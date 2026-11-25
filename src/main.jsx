import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider, useAuth } from './auth/AuthProvider.jsx'
import LoginPage from './pages/LoginPage.jsx'
import UserMenu from './components/UserMenu.jsx'

function Root() {
  const { session, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-300">Loading…</div>;
  }
  if (!session) return <LoginPage />;
  return (
    <>
      <App />
      <UserMenu />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
)