import { useAuth } from './AuthContext'

export function ProtectedRoute({ children, requireDLH = false, requireManager = false }) {
  const { user, loading, isWarga, isDLH, isManager } = useAuth()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 14, color: '#64748b' }}>
      ⏳ Memuat...
    </div>
  )

  // belum login → redirect ke login
  if (!user) {
    window.location.href = '/login'
    return null
  }

  // butuh role manager tapi bukan manager
  if (requireManager && !isManager) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 40 }}>🚫</div>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#1F4E79' }}>Akses Ditolak</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Halaman ini hanya untuk DLH Manager</div>
        <a href="/" style={{ color: '#1F4E79', fontSize: 13 }}>← Kembali ke Dashboard</a>
      </div>
    )
  }

  // butuh role DLH tapi warga
  if (requireDLH && isWarga) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 40 }}>🚫</div>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#1F4E79' }}>Akses Ditolak</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Halaman ini hanya untuk petugas DLH</div>
        <a href="/upload" style={{ color: '#1F4E79', fontSize: 13 }}>← Kembali ke Upload</a>
      </div>
    )
  }

  return children
}
