import { useAuth } from './AuthContext'
import { useEffect } from 'react'

export function ProtectedRoute({ children, requireDLH = false, requireManager = false }) {
  const { user, loading, isWarga, isDLH, isManager } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        window.location.href = '/login'
      } else if (requireDLH && isWarga) {
        window.location.href = '/upload'
      } else if (requireManager && !isManager) {
        window.location.href = '/'
      }
    }
  }, [loading, user, isWarga, isManager])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 14, color: '#64748b' }}>
      ⏳ Memuat...
    </div>
  )

  if (!user) return null
  if (requireDLH && isWarga) return null
  if (requireManager && !isManager) return null

  return children
}