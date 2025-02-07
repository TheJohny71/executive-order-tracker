import { DocumentType } from '@prisma/client'

export interface Order {
  id: number
  number: string
  title: string
  description?: string
  type: DocumentType
  date: Date
  link?: string
  pdfUrl?: string
  status?: {
    id: number
    name: string
    color?: string
  }
  category?: string
  agency?: string
  metadata?: Record<string, unknown>
}

export interface OrderMetadata {
  categories: string[]
  agencies: string[]
  statuses: OrderStatus[]
}

export interface OrderStatus {
  id: number
  name: string
  color?: string
}

export interface PaginationData {
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface OrdersResponse {
  orders: Order[]
  metadata: OrderMetadata
  pagination: PaginationData
}

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

export type OrderByClause = {
  [key: string]: 'asc' | 'desc'
}