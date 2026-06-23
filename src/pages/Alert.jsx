import { useState, useEffect } from 'react'
import axios from 'axios'
import './Alert.css'

const API = 'https://drain-eye-production.up.railway.app'

const RISK_LABELS = {
  low:      { label: 'Aman',    color: '#1dd1a1', bg: 'rgba(29, 209, 161, 0.15)', icon: '🟢' },
  moderate: { label: 'Sedang',  color: '#feca57', bg: 'rgba(254, 202, 87, 0.15)', icon: '🟠' },
  high:     { label: 'Tinggi',  color: '#ff9f43', bg: 'rgba(255, 159, 67, 0.15)', icon: '🔴' },
  critical: { label: 'Kritis',  color: '#ff4d4d', bg: 'rgba(255, 77, 77, 0.15)',  icon: '🚨' },
}

const DUMMY_ALERTS = [
  {
    id: 'ALT001',
    kelurahan: 'Pluit',
    kecamatan: 'Penjaringan',
    risk_score: 91,
    risk_level: 'critical',
    message: 'Risiko banjir kritis — 3 titik drainase tersumbat parah terdeteksi',
    triggered_at: new Date(Date.now() - 25 * 60000).toISOString(),
    is_acknowledged: false,
    blockage_pct: 89.1
  },
  {
    id: 'ALT002',
    kelurahan: 'Koja',
    kecamatan: 'Koja',
    risk_score: 84,
    risk_level: 'critical',
    message: 'Drainase 84% tersumbat — 4 laporan warga masuk dalam 1 jam terakhir',
    triggered_at: new Date(Date.now() - 52 * 60000).toISOString(),
    is_acknowledged: false,
    blockage_pct: 84.3
  },
  {
    id: 'ALT003',
    kelurahan: 'Tambora',
    kecamatan: 'Tambora',
    risk_score: 72,
    risk_level: 'high',
    message: 'Prakiraan hujan lebat 48 jam ke depan — risiko banjir meningkat signifikan',
    triggered_at: new Date(Date.now() - 90 * 60000).toISOString(),
    is_acknowledged: false,
    blockage_pct: 65.7
  },
  {
    id: 'ALT004',
    kelurahan: 'Cilincing',
    kecamatan: 'Cilincing',
    risk_score: 65,
    risk_level: 'high',
    message: 'Sumbatan drainase pasar meningkat 30% dalam 6 jam terakhir',
    triggered_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    is_acknowledged: true,
    blockage_pct: 61.7
  },
  {
    id: 'ALT005',
    kelurahan: 'Palmerah',
    kecamatan: 'Palmerah',
    risk_score: 58,
    risk_level: 'high',
    message: 'Titik drainase baru terdeteksi tersumbat di Jl. Palmerah Selatan',
    triggered_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    is_acknowledged: true,
    blockage_pct: 57.3
  },
]

export default function Alert() {
  const [alerts, setAlerts]         = useState(DUMMY_ALERTS)
  const [riskData, setRiskData]     = useState([])
  const [filter, setFilter]         = useState('all')
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    axios.get(`${API}/api/risk/all`)
      .then(r => setRiskData(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const acknowledge = (id) => {
    setAlerts(prev => prev.map(a =>
      a.id === id ? { ...a, is_acknowledged: true } : a
    ))
  }

  const acknowledgeAll = () => {
    setAlerts(prev => prev.map(a => ({ ...a, is_acknowledged: true })))
  }

  const filtered = alerts.filter(a => {
    if (filter === 'unread') return !a.is_acknowledged
    if (filter === 'critical') return a.risk_level === 'critical'
    if (filter === 'high') return a.risk_level === 'high'
    return true
  })

  const unreadCount = alerts.filter(a => !a.is_acknowledged).length

  const fmtTime = (ts) => {
    const diff = Math.floor((Date.now() - new Date(ts)) / 60000)
    if (diff < 60) return `${diff} menit lalu`
    if (diff < 1440) return `${Math.floor(diff/60)} jam lalu`
    return `${Math.floor(diff/1440)} hari lalu`
  }

  return (
    <div className="dash-wrap">
      {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="topbar-left">
          <a href="/" className="btn-back-link">← Kembali</a>
          <span className="topbar-title" style={{ marginLeft: '10px' }}>🔔 Pusat Alert Wilayah</span>
        </div>
        <div className="topbar-right">
          <span className="topbar-time">📬 {unreadCount} Belum Dibaca</span>
        </div>
      </header>

      <div className="dash-body">
        {/* ── SIDEBAR ── */}
        <nav className="sidebar">
          <a href="/"        className="nav-item">📊 Dashboard</a>
          <a href="/upload"  className="nav-item">📷 Upload Foto</a>
          <a href="/history" className="nav-item">🕐 Riwayat</a>
          <div className="nav-item active">🔔 Alert <span className="nav-badge">{unreadCount}</span></div>
          <div className="nav-item">📈 Analitik</div>
          <div className="nav-item">📄 Laporan</div>
        </nav>

        {/* ── MAIN CONTENT ── */}
        <main className="main-content">
          
          {/* ── METRIC SUMMARY CARDS ── */}
          <div className="metrics-row">
            <div className="metric-card glass-card card-red">
              <div className="metric-val">{alerts.filter(a => a.risk_level === 'critical').length}</div>
              <div className="metric-lbl">Kritis</div>
              <div className="metric-tag">Butuh Tindakan</div>
            </div>
            <div className="metric-card glass-card card-amber">
              <div className="metric-val">{alerts.filter(a => a.risk_level === 'high').length}</div>
              <div className="metric-lbl">Risiko Tinggi</div>
              <div className="metric-tag">Pantauan Ketat</div>
            </div>
            <div className="metric-card glass-card card-cyan">
              <div className="metric-val">{unreadCount}</div>
              <div className="metric-lbl">Belum Dibaca</div>
              <div className="metric-tag">Log Masuk</div>
            </div>
            <div className="metric-card glass-card card-green">
              <div className="metric-val">{alerts.length}</div>
              <div className="metric-lbl">Total Alert</div>
              <div className="metric-tag">Sistem Drain-Eye</div>
            </div>
          </div>

          {/* ── REAL-TIME RISK SCORE FROM LSTM ── */}
          {!loading && riskData.length > 0 && (
            <div className="card glass-card" style={{ marginBottom: '20px' }}>
              <div className="card-title">📊 Risk Score Real-time per Kelurahan (Prediksi AI)</div>
              <div className="risk-grid-modern">
                {riskData.slice(0, 6).map((r, i) => (
                  <div key={i} className="risk-card-modern" style={{
                    borderColor: RISK_LABELS[r.risk_level]?.color
                  }}>
                    <div className="risk-name-modern">{r.kelurahan}</div>
                    <div className="risk-score-modern" style={{ color: RISK_LABELS[r.risk_level]?.color }}>
                      {r.risk_score}<span style={{ fontSize: '12px', color: '#94a3b8' }}>/100</span>
                    </div>
                    <div className="risk-badge-modern" style={{
                      background: RISK_LABELS[r.risk_level]?.bg,
                      color: RISK_LABELS[r.risk_level]?.color
                    }}>
                      {RISK_LABELS[r.risk_level]?.icon} {RISK_LABELS[r.risk_level]?.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── FILTER CONTROLS ── */}
          <div className="alert-controls-row">
            <div className="filter-buttons-group">
              {['all', 'unread', 'critical', 'high'].map(f => (
                <button
                  key={f}
                  className={`filter-tab-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all'      ? '📋 Semua'        :
                   f === 'unread'   ? `📬 Belum Dibaca (${unreadCount})` :
                   f === 'critical' ? '🚨 Kritis'    : '🔴 Tinggi'}
                </button>
              ))}
            </div>
            {unreadCount > 0 && (
              <button className="btn-upload" style={{ background: '#1dd1a1', border: 'none' }} onClick={acknowledgeAll}>
                ✅ Tandai Semua Dibaca
              </button>
            )}
          </div>

          {/* ── ALERT LIST CONTENT ── */}
          <div className="alert-list-container">
            {filtered.length === 0 && (
              <div className="card glass-card alert-empty-state">
                <span>✅ Semua aman! Tidak ada log peringatan yang sesuai filter.</span>
              </div>
            )}
            
            {filtered.map(a => (
              <div key={a.id} className={`alert-item-card glass-card ${a.is_acknowledged ? 'status-read' : 'status-unread'}`}>
                <div className="alert-item-main-header">
                  <div className="alert-item-title-area">
                    <span className="alert-avatar-icon">{RISK_LABELS[a.risk_level]?.icon}</span>
                    <div>
                      <h4>{a.kelurahan}, <span className="sub-kecamatan">Kec. {a.kecamatan}</span></h4>
                      <span className="alert-timestamp">⏱ {fmtTime(a.triggered_at)}</span>
                    </div>
                  </div>
                  <div>
                    <span className="risk-score-pill" style={{
                      background: RISK_LABELS[a.risk_level]?.bg,
                      color: RISK_LABELS[a.risk_level]?.color,
                      border: `1px solid ${RISK_LABELS[a.risk_level]?.color}`
                    }}>
                      Skor Risiko: {a.risk_score}/100
                    </span>
                  </div>
                </div>

                <p className="alert-message-text">{a.message}</p>

                <div className="alert-item-footer-action">
                  <span className="blockage-percentage-tag">
                    🪠 Rasio Sumbatan: <strong>{a.blockage_pct}%</strong>
                  </span>
                  
                  {!a.is_acknowledged ? (
                    <button className="btn-action-ack" onClick={() => acknowledge(a.id)}>
                      Tandai Telah Diperiksa ✓
                    </button>
                  ) : (
                    <span className="archived-check-label">Selesai Ditinjau</span>
                  )}
                </div>
              </div>
            ))}
          </div>

        </main>
      </div>
    </div>
  )
}