import { useState } from 'react'
import axios from 'axios'
import './UploadPWA.css'

const API = 'https://drain-eye-production.up.railway.app'

const SEVERITY_LABELS = {
  clear:             { label: 'Bersih',          color: '#27500A', bg: '#EAF3DE' },
  partial:           { label: 'Sebagian',         color: '#633806', bg: '#FAEEDA' },
  blocked:           { label: 'Tersumbat',        color: '#A32D2D', bg: '#FCEBEB' },
  severely_blocked:  { label: 'Sangat Tersumbat', color: '#7B1D1D', bg: '#FEE2E2' },
}

const RISK_LABELS = {
  low:      { label: 'Rendah',  color: '#27500A', bg: '#EAF3DE' },
  moderate: { label: 'Sedang',  color: '#633806', bg: '#FAEEDA' },
  high:     { label: 'Tinggi',  color: '#A32D2D', bg: '#FCEBEB' },
  critical: { label: 'Kritis',  color: '#7B1D1D', bg: '#FEE2E2' },
}

export default function UploadPWA() {
  const [file, setFile]             = useState(null)
  const [preview, setPreview]       = useState(null)
  const [kelurahan, setKelurahan]   = useState('')
  const [kecamatan, setKecamatan]   = useState('')
  const [note, setNote]             = useState('')
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState(null)
  const [error, setError]           = useState(null)

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
    setError(null)
  }

  const handleSubmit = async () => {
    if (!file || !kelurahan || !kecamatan) {
      setError('Lengkapi foto, kelurahan, dan kecamatan terlebih dahulu.')
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('latitude', -6.2088)
    formData.append('longitude', 106.8456)
    formData.append('kelurahan', kelurahan)
    formData.append('kecamatan', kecamatan)
    if (note) formData.append('reporter_note', note)

    try {
      const res = await axios.post(`${API}/api/detection/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal menghubungi server. Pastikan backend berjalan.')
    } finally {
      setLoading(false)
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
  }

  return (
    <div className="pwa-wrap">

      {/* TOPBAR */}
      <header className="pwa-topbar">
        <a href="/" className="pwa-back">← Kembali</a>
        <span className="pwa-title">💧 DRAIN-EYE</span>
        <span />
      </header>

      <div className="pwa-body">
        <h2 className="pwa-heading">Laporkan Drainase Tersumbat</h2>
        <p className="pwa-sub">Foto drainase di sekitar kamu dan bantu DKI Jakarta cegah banjir</p>

        {/* HASIL DETEKSI */}
        {result && (
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
                  Sumbatan: {SEVERITY_LABELS[result.severity_class]?.label}
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
            <p className="result-note">Petugas DLH sudah diberitahu. Terima kasih telah membantu!</p>
            <button className="btn-reset" onClick={handleReset}>Kirim Laporan Lain</button>
          </div>
        )}

        {/* FORM UPLOAD */}
        {!result && (
          <>
            {/* UPLOAD ZONE */}
            <label className="upload-zone">
              {preview ? (
                <img src={preview} alt="preview" className="upload-preview" />
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon">📸</div>
                  <div className="upload-label">Ketuk untuk ambil foto</div>
                  <div className="upload-sub">atau pilih dari galeri • JPG/PNG maks 5MB</div>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>

            {/* FORM FIELDS */}
            <div className="form-group">
              <label className="form-label">Kelurahan *</label>
              <input
                className="form-input"
                placeholder="Contoh: Pluit"
                value={kelurahan}
                onChange={e => setKelurahan(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kecamatan *</label>
              <input
                className="form-input"
                placeholder="Contoh: Penjaringan"
                value={kecamatan}
                onChange={e => setKecamatan(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Keterangan (opsional)</label>
              <textarea
                className="form-input form-textarea"
                placeholder="Contoh: drainase di depan pasar, sudah 3 hari tidak mengalir..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            {/* ERROR */}
            {error && (
              <div className="error-box">⚠️ {error}</div>
            )}

            {/* SUBMIT */}
            <button
              className={`btn-submit ${loading ? 'loading' : ''}`}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? '⏳ Memproses AI...' : '🚀 Kirim Laporan'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
