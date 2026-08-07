import { useState, useEffect } from 'react'
import { fetchWithRetry } from '../utils/apiClient'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts'
import './Analitik.css'
import Navbar from '../components/Navbar'

const API = import.meta.env.VITE_API_URL || 'https://drain-eye-production.up.railway.app'

const COLORS = {
  critical: '#E24B4A',
  high:     '#EF9F27',
  moderate: '#F5C842',
  low:      '#3B6D11',
}

const SEVERITY_LABEL = {
  severely_blocked: 'Sangat Tersumbat',
  blocked:          'Tersumbat',
  partial:          'Sebagian',
  clear:            'Bersih',
}

const SEVERITY_COLOR = {
  severely_blocked: '#E24B4A',
  blocked:          '#EF9F27',
  partial:          '#F5C842',
  clear:            '#3B6D11',
}

// hitung jumlah laporan & rata-rata sumbatan per hari untuk 7 hari terakhir dari data histori asli
function buildDailyTrend(history) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dayStr = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('id-ID', { weekday: 'short' })

    const dayRecords = history.filter(h => (h.timestamp || '').startsWith(dayStr))
    const reports = dayRecords.length
    const avgBlockage = reports
      ? dayRecords.reduce((s, r) => s + (r.blockage_percentage || 0), 0) / reports
      : 0

    days.push({ day: label, reports, blockage_avg: Math.round(avgBlockage * 10) / 10 })
  }
  return days
}

function ChartSkeleton({ height = 220 }) {
  return <div className="chart-skeleton" style={{ height }} />
}

export default function Analitik() {
  const [riskData, setRiskData]     = useState([])
  const [history, setHistory]       = useState([])
  const [stats, setStats]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [retryStatus, setRetryStatus] = useState(null)

  const fetchAll = () => {
    setLoading(true)
    setFetchError(false)
    setRetryStatus(null)
    const onRetry = (a, m) => setRetryStatus(`Menghubungkan ke server... (percobaan ${a}/${m})`)

    Promise.all([
      fetchWithRetry(`${API}/api/risk/all`, { onRetry }),
      fetchWithRetry(`${API}/api/detection/history?limit=1000`, { onRetry }),
      fetchWithRetry(`${API}/api/detection/stats`, { onRetry }),
    ])
      .then(([risk, hist, st]) => {
        setRiskData(risk.data.data || [])
        setHistory(hist.data.data || [])
        setStats(st.data)
      })
      .catch(() => setFetchError(true))
      .finally(() => { setLoading(false); setRetryStatus(null) })
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekRecords = history.filter(d => d.timestamp && new Date(d.timestamp) >= sevenDaysAgo)

  const totalWeek = weekRecords.length
  const avgRisk = riskData.length
    ? Math.round((riskData.reduce((s, d) => s + d.risk_score, 0) / riskData.length) * 10) / 10
    : 0
  const totalHandled = history.filter(d => d.status === 'handled').length
  const avgBlockage = history.length
    ? Math.round((history.reduce((s, d) => s + (d.blockage_percentage || 0), 0) / history.length) * 10) / 10
    : 0

  const trendData = buildDailyTrend(history)

  const severityPie = stats
    ? Object.entries(SEVERITY_LABEL)
        .map(([key, name]) => ({ name, value: stats[key] || 0, color: SEVERITY_COLOR[key] }))
        .filter(s => s.value > 0)
    : []

  return (
    <div className="ana-wrap">
      <Navbar title="Analitik" backHref="/" />

      <div className="ana-body">

        {loading && retryStatus && (
          <div className="retry-status-banner">🔄 {retryStatus}</div>
        )}

        {!loading && fetchError && (
          <div className="ana-error-banner">
            <span>⚠️ Gagal memuat data analitik.</span>
            <button onClick={fetchAll} className="btn-retry-inline">🔄 Coba Lagi</button>
          </div>
        )}

        <div className="ana-summary">
          <div className="ana-card">
            <div className="ana-val red">{loading ? '-' : totalWeek}</div>
            <div className="ana-lbl">Total Laporan Minggu Ini</div>
          </div>
          <div className="ana-card">
            <div className="ana-val amber">{loading ? '-' : avgRisk}</div>
            <div className="ana-lbl">Rata-rata Risk Score</div>
          </div>
          <div className="ana-card">
            <div className="ana-val green">{loading ? '-' : totalHandled}</div>
            <div className="ana-lbl">Laporan Ditangani</div>
          </div>
          <div className="ana-card">
            <div className="ana-val blue">{loading ? '-' : `${avgBlockage}%`}</div>
            <div className="ana-lbl">Rata-rata Sumbatan</div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">📊 Tren Rata-rata Sumbatan (7 Hari)</div>
          {loading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="blockage_avg" name="% Sumbatan" stroke="#EF9F27" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid-2">
          <div className="chart-card">
            <div className="chart-title">📋 Jumlah Laporan per Hari</div>
            {loading ? <ChartSkeleton height={200} /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="reports" name="Laporan" radius={[4, 4, 0, 0]} fill="#2E74B5" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-title">🥧 Distribusi Tingkat Sumbatan</div>
            {loading ? <ChartSkeleton height={200} /> : severityPie.length === 0 ? (
              <div className="ana-empty-state">Belum ada data deteksi.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={severityPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {severityPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">🗺️ Risk Score per Kelurahan (Real-time LSTM)</div>

          {loading && <ChartSkeleton />}

          {!loading && !fetchError && riskData.length === 0 && (
            <div className="ana-empty-state">Belum ada data risk score tersedia saat ini.</div>
          )}

          {!loading && !fetchError && riskData.length > 0 && (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={riskData} layout="vertical" margin={{ left: 20, right: 24 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="kelurahan" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(v) => [`${v}/100`, 'Risk Score']} />
                  <Bar dataKey="risk_score" radius={[0, 4, 4, 0]}>
                    {riskData.map((d, i) => (
                      <Cell key={i} fill={COLORS[d.risk_level] || '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="legend-row">
                {Object.entries(COLORS).map(([k, v]) => (
                  <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: v, display: 'inline-block' }} />
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
