import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store';
import { useTenant } from '../context/TenantContext';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { branding } = useTenant();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.ok) {
      navigate('/', { replace: true });
    } else {
      setError(result.error);
    }
  };

  const handleQuickLogin = (email, pass) => {
    setEmail(email);
    setPassword(pass);
  };

  const focusLoginInput = () => {
    const el = document.getElementById('login-email');
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="gercep-login-page">
      {/* Background Image & Vignette Overlay */}
      <div className="gercep-bg-overlay" />

      {/* Top Navbar */}
      <header className="gercep-navbar">
        <div className="gercep-nav-brand">
          {branding.logoImage ? (
            <img
              src={branding.logoImage}
              alt={branding.sidebarTitle}
              className="gercep-logo-img"
            />
          ) : (
            <div className="gercep-logo-text">
              <span className="gercep-logo-icon">⚡</span>
              <span>{branding.sidebarTitle}</span>
            </div>
          )}
        </div>
      </header>


      {/* Main Hero Container */}
      <div className="gercep-hero-container">
        {/* Left Hero Content */}
        <div className="gercep-hero-left">
          <h1 className="gercep-hero-headline">
            <span className="gercep-white-text">DELIVER</span>{' '}
            <span className="gercep-smiles-text">SMILES</span><br />
            <span className="gercep-white-text">TO EVERY DESTINATION</span>
          </h1>



          <p className="gercep-hero-description">
            We don't just deliver goods, we deliver trust, efficiency, and smiles at
            every destination. Experience the modern standard of logistics.
          </p>
        </div>



        {/* Right Glassmorphic Login Card */}
        <div className="gercep-hero-right">
          <div className="login-card gercep-glass-card">
            <div className="login-card-header">
              <div className="gercep-card-badge">TMS SYSTEM LOGIN</div>
              <h2>Selamat Datang</h2>
              <p>Masuk ke akun TMS {branding.name}</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              {/* Error Alert */}
              {error && (
                <div className="login-error">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  id="login-email"
                  type="email"
                  className="form-input login-input"
                  placeholder="email@perusahaan.id"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Password</label>
                </div>
                <div className="login-pass-wrap">
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    className="form-input login-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="login-pass-toggle"
                    onClick={() => setShowPass(s => !s)}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                className={`btn btn-primary btn-lg login-btn ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <span className="login-spinner" />
                ) : (
                  <LogIn size={16} />
                )}
                {loading ? 'Memverifikasi...' : 'Masuk ke System'}
              </button>
            </form>

            {/* Quick Demo Login */}
            <div className="login-demo">
              <div className="login-demo-title">Demo Akun Cepat</div>
              <div className="login-demo-accounts">
                {[
                  { label: 'Admin', email: 'admin@tms.id', pass: 'admin123', color: '#a78bfa' },
                  { label: 'Dispatcher', email: 'dispatcher@tms.id', pass: 'rudi123', color: '#38bdf8' },
                  { label: 'Finance', email: 'finance@tms.id', pass: 'siti123', color: '#4ade80' },
                ].map(a => (
                  <button
                    key={a.label}
                    type="button"
                    className="login-demo-btn"
                    style={{ '--demo-color': a.color }}
                    onClick={() => handleQuickLogin(a.email, a.pass)}
                  >
                    <span className="login-demo-dot" style={{ background: a.color }} />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

