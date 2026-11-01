import React, { useState } from 'react';
import { usePuntoNexus, isNexusOwnerAccount } from '../context/PuntoNexusContext';
import { X, Lock, User, ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function UserProfileModal({ isOpen, onClose }) {
  const { user, updateUserProfile, loading, branches = [] } = usePuntoNexus();

  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || 'admin');
  const [branchId, setBranchId] = useState(user?.branch_id || branches[0]?.id || 'branch-matriz');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setError(null);

    if (newPassword && newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const payload = {};
    if (name.trim() !== user.name) payload.name = name.trim();
    if (role !== user.role) payload.role = role;
    if (branchId !== user.branch_id) payload.branch_id = branchId;
    if (newPassword) payload.newPassword = newPassword;

    if (Object.keys(payload).length === 0) {
      setError("No has realizado cambios.");
      return;
    }

    const res = await updateUserProfile(payload);
    if (res.error) {
      setError(res.error);
    } else {
      setMsg("¡Perfil, rol y sucursal asignada actualizados!");
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setMsg(null);
        onClose();
      }, 1500);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(3, 7, 18, 0.88)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200000,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '28px',
        borderRadius: '20px',
        background: '#090f1e',
        border: '1px solid rgba(6, 182, 212, 0.3)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(6, 182, 212, 0.15)',
        position: 'relative'
      }}>
        {/* Botón de Cierre */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#94a3b8',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
        >
          <X size={16} />
        </button>

        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(6, 182, 212, 0.12)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00d2ff'
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0, fontFamily: 'var(--font-title)' }}>
              Perfil y Seguridad
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Edita tu nombre y actualiza tu contraseña de acceso.
            </p>
          </div>
        </div>

        {/* Notificaciones */}
        {msg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>{msg}</span>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Email (Solo Lectura) */}
          <div className="form-group">
            <label className="form-label" style={{ color: '#94a3b8', fontSize: '11px' }}>Correo Electrónico (Usuario)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                value={user?.email || ''}
                disabled
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.03)',
                  color: '#64748b',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '10px 14px 10px 38px',
                  fontSize: '13px'
                }}
              />
              <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#475569' }} />
            </div>
          </div>

          {/* Nombre Completo */}
          <div className="form-group">
            <label className="form-label" style={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 700 }}>Nombre del Perfil</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu Nombre o Apodo"
                required
                style={{
                  width: '100%',
                  background: '#0d1527',
                  color: '#ffffff',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: '10px',
                  padding: '10px 14px 10px 38px',
                  fontSize: '13px'
                }}
              />
              <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#00d2ff' }} />
            </div>
          </div>

          {/* Rol del Usuario */}
          <div className="form-group">
            <label className="form-label" style={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 700 }}>Rol en el Sistema</label>
            <select
              className="form-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: '100%',
                background: '#0d1527',
                color: '#ffffff',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '13px'
              }}
            >
              {(isNexusOwnerAccount(user?.email) || isNexusOwnerAccount(user?.name) || ['nexusowner', 'nexus_owner', 'owner', 'superuser', 'super_admin'].includes((user?.role || '').toLowerCase())) && (
                <option value="nexusowner">👑 Nexus Owner (Super Admin)</option>
              )}
              <option value="admin">👑 Administrador / Dueño (Acceso total & cambio de sucursales)</option>
              <option value="user">👤 Cajero / Operador (Restringido a sucursal y módulos configurados)</option>
            </select>
          </div>

          {/* Sucursal Asignada (Seleccionable) */}
          <div className="form-group" style={{ background: role === 'user' ? 'rgba(6,182,212,0.06)' : 'transparent', border: role === 'user' ? '1px solid rgba(6,182,212,0.2)' : 'none', padding: role === 'user' ? '12px' : 0, borderRadius: '10px' }}>
            <label className="form-label" style={{ color: role === 'user' ? '#00d2ff' : '#e2e8f0', fontSize: '11px', fontWeight: 700 }}>
              {role === 'user' ? '🔒 Sucursal Asignada (Fija para este Operador)' : '🏢 Sucursal Principal / Preferida'}
            </label>
            <select
              className="form-input"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              style={{
                width: '100%',
                background: '#0d1527',
                color: '#ffffff',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '13px',
                marginTop: '4px'
              }}
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  🏢 {b.name} {b.is_main ? '(Matriz Principal)' : ''}
                </option>
              ))}
            </select>
            {role === 'user' && (
              <span style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                Al ser Cajero/Operador, este usuario solo podrá operar dentro de esta sucursal y ver los módulos que el dueño le autorice.
              </span>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed rgba(255, 255, 255, 0.1)', margin: '4px 0' }} />

          {/* Nueva Contraseña */}
          <div className="form-group">
            <label className="form-label" style={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 700 }}>Nueva Contraseña (Opcional)</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? "text" : "password"}
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={{
                  width: '100%',
                  background: '#0d1527',
                  color: '#ffffff',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: '10px',
                  padding: '10px 38px 10px 38px',
                  fontSize: '13px'
                }}
              />
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#00d2ff' }} />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirmar Nueva Contraseña */}
          {newPassword && (
            <div className="form-group" style={{ animation: 'fadeIn 0.2s ease' }}>
              <label className="form-label" style={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 700 }}>Confirmar Nueva Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? "text" : "password"}
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  style={{
                    width: '100%',
                    background: '#0d1527',
                    color: '#ffffff',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 14px 10px 38px',
                    fontSize: '13px'
                  }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#00d2ff' }} />
              </div>
            </div>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1.5,
                padding: '10px',
                borderRadius: '10px',
                background: 'linear-gradient(90deg, #00d2ff 0%, #2563eb 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                letterSpacing: '0.02em'
              }}
            >
              {loading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
