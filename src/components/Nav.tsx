import { NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Nav() {
  const { session } = useAuth()

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
      isActive
        ? 'border-stamp text-ink'
        : 'border-transparent text-ink-faint hover:text-ink'
    }`

  return (
    <header className="border-b border-line bg-white">
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-display text-lg text-ink py-3">Intake</span>
          <nav className="flex">
            <NavLink to="/" end className={tabClass}>
              Upload
            </NavLink>
            <NavLink to="/queue" className={tabClass}>
              Queue
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-ink-faint">
          <span>{session?.user.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-ink-faint hover:text-stamp transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
