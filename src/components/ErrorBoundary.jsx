import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[Nexus ErrorBoundary] Error capturado en vista:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '380px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
            padding: '28px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={26} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Error al cargar esta sección
            </h3>

            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px', lineHeight: '1.5' }}>
              Ocurrió un problema inesperado al mostrar esta pantalla. Puedes reintentar o regresar al inicio.
            </p>

            {this.state.error && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px',
                marginBottom: '18px',
                textAlign: 'left',
                maxHeight: '80px',
                overflowY: 'auto'
              }}>
                <code style={{ fontSize: '11px', color: '#b91c1c', fontFamily: 'monospace', wordBreak: 'break-word' }}>
                  {String(this.state.error?.message || this.state.error)}
                </code>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 16px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} />
                <span>Reintentar</span>
              </button>

              {this.props.onGoHome && (
                <button
                  type="button"
                  onClick={this.props.onGoHome}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 16px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  <Home size={14} />
                  <span>Ir al Inicio</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
