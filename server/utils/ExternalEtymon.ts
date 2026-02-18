import mongoose from 'mongoose'

export interface IExternalEtymon {
  id: string
  lexemeId: string
  languageCode: string
  dialectName?: string
  scriptForm: string
  phonetic?: string
  gloss?: string
  sourceType?: 'fieldwork' | 'dictionary' | 'literature' | 'corpus'
  sourceDetail?: string
  note?: string
  createdBy: string
}

const ExternalEtymonSchema = new mongoose.Schema<IExternalEtymon>({
  id: {
    type: String,
    required: true,
    unique: true
  },
  lexemeId: {
    type: String,
    required: true,
    index: true
  },
  languageCode: {
    type: String,
    required: true
  },
  dialectName: {
    type: String
  },
  scriptForm: {
    type: String,
    required: true
  },
  phonetic: {
    type: String
  },
  gloss: {
    type: String
  },
  sourceType: {
    type: String,
    enum: ['fieldwork', 'dictionary', 'literature', 'corpus']
  },
  sourceDetail: {
    type: String
  },
  note: {
    type: String
  },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'external_etymons'
})

export const ExternalEtymon = mongoose.models.ExternalEtymon || mongoose.model<IExternalEtymon>('ExternalEtymon', ExternalEtymonSchema)

