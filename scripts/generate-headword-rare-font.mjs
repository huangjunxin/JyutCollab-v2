#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadDotEnv() {
  const envPath = resolve(root, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match || process.env[match[1]]) continue
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
}

loadDotEnv()

const outputCss = resolve(root, 'public/fonts/jyutcollab-headword-rare.css')
const outputChars = resolve(root, 'public/fonts/jyutcollab-headword-rare-chars.txt')
const mongoUri = process.env.MONGODB_URI

const fontSources = [
  {
    name: 'p1',
    family: 'JyutCollab Headword Rare P1',
    source: process.env.RARE_HEADWORD_P1_SOURCE_FONT || resolve(root, 'assets/fonts/PlangothicP1-Regular.ttf'),
    output: resolve(root, 'public/fonts/jyutcollab-headword-rare-p1.woff2')
  },
  {
    name: 'p2',
    family: 'JyutCollab Headword Rare P2',
    source: process.env.RARE_HEADWORD_P2_SOURCE_FONT || resolve(root, 'assets/fonts/PlangothicP2-Regular.ttf'),
    output: resolve(root, 'public/fonts/jyutcollab-headword-rare-p2.woff2')
  },
  {
    name: 'noto',
    family: 'JyutCollab Headword Rare Noto',
    source: process.env.RARE_HEADWORD_NOTO_SOURCE_FONT || resolve(root, 'assets/fonts/NotoSansCJKtc-Regular.otf'),
    output: resolve(root, 'public/fonts/jyutcollab-headword-rare-noto.woff2')
  }
]

const cjkRarePattern = /[㐀-䶿\u{20000}-\u{3FFFF}-]/gu

function collectRareChars(value, chars) {
  if (!value) return
  for (const match of String(value).matchAll(cjkRarePattern)) {
    chars.add(match[0])
  }
}

async function collectHeadwordCharsFromMongo(chars) {
  if (!mongoUri) return false
  await mongoose.connect(mongoUri)
  const entries = mongoose.connection.db.collection('entries')
  const cursor = entries.find({}, { projection: { text: 1, 'headword.display': 1, 'headword.variants': 1 } })
  for await (const entry of cursor) {
    collectRareChars(entry.text, chars)
    collectRareChars(entry.headword?.display, chars)
    for (const variant of entry.headword?.variants || []) collectRareChars(variant, chars)
  }
  await mongoose.disconnect()
  return true
}

function runPyftsubset(source, output, charsFile) {
  const result = spawnSync('pyftsubset', [
    source,
    `--text-file=${charsFile}`,
    `--output-file=${output}`,
    '--flavor=woff2',
    '--layout-features=*',
    '--glyph-names',
    '--symbol-cmap',
    '--legacy-cmap',
    '--notdef-glyph',
    '--notdef-outline',
    '--recommended-glyphs',
    '--name-IDs=*',
    '--name-legacy',
    '--name-languages=*'
  ], { stdio: 'inherit' })

  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`pyftsubset failed with exit code ${result.status}`)
}

const chars = new Set()
const loadedFromMongo = await collectHeadwordCharsFromMongo(chars)
const sortedChars = [...chars].sort().join('')
writeFileSync(outputChars, sortedChars || '\n')

if (!sortedChars) {
  writeFileSync(outputCss, '/* No rare headword glyphs found. */\n')
  console.log(loadedFromMongo
    ? 'No rare headword glyphs found; chars file written empty.'
    : 'MONGODB_URI is not set; chars file written empty. Set MONGODB_URI to collect headword glyphs.')
  process.exit(0)
}

const generatedFonts = []
for (const fontSource of fontSources) {
  if (!existsSync(fontSource.source)) continue
  runPyftsubset(fontSource.source, fontSource.output, outputChars)
  generatedFonts.push(fontSource)
}

if (!generatedFonts.length) {
  throw new Error('No source fonts found. Put PlangothicP1-Regular.ttf and PlangothicP2-Regular.ttf under assets/fonts/.')
}

const fontFaces = generatedFonts.map(font => `@font-face {
  font-family: "${font.family}";
  src: url("/fonts/${font.output.split('/').at(-1)}") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}`).join('\n\n')

writeFileSync(outputCss, `${fontFaces}\n\n:root {
  --jc-font-headword: ${generatedFonts.map(font => `"${font.family}"`).join(', ')}, "PingFang TC", "PingFang HK", "Noto Sans CJK TC", "Noto Sans TC", "Noto Sans HK", var(--jc-font-sans);
}\n`)

console.log(`Generated ${generatedFonts.length} rare headword subset fonts with ${chars.size} candidate glyphs.`)
