import { useState, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../AuthContext'
import Navbar from '../components/Navbar'
import './UploadPWA.css'

const API = 'https://drain-eye-production.up.railway.app'

const SEVERITY_LABELS = {
  clear:             { label: 'Bersih',          color: '#27500A', bg: '#EAF3DE', icon: '✅' },
  partial:           { label: 'Sebagian',         color: '#633806', bg: '#FAEEDA', icon: '⚠️' },
  blocked:           { label: 'Tersumbat',        color: '#A32D2D', bg: '#FCEBEB', icon: '🔴' },
  severely_blocked:  { label: 'Sangat Tersumbat', color: '#7B1D1D', bg: '#FEE2E2', icon: '🚨' },
}

const RISK_LABELS = {
  low:      { label: 'Rendah',  color: '#27500A', bg: '#EAF3DE' },
  moderate: { label: 'Sedang',  color: '#633806', bg: '#FAEEDA' },
  high:     { label: 'Tinggi',  color: '#A32D2D', bg: '#FCEBEB' },
  critical: { label: 'Kritis',  color: '#7B1D1D', bg: '#FEE2E2' },
}

const LOADING_STEPS = [
  'Mengunggah foto...',
  'AI menganalisis gambar...',
  'Menghitung tingkat sumbatan...',
  'Menyimpan laporan...'
]

export default function UploadPWA() {
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  const [file, setFile]             = useState(null)
  const [preview, setPreview]       = useState(null)
  const [kelurahan, setKelurahan]   = useState('')
  const [kecamatan, setKecamatan]   = useState('')
  const [note, setNote]             = useState('')
  const [loading, setLoading]       = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [result, setResult]         = useState(null)
  const [error, setError]           = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [dragActive, setDragActive] = useState(false)

  const validateFile = (f) => {
    if (!f) return 'Pilih foto terlebih dahulu.'
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(f.type)) {
      return 'Format file harus JPG atau PNG.'
    }
    if (f.size > 5 * 1024 * 1024) {
      return 'Ukuran file maksimal 5MB. File kamu ' + (f.size / 1024 / 1024).toFixed(1) + 'MB.'
    }
    return null
  }

  const processFile = (f) => {
    const err = validateFile(f)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
  }

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (f) processFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragActive(false)
  }

  const validateForm = () => {
    const errs = {}
    if (!file) errs.file = 'Foto wajib diupload'
    if (!kelurahan.trim()) errs.kelurahan = 'Kelurahan wajib diisi'
    if (!kecamatan.trim()) errs.kecamatan = 'Kecamatan wajib diisi'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    setError(null)
    if (!validateForm()) {
      setError('Mohon lengkapi semua field yang wajib diisi (bertanda *).')
      return
    }

    setLoading(true)
    setLoadingStep(0)

    // animasi step loading
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev))
    }, 900)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('latitude', -6.2088)
    formData.append('longitude', 106.8456)
    formData.append('kelurahan', kelurahan.trim())
    formData.append('kecamatan', kecamatan.trim())
    if (note) formData.append('reporter_note', note.trim())
    formData.append('user_id', user?.id || '')
    formData.append('user_email', user?.email || '')

    try {
      const res = await axios.post(`${API}/api/detection/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      })
      setResult(res.data)
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('Koneksi timeout. Periksa internet kamu dan coba lagi.')
      } else if (err.response) {
        setError(err.response.data?.detail || 'Server menolak permintaan. Coba lagi.')
      } else if (err.request) {
        setError('Tidak bisa terhubung ke server. Periksa koneksi internet kamu.')
      } else {
        setError('Terjadi kesalahan tak terduga. Coba lagi.')
      }
    } finally {
      clearInterval(stepInterval)
      setLoading(false)
      setLoadingStep(0)
    }
  }

  const handleReset = () => {
    setFile(null)
    setPreview(null)
    setKelurahan('')
    setKecamatan('')
    setNote('')
    setResult(null)
    setError(null)
    setFieldErrors({})
  }

  const removePhoto = (e) => {
    e.stopPropagation()
    setFile(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="pwa-wrap">
      <Navbar title="Upload Foto Drainase" backHref="/history" />

      <div className="pwa-body">
        <h2 className="pwa-heading">Laporkan Drainase Tersumbat</h2>
        <p className="pwa-sub">Foto drainase di sekitar kamu dan bantu DKI Jakarta cegah banjir</p>

        {/* LOADING STATE */}
        {loading && (
          <div className="loading-card">
            <div className="loading-spinner"></div>
            <div className="loading-text">{LOADING_STEPS[loadingStep]}</div>
            <div className="loading-progress">
              <div
                className="loading-progress-fill"
                style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* RESULT */}
        {!loading && result && (
          <div className="result-card">
            <div className="result-icon">✅</div>
            <div className="result-title">Laporan Berhasil Dikirim!</div>
            <div className="result-msg">{result.message}</div>
            <div className="result-badges">
              {result.severity_class && (
                <span className="result-badge" style={{
                  background: SEVERITY_LABELS[result.severity_class]?.bg,
                  color: SEVERITY_LABELS[result.severity_class]?.color
                }}>
                  {SEVERITY_LABELS[result.severity_class]?.icon} {SEVERITY_LABELS[result.severity_class]?.label}
                </span>
              )}
              {result.risk_level && (
                <span className="result-badge" style={{
                  background: RISK_LABELS[result.risk_level]?.bg,
                  color: RISK_LABELS[result.risk_level]?.color
                }}>
                  Risiko: {RISK_LABELS[result.risk_level]?.label}
                </span>
              )}
              {result.blockage_percentage !== undefined && result.blockage_percentage !== null && (
                <span className="result-badge" style={{ background: '#f1f5f9', color: '#1F4E79' }}>
                  {result.blockage_percentage}% tersumbat
                </span>
              )}
            </div>
            <p className="result-note">Petugas DLH sudah diberitahu. Terima kasih telah membantu! 🙏</p>
            <div className="result-actions">
              <button className="btn-reset" onClick={handleReset}>📷 Kirim Laporan Lain</button>
              <a href="/history" className="btn-view-history">📋 Lihat Riwayat</a>
            </div>
          </div>
        )}

        {/* FORM */}
        {!loading && !result && (
          <>
            <label
              className={`upload-zone ${dragActive ? 'drag-active' : ''} ${fieldErrors.file ? 'field-error' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {preview ? (
                <div className="upload-preview-wrap">
                  <img src={preview} alt="preview" className="upload-preview" />
                  <button className="btn-remove-photo" onClick={removePhoto} type="button">✕ Ganti Foto</button>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon">📸</div>
                  <div className="upload-label">Ketuk untuk ambil foto</div>
                  <div className="upload-sub">atau seret foto ke sini • JPG/PNG maks 5MB</div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
            {fieldErrors.file && <div className="field-error-text">⚠️ {fieldErrors.file}</div>}

            <div className="form-group">
              <label className="form-label">Kelurahan <span className="required">*</span></label>
              <input
                className={`form-input ${fieldErrors.kelurahan ? 'input-error' : ''}`}
                placeholder="Contoh: Pluit"
                value={kelurahan}
                onChange={e => { setKelurahan(e.target.value); setFieldErrors(p => ({ ...p, kelurahan: null })) }}
              />
              {fieldErrors.kelurahan && <div className="field-error-text">⚠️ {fieldErrors.kelurahan}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Kecamatan <span className="required">*</span></label>
              <input
                className={`form-input ${fieldErrors.kecamatan ? 'input-error' : ''}`}
                placeholder="Contoh: Penjaringan"
                value={kecamatan}
                onChange={e => { setKecamatan(e.target.value); setFieldErrors(p => ({ ...p, kecamatan: null })) }}
              />
              {fieldErrors.kecamatan && <div className="field-error-text">⚠️ {fieldErrors.kecamatan}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Keterangan <span className="optional">(opsional)</span></label>
              <textarea
                className="form-input form-textarea"
                placeholder="Contoh: drainase di depan pasar, sudah 3 hari tidak mengalir..."
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={200}
              />
              <div className="char-counter">{note.length}/200</div>
            </div>

            {error && (
              <div className="error-box">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button className="btn-submit" onClick={handleSubmit}>
              🚀 Kirim Laporan
            </button>
          </>
        )}
      </div>
    </div>
  )
}
