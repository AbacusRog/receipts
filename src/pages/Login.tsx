import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl text-ink" style={{ fontOpticalSizing: 'auto' }}>
            Intake
          </h1>
          <p className="text-ink-faint text-sm mt-1">Sign in to the document tray</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-line rounded-sm p-6 shadow-sm"
        >
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-faint mb-1">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-line rounded-sm px-3 py-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-ink-soft"
          />
          <label className="block text-xs font-medium uppercase tracking-wide text-ink-faint mb-1">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-line rounded-sm px-3 py-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-ink-soft"
          />
          {error && <p className="text-stamp text-sm mb-4">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-ink text-white rounded-sm py-2 text-sm font-medium hover:bg-ink-soft transition-colors disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
