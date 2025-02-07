import { DocumentType } from '@prisma/client'

export type WhereClause = {
  type?: DocumentType
  statusId?: number
  category?: string
  agency?: string
  datePublished?: {
    gte?: Date
    lte?: Date
  }
  OR?: {
    title?: { contains: string; mode: 'insensitive' }
    summary?: { contains: string; mode: 'insensitive' }
    number?: { contains: string; mode: 'insensitive' }
  }[]
}