import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: 'page',
      source: 'docs/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        order: z.number(),
        category: z.string(),
        updatedAt: z.string()
      })
    })
  }
})
