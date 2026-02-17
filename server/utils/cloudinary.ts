import { v2 as cloudinary } from 'cloudinary'

export function getCloudinaryConfig() {
  const config = useRuntimeConfig()
  return {
    cloudName: config.cloudinaryCloudName,
    apiKey: config.cloudinaryApiKey,
    apiSecret: config.cloudinaryApiSecret
  }
}

/** 確保 Cloudinary 已配置並返回配置好的實例（僅在需要上傳時調用） */
export function configureCloudinary() {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig()
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary 未配置：請設置 NUXT_CLOUDINARY_CLOUD_NAME、NUXT_CLOUDINARY_API_KEY、NUXT_CLOUDINARY_API_SECRET')
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })
  return cloudinary
}

/**
 * 上傳 buffer 到 Cloudinary，返回 public_id 與原始 URL。
 * 建議前端展示時使用 getOptimizedImageUrl(public_id) 取得優化後 URL。
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  options: { folder?: string; publicId?: string } = {}
): Promise<{ public_id: string; secure_url: string }> {
  const cld = configureCloudinary()
  return new Promise((resolve, reject) => {
    const uploadStream = cld.uploader.upload_stream(
      {
        folder: options.folder || 'jyutcollab/sense-images',
        resource_type: 'image',
        ...(options.publicId ? { public_id: options.publicId } : {})
      },
      (err, result) => {
        if (err) return reject(err)
        if (!result?.secure_url || !result?.public_id) {
          return reject(new Error('Cloudinary 上傳返回數據不完整'))
        }
        resolve({ public_id: result.public_id, secure_url: result.secure_url })
      }
    )
    uploadStream.end(buffer)
  })
}

/**
 * 根據 public_id 生成優化後的圖片 URL（auto format、auto quality，可選縮放）。
 * 僅需 cloudName，可從 runtimeConfig.public 取得，供前端或服務端使用。
 */
export function getOptimizedImageUrl(
  publicId: string,
  options: { width?: number; height?: number; crop?: string } = {}
): string {
  const config = useRuntimeConfig()
  const cloudName = config.public?.cloudinaryCloudName || config.cloudinaryCloudName
  if (!cloudName) {
    return ''
  }
  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`
  const transforms: string[] = ['f_auto', 'q_auto']
  if (options.width ?? options.height) {
    if (options.crop) transforms.push(`c_${options.crop}`)
    if (options.width) transforms.push(`w_${options.width}`)
    if (options.height) transforms.push(`h_${options.height}`)
  }
  const prefix = transforms.join(',') + '/'
  return `${baseUrl}/${prefix}${publicId}`
}
