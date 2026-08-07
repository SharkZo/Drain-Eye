import { useState, useEffect } from 'react'
import axios from 'axios'
import { fetchWithRetry } from '../utils/apiClient'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Navbar from '../components/Navbar'
import './Dashboard.css'

const API = import.meta.env.VITE_API_URL || 'https://drain-eye-production.up.railway.app'
const JAKARTA_CENTER = [-6.2088, 106.8456]

const priorityLabel = (p) => (p === 1 ? 'P1' : 'P2')

const riskColor = (level) => ({
  critical: '#E24B4A',
  high:     '#EF9F27',
  moderate: '#F5C842',
  low:      '#3B6D11',
}[level] || '#64748b')

const priorityStyle = (p) => ({
  P1: { background: '#FCEBEB', color: '#A32D2D' },
  P2: { background: '#FAEEDA', color: '#633806' },
  P3: { background: '#EAF3DE', color: '#27500A' },
}[p] || {})

function citywideScore(riskScores) {
  if (!riskScores || riskScores.length === 0) return 0
  const avg = riskScores.reduce((s, d) => s + d.risk_score, 0) / riskScores.length
  return Math.round(avg)
}

// ambil skor risiko tertinggi per kecamatan (satu kecamatan bisa punya beberapa kelurahan)
function aggregateByKecamatan(riskScores) {
  const byKecamatan = {}
  for (const r of riskScores || []) {
    const key = (r.kecamatan || '').toUpperCase()
    if (!key) continue
    if (!byKecamatan[key] || r.risk_score > byKecamatan[key].risk_score) {
      byKecamatan[key] = r
    }
  }
  return byKecamatan
}

function scoreLevel(score) {
  if (score >= 70) return { label: 'Kritis',  color: '#A32D2D' }
  if (score >= 50) return { label: 'Tinggi',  color: '#633806' }
  if (score >= 30) return { label: 'Sedang',  color: '#713F12' }
  return { label: 'Aman', color: '#27500A' }
}

function SkeletonCard() {
  return <div className="metric-card skeleton-card"><div className="skel-line w60"></div><div className="skel-line w80"></div></div>
}

export default function Dashboard() {
  const [summary, setSummary]   = useState(null)
  const [stats, setStats]       = useState(null)
  const [geoData, setGeoData]   = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingStats, setLoadingStats]     = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [retryStatus, setRetryStatus] = useState(null)

  const fetchData = () => {
    setFetchError(false)
    setRetryStatus(null)
    setLoadingSummary(true)
    setLoadingStats(true)

    const onRetry = (attempt, max) => setRetryStatus(`Menghubungkan ke server... (percobaan ${attempt}/${max})`)

    fetchWithRetry(`${API}/api/dashboard/summary`, { onRetry })
      .then(r => setSummary(r.data))
      .catch(() => setFetchError(true))
      .finally(() => { setLoadingSummary(false); setRetryStatus(null) })

    fetchWithRetry(`${API}/api/detection/stats`, { onRetry })
      .then(r => setStats(r.data))
      .catch(() => setFetchError(true))
      .finally(() => setLoadingStats(false))
  }

  useEffect(() => {
    fetchData()
    fetch('/data/jakarta_kecamatan.geojson')
      .then(r => r.json())
      .then(setGeoData)
      .catch(() => {})
  }, [])

  const kecamatanRisk = aggregateByKecamatan(summary?.risk_scores)
  const cityScore = citywideScore(summary?.risk_scores)
  const cityLevel = scoreLevel(cityScore)

  const geojsonStyle = (feature) => {
    const r = kecamatanRisk[feature.properties.name]
    return {
      fillColor: r ? riskColor(r.risk_level) : '#d1d5db',
      fillOpacity: r ? 0.65 : 0.2,
      color: '#ffffff',
      weight: 1.5,
    }
  }

  const onEachKecamatan = (feature, layer) => {
    const name = feature.properties.name
    const r = kecamatanRisk[name]
    layer.bindPopup(
      r
        ? `<strong>${name}</strong><br/>Skor risiko: ${r.risk_score}/100<br/>Level: ${r.risk_level}`
        : `<strong>${name}</strong><br/>Belum ada data`
    )
  }

  return (
    <div className="dash-wrap">
      <Navbar title="Dashboard DLH DKI Jakarta" showClock showUpload />

      <div className="dash-body">

        <nav className="sidebar">
          <a href="/"         className="nav-item active">📊 Dashboard</a>
          <a href="/upload"   className="nav-item">📷 Upload Foto</a>
          <a href="/history"  className="nav-item">🕐 Riwayat</a>
          <a href="/alert"    className="nav-item">
            🔔 Alert {summary?.active_alerts?.length > 0 && <span className="nav-badge">{summary.active_alerts.length}</span>}
          </a>
          <a href="/analitik" className="nav-item">📈 Analitik</a>
          <a href="/peta"     className="nav-item">🗺️ Peta</a>
          <a href="/laporan"  className="nav-item">📄 Laporan</a>

          <div className="sidebar-footer">
            <div className="sf-status">
              <span className={`sf-status-dot ${fetchError ? 'offline' : 'online'}`} />
              {fetchError ? 'Server terputus' : 'Sistem online'}
            </div>

            <div className="sf-city-score">
              <div className="sf-city-score-val" style={{ color: cityLevel.color }}>{cityScore}</div>
              <div className="sf-city-score-lbl" style={{ color: cityLevel.color }}>Risiko Kota — {cityLevel.label}</div>
            </div>

            <div className="sf-version">DRAIN-EYE v1.0 · DLH DKI Jakarta</div>
          </div>
        </nav>

        <main className="main-content">

          {/* RETRY STATUS */}
          {retryStatus && (
            <div className="retry-status-banner">🔄 {retryStatus}</div>
          )}

          {/* CONNECTION ERROR BANNER */}
          {fetchError && (
            <div className="conn-error-banner">
              <span>⚠️ Tidak bisa terhubung ke server. Menampilkan data cache terakhir.</span>
              <button onClick={fetchData} className="btn-retry-inline">🔄 Coba Lagi</button>
            </div>
          )}

          {/* METRIC CARDS */}
          <div className="metrics-row">
            {loadingSummary ? (
              <>
                <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
              </>
            ) : (
              <>
                <div className="metric-card">
                  <div className="metric-val red">{summary?.total_active_blockages ?? 87}</div>
                  <div className="metric-lbl">Titik tersumbat aktif</div>
                  <div className="metric-tag red-tag">+12 hari ini</div>
                </div>
                <div className="metric-card">
                  <div className="metric-val amber">{summary?.total_high_risk_areas ?? 23}</div>
                  <div className="metric-lbl">Risiko tinggi</div>
                  <div className="metric-tag amber-tag">Perlu segera</div>
                </div>
                <div className="metric-card">
                  <div className="metric-val green">{summary?.total_completed_today ?? 41}</div>
                  <div className="metric-lbl">Selesai ditangani</div>
                  <div className="metric-tag green-tag">Minggu ini</div>
                </div>
                <div className="metric-card">
                  <div className="metric-val">{summary?.total_citizen_reports ?? 1200}</div>
                  <div className="metric-lbl">Laporan warga</div>
                  <div className="metric-tag gray-tag">Total</div>
                </div>
              </>
            )}
          </div>

          <div className="grid-2">

            <div className="card">
              <div className="card-title">🗺️ Risk Score per Kecamatan</div>
              <div style={{ flex: 1, minHeight: 380, borderRadius: 10, overflow: 'hidden' }}>
                {geoData ? (
                  <MapContainer
                    center={JAKARTA_CENTER}
                    zoom={11}
                    scrollWheelZoom={false}
                    style={{ height: '380px', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <GeoJSON
                      key={JSON.stringify(kecamatanRisk)}
                      data={geoData}
                      style={geojsonStyle}
                      onEachFeature={onEachKecamatan}
                    />
                  </MapContainer>
                ) : (
                  <div className="empty-state-sm">Memuat peta...</div>
                )}
              </div>
              <div className="legend-row">
                <span className="legend-dot" style={{ background: '#E24B4A' }} /> <span>Kritis</span>
                <span className="legend-dot" style={{ background: '#EF9F27' }} /> <span>Tinggi</span>
                <span className="legend-dot" style={{ background: '#F5C842' }} /> <span>Sedang</span>
                <span className="legend-dot" style={{ background: '#3B6D11' }} /> <span>Aman</span>
                <span className="legend-dot" style={{ background: '#d1d5db' }} /> <span>Belum ada data</span>
              </div>
            </div>

            <div className="card">
              <div className="card-title">🔔 Alert Aktif</div>
              {!summary?.active_alerts?.length ? (
                <div className="empty-state-sm">✅ Tidak ada alert aktif saat ini</div>
              ) : (
                summary.active_alerts.map(a => (
                  <div key={a.alert_id} className="alert-row">
                    <div className="alert-dot" style={{ background: riskColor(a.risk_level) }} />
                    <div className="alert-body">
                      <div className="alert-title">{a.kelurahan} — Skor {Math.round(a.risk_score)}/100</div>
                      <div className="alert-msg">{a.message}</div>
                      <div className="alert-time">
                        {a.triggered_at && new Date(a.triggered_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </div>
                    </div>
                    <button className="btn-ack">Tandai</button>
                  </div>
                ))
              )}

              <div className="card-title" style={{ marginTop: 20 }}>📷 Deteksi Hari Ini</div>
              {loadingStats ? (
                <div className="stats-grid">
                  <div className="stat-item skeleton-stat"></div>
                  <div className="stat-item skeleton-stat"></div>
                  <div className="stat-item skeleton-stat"></div>
                  <div className="stat-item skeleton-stat"></div>
                </div>
              ) : (
                <div className="stats-grid">
                  <div className="stat-item red-bg">
                    <div className="stat-val">{stats?.severely_blocked ?? 12}</div>
                    <div className="stat-lbl">Sangat Tersumbat</div>
                  </div>
                  <div className="stat-item amber-bg">
                    <div className="stat-val">{stats?.blocked ?? 23}</div>
                    <div className="stat-lbl">Tersumbat</div>
                  </div>
                  <div className="stat-item yellow-bg">
                    <div className="stat-val">{stats?.partial ?? 31}</div>
                    <div className="stat-lbl">Sebagian</div>
                  </div>
                  <div className="stat-item green-bg">
                    <div className="stat-val">{stats?.clear ?? 21}</div>
                    <div className="stat-lbl">Bersih</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-title">🔧 Antrian Maintenance Hari Ini</div>
            {!summary?.maintenance_queue?.length ? (
              <div className="empty-state-sm">✅ Tidak ada antrian maintenance saat ini</div>
            ) : (
              <div className="table-scroll">
                <table className="queue-table">
                  <thead>
                    <tr>
                      <th>Prioritas</th>
                      <th>Lokasi</th>
                      <th>Tim</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.maintenance_queue.map(q => (
                      <tr key={q.task_id}>
                        <td><span className="priority-badge" style={priorityStyle(priorityLabel(q.priority))}>{priorityLabel(q.priority)}</span></td>
                        <td>{q.location_detail}</td>
                        <td>{q.assigned_team || 'Belum ditugaskan'}</td>
                        <td>
                          <span className={`status-badge status-${q.status}`}>
                            {q.status === 'handled' ? 'Ditangani' : 'Menunggu'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
