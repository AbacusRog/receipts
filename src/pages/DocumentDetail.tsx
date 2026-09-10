import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import type { DocumentRow, ExtractionRow } from '../lib/types'

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [doc, setDoc] = useState<DocumentRow | null>(null)
  const [extraction, setExtraction] = useState<Partial<ExtractionRow>>({})
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) load(id)
  }, [id])

  async function load(docId: string) {
    setLoading(true)
    const { data: docRow } = await supabase.from('documents').select('*').eq('id', docId).single()
    setDoc(docRow)

    if (docRow) {
      const { data: signed } = await supabase.storage
        .from('receipts')
        .createSignedUrl(docRow.file_path, 3600)
      setPreviewUrl(signed?.signedUrl ?? null)
    }

    const { data: extRow } = await supabase
      .from('extractions')
      .select('*')
      .eq('document_id', docId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setExtraction(extRow ?? { document_id: docId, currency: 'GBP' })
    setLoading(false)
  }

  function updateField<K extends keyof ExtractionRow>(key: K, value: ExtractionRow[K]) {
    setExtraction((prev) => ({ ...prev, [key]: value }))
  }

  async function saveAndConfirm() {
    if (!doc) return
    setSaving(true)

    if (extraction.id) {
      await supabase
        .from('extractions')
        .update({
          ...extraction,
          reviewed_by: session?.user.email ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', extraction.id)
    } else {
      await supabase.from('extractions').insert({
        ...extraction,
        document_id: doc.id,
        reviewed_by: session?.user.email ?? null,
        reviewed_at: new Date().toISOString(),
      })
    }

    await supabase.from('documents').update({ status: 'confirmed' }).eq('id', doc.id)
    setSaving(false)
    navigate('/queue')
  }

  if (loading) return <div className="max-w-5xl mx-auto px-6 py-10 text-ink-faint text-sm">Loading…</div>
  if (!doc) return <div className="max-w-5xl mx-auto px-6 py-10 text-ink-faint text-sm">Document not found.</div>

  const isImage = doc.file_type.startsWith('image/')

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <p className="text-xs font-mono uppercase tracking-wide text-ink-faint mb-2">{doc.file_name}</p>
        <div className="border border-line bg-white rounded-sm overflow-hidden aspect-[3/4] flex items-center justify-center">
          {previewUrl && isImage && (
            <img src={previewUrl} alt={doc.file_name} className="max-h-full max-w-full object-contain" />
          )}
          {previewUrl && !isImage && (
            <iframe src={previewUrl} title={doc.file_name} className="w-full h-full" />
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-xl text-ink">Extracted details</h1>
          {doc.status === 'confirmed' || doc.status === 'exported' ? (
            <span className="stamp text-ledger-green text-xs px-2 py-1">
              {doc.status === 'exported' ? 'Exported' : 'Confirmed'}
            </span>
          ) : null}
        </div>

        <div className="space-y-4">
          <Field label="Supplier">
            <input
              value={extraction.supplier ?? ''}
              onChange={(e) => updateField('supplier', e.target.value)}
              className="w-full border border-line rounded-sm px-3 py-2 text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date">
              <input
                type="date"
                value={extraction.document_date ?? ''}
                onChange={(e) => updateField('document_date', e.target.value)}
                className="w-full border border-line rounded-sm px-3 py-2 text-sm font-mono"
              />
            </Field>
            <Field label="Currency">
              <input
                value={extraction.currency ?? 'GBP'}
                onChange={(e) => updateField('currency', e.target.value)}
                className="w-full border border-line rounded-sm px-3 py-2 text-sm font-mono"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Net">
              <input
                type="number"
                step="0.01"
                value={extraction.net_amount ?? ''}
                onChange={(e) => updateField('net_amount', parseFloat(e.target.value))}
                className="w-full border border-line rounded-sm px-3 py-2 text-sm font-mono"
              />
            </Field>
            <Field label="VAT">
              <input
                type="number"
                step="0.01"
                value={extraction.vat_amount ?? ''}
                onChange={(e) => updateField('vat_amount', parseFloat(e.target.value))}
                className="w-full border border-line rounded-sm px-3 py-2 text-sm font-mono"
              />
            </Field>
            <Field label="Total">
              <input
                type="number"
                step="0.01"
                value={extraction.total_amount ?? ''}
                onChange={(e) => updateField('total_amount', parseFloat(e.target.value))}
                className="w-full border border-line rounded-sm px-3 py-2 text-sm font-mono"
              />
            </Field>
          </div>

          <Field label="Category">
            <input
              value={extraction.category ?? ''}
              onChange={(e) => updateField('category', e.target.value)}
              className="w-full border border-line rounded-sm px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Client">
            <input
              value={doc.client_name ?? ''}
              onChange={(e) => setDoc({ ...doc, client_name: e.target.value })}
              className="w-full border border-line rounded-sm px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={extraction.notes ?? ''}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={2}
              className="w-full border border-line rounded-sm px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={saveAndConfirm}
            disabled={saving}
            className="bg-ink text-white rounded-sm px-5 py-2.5 text-sm font-medium hover:bg-ink-soft transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Confirm & save'}
          </button>
          <button
            onClick={() => navigate('/queue')}
            className="border border-line text-ink-faint rounded-sm px-5 py-2.5 text-sm font-medium hover:border-ink-soft transition-colors"
          >
            Back to queue
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-ink-faint mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}
