/**
 * archiver 流式 ZIP 輸出適配器（P5 backup 導出用；§10.2 流式 ZIP）。
 *
 * **pull 模型**：每文件把行迭代器包成 `Readable.from` 後 append 給 archiver，
 * archiver 按需拉取（反壓由流系統管理），無手動 write/drain——修復逐條
 * `PassThrough.write` + drain 等待在真實數據下與 archiver 消費競爭導致的死鎖
 * （診斷：全量導出 ZIP 精確停在 21185 字節、inflate 截斷）。
 * writeFile 等待該文件行迭代器完全消費（Readable 'end'）後返回；
 * finalize 結束所有條目後返回最終 ZIP 字節數；abort 銷毀未完成流並刪半成品文件。
 * 文件內容與 export-backup.ts 純邏輯序列化的字節完全一致——manifest 的
 * records/SHA-256 在純邏輯層計算，故可對 ZIP 內文件復算核對。
 */
import { createWriteStream, existsSync, statSync, unlinkSync } from 'node:fs'
import { Readable } from 'node:stream'
import archiver from 'archiver'
import type { ExportOutput } from './export-backup'

export function createArchiverExportOutput(zipPath: string): ExportOutput {
  const archive = archiver('zip', { zlib: { level: 6 } })
  const output = createWriteStream(zipPath)
  archive.pipe(output)

  let finalized = false

  return {
    async writeFile(name, lines) {
      const readable = Readable.from(lines)
      // 行迭代器內部的錯誤（如游標中斷）→ 轉為 writeFile 的 reject
      const writePromise = new Promise<void>((resolve, reject) => {
        readable.once('error', reject)
        readable.once('end', resolve)
      })
      archive.append(readable, { name })
      await writePromise
    },
    async finalize() {
      finalized = true
      // 所有文件的行迭代器都已消費（writeFile 已 await）；收尾壓縮輸出
      await new Promise<void>((resolve, reject) => {
        output.once('close', resolve)
        output.once('error', reject)
        archive.once('error', reject)
        archive.finalize()
      })
      return { fileSize: statSync(zipPath).size }
    },
    async abort() {
      if (!finalized) {
        output.destroy()
        archive.abort()
      }
      if (existsSync(zipPath)) {
        try {
          unlinkSync(zipPath)
        } catch {
          // 半成品清理失敗不阻塞批次標 failed
        }
      }
    }
  }
}
