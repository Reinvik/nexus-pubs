import React, { useState } from 'react';
import { usePuntoNexus } from '../context/PuntoNexusContext';
import { Lock, Mail, RefreshCw, QrCode, Split, ShieldCheck, Beer } from 'lucide-react';

export default function Login() {
  const { login, loading } = usePuntoNexus();
  const [email, setEmail] = useState('ariel.mellag@gmail.com');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Por favor completa correo y contraseña.');
      return;
    }

    setErrorMsg('');
    const res = await login(email, password);
    if (res && res.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="login-split-container">
      {/* Panel Izquierdo: Identidad Nexus Pub Chile */}
      <div className="login-left-hero">
        <div className="login-hero-header" style={{ gap: '14px', display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(245, 158, 11, 0.2))',
            border: '1.5px solid rgba(6, 182, 212, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 24px rgba(6, 182, 212, 0.25)',
            flexShrink: 0,
            overflow: 'hidden'
          }}>
            <img src="/pub-logo.svg" alt="Nexus Pub" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.03em', color: '#ffffff', lineHeight: 1 }}>
              <span style={{ color: '#06b6d4' }}>Nexus</span> <span style={{ color: '#f59e0b' }}>Pub</span>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '4px' }}>
              🇨🇱 Edición Bares &amp; Cervecerías Chile
            </div>
          </div>
        </div>

        <div className="login-hero-content">
          <div className="login-hero-tag">
            <span className="login-hero-tag-dot"></span>
            CLP $ · Propina Legal 10% · KDS Barra &amp; Cocina
          </div>

          <h1 className="login-hero-title">
            Tarjetas QR, cuentas divididas <br />
            <span style={{
              background: 'linear-gradient(90deg, #06b6d4 0%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block',
              marginTop: '4px'
            }}>
              y salida sin filas para tu bar
            </span>
          </h1>

          <p className="login-hero-subtitle" style={{ lineHeight: '1.7' }}>
            <strong style={{ color: '#ffffff' }}>Nexus Pub</strong> transforma la operación de pubs, cervecerías y restobares en Chile: entrega una <strong style={{ color: '#06b6d4' }}>Tarjeta QR</strong> al ingresar, reduce garzones a <em>runners</em> de entrega y verifica en segundos que toda la mesa esté pagada antes de salir.
          </p>

          <div className="login-features-list">
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <QrCode size={18} />
              </div>
              <div className="login-feature-text">
                <h3 className="login-feature-text-title">Autopedido a Barra y Cocina por Tarjeta QR</h3>
                <p className="login-feature-text-desc">Cada amigo escanea el QR de la tarjeta, registra su nombre y pide rondas directo a KDS Barra o Cocina.</p>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="login-feature-icon">
                <Split size={18} />
              </div>
              <div className="login-feature-text">
                <h3 className="login-feature-text-title">Split Bill &amp; Pago Anticipado con Propina 10%</h3>
                <p className="login-feature-text-desc">Paga solo lo tuyo, divide en partes iguales o paga cada ronda por adelantado con Webpay, Mercado Pago o Fintoc.</p>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="login-feature-icon">
                <ShieldCheck size={18} />
              </div>
              <div className="login-feature-text">
                <h3 className="login-feature-text-title">Semáforo de Salida en Puerta</h3>
                <p className="login-feature-text-desc">Escanea la tarjeta al retirarse: luz verde si el saldo es $0 o alerta roja inmediata con cobro express POS.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="login-hero-footer">
          © {new Date().getFullYear()} SMARTLEAN CHILE • NEXUS PUB POS
        </div>
      </div>

      {/* Panel Derecho: Formulario de Login */}
      <div className="login-right-form">
        <div className="login-form-card">
          <div className="login-form-header">
            <h2 className="login-form-title">Acceso Administración</h2>
            <p className="login-form-desc">Ingresa al panel de salón, KDS Barra/Cocina y Semáforo de Puerta.</p>
          </div>

          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '10px',
              padding: '12px 16px',
              color: '#f87171',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="email" style={{ color: '#94a3b8' }}>Correo Administrador</label>
              <div className="login-dark-input-wrapper">
                <Mail size={18} className="login-dark-input-icon" />
                <input
                  id="email"
                  type="text"
                  autoComplete="username"
                  className="login-dark-input"
                  placeholder="ariel.mellag@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="password" style={{ color: '#94a3b8' }}>Contraseña</label>
              <div className="login-dark-input-wrapper">
                <Lock size={18} className="login-dark-input-icon" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="login-dark-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '16px', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Ingresar a Nexus Pub <span style={{ fontSize: '18px', fontWeight: 'bold' }}>→</span>
                </span>
              )}
            </button>
          </form>

          <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
            <a
              href="/?qr=QR-MESA-01"
              style={{
                color: '#38bdf8',
                fontSize: '12.5px',
                textDecoration: 'none',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <QrCode size={15} /> Probar vista móvil directa: Tarjeta QR-MESA-01 →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
