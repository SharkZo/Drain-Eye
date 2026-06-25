import { useState } from 'react'
import { supabase } from '../supabase'
import './Login.css'

export default function Login() {
  const [mode, setMode]         = useState('login') // login | register
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(null)

  const handleLogin = async () => {
    if (!email || !password) { setError('Email dan password wajib diisi.'); return }
    setLoading(true); setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email atau password salah.')
    } else {
      // cek role user
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      const role = profile?.role || 'warga'

      if (role === 'warga') {
        window.location.href = '/upload'
      } else {
        window.location.href = '/'
      }
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    if (!email || !password || !fullName) { setError('Semua field wajib diisi.'); return }
    if (password.length < 6) { setError('Password minimal 6 karakter.'); return }
    setLoading(true); setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Registrasi berhasil! Cek email kamu untuk verifikasi, lalu login.')
      setMode('login')
    }
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">💧</div>
          <div className="login-title">DRAIN-EYE</div>
          <div className="login-sub">Sistem Deteksi Sumbatan Drainase DKI Jakarta</div>
        </div>

        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
          >
            Masuk
          </button>
          <button
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(null); setSuccess(null) }}
          >
            Daftar
          </button>
        </div>

        <div className="login-form">
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input
                className="form-input"
                placeholder="Masukkan nama lengkap"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
            />
          </div>

          {error && <div className="login-error">⚠️ {error}</div>}
          {success && <div className="login-success">✅ {success}</div>}

          <button
            className={`btn-login ${loading ? 'loading' : ''}`}
            onClick={mode === 'login' ? handleLogin : handleRegister}
            disabled={loading}
          >
            {loading ? '⏳ Memproses...' : mode === 'login' ? '🔐 Masuk' : '📝 Daftar'}
          </button>

          {mode === 'login' && (
            <div className="login-note">
              Warga baru? <span className="link" onClick={() => setMode('register')}>Daftar di sini</span>
            </div>
          )}

          <div className="login-roles">
            <div className="role-info">
              <strong>👤 Warga</strong> — Upload foto drainase & lihat riwayat
            </div>
            <div className="role-info">
              <strong>🏛️ DLH Operator</strong> — Dashboard, alert & maintenance
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
