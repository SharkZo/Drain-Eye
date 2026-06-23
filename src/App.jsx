import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import UploadPWA from './pages/UploadPWA'
import History from './pages/History'
import Alert from './pages/Alert'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<UploadPWA />} />
        <Route path="/history" element={<History />} />
        <Route path="/alert" element={<Alert />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App