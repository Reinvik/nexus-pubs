import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { usePuntoNexus } from '../context/PuntoNexusContext';

export default function AdminPasswordModal({
  isOpen,
  onClose,
  onConfirm,
  requireReason = false,
  requireConfirmationWord = null,
  user = null,
  title = "Autorización de Administrador Requerida",
  actionName = "anular esta venta",
  description = null,
  confirmButtonText = null,
  isDanger = false
}) {
  const { verifyAdminPassword } = usePuntoNexus();
  const [password, setPassword] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [confirmationWordInput, setConfirmationWordInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setPassword('');
    setCancellationReason('');
    setConfirmationWordInput('');
    setError('');
    onClose();
  };

  const isWordMatch = !requireConfirmationWord || (confirmationWordInput.trim().toLowerCase() === requireConfirmationWord.toLowerCase());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (requireConfirmationWord && !isWordMatch) {
      setError(`Debes escribir exactamente "${requireConfirmationWord}" para autorizar.`);
      return;
    }

    if (requireReason && !cancellationReason.trim()) {
      setError('Por favor indica el motivo o justificación de la anulación.');
      return;
    }

    if (!password.trim()) {
      setError('Por favor ingresa la clave de Administrador.');
      return;
    }

    setLoading(true);
    const isValid = await verifyAdminPassword(password);
    setLoading(false);

    if (isValid) {
      setPassword('');
      setCancellationReason('');
      setConfirmationWordInput('');
      setError('');
      onConfirm(cancellationReason.trim());
    } else {
      setError('Contraseña de administrador incorrecta. Acceso denegado.');
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 20000 }}>
      <div
        className="modal-content glass-panel cyan-glow"
        style={{
          maxWidth: '440px',
          padding: '24px',
          background: '#090f1e',
          color: '#fff',
          borderRadius: '20px',
          border: isDanger ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(6, 182, 212, 0.4)',
          boxShadow: isDanger ? '0 10px 30px rgba(239, 68, 68, 0.2)' : '0 10px 30px rgba(6, 182, 212, 0.15)'
        }}
      >
        <div className="modal-header" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={22} style={{ color: isDanger ? '#ef4444' : '#06b6d4' }} />
            <h3 className="modal-title" style={{ margin: 0, fontSize: '16px', color: '#fff' }}>
              {title}
            </h3>
          </div>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <p style={{ fontSize: '12.5px', color: '#cbd5e1', marginBottom: '16px', lineHeight: '1.4' }}>
          {description ? description : (
            <>
              Para <strong>{actionName}</strong> se requiere la clave de <strong>Administrador</strong> o la <strong>Clave de Anulación de Facturas</strong> configurada.
            </>
          )}
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '10px 12px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 700,
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {requireReason && (
            <div style={{ marginBottom: '14px', background: '#1e293b', padding: '10px 12px', borderRadius: '10px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>
                👤 Usuario Responsable: <span style={{ color: 'var(--color-cyan)', fontWeight: 900 }}>{user?.full_name || user?.name || user?.email || 'Administrador'}</span>
              </div>
            </div>
          )}

          {requireReason && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-cyan)', display: 'block', marginBottom: '6px' }}>
                📝 Motivo / Justificación de la Anulación *
              </label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Escribe el motivo (ej. Error en cobro, cliente canceló, devolución...)"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '13px',
                  borderRadius: '10px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#fff',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          )}

          {requireConfirmationWord && (
            <div style={{
              marginBottom: '16px',
              background: 'rgba(239, 68, 68, 0.08)',
              padding: '12px 14px',
              borderRadius: '12px',
              border: isWordMatch && confirmationWordInput ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#f87171', display: 'block', marginBottom: '6px' }}>
                ⚠️ Escribe "{requireConfirmationWord}" para confirmar *
              </label>
              <input
                type="text"
                className="form-input"
                autoFocus
                placeholder={`Escribe ${requireConfirmationWord} aquí...`}
                value={confirmationWordInput}
                onChange={(e) => setConfirmationWordInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '13px',
                  borderRadius: '10px',
                  background: '#0d1527',
                  border: isWordMatch && confirmationWordInput.trim()
                    ? '1.5px solid #22c55e'
                    : '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fff',
                  boxSizing: 'border-box'
                }}
                required
              />
              <span style={{
                fontSize: '10.5px',
                color: isWordMatch && confirmationWordInput.trim() ? '#4ade80' : '#94a3b8',
                marginTop: '6px',
                display: 'block'
              }}>
                {isWordMatch && confirmationWordInput.trim()
                  ? '✅ Confirmación correcta.'
                  : `Para proteger tus datos, debes escribir "${requireConfirmationWord}".`}
              </span>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-cyan)', display: 'block', marginBottom: '6px' }}>
              Contraseña de Administrador *
            </label>
            <input
              type="password"
              className="form-input"
              autoFocus={!requireConfirmationWord && !requireReason}
              placeholder="Ingresa tu contraseña o PIN..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                borderRadius: '10px',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#fff',
                boxSizing: 'border-box'
              }}
              required
            />
            <span style={{ fontSize: '10.5px', color: '#64748b', marginTop: '6px', display: 'block' }}>
              💡 Contraseña de tu cuenta Admin o clave de anulación.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (requireConfirmationWord && !isWordMatch)}
              style={{
                background: isDanger ? '#ef4444' : '#06b6d4',
                color: '#fff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: (loading || (requireConfirmationWord && !isWordMatch)) ? 'not-allowed' : 'pointer',
                opacity: (requireConfirmationWord && !isWordMatch) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <ShieldCheck size={16} />
              <span>{loading ? 'Verificando...' : (confirmButtonText || 'Autorizar y Confirmar')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
