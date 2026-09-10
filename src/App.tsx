import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Login from './pages/Login'
import Upload from './pages/Upload'
import Queue from './pages/Queue'
import DocumentDetail from './pages/DocumentDetail'
import Nav from './components/Nav'

function Guarded({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-paper" />
  if (!session) return <Navigate to="/login" replace />
  return (
    <>
      <Nav />
      {children}
    </>
  )
}

function Shell() {
  const { session, loading } = useAuth()

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-paper">
        <Routes>
          <Route
            path="/login"
            element={!loading && session ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/"
            element={
              <Guarded>
                <Upload />
              </Guarded>
            }
          />
          <Route
            path="/queue"
            element={
              <Guarded>
                <Queue />
              </Guarded>
            }
          />
          <Route
            path="/document/:id"
            element={
              <Guarded>
                <DocumentDetail />
              </Guarded>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
