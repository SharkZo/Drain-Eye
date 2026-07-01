import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'

export default function Navbar({ title, backHref, showClock = false, showUpload = false }) {
  const { signOut, profile } = useAuth()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    if (!showClock) return
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [showClock])

  const fmtTime = t => t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <header style={{
      background: '#1F4E79',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {showClock && (
          <span style={{ color: '#B5D4F4', fontSize: 12 }}>{fmtTime(time)} WIB</span>
        )}

        {showUpload && (
          <a
            href="/upload"
            style={{
              background: '#2E74B5',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '7px 14px',
              fontSize: 12,
              cursor: 'pointer',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            📷 Upload
          </a>
        )}

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
