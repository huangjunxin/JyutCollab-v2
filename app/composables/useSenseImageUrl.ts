/**
 * 根據 Cloudinary public_id 生成優化後的釋義配圖 URL（f_auto, q_auto）。
 * 需在 nuxt.config 的 runtimeConfig.public 中設置 cloudinaryCloudName。
 */
export function useSenseImageUrl() {
  const config = useRuntimeConfig()
  const cloudName = config.public.cloudinaryCloudName as string | undefined

  return (publicId: string, options?: { width?: number; crop?: string }): string => {
    if (!cloudName || !publicId) return ''
    const transforms = ['f_auto', 'q_auto']
    if (options?.width) {
      if (options.crop) transforms.push(`c_${options.crop}`)
      transforms.push(`w_${options.width}`)
    }
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join(',')}/${publicId}`
  }
}
