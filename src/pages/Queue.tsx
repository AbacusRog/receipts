import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { DocumentRow, DocumentStatus } from '../lib/types'

const STATUS_LABEL: Record<DocumentStatus, string> = {
  pending: 'Pending',
  processing: 'Reading',
  needs_review: 'Needs review',
  confirmed: 'Confirmed',
  exported: 'Exported',
  failed: 'Failed',
}

const STATUS_COLOR: Record<DocumentStatus, string> = {
  pending: 'text-ink-faint',
  processing: 'text-ink-soft',
  needs_review: 'text-stamp',
  confirmed: 'text-ledger-green',
  exported: 'text-ledger-green',
  failed: 'text-stamp',
}

const FILTERS: Array<{ key: DocumentStatus | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'needs_review', label: 'Needs review' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'exported', label: 'Exported' },
]

export default function Queue() {
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [filter, setFilter] = useState<DocumentStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
    setDocs(data ?? [])
    setLoading(false)
  }

  const visible = filter === 'all' ? docs : docs.filter((d) => d.status === filter)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-display text-2xl text-ink">The ledger</h1>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm border transition-colors ${
                filter === f.key
                  ? 'bg-ink text-white border-ink'
                  : 'border-line text-ink-faint hover:border-ink-soft'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-ink-faint text-sm">Loading…</p>}

      {!loading && visible.length === 0 && (
        <div className="border border-dashed border-line rounded-sm py-16 text-center">
          <p className="text-ink-faint text-sm">Nothing here yet.</p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="border border-line bg-white rounded-sm divide-y divide-line">
          {visible.map((doc) => (
            <Link
              key={doc.id}
              to={`/document/${doc.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-paper/60 transition-colors"
            >
              <div className="min-w-0 mr-4">
                <p className="text-sm text-ink truncate">{doc.file_name}</p>
                <p className="text-xs text-ink-faint font-mono mt-0.5">
                  {new Date(doc.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {doc.client_name ? ` · ${doc.client_name}` : ''}
                </p>
              </div>
              <span className={`font-mono text-xs uppercase tracking-wide shrink-0 ${STATUS_COLOR[doc.status]}`}>
                {STATUS_LABEL[doc.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
