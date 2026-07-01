import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Navbar from '../components/Navbar'
import { fetchWithRetry } from '../utils/apiClient'
import './Peta.css'

const API = 'https://drain-eye-production.up.railway.app'
const JAKARTA_CENTER = [-6.2088, 106.8456]

const LEVEL_COLOR = {
  critical: '#E24B4A',
  high:     '#EF9F27',
  moderate: '#F5C842',
  low:      '#3B6D11',
}

const SEVERITY_COLOR = {
  clear:            '#3B6D11',
  partial:          '#F5C842',
  blocked:          '#EF9F27',
  severely_blocked: '#E24B4A',
}

const FILTERS = ['all', 'critical', 'high', 'moderate', 'low']

export default function Peta() {
  const [detections, setDetections]   = useState([])
  const [risk, setRisk]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(false)
  const [retryStatus, setRetryStatus] = useState(null)
  const [filter, setFilter]           = useState('all')

  const fetchData = () => {
    setLoading(true)
    setError(false)
    setRetryStatus(null)
    const onRetry = (a, m) => setRetryStatus(`Menghubungkan ke server... (percobaan ${a}/${m})`)

    Promise.all([
      fetchWithRetry(`${API}/api/detection/history`, { onRetry }),
      fetchWithRetry(`${API}/api/risk/all`, { onRetry }),
    ])
      .then(([h, r]) => {
        setDetections(h.data.data || [])
        setRisk(r.data.data || [])
      })
      .catch(() => setError(true))
      .finally(() => { setLoading(false); setRetryStatus(null) })
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = detections.filter(d =>
    filter === 'all' ? true : d.risk_level === filter
  )

  return (
    <div className="peta-wrap">
      <Navbar title="Peta Risiko Drainase" backHref="/" />

      <div className="peta-body">

        <div className="peta-controls">
          <div className="filter-row">
            {FILTERS.map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Semua' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="peta-legend">
            {Object.entries(SEVERITY_COLOR).map(([k, v]) => (
              <span key={k} className="legend-chip">
                <span className="legend-dot" style={{ background: v }} />
                {k.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        {loading && (
          <div className="peta-state-card">
            <div className="peta-spinner"></div>
            <div>{retryStatus || 'Memuat data peta...'}</div>
          </div>
        )}

        {!loading && error && (
          <div className="peta-state-card error">
            <div style={{ fontSize: 28 }}>⚠️</div>
            <div>Gagal memuat data peta. Periksa koneksi internet kamu.</div>
            <button className="btn-retry" onClick={fetchData}>🔄 Coba Lagi</button>
          </div>
        )}

        {!loading && !error && (
          <div className="map-card">
            <MapContainer
              center={JAKARTA_CENTER}
              zoom={11}
              scrollWheelZoom={true}
              style={{ height: '520px', width: '100%', borderRadius: '10px' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filtered.map((d, i) => (
                d.latitude != null && d.longitude != null && (
                  <CircleMarker
                    key={d.id || i}
                    center={[d.latitude, d.longitude]}
                    radius={9}
                    pathOptions={{
                      color: SEVERITY_COLOR[d.severity_class] || '#64748b',
                      fillColor: SEVERITY_COLOR[d.severity_class] || '#64748b',
                      fillOpacity: 0.75,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <strong>{d.kelurahan}, {d.kecamatan}</strong><br />
                      Sumbatan: {d.blockage_percentage}%<br />
                      Level risiko: {d.risk_level}<br />
                      Status: {d.status === 'handled' ? 'Ditangani' : 'Pending'}<br />
                      {d.timestamp && new Date(d.timestamp).toLocaleString('id-ID')}
                    </Popup>
                  </CircleMarker>
                )
              ))}
            </MapContainer>

            {filtered.length === 0 && (
              <div className="peta-empty-overlay">Tidak ada titik laporan untuk filter ini.</div>
            )}
          </div>
        )}

        <div className="risk-summary-card">
          <div className="section-title">📊 Risk Score per Kelurahan</div>
          {risk.length === 0 ? (
            <div className="empty-state-sm">Data risk score belum tersedia.</div>
          ) : (
            <div className="risk-chip-grid">
              {risk.map((r, i) => (
                <div
                  key={i}
                  className="risk-chip"
                  style={{ borderLeft: `4px solid ${LEVEL_COLOR[r.risk_level] || '#64748b'}` }}
                >
                  <div className="risk-chip-name">{r.kelurahan}</div>
                  <div className="risk-chip-score" style={{ color: LEVEL_COLOR[r.risk_level] || '#64748b' }}>
                    {r.risk_score}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
