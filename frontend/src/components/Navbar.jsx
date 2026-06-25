import { useAuth } from '../AuthContext'

export default function Navbar({ title, backHref }) {
  const { signOut, profile } = useAuth()

  return (
    <header style={{
      background: '#1F4E79',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {backHref && (
          <a href={backHref} style={{ color: '#B5D4F4', fontSize: 13, textDecoration: 'none', marginRight: 4 }}>←</a>
        )}
        <span style={{ fontSize: 18 }}>💧</span>
        <span style={{ color: '#E6F1FB', fontSize: 15, fontWeight: 600 }}>
          {title || 'DRAIN-EYE'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#E6F1FB', fontSize: 12, fontWeight: 500 }}>
            {profile?.full_name || profile?.email}
          </div>
          <div style={{ color: '#93C5E8', fontSize: 10 }}>
            {profile?.role === 'dlh_manager'  ? '🏛️ DLH Manager'   :
             profile?.role === 'dlh_operator' ? '🏛️ DLH Operator'  :
                                                '👤 Warga'}
          </div>
        </div>
        <button
          onClick={signOut}
          style={{
            background: '#E24B4A',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 500
          }}
        >
          Logout
        </button>
      </div>
    </header>
  )
}
