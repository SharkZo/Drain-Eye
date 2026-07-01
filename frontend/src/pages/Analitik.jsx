import { useState, useEffect } from 'react'
import axios from 'axios'
import { fetchWithRetry } from '../utils/apiClient'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts'
import './Analitik.css'
import Navbar from '../components/Navbar'

const API = 'https://drain-eye-production.up.railway.app'

const COLORS = {
  critical: '#E24B4A',
  high:     '#EF9F27',
  moderate: '#F5C842',
  low:      '#3B6D11',
}

const TREND_DATA = [
  { day: 'Sen', risk_avg: 42, blockage_avg: 55, reports: 12 },
  { day: 'Sel', risk_avg: 38, blockage_avg: 48, reports: 9  },
  { day: 'Rab', risk_avg: 51, blockage_avg: 62, reports: 15 },
  { day: 'Kam', risk_avg: 67, blockage_avg: 71, reports: 21 },
  { day: 'Jum', risk_avg: 72, blockage_avg: 78, reports: 28 },
  { day: 'Sab', risk_avg: 58, blockage_avg: 65, reports: 19 },
  { day: 'Min', risk_avg: 45, blockage_avg: 52, reports: 14 },
]

const SEVERITY_PIE = [
  { name: 'Sangat Tersumbat', value: 12, color: '#E24B4A' },
  { name: 'Tersumbat',        value: 23, color: '#EF9F27' },
  { name: 'Sebagian',         value: 31, color: '#F5C842' },
  { name: 'Bersih',           value: 21, color: '#3B6D11' },
]

function ChartSkeleton({ height = 220 }) {
  return <div className="chart-skeleton" style={{ height }} />
}

export default function Analitik() {
  const [riskData, setRiskData]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [retryStatus, setRetryStatus] = useState(null)

  const fetchRisk = () => {
    setLoading(true)
    setFetchError(false)
    setRetryStatus(null)
    fetchWithRetry(`${API}/api/risk/all`, {
      onRetry: (a, m) => setRetryStatus(`Menghubungkan ke server... (percobaan ${a}/${m})`)
    })
      .then(r => setRiskData(r.data.data || []))
      .catch(() => setFetchError(true))
      .finally(() => { setLoading(false); setRetryStatus(null) })
  }

  useEffect(() => {
    fetchRisk()
  }, [])

  return (
    <div className="ana-wrap">
      <Navbar title="Analitik" backHref="/" />

      <div className="ana-body">

        <div className="ana-summary">
          <div className="ana-card">
            <div className="ana-val red">87</div>
            <div className="ana-lbl">Total Laporan Minggu Ini</div>
          </div>
          <div className="ana-card">
            <div className="ana-val amber">52.4</div>
            <div className="ana-lbl">Rata-rata Risk Score</div>
          </div>
          <div className="ana-card">
            <div className="ana-val green">41</div>
            <div className="ana-lbl">Laporan Ditangani</div>
          </div>
          <div className="ana-card">
            <div className="ana-val blue">62.3%</div>
            <div className="ana-lbl">Rata-rata Sumbatan</div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">📊 Tren Risk Score & Sumbatan (7 Hari)</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={TREND_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="risk_avg"     name="Risk Score"  stroke="#E24B4A" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="blockage_avg" name="% Sumbatan"  stroke="#EF9F27" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid-2">
          <div className="chart-card">
            <div className="chart-title">📋 Jumlah Laporan per Hari</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={TREND_DATA} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="reports" name="Laporan" radius={[4, 4, 0, 0]}>
                  {TREND_DATA.map((_, i) => (
                    <Cell key={i} fill={i === 4 ? '#E24B4A' : '#2E74B5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-title">🥧 Distribusi Tingkat Sumbatan</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={SEVERITY_PIE}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {SEVERITY_PIE.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">🗺️ Risk Score per Kelurahan (Real-time LSTM)</div>

          {loading && retryStatus && (
            <div className="retry-status-banner">🔄 {retryStatus}</div>
          )}
          {loading && <ChartSkeleton />}

          {!loading && fetchError && (
            <div className="ana-error-banner">
              <span>⚠️ Gagal memuat data risk score real-time.</span>
              <button onClick={fetchRisk} className="btn-retry-inline">🔄 Coba Lagi</button>
            </div>
          )}

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
