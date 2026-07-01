import { useState, useEffect } from 'react'
import axios from 'axios'
import { fetchWithRetry } from '../utils/apiClient'
import './Alert.css'
import Navbar from '../components/Navbar'

const API = 'https://drain-eye-production.up.railway.app'

const LEVEL_COLOR = {
  critical: { bg: '#FCEBEB', text: '#A32D2D', icon: '🔴' },
  high:     { bg: '#FAEEDA', text: '#633806', icon: '🟠' },
  moderate: { bg: '#FEFCE8', text: '#713F12', icon: '🟡' },
  low:      { bg: '#EAF3DE', text: '#27500A', icon: '🟢' },
}

function levelStyle(level) {
  return LEVEL_COLOR[level] || { bg: '#f1f5f9', text: '#64748b', icon: '🔔' }
}

function SkeletonRisk() {
  return <div className="risk-card skeleton-risk"></div>
}

function SkeletonAlert() {
  return (
    <div className="alert-item skeleton-alert">
      <div className="skel-line w40" style={{ height: 14 }}></div>
      <div className="skel-line w90" style={{ height: 12 }}></div>
      <div className="skel-line w30" style={{ height: 10 }}></div>
    </div>
  )
}

export default function Alert() {
  const [risk, setRisk]                 = useState([])
  const [alerts, setAlerts]             = useState([])
  const [loadingRisk, setLoadingRisk]   = useState(true)
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [riskError, setRiskError]       = useState(false)
  const [alertsError, setAlertsError]   = useState(false)
  const [riskRetryStatus, setRiskRetryStatus]     = useState(null)
  const [alertsRetryStatus, setAlertsRetryStatus] = useState(null)
  const [filter, setFilter]             = useState('all')
  const [acknowledged, setAcknowledged] = useState(new Set())

  const fetchRisk = () => {
    setLoadingRisk(true)
    setRiskError(false)
    setRiskRetryStatus(null)
    fetchWithRetry(`${API}/api/risk/all`, {
      onRetry: (a, m) => setRiskRetryStatus(`Menghubungkan ke server... (percobaan ${a}/${m})`)
    })
      .then(r => setRisk((r.data.data || []).slice(0, 6)))
      .catch(() => setRiskError(true))
      .finally(() => { setLoadingRisk(false); setRiskRetryStatus(null) })
  }

  const fetchAlerts = () => {
    setLoadingAlerts(true)
    setAlertsError(false)
    setAlertsRetryStatus(null)
    fetchWithRetry(`${API}/api/dashboard/summary`, {
      onRetry: (a, m) => setAlertsRetryStatus(`Menghubungkan ke server... (percobaan ${a}/${m})`)
    })
      .then(r => setAlerts(r.data.active_alerts || []))
      .catch(() => setAlertsError(true))
      .finally(() => { setLoadingAlerts(false); setAlertsRetryStatus(null) })
  }

  useEffect(() => {
    fetchRisk()
    fetchAlerts()
  }, [])

  const ack = (alertId) => {
    setAcknowledged(prev => new Set(prev).add(alertId))
  }

  const ackAll = () => {
    setAcknowledged(prev => {
      const next = new Set(prev)
      filteredAlerts.forEach(a => next.add(a.alert_id))
      return next
    })
  }

  const criticalCount = alerts.filter(a => a.risk_level === 'critical').length
  const highCount     = alerts.filter(a => a.risk_level === 'high').length
  const unreadCount   = alerts.filter(a => !acknowledged.has(a.alert_id)).length
  const totalCount    = alerts.length

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'critical') return a.risk_level === 'critical'
    if (filter === 'high')     return a.risk_level === 'high'
    if (filter === 'unread')   return !acknowledged.has(a.alert_id)
    return true
  })

  return (
    <div className="alert-wrap">
      <Navbar title="Alert" backHref="/" />

      <div className="alert-body">

        {/* SUMMARY */}
        <div className="alert-summary">
          <div className="ascard critical">
            <div className="ascard-val">{criticalCount}</div>
            <div className="ascard-lbl">Kritis</div>
          </div>
          <div className="ascard high">
            <div className="ascard-val">{highCount}</div>
            <div className="ascard-lbl">Tinggi</div>
          </div>
          <div className="ascard unread">
            <div className="ascard-val">{unreadCount}</div>
            <div className="ascard-lbl">Belum Dibaca</div>
          </div>
          <div className="ascard total">
            <div className="ascard-val">{totalCount}</div>
            <div className="ascard-lbl">Total Alert</div>
          </div>
        </div>

        {/* RISK SCORE SECTION */}
        <div className="risk-section">
          <div className="section-title">📊 Risk Score Tertinggi</div>

          {loadingRisk && riskRetryStatus && (
            <div className="retry-status-banner">🔄 {riskRetryStatus}</div>
          )}
          {loadingRisk && (
            <div className="risk-grid">
              <SkeletonRisk /><SkeletonRisk /><SkeletonRisk />
            </div>
          )}

          {!loadingRisk && riskError && (
            <div className="risk-error">
              <span>⚠️ Gagal memuat risk score.</span>
              <button onClick={fetchRisk} className="btn-retry-sm">🔄 Coba Lagi</button>
            </div>
          )}

          {!loadingRisk && !riskError && risk.length === 0 && (
            <div className="empty-state-sm">Belum ada data risk score.</div>
          )}

          {!loadingRisk && !riskError && risk.length > 0 && (
            <div className="risk-grid">
              {risk.map((r, i) => {
                const lv = levelStyle(r.risk_level)
                return (
                  <div key={i} className="risk-card">
                    <div className="risk-name">{r.kelurahan}</div>
                    <div className="risk-score" style={{ color: lv.text }}>{r.risk_score}</div>
                    <span className="risk-badge" style={{ background: lv.bg, color: lv.text }}>
                      {r.risk_level}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* CONTROLS */}
        <div className="alert-controls">
          <div className="filter-row">
            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Semua</button>
            <button className={`filter-btn ${filter === 'critical' ? 'active' : ''}`} onClick={() => setFilter('critical')}>Kritis</button>
            <button className={`filter-btn ${filter === 'high' ? 'active' : ''}`} onClick={() => setFilter('high')}>Tinggi</button>
            <button className={`filter-btn ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>Belum Dibaca</button>
          </div>
          {filteredAlerts.length > 0 && (
            <button className="btn-ack-all" onClick={ackAll}>✓ Tandai Semua Dibaca</button>
          )}
        </div>

        {/* ALERT LIST */}
        <div className="alert-list">
          {loadingAlerts && alertsRetryStatus && (
            <div className="retry-status-banner">🔄 {alertsRetryStatus}</div>
          )}
          {loadingAlerts && (
            <>
              <SkeletonAlert /><SkeletonAlert /><SkeletonAlert />
            </>
          )}

          {!loadingAlerts && alertsError && (
            <div className="risk-error">
              <span>⚠️ Gagal memuat data alert.</span>
              <button onClick={fetchAlerts} className="btn-retry-sm">🔄 Coba Lagi</button>
            </div>
          )}

          {!loadingAlerts && !alertsError && filteredAlerts.length === 0 && (
            <div className="alert-empty">✅ Tidak ada alert{filter !== 'all' ? ' pada filter ini' : ' aktif saat ini'}.</div>
          )}

          {!loadingAlerts && !alertsError && filteredAlerts.map(a => {
            const lv = levelStyle(a.risk_level)
            const isRead = acknowledged.has(a.alert_id)
            return (
              <div key={a.alert_id} className={`alert-item ${isRead ? 'read' : 'unread-item'}`}>
                <div className="alert-item-header">
                  <div className="alert-item-left">
                    <span className="alert-icon">{lv.icon}</span>
                    <div>
                      <div className="alert-item-title">
                        {a.kelurahan}
                        {!isRead && <span className="new-badge">BARU</span>}
                      </div>
                      <div className="alert-item-time">
                        {new Date(a.triggered_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  </div>
                  <span className="risk-score-badge" style={{ background: lv.bg, color: lv.text }}>
                    {a.risk_score}/100
                  </span>
                </div>

                <div className="alert-item-msg">{a.message}</div>

                <div className="alert-item-footer">
                  <span className="blockage-info">Level: {a.risk_level}</span>
                  {isRead ? (
                    <span className="ack-label">✓ Sudah ditandai</span>
                  ) : (
                    <button className="btn-ack" onClick={() => ack(a.alert_id)}>Tandai Dibaca</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
