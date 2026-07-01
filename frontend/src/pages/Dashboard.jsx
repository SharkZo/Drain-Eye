import { useState, useEffect } from 'react'
import axios from 'axios'
import { fetchWithRetry } from '../utils/apiClient'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Navbar from '../components/Navbar'
import './Dashboard.css'

const API = 'https://drain-eye-production.up.railway.app'

const KELURAHAN_DATA = [
  { name: 'Pluit',           risk: 91, level: 'critical' },
  { name: 'Koja',            risk: 84, level: 'critical' },
  { name: 'Tambora',         risk: 72, level: 'high'     },
  { name: 'Cilincing',       risk: 65, level: 'high'     },
  { name: 'Palmerah',        risk: 58, level: 'high'     },
  { name: 'Penjaringan',     risk: 53, level: 'high'     },
  { name: 'Mampang',         risk: 44, level: 'moderate' },
  { name: 'Senen',           risk: 38, level: 'moderate' },
  { name: 'Tebet',           risk: 28, level: 'low'      },
  { name: 'Pasar Minggu',    risk: 21, level: 'low'      },
]

const ALERTS = [
  { id: 1, kelurahan: 'Pluit',    risk: 91, level: 'critical', message: 'Risiko banjir kritis — 3 titik tersumbat parah', time: '10:28 WIB' },
  { id: 2, kelurahan: 'Koja',     risk: 84, level: 'critical', message: 'Drainase 89% tersumbat — laporan warga x4',       time: '10:15 WIB' },
  { id: 3, kelurahan: 'Tambora',  risk: 72, level: 'high',     message: 'Hujan 48 jam diprediksi lebat — risiko meningkat', time: 'BMKG'      },
]

const QUEUE = [
  { id: 1, priority: 'P1', location: 'Jl. Pluit Raya — drainase utama',    team: 'Tim A', hours: 2,   status: 'assigned'   },
  { id: 2, priority: 'P1', location: 'Jl. Koja Utara — gorong-gorong',     team: 'Tim B', hours: 3,   status: 'in_progress' },
  { id: 3, priority: 'P2', location: 'Gg. Tambora 3 — saluran kecil',      team: 'Tim C', hours: 1,   status: 'pending'    },
  { id: 4, priority: 'P2', location: 'Cilincing — drainase pasar',         team: 'Tim D', hours: 2.5, status: 'pending'    },
  { id: 5, priority: 'P3', location: 'Mampang — saluran sekunder',         team: 'Tim E', hours: 1.5, status: 'pending'    },
]

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

function citywideScore(data) {
  const avg = data.reduce((s, d) => s + d.risk, 0) / data.length
  return Math.round(avg)
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
  }, [])

  const cityScore = citywideScore(KELURAHAN_DATA)
  const cityLevel = scoreLevel(cityScore)

  return (
    <div className="dash-wrap">
      <Navbar title="Dashboard DLH DKI Jakarta" showClock showUpload />

      <div className="dash-body">

        <nav className="sidebar">
          <a href="/"         className="nav-item active">📊 Dashboard</a>
          <a href="/upload"   className="nav-item">📷 Upload Foto</a>
          <a href="/history"  className="nav-item">🕐 Riwayat</a>
          <a href="/alert"    className="nav-item">🔔 Alert <span className="nav-badge">3</span></a>
          <a href="/analitik" className="nav-item">📈 Analitik</a>
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
              <div className="card-title">📊 Risk Score per Kelurahan</div>
              <div style={{ flex: 1, minHeight: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={KELURAHAN_DATA} layout="vertical" margin={{ left: 16, right: 24 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={88} />
                    <Tooltip formatter={(v) => [`${v}/100`, 'Risk Score']} />
                    <Bar dataKey="risk" radius={[0, 4, 4, 0]}>
                      {KELURAHAN_DATA.map((d, i) => (
                        <Cell key={i} fill={riskColor(d.level)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="legend-row">
                <span className="legend-dot" style={{ background: '#E24B4A' }} /> <span>Kritis</span>
                <span className="legend-dot" style={{ background: '#EF9F27' }} /> <span>Tinggi</span>
                <span className="legend-dot" style={{ background: '#F5C842' }} /> <span>Sedang</span>
                <span className="legend-dot" style={{ background: '#3B6D11' }} /> <span>Aman</span>
              </div>
            </div>

            <div className="card">
              <div className="card-title">🔔 Alert Aktif</div>
              {ALERTS.length === 0 ? (
                <div className="empty-state-sm">✅ Tidak ada alert aktif saat ini</div>
              ) : (
                ALERTS.map(a => (
                  <div key={a.id} className="alert-row">
                    <div className="alert-dot" style={{ background: riskColor(a.level) }} />
                    <div className="alert-body">
                      <div className="alert-title">{a.kelurahan} — Skor {a.risk}/100</div>
                      <div className="alert-msg">{a.message}</div>
                      <div className="alert-time">{a.time}</div>
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
            {QUEUE.length === 0 ? (
              <div className="empty-state-sm">✅ Tidak ada antrian maintenance saat ini</div>
            ) : (
              <div className="table-scroll">
                <table className="queue-table">
                  <thead>
                    <tr>
                      <th>Prioritas</th>
                      <th>Lokasi</th>
                      <th>Tim</th>
                      <th>Est. Waktu</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {QUEUE.map(q => (
                      <tr key={q.id}>
                        <td><span className="priority-badge" style={priorityStyle(q.priority)}>{q.priority}</span></td>
                        <td>{q.location}</td>
                        <td>{q.team}</td>
                        <td>{q.hours} jam</td>
                        <td>
                          <span className={`status-badge status-${q.status}`}>
                            {q.status === 'assigned'    ? 'Ditugaskan' :
                             q.status === 'in_progress' ? 'Sedang Dikerjakan' : 'Menunggu'}
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
