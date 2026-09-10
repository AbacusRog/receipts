export type DocumentStatus = 'pending' | 'processing' | 'needs_review' | 'confirmed' | 'exported' | 'failed'

export interface DocumentRow {
  id: string
  created_at: string
  file_path: string
  file_name: string
  file_type: string
  source: 'upload' | 'email'
  status: DocumentStatus
  client_name: string | null
  uploaded_by: string | null
}

export interface ExtractionRow {
  id: string
  document_id: string
  supplier: string | null
  document_date: string | null
  net_amount: number | null
  vat_amount: number | null
  total_amount: number | null
  currency: string | null
  category: string | null
  notes: string | null
  confidence: number | null
  raw_response: unknown
  reviewed_by: string | null
  reviewed_at: string | null
}
