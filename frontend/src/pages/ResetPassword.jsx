import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import './Login.css'
import './ResetPassword.css'

export default function ResetPassword() {
  const [ready, setReady]       = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    // Supabase otomatis bikin session sementara dari token di URL (hash fragment)
    // saat halaman ini dibuka lewat link reset password di email.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    // fallback: kalau event PASSWORD_RECOVERY sudah lewat sebelum listener kepasang,
    // cek langsung apakah sudah ada session aktif
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true)
      else setTimeout(() => {
        supabase.auth.getSession().then(({ data }) => {
          if (data?.session) setReady(true)
          else setInvalidLink(true)
        })
      }, 1500)
    })

    return () => listener?.subscription?.unsubscribe()
  }, [])

  const validate = () => {
    const errs = {}
    if (!password) errs.password = 'Password wajib diisi'
    else if (password.length < 6) errs.password = 'Password minimal 6 karakter'
    if (!confirm) errs.confirm = 'Konfirmasi password wajib diisi'
    else if (confirm !== password) errs.confirm = 'Konfirmasi password tidak cocok'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    setError(null)
    if (!validate()) return
    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError('Gagal mengubah password: ' + error.message)
        setLoading(false)
        return
      }
      setSuccess(true)
      setTimeout(() => { window.location.href = '/login' }, 2000)
    } catch (err) {
      setError('Terjadi kesalahan jaringan. Periksa koneksi internet kamu.')
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">💧</div>
          <div className="login-title">DRAIN-EYE</div>
          <div className="login-sub">Atur Ulang Password</div>
        </div>

        {invalidLink && (
          <div className="login-error">
            ⚠️ Link reset password tidak valid atau sudah kedaluwarsa. Minta link baru lewat halaman login.
            <div className="login-note" style={{ marginTop: 10 }}>
              <a href="/login" className="link">← Kembali ke halaman masuk</a>
            </div>
          </div>
        )}

        {!ready && !invalidLink && (
          <div className="reset-loading">
            <div className="reset-spinner"></div>
            <div>Memverifikasi link...</div>
          </div>
        )}

        {ready && !success && (
          <div className="login-form">
            <div className="form-group">
              <label className="form-label">Password Baru <span className="required">*</span></label>
              <div className="password-wrap">
                <input
                  className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: null })) }}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  autoFocus
                />
                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? '🔒' : '👁️'}
                </button>
              </div>
              {fieldErrors.password && <div className="field-error-text">⚠️ {fieldErrors.password}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Konfirmasi Password Baru <span className="required">*</span></label>
              <input
                className={`form-input ${fieldErrors.confirm ? 'input-error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                placeholder="Ulangi password baru"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setFieldErrors(p => ({ ...p, confirm: null })) }}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              {fieldErrors.confirm && <div className="field-error-text">⚠️ {fieldErrors.confirm}</div>}
            </div>

            {error && <div className="login-error">⚠️ {error}</div>}

            <button className="btn-login" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <span className="btn-spinner-wrap"><span className="btn-spinner"></span> Menyimpan...</span>
              ) : '✅ Simpan Password Baru'}
            </button>
          </div>
        )}

        {success && (
          <div className="login-success">
            ✅ Password berhasil diubah! Mengarahkan ke halaman login...
          </div>
        )}
      </div>
    </div>
  )
}
