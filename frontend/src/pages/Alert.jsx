import { useState, useEffect } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar'
import './Alert.css'

const API = 'https://drain-eye-production.up.railway.app'

const RISK_LABELS = {
  low:      { label: 'Rendah',  color: '#27500A', bg: '#EAF3DE', icon: '🟢' },
  moderate: { label: 'Sedang',  color: '#633806', bg: '#FAEEDA', icon: '🟠' },
  high:     { label: 'Tinggi',  color: '#A32D2D', bg: '#FCEBEB', icon: '🔴' },
  critical: { label: 'Kritis',  color: '#7B1D1D', bg: '#FEE2E2', icon: '🚨' },
}

const DUMMY_ALERTS = [
  {
    id: 'ALT001', kelurahan: 'Pluit', kecamatan: 'Penjaringan',
    risk_score: 91, risk_level: 'critical',
    message: 'Risiko banjir kritis — 3 titik drainase tersumbat parah terdeteksi',
    triggered_at: new Date(Date.now() - 25 * 60000).toISOString(),
    is_acknowledged: false, blockage_pct: 89.1
  },
  {
    id: 'ALT002', kelurahan: 'Koja', kecamatan: 'Koja',
    risk_score: 84, risk_level: 'critical',
    message: 'Drainase 84% tersumbat — 4 laporan warga masuk dalam 1 jam terakhir',
    triggered_at: new Date(Date.now() - 52 * 60000).toISOString(),
    is_acknowledged: false, blockage_pct: 84.3
  },
  {
    id: 'ALT003', kelurahan: 'Tambora', kecamatan: 'Tambora',
    risk_score: 72, risk_level: 'high',
    message: 'Prakiraan hujan lebat 48 jam ke depan — risiko banjir meningkat signifikan',
    triggered_at: new Date(Date.now() - 90 * 60000).toISOString(),
    is_acknowledged: false, blockage_pct: 65.7
  },
  {
    id: 'ALT004', kelurahan: 'Cilincing', kecamatan: 'Cilincing',
    risk_score: 65, risk_level: 'high',
    message: 'Sumbatan drainase pasar meningkat 30% dalam 6 jam terakhir',
    triggered_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    is_acknowledged: true, blockage_pct: 61.7
  },
  {
    id: 'ALT005', kelurahan: 'Palmerah', kecamatan: 'Palmerah',
    risk_score: 58, risk_level: 'high',
    message: 'Titik drainase baru terdeteksi tersumbat di Jl. Palmerah Selatan',
    triggered_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    is_acknowledged: true, blockage_pct: 57.3
  },
]

function SkeletonAlert() {
  return (
    <div className="alert-item skeleton-alert">
      <div className="skel-line w40" style={{ height: 16 }}></div>
      <div className="skel-line w90" style={{ height: 12 }}></div>
      <div className="skel-line w30" style={{ height: 10 }}></div>
    </div>
  )
}

export default function Alert() {
  const [alerts, setAlerts]         = useState(DUMMY_ALERTS)
  const [riskData, setRiskData]     = useState([])
  const [filter, setFilter]         = useState('all')
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState(false)

  useEffect(() => {
    fetchRisk()
  }, [])

  const fetchRisk = () => {
    setLoading(true)
    setLoadError(false)
    axios.get(`${API}/api/risk/all`)
      .then(r => setRiskData(r.data.data || []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

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
    <div className="alert-wrap">
      <Navbar title="Pusat Alert" backHref="/" />

      <div className="alert-body">

        <div className="alert-summary">
          <div className="ascard critical">
            <div className="ascard-val">{alerts.filter(a => a.risk_level === 'critical').length}</div>
            <div className="ascard-lbl">🚨 Kritis</div>
          </div>
          <div className="ascard high">
            <div className="ascard-val">{alerts.filter(a => a.risk_level === 'high').length}</div>
            <div className="ascard-lbl">🔴 Tinggi</div>
          </div>
          <div className="ascard unread">
            <div className="ascard-val">{unreadCount}</div>
            <div className="ascard-lbl">📬 Belum Dibaca</div>
          </div>
          <div className="ascard total">
            <div className="ascard-val">{alerts.length}</div>
            <div className="ascard-lbl">📋 Total Alert</div>
          </div>
        </div>

        {/* RISK SCORE DARI LSTM */}
        <div className="risk-section">
          <div className="section-title">📊 Risk Score Real-time per Kelurahan</div>

          {loading && (
            <div className="risk-grid">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="risk-card skeleton-risk"></div>
              ))}
            </div>
          )}

          {!loading && loadError && (
            <div className="risk-error">
              <span>⚠️ Gagal memuat data risk score dari server.</span>
              <button className="btn-retry-sm" onClick={fetchRisk}>🔄 Coba Lagi</button>
            </div>
          )}

          {!loading && !loadError && riskData.length === 0 && (
            <div className="empty-state-sm">Belum ada data risk score tersedia.</div>
          )}

          {!loading && !loadError && riskData.length > 0 && (
            <div className="risk-grid">
              {riskData.slice(0, 6).map((r, i) => (
                <div key={i} className="risk-card" style={{
                  borderLeft: `4px solid ${RISK_LABELS[r.risk_level]?.color}`
                }}>
                  <div className="risk-name">{r.kelurahan}</div>
                  <div className="risk-score" style={{ color: RISK_LABELS[r.risk_level]?.color }}>
                    {r.risk_score}
                  </div>
                  <div className="risk-badge" style={{
                    background: RISK_LABELS[r.risk_level]?.bg,
                    color: RISK_LABELS[r.risk_level]?.color
                  }}>
                    {RISK_LABELS[r.risk_level]?.icon} {RISK_LABELS[r.risk_level]?.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FILTER & ACTIONS */}
        <div className="alert-controls">
          <div className="filter-row">
            {['all', 'unread', 'critical', 'high'].map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all'      ? 'Semua'        :
                 f === 'unread'   ? `📬 Belum Dibaca (${unreadCount})` :
                 f === 'critical' ? '🚨 Kritis'    : '🔴 Tinggi'}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button className="btn-ack-all" onClick={acknowledgeAll}>
              ✅ Tandai Semua Dibaca
            </button>
          )}
        </div>

        {/* ALERT LIST */}
        <div className="alert-list">
          {filtered.length === 0 && (
            <div className="alert-empty">✅ Tidak ada alert yang sesuai filter</div>
          )}
          {filtered.map(a => (
            <div key={a.id} className={`alert-item ${a.is_acknowledged ? 'read' : 'unread-item'}`}>
              <div className="alert-item-header">
                <div className="alert-item-left">
                  <span className="alert-icon">{RISK_LABELS[a.risk_level]?.icon}</span>
                  <div>
                    <div className="alert-item-title">
                      {a.kelurahan}, {a.kecamatan}
                      {!a.is_acknowledged && <span className="new-badge">BARU</span>}
                    </div>
                    <div className="alert-item-time">{fmtTime(a.triggered_at)}</div>
                  </div>
                </div>
                <div className="alert-item-right">
                  <span className="risk-score-badge" style={{
                    background: RISK_LABELS[a.risk_level]?.bg,
                    color: RISK_LABELS[a.risk_level]?.color
                  }}>
                    Skor {a.risk_score}/100
                  </span>
                </div>
              </div>
              <div className="alert-item-msg">{a.message}</div>
              <div className="alert-item-footer">
                <span className="blockage-info">⛽ Sumbatan: {a.blockage_pct}%</span>
                {!a.is_acknowledged && (
                  <button className="btn-ack" onClick={() => acknowledge(a.id)}>
                    ✅ Tandai Dibaca
                  </button>
                )}
                {a.is_acknowledged && (
                  <span className="ack-label">✅ Sudah dibaca</span>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
