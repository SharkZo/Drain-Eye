import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { fetchWithRetry } from '../utils/apiClient'
import './Laporan.css'

const API = 'https://drain-eye-production.up.railway.app'

const RISK_LABELS = {
  low:      { label: 'Rendah',  color: '#27500A', bg: '#EAF3DE' },
  moderate: { label: 'Sedang',  color: '#633806', bg: '#FAEEDA' },
  high:     { label: 'Tinggi',  color: '#A32D2D', bg: '#FCEBEB' },
  critical: { label: 'Kritis',  color: '#7B1D1D', bg: '#FEE2E2' },
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

function todayWIBString() {
  const now = new Date(Date.now() + WIB_OFFSET_MS)
  return now.toISOString().slice(0, 10) // YYYY-MM-DD
}

function isToday(timestamp) {
  if (!timestamp) return false
  const t = new Date(new Date(timestamp).getTime() + WIB_OFFSET_MS)
  return t.toISOString().slice(0, 10) === todayWIBString()
}

export default function Laporan() {
  const [history, setHistory]       = useState([])
  const [riskData, setRiskData]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState(null)
  const [retryStatus, setRetryStatus] = useState(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setLoadError(null)
    setRetryStatus(null)
    const onRetry = (a, m) => setRetryStatus(`Menghubungkan ke server... (percobaan ${a}/${m})`)
    try {
      const [h, r] = await Promise.all([
        fetchWithRetry(`${API}/api/detection/history`, { onRetry }),
        fetchWithRetry(`${API}/api/risk/all`, { onRetry })
      ])
      // Hanya ambil laporan yang masuk HARI INI (WIB) — sesuai judul "Laporan Harian"
      const todayOnly = (h.data.data || []).filter(item => isToday(item.timestamp))
      setHistory(todayOnly)
      setRiskData(r.data.data || [])
    } catch (err) {
      setLoadError('Gagal memuat data laporan. Periksa koneksi internet kamu.')
    } finally {
      setLoading(false)
      setRetryStatus(null)
    }
  }

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  const generatedAt = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  const stats = {
    total:    history.length,
    critical: history.filter(h => h.risk_level === 'critical').length,
    high:     history.filter(h => h.risk_level === 'high').length,
    handled:  history.filter(h => h.status === 'handled').length,
    pending:  history.filter(h => h.status === 'pending').length,
    avgBlockage: history.length > 0
      ? (history.reduce((a, b) => a + b.blockage_percentage, 0) / history.length).toFixed(1)
      : 0
  }

  const handleGenerate = () => {
    setGenerating(true)
    setTimeout(() => {
      setGenerating(false)
      window.print()
    }, 1000)
  }

  return (
    <div className="lap-wrap">
      <Navbar title="Laporan Harian" backHref="/" />

      <div className="lap-toolbar no-print">
        <div className="lap-toolbar-info">
          {!loading && !loadError && (
            <span>📊 Laporan dibuat {generatedAt} WIB • {stats.total} data laporan hari ini</span>
          )}
        </div>
        <button
          className={`btn-generate ${generating ? 'loading' : ''}`}
          onClick={handleGenerate}
          disabled={generating || loading || !!loadError}
        >
          {generating ? (
            <span className="btn-spinner-wrap"><span className="btn-spinner-sm"></span> Menyiapkan...</span>
          ) : '🖨️ Cetak / Export PDF'}
        </button>
      </div>

      <div className="lap-body" id="laporan-print">

        {/* LOADING STATE */}
        {loading && (
          <div className="lap-state-card">
            <div className="lap-spinner"></div>
            <div>{retryStatus || 'Memuat data laporan...'}</div>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && loadError && (
          <div className="lap-state-card error">
            <div style={{ fontSize: 32 }}>⚠️</div>
            <div>{loadError}</div>
            <button className="btn-retry" onClick={fetchData}>🔄 Coba Lagi</button>
          </div>
        )}

        {!loading && !loadError && (
          <>
            {/* HEADER LAPORAN */}
            <div className="lap-header-doc">
              <div className="lap-logo">💧</div>
              <div>
                <div className="lap-doc-title">LAPORAN HARIAN DRAIN-EYE</div>
                <div className="lap-doc-subtitle">Sistem Deteksi Sumbatan Drainase & Skoring Risiko Banjir</div>
                <div className="lap-doc-sub2">Dinas Lingkungan Hidup DKI Jakarta</div>
              </div>
              <div className="lap-date-box">
                <div className="lap-date-label">Tanggal Laporan</div>
                <div className="lap-date-val">{today}</div>
                <div className="lap-date-label" style={{ marginTop: 6 }}>Digenerate pukul</div>
                <div className="lap-date-val">{generatedAt} WIB</div>
              </div>
            </div>

            {/* RINGKASAN EKSEKUTIF */}
            <div className="lap-section">
              <div className="lap-section-title">📊 Ringkasan Eksekutif</div>
              {stats.total === 0 ? (
                <div className="lap-empty">Belum ada data laporan untuk ditampilkan hari ini.</div>
              ) : (
                <div className="lap-stats-grid">
                  <div className="lap-stat">
                    <div className="lap-stat-val red">{stats.total}</div>
                    <div className="lap-stat-lbl">Total Laporan</div>
                  </div>
                  <div className="lap-stat">
                    <div className="lap-stat-val red">{stats.critical}</div>
                    <div className="lap-stat-lbl">Risiko Kritis</div>
                  </div>
                  <div className="lap-stat">
                    <div className="lap-stat-val amber">{stats.high}</div>
                    <div className="lap-stat-lbl">Risiko Tinggi</div>
                  </div>
                  <div className="lap-stat">
                    <div className="lap-stat-val green">{stats.handled}</div>
                    <div className="lap-stat-lbl">Sudah Ditangani</div>
                  </div>
                  <div className="lap-stat">
                    <div className="lap-stat-val amber">{stats.pending}</div>
                    <div className="lap-stat-lbl">Menunggu</div>
                  </div>
                  <div className="lap-stat">
                    <div className="lap-stat-val blue">{stats.avgBlockage}%</div>
                    <div className="lap-stat-lbl">Rata-rata Sumbatan</div>
                  </div>
                </div>
              )}
            </div>

            {/* RISK SCORE KELURAHAN */}
            <div className="lap-section">
              <div className="lap-section-title">🗺️ Risk Score per Kelurahan (Real-time)</div>
              {riskData.length === 0 ? (
                <div className="lap-empty">Data risk score belum tersedia.</div>
              ) : (
                <table className="lap-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Kelurahan</th>
                      <th>Risk Score</th>
                      <th>Level Risiko</th>
                      <th>Rekomendasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskData.map((r, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{r.kelurahan}</td>
                        <td><strong>{r.risk_score}/100</strong></td>
                        <td>
                          <span className="risk-pill" style={{
                            background: RISK_LABELS[r.risk_level]?.bg,
                            color: RISK_LABELS[r.risk_level]?.color
                          }}>
                            {RISK_LABELS[r.risk_level]?.label}
                          </span>
                        </td>
                        <td className="rec-cell">
                          {r.risk_level === 'critical' ? '🚨 Pengerahan segera' :
                           r.risk_level === 'high'     ? '🔴 Prioritas tinggi'  :
                           r.risk_level === 'moderate' ? '🟠 Monitor aktif'     :
                                                         '🟢 Pantau rutin'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* RIWAYAT DETEKSI */}
            <div className="lap-section">
              <div className="lap-section-title">📋 Riwayat Deteksi Hari Ini</div>
              {history.length === 0 ? (
                <div className="lap-empty">Belum ada laporan warga masuk hari ini.</div>
              ) : (
                <>
                  <table className="lap-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Kelurahan</th>
                        <th>Sumbatan</th>
                        <th>Level</th>
                        <th>Status</th>
                        <th>Waktu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 10).map((h, i) => (
                        <tr key={i}>
                          <td>#{h.id}</td>
                          <td>{h.kelurahan}, {h.kecamatan}</td>
                          <td>{h.blockage_percentage}%</td>
                          <td>
                            <span className="risk-pill" style={{
                              background: RISK_LABELS[h.risk_level]?.bg,
                              color: RISK_LABELS[h.risk_level]?.color
                            }}>
                              {RISK_LABELS[h.risk_level]?.label}
                            </span>
                          </td>
                          <td>{h.status === 'handled' ? '✅ Ditangani' : '⏳ Pending'}</td>
                          <td>{new Date(h.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {history.length > 10 && (
                    <div className="lap-note">* Menampilkan 10 dari {history.length} laporan hari ini. Cetak untuk melihat semua data.</div>
                  )}
                </>
              )}
            </div>

            {/* FOOTER */}
            <div className="lap-footer">
              <div>Digenerate oleh sistem DRAIN-EYE — AI-powered Drainage Monitoring System</div>
              <div>© 2026 Dinas Lingkungan Hidup DKI Jakarta | drain-eye-tbnt.vercel.app</div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
