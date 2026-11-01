import React, { useState, useEffect, useMemo } from 'react';
import { usePuntoNexus } from '../context/PuntoNexusContext';
import DualCurrencyDisplay from './DualCurrencyDisplay';
import { Shield, PlusCircle, UserPlus, Store, User, RefreshCw, Key, Mail, CheckCircle, Building2, MapPin, Phone, Award, TrendingUp, Package, Layers, ArrowRight } from 'lucide-react';

export default function NexusOwner() {
  const { 
    user,
    companyId, 
    companyName, 
    companySettings = {},
    updateCompanySettings, 
    getAllCompanies, 
    createCompany, 
    createAccount, 
    selectCompany,
    branches = [],
    activeBranchId,
    switchBranch,
    addBranch,
    sales = [],
    inventory = [],
    formatCurrency,
    loading: contextLoading
  } = usePuntoNexus();

  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Módulos del Sistema disponibles para otorgar a cada tienda
  const SYSTEM_ALL_MODULES = useMemo(() => [
    { key: 'dashboard', label: '📊 Resumen & Métricas KPI', desc: 'Panel con métricas de ventas y ganancias' },
    { key: 'pos', label: '🖥️ Terminal de Ventas (POS)', desc: 'Caja registradora y cobro multimoneda' },
    { key: 'tables', label: '🍽️ Mesas & Comandero de Restaurante', desc: 'Control de mesas y cocina' },
    { key: 'inventory', label: '📦 Gestión de Inventario & Stock', desc: 'Control de insumos y productos' },
    { key: 'finances', label: '⚖️ Finanzas & Punto de Equilibrio', desc: 'Punto de equilibrio y egresos OPEX' },
    { key: 'branches', label: '🏢 Control de Sucursales & Personal', desc: 'Gestión multisede y usuarios' },
    { key: 'history', label: '📜 Historial de Transacciones', desc: 'Boletas, facturas y auditoría' },
    { key: 'showcase', label: '📱 Vitrina Digital Cliente', desc: 'Simulador de canasta cliente' }
  ], []);

  // Estado local para los módulos seleccionados de la tienda activa
  const [storeEnabledModules, setStoreEnabledModules] = useState(() => {
    return Array.isArray(companySettings?.enabled_modules)
      ? companySettings.enabled_modules
      : ['dashboard', 'pos', 'tables', 'inventory', 'finances', 'branches', 'history', 'showcase'];
  });
  const [savingModules, setSavingModules] = useState(false);

  // Sincronizar storeEnabledModules cuando cambia la empresa activa
  useEffect(() => {
    if (Array.isArray(companySettings?.enabled_modules)) {
      setStoreEnabledModules(companySettings.enabled_modules);
    } else {
      setStoreEnabledModules(['dashboard', 'pos', 'tables', 'inventory', 'finances', 'branches', 'history', 'showcase']);
    }
  }, [companyId, companySettings]);

  const handleToggleStoreModule = (modKey) => {
    setStoreEnabledModules(prev => {
      if (prev.includes(modKey)) {
        return prev.filter(k => k !== modKey);
      } else {
        return [...prev, modKey];
      }
    });
  };

  const handleSaveStoreModules = async () => {
    if (!companyId) return;
    setSavingModules(true);
    const res = await updateCompanySettings({
      enabled_modules: storeEnabledModules
    });
    setSavingModules(false);

    if (res?.error) {
      alert(`Error al guardar módulos: ${res.error}`);
    } else {
      alert(`✅ Módulos otorgados a "${companyName}" guardados exitosamente. Las cuentas asociadas a esta tienda solo verán los módulos activados.`);
    }
  };

  // Formulario para Crear Sucursal
  const [newBranch, setNewBranch] = useState({
    name: '',
    address: '',
    phone: '',
    manager: '',
    code: ''
  });
  const [creatingBranch, setCreatingBranch] = useState(false);

  // Estados del Formulario de Creación de Compañías / Tiendas Matrices
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyGiro, setNewCompanyGiro] = useState('alimentos');
  const [adminMode, setAdminMode] = useState('new'); // 'new' | 'owner'
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [createdModalData, setCreatedModalData] = useState(null);
  const [creatingCompany, setCreatingCompany] = useState(false);

  // Estados del Formulario de Creación de Usuarios
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Administrador',
    targetCompanyId: ''
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Cargar lista de compañías
  const fetchCompaniesList = async () => {
    setLoadingCompanies(true);
    const res = await getAllCompanies();
    setLoadingCompanies(false);
    const list = res.companies && res.companies.length > 0 ? res.companies : [
      { id: companyId || 'company-123', name: companyName || 'Punto Nexus' }
    ];
    setCompanies(list);
    if (list.length > 0 && !newUser.targetCompanyId) {
      setNewUser(prev => ({ ...prev, targetCompanyId: list[0].id }));
    }
  };

  useEffect(() => {
    fetchCompaniesList();
  }, []);

  // Handler para Crear Sucursal
  const handleAddBranchSubmit = async (e) => {
    e.preventDefault();
    if (!newBranch.name.trim()) return;

    setCreatingBranch(true);
    await addBranch(newBranch);
    setCreatingBranch(false);
    setNewBranch({ name: '', address: '', phone: '', manager: '', code: '' });
    alert(`✅ Sucursal "${newBranch.name}" creada e integrada exitosamente.`);
  };

  // Crear Tienda Matriz & Registrar Administrador Principal
  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return alert('Por favor ingresa el nombre de la tienda.');

    let finalEmail = adminEmail.trim();
    let finalPass = adminPassword.trim();
    let finalName = adminFullName.trim();

    if (adminMode === 'owner') {
      finalEmail = user?.email || 'admin@puntonexus.com';
      finalPass = user?.password || 'nexus2026';
      finalName = user?.name || user?.full_name || 'Nexus Owner';
    } else {
      if (!finalEmail || !finalPass || !finalName) {
        return alert('Por favor ingresa el nombre, correo y contraseña del Administrador de la tienda.');
      }
    }

    setCreatingCompany(true);
    const companyRes = await createCompany(newCompanyName.trim(), { giro: newCompanyGiro });

    if (companyRes.error) {
      setCreatingCompany(false);
      return alert(`Error al crear la tienda: ${companyRes.error}`);
    }

    const newCompId = companyRes.id;

    // Crear la cuenta del Administrador principal para esta tienda matriz
    await createAccount(
      finalEmail,
      finalPass,
      finalName,
      'Administrador',
      newCompId
    );

    setCreatingCompany(false);

    // Mostrar Modal de Confirmación y Credenciales
    setCreatedModalData({
      companyId: newCompId,
      companyName: newCompanyName.trim(),
      adminName: finalName,
      adminEmail: finalEmail,
      adminPassword: finalPass
    });

    // Resetear formulario
    setNewCompanyName('');
    setAdminFullName('');
    setAdminEmail('');
    setAdminPassword('');
    await fetchCompaniesList();
  };

  // Crear usuario
  const handleCreateUser = async (e) => {
    e.preventDefault();
    const { name, email, password, role, targetCompanyId } = newUser;
    if (!name.trim() || !email.trim() || !password.trim() || !targetCompanyId) {
      alert('Por favor completa todos los campos.');
      return;
    }

    setCreatingUser(true);
    const res = await createAccount(email.trim(), password.trim(), name.trim(), role, targetCompanyId);
    setCreatingUser(false);

    if (res.error) {
      alert(`Error al crear la cuenta: ${res.error}`);
    } else {
      alert(`Cuenta para ${name} creada exitosamente.`);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'Administrador',
        targetCompanyId: companies[0]?.id || ''
      });
    }
  };

  // Switch de tienda activa
  const handleSelectCompany = (id) => {
    const selected = companies.find(c => c.id === id);
    if (selected) {
      selectCompany(selected.id, selected.name);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Banner de Bienvenida del Rol Especial */}
      <div className="glass-panel" style={{
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.08), rgba(6, 182, 212, 0.08))',
        border: '1px solid rgba(6, 182, 212, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        borderRadius: '16px'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: 'rgba(6,182,212,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-cyan)',
          flexShrink: 0
        }}>
          <Shield size={28} />
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Panel de Control & Resumen de Sucursales (Nexus Owner)</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Administración del ecosistema multi-sucursal. Controla las sedes activas, monitorea ganancias consolidadas y gestiona permisos de usuario.
          </p>
        </div>
      </div>

      {/* ── SECCIÓN 0: CONTROL Y RESUMEN DE SUCURSALES (EXECUTIVE DASHBOARD) ── */}
      <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 900, color: 'var(--color-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} />
              Resumen de Sucursales & Sedes de {companyName}
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
              Monitoreo ejecutivo consolidado. Visualiza el rendimiento comercial y administra tus sedes en tiempo real.
            </p>
          </div>

          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '6px 14px', borderRadius: '99px', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Store size={14} />
            {branches.length} {branches.length === 1 ? 'Sucursal Registrada' : 'Sucursales Registradas'}
          </span>
        </div>

        {/* CARDS COMPARATIVAS POR SUCURSAL */}
        <div className="nexus-owner-branches-grid">
          {branches.map(b => {
            const isSelected = activeBranchId === b.id || (!activeBranchId && b.is_main);
            // Calcular ventas válidas asociadas a esta sucursal (excluyendo anuladas)
            const branchSales = sales.filter(s => {
              if (s.status === 'Anulada' || s.cancelled) return false;
              if (b.is_main || b.id === 'branch-matriz') return !s.branch_id || s.branch_id === b.id || s.branch_id === 'branch-matriz';
              return s.branch_id === b.id;
            });
            const totalBranchSales = branchSales.reduce((acc, s) => acc + Number(s.total_sell || s.total || 0), 0);

            return (
              <div 
                key={b.id} 
                style={{
                  background: isSelected ? 'linear-gradient(135deg, rgba(6,182,212,0.06), rgba(99,102,241,0.06))' : '#ffffff',
                  border: isSelected ? '2px solid var(--color-cyan)' : '1px solid #cbd5e1',
                  borderRadius: '16px',
                  padding: '18px',
                  boxShadow: isSelected ? '0 4px 16px rgba(6,182,212,0.15)' : '0 2px 8px rgba(15,23,42,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', background: b.is_main ? '#dcfce7' : '#e0f2fe', color: b.is_main ? '#15803d' : '#0369a1', display: 'inline-block', marginBottom: '4px' }}>
                        {b.is_main ? 'Casa Matriz' : (b.code || 'Sucursal')}
                      </span>
                      <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                        {b.name}
                      </h4>
                    </div>

                    {isSelected && (
                      <span style={{ fontSize: '10px', fontWeight: 800, background: '#06b6d4', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                        ACTIVA
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px' }}>
                    {b.address && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {b.address}</span>}
                    {b.manager && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {b.manager}</span>}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '10px 12px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Ventas Totales:</div>
                  <DualCurrencyDisplay amount={totalBranchSales} fontSize="18px" primaryColor="var(--color-cyan)" showSwap={false} />
                  <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px', fontWeight: 700 }}>
                    {branchSales.length} transacciones registradas
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => switchBranch(b.id)}
                  className={isSelected ? 'btn-secondary' : 'btn-primary'}
                  style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '8px', gap: '6px' }}
                >
                  {isSelected ? '✓ Sucursal en Uso' : '⚡ Activar y Gestionar'}
                </button>
              </div>
            );
          })}
        </div>

        {/* AGREGAR NUEVA SUCURSAL */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PlusCircle size={15} style={{ color: 'var(--color-cyan)' }} />
            Agregar Nueva Sucursal / Sede Comercial
          </h4>

          <form onSubmit={handleAddBranchSubmit} className="nexus-owner-form-grid">
            <div>
              <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Nombre Sucursal *</label>
              <input
                type="text"
                className="form-input"
                style={{ padding: '7px 10px', fontSize: '12px' }}
                placeholder="Ej: Sucursal Altamira"
                value={newBranch.name}
                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Dirección / Ubicación</label>
              <input
                type="text"
                className="form-input"
                style={{ padding: '7px 10px', fontSize: '12px' }}
                placeholder="Ej: Av. Principal 123"
                value={newBranch.address}
                onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Encargado / Manager</label>
              <input
                type="text"
                className="form-input"
                style={{ padding: '7px 10px', fontSize: '12px' }}
                placeholder="Ej: Carlos Silva"
                value={newBranch.manager}
                onChange={(e) => setNewBranch({ ...newBranch, manager: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '12px', height: '36px' }}
              disabled={creatingBranch}
            >
              <PlusCircle size={14} />
              <span>{creatingBranch ? 'Guardando...' : '+ Crear Sucursal'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Grid Principal de 2 Columnas */}
      <div className="nexus-owner-main-grid">
        
        {/* Columna Izquierda: Cambio de Tienda y Creación de Cuentas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SECCIÓN 1: SELECTOR DE TIENDA ACTIVA */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-cyan)' }}>
              <Store size={18} />
              Conmutar Tienda Activa
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tienda Actualmente en Uso:</label>
                <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-emerald)' }}></span>
                  {companyName}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Elegir Otra Tienda punto Nexus</label>
                  <select
                    className="form-input"
                    style={{ width: '100%', padding: '10px 14px' }}
                    value={companyId || ''}
                    onChange={(e) => handleSelectCompany(e.target.value)}
                    disabled={loadingCompanies}
                  >
                    {loadingCompanies ? (
                      <option>Cargando tiendas...</option>
                    ) : (
                      companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))
                    )}
                  </select>
                </div>
                <button 
                  onClick={fetchCompaniesList}
                  className="btn-secondary" 
                  style={{ height: '40px', width: '40px', justifyContent: 'center', padding: 0 }}
                  title="Refrescar Lista"
                >
                  <RefreshCw size={16} className={loadingCompanies ? 'animate-spin' : ''} />
                </button>
              </div>
            
              {/* CONFIGURACIÓN PERSONALIZADA DE MÓDULOS OTORGADOS A ESTA TIENDA */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={16} style={{ color: 'var(--color-cyan)' }} />
                      Módulos Otorgados a esta Tienda ({companyName})
                    </h4>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
                      Marca los módulos del sistema que deseas habilitar para el cliente/tienda seleccionada.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSaveStoreModules}
                    disabled={savingModules}
                    style={{ fontSize: '11.5px', padding: '6px 14px', borderRadius: '8px' }}
                  >
                    {savingModules ? 'Guardando...' : '💾 Guardar Módulos de esta Tienda'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginTop: '12px' }}>
                  {SYSTEM_ALL_MODULES.map(m => {
                    const isChecked = storeEnabledModules.includes(m.key);
                    return (
                      <div
                        key={m.key}
                        onClick={() => handleToggleStoreModule(m.key)}
                        style={{
                          background: isChecked ? '#e0f2fe' : '#ffffff',
                          border: isChecked ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ marginTop: '3px', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: isChecked ? '#0369a1' : '#334155' }}>
                            {m.label}
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                            {m.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* SECCIÓN 2: CREACIÓN DE CUENTAS / AGREGAR USUARIOS */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-cyan)' }}>
              <UserPlus size={18} />
              Agregar Cuenta de Usuario
            </h3>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre Completo *</label>
                  <div style={{ position: 'relative' }}>
                    <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '36px' }}
                      placeholder="Ej: Ariel Mella"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electrónico *</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      className="form-input"
                      style={{ paddingLeft: '36px' }}
                      placeholder="ariel.mellag@gmail.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Contraseña de Acceso *</label>
                  <div style={{ position: 'relative' }}>
                    <Key size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="password"
                      className="form-input"
                      style={{ paddingLeft: '36px' }}
                      placeholder="••••••••"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Rol del Usuario *</label>
                  <select
                    className="form-input"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    required
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Cajero">Cajero</option>
                    <option value="nexusowner">Nexus Owner (Super Admin)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Asignar a la Tienda *</label>
                <select
                  className="form-input"
                  value={newUser.targetCompanyId}
                  onChange={(e) => setNewUser({ ...newUser, targetCompanyId: e.target.value })}
                  required
                >
                  <option value="">Seleccione una tienda...</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ marginTop: '8px', padding: '12px', justifyContent: 'center' }}
                disabled={creatingUser}
              >
                <UserPlus size={16} style={{ marginRight: '6px' }} />
                {creatingUser ? 'Registrando Cuenta...' : 'Agregar Usuario'}
              </button>
            </form>
          </div>

        </div>

        {/* Columna Derecha: Crear Tiendas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SECCIÓN 3: CREAR TIENDA MATRIZ PUNTO NEXUS & ADMINISTRADOR */}
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '20px', border: '1.5px solid var(--color-cyan)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 900, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
              <PlusCircle size={20} style={{ color: 'var(--color-cyan)' }} />
              Crear Nueva Tienda Matriz (Empresa Independiente)
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>
              Registra un nuevo comercio o cliente SaaS con su propio Administrador y Casa Matriz.
            </p>

            <form onSubmit={handleCreateCompany} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* 1. DATOS DE LA EMPRESA / TIENDA */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label className="form-label" style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  🏢 Nombre de la Empresa / Tienda Matriz *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Repuestos El Chispazo, Restaurante La Casona"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  required
                />

                <label className="form-label" style={{ fontWeight: 800, color: '#0f172a', marginTop: '10px', marginBottom: '4px', display: 'block' }}>
                  🛒 Giro del Negocio / Tipo de Comercio *
                </label>
                <select
                  className="form-input"
                  value={newCompanyGiro}
                  onChange={(e) => setNewCompanyGiro(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '12.5px', fontWeight: 800, borderRadius: '8px' }}
                >
                  <option value="alimentos">🛒 Minimarket / Abasto / Alimentos</option>
                  <option value="gastronomia">🍔 Restaurante / Comida al Paso / Fast Food</option>
                  <option value="servicios">🔧 Taller / Repuestos / Servicios Técnicos</option>
                  <option value="general">🛍️ Comercio General / Tienda de Retail</option>
                </select>
              </div>

              {/* 2. CREACIÓN O ASIGNACIÓN DEL ADMINISTRADOR */}
              <div style={{ background: '#f0f9ff', padding: '14px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                <label className="form-label" style={{ fontWeight: 900, color: '#0369a1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={15} />
                  👤 Configuración del Administrador de la Tienda
                </label>

                {/* Selección de Tipo de Admin */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setAdminMode('new')}
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      background: adminMode === 'new' ? '#0284c7' : '#ffffff',
                      color: adminMode === 'new' ? '#ffffff' : '#0369a1',
                      border: adminMode === 'new' ? 'none' : '1px solid #7dd3fc',
                      cursor: 'pointer'
                    }}
                  >
                    + Crear Nuevo Correo & Clave
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminMode('owner')}
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      background: adminMode === 'owner' ? '#0284c7' : '#ffffff',
                      color: adminMode === 'owner' ? '#ffffff' : '#0369a1',
                      border: adminMode === 'owner' ? 'none' : '1px solid #7dd3fc',
                      cursor: 'pointer'
                    }}
                  >
                    Usar mi Correo (Nexus Owner)
                  </button>
                </div>

                {adminMode === 'new' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '2px' }}>
                        Nombre Completo del Administrador:
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: Carlos Silva (Dueño)"
                        value={adminFullName}
                        onChange={(e) => setAdminFullName(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', fontSize: '12.5px' }}
                        required={adminMode === 'new'}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '2px' }}>
                        📧 Correo de Ingreso (Email):
                      </label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="Ej: carlos@elchispazo.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', fontSize: '12.5px' }}
                        required={adminMode === 'new'}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '2px' }}>
                        🔐 Contraseña Inicial de Acceso:
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: chispazo2026"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', fontSize: '12.5px', fontWeight: 800 }}
                        required={adminMode === 'new'}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#0369a1', background: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #7dd3fc' }}>
                    💡 Se asignará tu usuario actual <strong>{user?.email || 'admin@puntonexus.com'}</strong> como Administrador principal de esta nueva tienda matriz.
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ padding: '12px', justifyContent: 'center', fontSize: '13px', fontWeight: 900, background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}
                disabled={creatingCompany}
              >
                <PlusCircle size={16} style={{ marginRight: '6px' }} />
                {creatingCompany ? 'Creando Tienda Matriz...' : '🚀 Crear Tienda Matriz & Administrador'}
              </button>
            </form>
          </div>

          {/* Información Adicional de Auditoría */}
          <div className="glass-panel" style={{ padding: '20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <h4 style={{ fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} style={{ color: 'var(--color-cyan)' }} />
              Políticas del Sistema
            </h4>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              Todas las altas de cuentas de usuario y creación de tiendas quedan registradas con la firma del Owner actual para fines de auditoría del ecosistema general.
            </p>
          </div>

        </div>
      </div>

      {/* MODAL DE ÉXITO TRAS CREAR TIENDA MATRIZ & CREDENCIALES */}
      {createdModalData && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '480px', padding: '24px', background: '#ffffff', borderRadius: '24px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
              <CheckCircle size={32} />
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0' }}>
              ¡Tienda Matriz Creada Exitosamente!
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 18px 0' }}>
              Se ha registrado la empresa <strong>"{createdModalData.companyName}"</strong> y su cuenta de Administrador principal.
            </p>

            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '14px', textAlign: 'left', marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', marginBottom: '10px' }}>
                🔑 CREDENCIALES DEL ADMINISTRADOR:
              </div>
              <div style={{ fontSize: '12.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>🏢 <strong>Empresa / Tienda:</strong> {createdModalData.companyName}</div>
                <div>👤 <strong>Administrador:</strong> {createdModalData.adminName}</div>
                <div>📧 <strong>Correo de Ingreso:</strong> <span style={{ color: '#0284c7', fontWeight: 800 }}>{createdModalData.adminEmail}</span></div>
                <div>🔐 <strong>Contraseña Inicial:</strong> <span style={{ background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', fontWeight: 900, color: '#0369a1' }}>{createdModalData.adminPassword}</span></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCreatedModalData(null)}
                style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 800 }}
              >
                Cerrar
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  selectCompany(createdModalData.companyId, createdModalData.companyName);
                  setCreatedModalData(null);
                }}
                style={{ flex: 1.3, padding: '10px', fontSize: '12px', fontWeight: 900, background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}
              >
                ⚡ Conmutar a esta Tienda
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
