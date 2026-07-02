import { useState } from 'react'
import { supabase } from '../supabase'
import './Login.css'

export default function Login() {
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const switchMode = (newMode) => {
    setMode(newMode)
    setError(null)
    setSuccess(null)
    setFieldErrors({})
  }

  const validateLogin = () => {
    const errs = {}
    if (!email.trim()) errs.email = 'Email wajib diisi'
    else if (!validateEmail(email)) errs.email = 'Format email tidak valid'
    if (!password) errs.password = 'Password wajib diisi'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateRegister = () => {
    const errs = {}
    if (!fullName.trim()) errs.fullName = 'Nama lengkap wajib diisi'
    if (!email.trim()) errs.email = 'Email wajib diisi'
    else if (!validateEmail(email)) errs.email = 'Format email tidak valid'
    if (!password) errs.password = 'Password wajib diisi'
    else if (password.length < 6) errs.password = 'Password minimal 6 karakter'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleLogin = async () => {
    setError(null)
    if (!validateLogin()) return
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Email atau password salah. Periksa kembali.')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Email belum diverifikasi. Cek inbox kamu.')
        } else {
          setError('Gagal masuk: ' + error.message)
        }
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      // PENTING: kalau gagal ambil role, JANGAN diam-diam anggap 'warga'.
      // Salah redirect DLH Manager ke halaman warga itu membingungkan.
      if (profileError) {
        setError('Berhasil masuk, tapi gagal memuat data akun kamu. Coba klik "Masuk" sekali lagi.')
        setLoading(false)
        return
      }

      const role = profile?.role || 'warga'
      window.location.href = role === 'warga' ? '/upload' : '/'
    } catch (err) {
      setError('Terjadi kesalahan jaringan. Periksa koneksi internet kamu.')
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setError(null)
    if (!validateRegister()) return
    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } }
      })

      if (error) {
        if (error.message.includes('already registered')) {
          setError('Email ini sudah terdaftar. Coba masuk dengan akun yang ada.')
        } else if (error.message.includes('rate limit')) {
          setError('Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.')
        } else {
          setError('Gagal mendaftar: ' + error.message)
        }
        setLoading(false)
        return
      }

      setSuccess('Registrasi berhasil! Silakan masuk dengan akun barumu.')
      setEmail('')
      setPassword('')
      setFullName('')
      setTimeout(() => switchMode('login'), 1500)
    } catch (err) {
      setError('Terjadi kesalahan jaringan. Periksa koneksi internet kamu.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      mode === 'login' ? handleLogin() : handleRegister()
    }
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
            onClick={() => switchMode('login')}
            disabled={loading}
          >
            Masuk
          </button>
          <button
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
            disabled={loading}
          >
            Daftar
          </button>
        </div>

        <div className="login-form">
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Nama Lengkap <span className="required">*</span></label>
              <input
                className={`form-input ${fieldErrors.fullName ? 'input-error' : ''}`}
                placeholder="Masukkan nama lengkap"
                value={fullName}
                onChange={e => { setFullName(e.target.value); setFieldErrors(p => ({ ...p, fullName: null })) }}
                onKeyDown={handleKeyDown}
                disabled={loading}
                autoFocus
              />
              {fieldErrors.fullName && <div className="field-error-text">⚠️ {fieldErrors.fullName}</div>}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email <span className="required">*</span></label>
            <input
              className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: null })) }}
              onKeyDown={handleKeyDown}
              disabled={loading}
              autoFocus={mode === 'login'}
            />
            {fieldErrors.email && <div className="field-error-text">⚠️ {fieldErrors.email}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Password <span className="required">*</span></label>
            <div className="password-wrap">
              <input
                className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Minimal 6 karakter' : 'Masukkan password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: null })) }}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🔒' : '👁️'}
              </button>
            </div>
            {fieldErrors.password && <div className="field-error-text">⚠️ {fieldErrors.password}</div>}
          </div>

          {error && <div className="login-error">⚠️ {error}</div>}
          {success && <div className="login-success">✅ {success}</div>}

          <button
            className={`btn-login ${loading ? 'loading' : ''}`}
            onClick={mode === 'login' ? handleLogin : handleRegister}
            disabled={loading}
          >
            {loading ? (
              <span className="btn-spinner-wrap"><span className="btn-spinner"></span> Memproses...</span>
            ) : mode === 'login' ? '🔐 Masuk' : '📝 Daftar'}
          </button>

          {mode === 'login' && (
            <div className="login-note">
              Warga baru? <span className="link" onClick={() => !loading && switchMode('register')}>Daftar di sini</span>
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
