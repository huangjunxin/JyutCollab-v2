/**
 * 上傳前壓縮圖片：縮放至最長邊不超過 maxSize，並以指定品質輸出為 JPEG。
 * 用於減少上傳體積與 Cloudinary 儲存，適合釋義配圖等情境。
 */
export interface ImageCompressOptions {
  /** 最長邊（寬或高）上限像素，預設 1200 */
  maxSize?: number
  /** JPEG 品質 0–1，預設 0.82 */
  quality?: number
}

const DEFAULT_MAX_SIZE = 1200
const DEFAULT_QUALITY = 0.82

export function useImageCompress() {
  return async function compressImage(
    file: File,
    options: ImageCompressOptions = {}
  ): Promise<Blob> {
    const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE
    const quality = options.quality ?? DEFAULT_QUALITY

    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        const w = img.naturalWidth
        const h = img.naturalHeight
        if (w <= 0 || h <= 0) {
          resolve(file as unknown as Blob)
          return
        }

        const scale = Math.min(1, maxSize / Math.max(w, h))
        const cw = Math.round(w * scale)
        const ch = Math.round(h * scale)

        const canvas = document.createElement('canvas')
        canvas.width = cw
        canvas.height = ch
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file as unknown as Blob)
          return
        }
        ctx.drawImage(img, 0, 0, cw, ch)

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else resolve(file as unknown as Blob)
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('無法讀取圖片'))
      }

      img.src = url
    })
  }
}
