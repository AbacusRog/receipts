import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

interface QueuedFile {
  file: File
  status: 'waiting' | 'uploading' | 'done' | 'error'
  errorMessage?: string
}

export default function Upload() {
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { session } = useAuth()
  const navigate = useNavigate()

  const addFiles = useCallback((files: FileList | File[]) => {
    const accepted = Array.from(files).filter(
      (f) =>
        f.type === 'application/pdf' ||
        f.type.startsWith('image/')
    )
    setQueue((prev) => [...prev, ...accepted.map((file) => ({ file, status: 'waiting' as const }))])
  }, [])

  async function uploadAll() {
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status !== 'waiting') continue
      setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: 'uploading' } : q)))

      const file = queue[i].file
      const ext = file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage.from('receipts').upload(path, file)

      if (uploadError) {
        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i ? { ...q, status: 'error', errorMessage: uploadError.message } : q
          )
        )
        continue
      }

      const { data: docRow, error: dbError } = await supabase
        .from('documents')
        .insert({
          file_path: path,
          file_name: file.name,
          file_type: file.type,
          source: 'upload',
          status: 'pending',
          uploaded_by: session?.user.email ?? null,
        })
        .select()
        .single()

      if (dbError) {
        setQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: 'error', errorMessage: dbError.message } : q))
        )
        continue
      }

      setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: 'done' } : q)))

      // Kick off extraction in the background; failures here just leave the
      // document sitting in "pending" for manual entry, so we don't block on it.
      fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docRow.id }),
      }).catch(() => {})
    }
  }

  const allDone = queue.length > 0 && queue.every((q) => q.status === 'done' || q.status === 'error')
  const hasWaiting = queue.some((q) => q.status === 'waiting')

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display text-2xl text-ink mb-1">Drop it in the tray</h1>
      <p className="text-ink-faint text-sm mb-6">
        Receipts and invoices — PDF, JPG or PNG. They'll queue for review once uploaded.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-sm border-2 border-dashed transition-colors px-8 py-16 text-center ${
          dragActive ? 'border-stamp bg-stamp/5' : 'border-kraft-dark bg-white'
        }`}
        style={{
          boxShadow: '0 1px 0 var(--color-line), 0 -6px 0 -2px var(--color-paper-dim), 0 -8px 0 -3px var(--color-line)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <p className="font-display text-lg text-ink mb-1">Drag files here, or click to browse</p>
        <p className="text-ink-faint text-sm">One or several at a time</p>
      </div>

      {queue.length > 0 && (
        <div className="mt-6 border border-line bg-white rounded-sm divide-y divide-line">
          {queue.map((q, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-ink truncate mr-4">{q.file.name}</span>
              <span
                className={`font-mono text-xs uppercase tracking-wide ${
                  q.status === 'done'
                    ? 'text-ledger-green'
                    : q.status === 'error'
                    ? 'text-stamp'
                    : q.status === 'uploading'
                    ? 'text-ink-soft'
                    : 'text-ink-faint'
                }`}
              >
                {q.status === 'error' ? q.errorMessage ?? 'error' : q.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        {hasWaiting && (
          <button
            onClick={uploadAll}
            className="bg-ink text-white rounded-sm px-5 py-2.5 text-sm font-medium hover:bg-ink-soft transition-colors"
          >
            Upload {queue.filter((q) => q.status === 'waiting').length} file
            {queue.filter((q) => q.status === 'waiting').length === 1 ? '' : 's'}
          </button>
        )}
        {allDone && (
          <button
            onClick={() => navigate('/queue')}
            className="border border-ink text-ink rounded-sm px-5 py-2.5 text-sm font-medium hover:bg-ink hover:text-white transition-colors"
          >
            Go to queue
          </button>
        )}
      </div>
    </div>
  )
}
