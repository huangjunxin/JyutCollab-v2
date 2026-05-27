import { z } from 'zod'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AgentToolDefinition } from '../core/contracts'

interface DocIndex {
  slug: string
  title: string
  description: string
  category: string
  order: number
  headings: string[]
  bodyText: string
  fullPath: string
}

let docCache: DocIndex[] | null = null

function parseFrontmatter(content: string): { frontmatter: Record<string, string>, body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match || !match[1] || !match[2]) return { frontmatter: {}, body: content }
  const fmBody = match[1]
  const mainBody = match[2]
  const frontmatter: Record<string, string> = {}
  for (const line of fmBody.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0) {
      frontmatter[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim()
    }
  }
  return { frontmatter, body: mainBody }
}

function loadDocIndex(): DocIndex[] {
  if (docCache) return docCache
  const docsDir = resolve(process.cwd(), 'content/docs')
  try {
    const files = readdirSync(docsDir).filter(f => f.endsWith('.md'))
    docCache = files.map(file => {
      const slug = file.replace(/\.md$/, '')
      const fullPath = resolve(docsDir, file)
      const raw = readFileSync(fullPath, 'utf-8')
      const { frontmatter, body } = parseFrontmatter(raw)
      const headings: string[] = []
      const bodyLines: string[] = []
      for (const line of body.split('\n')) {
        const trimmed = line.trim()
        if (trimmed.startsWith('## ')) headings.push(trimmed.slice(3))
        else if (trimmed.startsWith('### ')) headings.push(trimmed.slice(4))
        else if (!trimmed.startsWith('# ') && !trimmed.startsWith('---')) bodyLines.push(trimmed)
      }
      return {
        slug,
        title: frontmatter.title || slug,
        description: frontmatter.description || '',
        category: frontmatter.category || '',
        order: parseInt(frontmatter.order || '99', 10) || 99,
        headings,
        bodyText: bodyLines.join(' '),
        fullPath
      }
    }).sort((a, b) => a.order - b.order)
    return docCache
  } catch {
    docCache = []
    return docCache
  }
}

function scoreDoc(doc: DocIndex, query: string): number {
  const q = query.toLowerCase()
  let score = 0
  if (doc.title.toLowerCase().includes(q)) score += 10
  if (doc.description.toLowerCase().includes(q)) score += 6
  if (doc.category.toLowerCase().includes(q)) score += 4
  for (const heading of doc.headings) {
    if (heading.toLowerCase().includes(q)) score += 5
  }
  const words = q.split(/\s+/).filter(Boolean)
  for (const word of words) {
    if (doc.bodyText.toLowerCase().includes(word)) score += 1
  }
  return score
}

const SearchDocsInput = z.object({
  query: z.string().trim().min(1).max(200)
})

const ReadDocInput = z.object({
  slug: z.string().trim().min(1).max(100)
})

export const searchDocsTool: AgentToolDefinition<z.infer<typeof SearchDocsInput>> = {
  name: 'jyutcollab.search_docs',
  description: '搜尋 JyutCollab 使用指南、FAQ、快捷鍵和流程說明文件。',
  risk: 'safe',
  inputSchema: SearchDocsInput,
  async execute(input) {
    const docs = loadDocIndex()
    if (!docs.length) {
      return {
        ok: false,
        summary: '目前無法讀取使用指南文件。',
        warnings: ['content/docs 目錄可能不存在或為空。']
      }
    }
    const scored = docs
      .map(doc => ({ doc, score: scoreDoc(doc, input.query) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => ({
        slug: item.doc.slug,
        title: item.doc.title,
        category: item.doc.category,
        description: item.doc.description,
        headings: item.doc.headings.slice(0, 6),
        score: item.score
      }))

    if (!scored.length) {
      return {
        ok: true,
        data: { docs: [], query: input.query },
        summary: `找不到與「${input.query}」相關的使用指南。`,
        nextAction: '嘗試用更簡短的關鍵詞重新搜尋，或直接詢問具體操作問題。'
      }
    }

    return {
      ok: true,
      data: { docs: scored, query: input.query },
      summary: `找到 ${scored.length} 篇相關指南：${scored.map(d => d.title).join('、')}。`,
      nextAction: '使用 jyutcollab.read_doc 讀取完整內容。'
    }
  }
}

export const readDocTool: AgentToolDefinition<z.infer<typeof ReadDocInput>> = {
  name: 'jyutcollab.read_doc',
  description: '讀取指定使用指南的完整內容。',
  risk: 'safe',
  inputSchema: ReadDocInput,
  async execute(input) {
    const docs = loadDocIndex()
    const doc = docs.find(d => d.slug === input.slug)
    if (!doc) {
      return {
        ok: false,
        summary: `找不到 slug 為「${input.slug}」的指南。`,
        warnings: [`可用的指南 slug：${docs.map(d => d.slug).join('、')}`],
        nextAction: '使用 jyutcollab.search_docs 搜尋後再讀取。'
      }
    }

    let raw: string
    try {
      raw = readFileSync(doc.fullPath, 'utf-8')
    } catch {
      return {
        ok: false,
        summary: `無法讀取指南「${doc.title}」。`,
        warnings: ['讀取文件時發生錯誤。']
      }
    }
    const { body } = parseFrontmatter(raw)
    const sections: Array<{ heading: string, content: string }> = []
    let currentHeading = '概述'
    let currentContent: string[] = []
    for (const line of body.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
        if (currentContent.length) {
          sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() })
        }
        currentHeading = trimmed.replace(/^#{2,3}\s+/, '')
        currentContent = []
      } else if (trimmed !== '' || currentContent.length > 0) {
        currentContent.push(line)
      }
    }
    if (currentContent.length) {
      sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() })
    }

    return {
      ok: true,
      data: { slug: doc.slug, title: doc.title, category: doc.category, sections },
      summary: `已讀取指南「${doc.title}」，共 ${sections.length} 個章節。`
    }
  }
}

export function createDocsTools() {
  return [searchDocsTool, readDocTool]
}
