import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate a brief async delay for UX
    await new Promise(r => setTimeout(r, 600));

    const result = login(email, password);
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

  return (
    <div className="login-page">
      {/* Background blobs */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />

      <div className="login-container">
        {/* Left panel */}
        <div className="login-left">
          <div className="login-brand">
            <div className="login-brand-icon">🚛</div>
            <div>
              <div className="login-brand-name">TMS</div>
              <div className="login-brand-sub">Transport Management System</div>
            </div>
          </div>

          <div className="login-hero">
            <h1 className="login-hero-title">
              Kelola Armada,<br />
              <span className="login-hero-accent">Pantau Setiap Perjalanan.</span>
            </h1>
            <p className="login-hero-desc">
              Platform terpadu untuk manajemen Delivery Order, Invoice 70:30,
              Biaya Operasional, dan laporan P&L perjalanan secara real-time.
            </p>
          </div>

          <div className="login-features">
            {[
              { icon: '📦', text: 'Multi-Drop Delivery Order' },
              { icon: '🧾', text: 'Invoice Otomatis DP & Pelunasan' },
              { icon: '💸', text: 'Biaya Operasional & Realisasi Rincian' },
              { icon: '📊', text: 'Dashboard P&L & Arus Kas' },
            ].map(f => (
              <div key={f.text} className="login-feature-item">
                <span className="login-feature-icon">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — Form */}
        <div className="login-right">
          <div className="login-card">
            <div className="login-card-header">
              <h2>Selamat Datang</h2>
              <p>Masuk ke akun TMS Anda</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              {/* Error */}
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
                {loading ? 'Memverifikasi...' : 'Masuk'}
              </button>
            </form>

            {/* Quick login demo */}
            <div className="login-demo">
              <div className="login-demo-title">Demo Akun</div>
              <div className="login-demo-accounts">
                {[
                  { label: 'Admin', email: 'admin@tms.id', pass: 'admin123', color: '#a78bfa' },
                  { label: 'Dispatcher', email: 'dispatcher@tms.id', pass: 'rudi123', color: '#4f6ef7' },
                  { label: 'Finance', email: 'finance@tms.id', pass: 'siti123', color: '#22c55e' },
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

          <div className="login-footer">
            TMS &copy; 2025 &mdash; Transport Management System
          </div>
        </div>
      </div>
    </div>
  );
}
