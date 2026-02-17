import { uploadImageBuffer, getOptimizedImageUrl } from '../../utils/cloudinary'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({ statusCode: 401, message: '請先登錄' })
  }

  const form = await readMultipartFormData(event)
  if (!form?.length) {
    throw createError({ statusCode: 400, message: '請選擇要上傳的圖片' })
  }

  const file = form.find((f) => f.name === 'file' || f.name === 'image')
  if (!file?.data) {
    throw createError({ statusCode: 400, message: '未找到上傳文件' })
  }

  const type = file.type || ''
  if (!ALLOWED_TYPES.includes(type)) {
    throw createError({
      statusCode: 400,
      message: '僅支持 JPG、PNG、GIF、WebP 格式'
    })
  }

  if (file.data.length > MAX_SIZE) {
    throw createError({ statusCode: 400, message: '圖片大小不能超過 5MB' })
  }

  try {
    const { public_id, secure_url } = await uploadImageBuffer(file.data)
    const optimizedUrl = getOptimizedImageUrl(public_id, { width: 800, crop: 'limit' })

    return {
      success: true,
      data: {
        public_id,
        url: secure_url,
        optimized_url: optimizedUrl
      }
    }
  } catch (err: any) {
    console.error('Cloudinary upload error:', err)
    throw createError({
      statusCode: 500,
      message: err.message || '圖片上傳失敗'
    })
  }
})
