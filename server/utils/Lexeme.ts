import mongoose from 'mongoose'

export interface ILexeme {
  id: string
  /** 備註／詞義範圍等（可選） */
  notes?: string
}

const LexemeSchema = new mongoose.Schema<ILexeme>({
  id: {
    type: String,
    required: true,
    unique: true
  },
  notes: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'lexemes'
})

export const Lexeme = mongoose.models.Lexeme || mongoose.model<ILexeme>('Lexeme', LexemeSchema)

