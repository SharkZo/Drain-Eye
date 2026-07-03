import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { ProtectedRoute } from './ProtectedRoute'
import Dashboard from './pages/Dashboard'
import UploadPWA from './pages/UploadPWA'
import History from './pages/History'
import Alert from './pages/Alert'
import Analitik from './pages/Analitik'
import Laporan from './pages/Laporan'
import Peta from './pages/Peta'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={
            <ProtectedRoute requireDLH={true}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/upload" element={
            <ProtectedRoute>
              <UploadPWA />
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          } />
          <Route path="/alert" element={
            <ProtectedRoute requireDLH={true}>
              <Alert />
            </ProtectedRoute>
          } />
          <Route path="/analitik" element={
            <ProtectedRoute requireDLH={true}>
              <Analitik />
            </ProtectedRoute>
          } />
          <Route path="/laporan" element={
            <ProtectedRoute requireDLH={true}>
              <Laporan />
            </ProtectedRoute>
          } />
          <Route path="/peta" element={
            <ProtectedRoute requireDLH={true}>
              <Peta />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
