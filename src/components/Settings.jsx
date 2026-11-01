import React, { useState, useMemo, useEffect } from 'react';
import { usePuntoNexus } from '../context/PuntoNexusContext';
import { supabase } from '../utils/supabaseClient';
import { Settings as SettingsIcon, Globe, DollarSign, Percent, Clock, RefreshCw, Utensils, ShoppingBag, ShoppingCart, User, Coffee, Monitor, Truck, Wrench, Store, Check, Sparkles, Palette, Image as ImageIcon, Building2, MapPin, Plus, ShieldCheck, Upload, Volume2, VolumeX, Smartphone, MessageSquare, Calculator, BellRing, Save, Scissors } from 'lucide-react';
import ExchangeRateChart from './ExchangeRateChart';
import DualCurrencyDisplay from './DualCurrencyDisplay';
import { isSoundEnabled, setSoundEnabled, playSound, requestNotificationPermission, showNativeSaleNotification } from '../utils/soundEffects';
import { cleanWhatsAppNumber } from '../utils/shiftExport';

const GIROS_COMERCIALES = [
  { 
    id: 'belleza', 
    name: 'Barbería, Salón & Estética', 
    icon: Scissors, 
    color: '#ec4899', 
    gradient: 'linear-gradient(135deg, #f43f5e, #ec4899, #a855f7)',
    desc: 'Gestión moderna para Barberías y Salones: Membresías prepago (pases de sesiones), IA de recompra predictiva por WhatsApp y control de insumos por profesional.'
  },
  { 
    id: 'tienda_online', 
    name: 'Tienda Online / E-Commerce', 
    icon: Globe, 
    color: '#0284c7', 
    gradient: 'linear-gradient(135deg, #38bdf8, #0284c7)',
    desc: 'Catálogo web interactivo, ventas online, envíos a domicilio, pedidos a WhatsApp y retiro en tienda. Sin comandero de mesas ni cocina.'
  },
  { 
    id: 'boutique', 
    name: 'Boutique', 
    icon: ShoppingBag, 
    color: '#ec4899', 
    gradient: 'linear-gradient(135deg, #f472b6, #ec4899)',
    desc: 'Venta de ropa, calzado, moda, confección y accesorios de vestir.'
  },
  { 
    id: 'alimentos', 
    name: 'Alimentos', 
    icon: ShoppingCart, 
    color: '#a855f7', 
    gradient: 'linear-gradient(135deg, #c084fc, #9333ea)',
    desc: 'Minimarkets, supermercados, abarrotes, bodegas y panaderías.'
  },
  { 
    id: 'servicios', 
    name: 'Servicios', 
    icon: User, 
    color: '#3b82f6', 
    gradient: 'linear-gradient(135deg, #60a5fa, #2563eb)',
    desc: 'Servicios profesionales, talleres, barberías, salones y consultoría.'
  },
  { 
    id: 'gastronomia', 
    name: 'Gastronomía', 
    icon: Coffee, 
    color: '#f59e0b', 
    gradient: 'linear-gradient(135deg, #fbbf24, #d97706)',
    desc: 'Restaurantes, comensales, comandero de mesas, cafeterías y comida rápida.'
  },
  { 
    id: 'electronica', 
    name: 'Electrónica / Accesorios', 
    icon: Monitor, 
    color: '#06b6d4', 
    gradient: 'linear-gradient(135deg, #22d3ee, #0891b2)',
    desc: 'Computación, tecnología, celulares, gadgetry y accesorios.'
  },
  { 
    id: 'repuestos', 
    name: 'Repuestos', 
    icon: Truck, 
    color: '#8b5cf6', 
    gradient: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    desc: 'Repuestos automotrices, garaje, autopartes y suministros.'
  },
  { 
    id: 'ferreteria', 
    name: 'Ferretería', 
    icon: Wrench, 
    color: '#ef4444', 
    gradient: 'linear-gradient(135deg, #f87171, #dc2626)',
    desc: 'Artículos de ferretería, construcción, herramientas y materiales.'
  }
];

export default function Settings({ onOpenProfileModal }) {
  const { 
    companySettings, 
    updateCompanySettings, 
    companyName, 
    setCompanyName, 
    updateCompanyName, 
    syncExchangeRate, 
    rateHistory, 
    bcvRate, 
    paraleloRate, 
    euroRate, 
    bcvLastUpdated, 
    loading, 
    branches = [], 
    activeBranchId, 
    switchBranch, 
    addBranch,
    fixedCosts = {},
    updateFixedCosts,
    formatCurrency,
    triggerSaleAlert
  } = usePuntoNexus();

  const currentGiro = companySettings.business_type || (companyName?.toLowerCase().includes('anubis') ? 'tienda_online' : 'gastronomia');
  const selectedGiroObj = GIROS_COMERCIALES.find(g => g.id === currentGiro) || GIROS_COMERCIALES[0];

  // ─── Gestión de Costos Fijos Base de la Empresa ───
  const [fixedCostsForm, setFixedCostsForm] = useState({
    rent: fixedCosts?.rent || 0,
    salaries: fixedCosts?.salaries || 0,
    services: fixedCosts?.services || 0,
    software: fixedCosts?.software || 0,
    marketing: fixedCosts?.marketing || 0,
    other: fixedCosts?.other || 0
  });
  const [savedFixedCostsMsg, setSavedFixedCostsMsg] = useState(null);

  useEffect(() => {
    setFixedCostsForm({
      rent: fixedCosts?.rent || 0,
      salaries: fixedCosts?.salaries || 0,
      services: fixedCosts?.services || 0,
      software: fixedCosts?.software || 0,
      marketing: fixedCosts?.marketing || 0,
      other: fixedCosts?.other || 0
    });
  }, [fixedCosts]);

  const totalFixedCostsSettings = useMemo(() => {
    return (
      Number(fixedCostsForm.rent || 0) +
      Number(fixedCostsForm.salaries || 0) +
      Number(fixedCostsForm.services || 0) +
      Number(fixedCostsForm.software || 0) +
      Number(fixedCostsForm.marketing || 0) +
      Number(fixedCostsForm.other || 0)
    );
  }, [fixedCostsForm]);

  const handleSaveFixedCostsSettings = (e) => {
    if (e) e.preventDefault();
    updateFixedCosts(fixedCostsForm);
    setSavedFixedCostsMsg('¡Costos fijos actualizados y guardados!');
    setTimeout(() => setSavedFixedCostsMsg(null), 2500);
  };

  const handleResetFixedCostsToZero = () => {
    const zeroCosts = { rent: 0, salaries: 0, services: 0, software: 0, marketing: 0, other: 0 };
    setFixedCostsForm(zeroCosts);
    updateFixedCosts(zeroCosts);
    setSavedFixedCostsMsg('¡Costos fijos restablecidos a $0 (sin costos asumidos)!');
    setTimeout(() => setSavedFixedCostsMsg(null), 2500);
  };

  // ─── Estado reactivo y persistencia de WhatsApp & Configuración General ───
  const [whatsappPhone, setWhatsappPhone] = useState(companySettings.owner_whatsapp_phone || '');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  useEffect(() => {
    if (companySettings?.owner_whatsapp_phone !== undefined) {
      setWhatsappPhone(companySettings.owner_whatsapp_phone || '');
    }
  }, [companySettings?.owner_whatsapp_phone]);

  const handleSaveAllSettings = async (additionalUpdates = {}) => {
    setIsSavingSettings(true);
    setSaveSuccessMsg(null);
    try {
      const cleanPhone = (whatsappPhone || '').trim();
      const updates = {
        owner_whatsapp_phone: cleanPhone,
        phone: cleanPhone,
        ...additionalUpdates
      };
      const res = await updateCompanySettings(updates);
      if (res?.error) {
        alert('⚠️ Error al guardar configuración: ' + res.error);
      } else {
        setSaveSuccessMsg('¡Configuración guardada y sincronizada exitosamente!');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (e) {
      alert('⚠️ Error inesperado: ' + (e.message || e));
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ─── Sincronización manual de sucursales desde Supabase ───
  const [syncingBranches, setSyncingBranches] = useState(false);
  const [branchSyncMsg, setBranchSyncMsg] = useState(null);
  const [soundEnabled, setSoundEnabledState] = useState(() => isSoundEnabled());

  // ─── Pestañas de Configuración y Navegación Rápida ───
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('punto_nexus_settings_tab');
    const validTabs = ['empresa', 'marca', 'costos', 'impuestos', 'moneda', 'sistema'];
    return validTabs.includes(saved) ? saved : 'empresa';
  });

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem('punto_nexus_settings_tab', tabId);
  };

  // ─── Gestión de Régimen Tributario (Con IVA vs Sin IVA) ───
  const isTaxEnabled = companySettings.tax_enabled !== false && Number(companySettings.tax_rate ?? 0.16) > 0;
  const currentTaxPct = isTaxEnabled 
    ? Math.round(Number(companySettings.tax_rate !== undefined && companySettings.tax_rate !== null ? companySettings.tax_rate : 0.19) * 100)
    : 0;

  const SETTINGS_TABS = [
    {
      id: 'empresa',
      label: 'Empresa & Sedes',
      icon: Building2,
      badge: `${branches.length || 1} ${branches.length === 1 ? 'sede' : 'sedes'}`
    },
    {
      id: 'marca',
      label: 'Marca & Menú QR',
      icon: Palette,
      badge: 'QR & Logo'
    },
    {
      id: 'costos',
      label: 'Costos Fijos',
      icon: Calculator,
      badge: totalFixedCostsSettings > 0 ? `$${totalFixedCostsSettings}` : '$0'
    },
    {
      id: 'impuestos',
      label: 'Régimen Fiscal & IVA',
      icon: Percent,
      badge: isTaxEnabled ? `${currentTaxPct}% IVA` : '0% Exento'
    },
    {
      id: 'moneda',
      label: 'Moneda & Tasas',
      icon: DollarSign,
      badge: companySettings.use_usd_pricing ? 'USD' : (companySettings.currency_code || 'CLP')
    },
    {
      id: 'sistema',
      label: 'Sistema & Permisos',
      icon: ShieldCheck,
      badge: null
    }
  ];

  const handleEnableTax = async () => {
    const country = companySettings.country || 'CL';
    const defaultRate = country === 'VE' ? 0.16 : country === 'AR' ? 0.21 : 0.19;
    const res = await updateCompanySettings({
      tax_enabled: true,
      tax_rate: defaultRate,
      tax_name: 'IVA'
    });
    if (res.error) alert(res.error);
  };

  const handleDisableTax = async () => {
    const res = await updateCompanySettings({
      tax_enabled: false,
      tax_rate: 0.0,
      tax_name: 'Sin IVA'
    });
    if (res.error) alert(res.error);
  };

  const handleChangeTaxRate = async (newPct) => {
    const numericRate = Math.max(0, Math.min(100, Number(newPct) || 0)) / 100;
    const res = await updateCompanySettings({
      tax_rate: numericRate,
      tax_enabled: numericRate > 0
    });
    if (res.error) alert(res.error);
  };

  const handleSyncBranchesFromDB = async () => {
    const companyId = companySettings.company_id || localStorage.getItem('punto_nexus_company_id');
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId);

    if (!isValidUUID) {
      setBranchSyncMsg({ type: 'warn', text: 'La sincronización remota requiere una cuenta Supabase. Las sucursales actuales están guardadas localmente.' });
      setTimeout(() => setBranchSyncMsg(null), 4000);
      return;
    }

    setSyncingBranches(true);
    try {
      const { data, error } = await supabase
        .from('punto_nexus_branches')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        localStorage.setItem(`punto_nexus_branches_${companyId}`, JSON.stringify(data));
        window.location.reload();
      } else {
        // Limpiar sucursales secundarias fantasmas en localStorage si no existen en el servidor Supabase
        const defaultMain = [{ id: 'branch-matriz', name: 'Matriz Principal', code: 'MATRIZ-01', is_main: true, business_type: 'gastronomia' }];
        localStorage.setItem(`punto_nexus_branches_${companyId}`, JSON.stringify(defaultMain));
        localStorage.setItem(`punto_nexus_active_branch_${companyId}`, 'branch-matriz');
        setBranchSyncMsg({ type: 'info', text: 'No existen sucursales remotas en Supabase para esta empresa. Se han removido las sucursales locales.' });
        setTimeout(() => {
          setBranchSyncMsg(null);
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      const isMissingTable = err.message?.includes('schema cache') || err.message?.includes('does not exist');
      const msg = isMissingTable 
        ? 'La tabla de sucursales en Supabase no ha sido migrada aún. Las sucursales funcionan perfectamente en modo local en esta instancia.'
        : `Error: ${err.message}`;
      setBranchSyncMsg({ type: 'warn', text: msg });
      setTimeout(() => setBranchSyncMsg(null), 6000);
    } finally {
      setSyncingBranches(false);
    }
  };

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoSaveMsg, setLogoSaveMsg] = useState(null);

  const compressImageFile = (file, maxDim = 350) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png', 0.85));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleLogoFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setLogoSaveMsg("⏳ Optimizando y guardando logo en Supabase...");

    const compressedDataUrl = await compressImageFile(file, 350);
    if (!compressedDataUrl) {
      alert("⚠️ No se pudo procesar la imagen seleccionada.");
      setIsUploadingLogo(false);
      return;
    }

    const res = await updateCompanySettings({ logo_url: compressedDataUrl });
    setIsUploadingLogo(false);

    if (res?.error) {
      setLogoSaveMsg("⚠️ Guardado localmente (sin conexión a servidor)");
    } else {
      setLogoSaveMsg("✅ Logo optimizado y sincronizado en Supabase para todas las PCs");
    }
    setTimeout(() => setLogoSaveMsg(null), 5000);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '820px', margin: '0 auto' }}>
      
      {/* Cabecera Principal */}
      <div className="glass-panel" style={{
        padding: '22px 24px',
        background: 'linear-gradient(135deg, rgba(6,182,212,0.06), rgba(99,102,241,0.06))',
        border: '1px solid rgba(6, 182, 212, 0.2)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            background: 'rgba(6,182,212,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-cyan)',
            flexShrink: 0
          }}>
            <SettingsIcon size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Ajustes y Localización del Establecimiento</h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
              Configura el país de operación, moneda, reglas tributarias, logo, WhatsApp de pedidos y sedes.
            </p>
          </div>
        </div>

        {/* Botón Principal de Guardado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {saveSuccessMsg && (
            <span style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#059669',
              background: 'rgba(16, 185, 129, 0.12)',
              padding: '7px 12px',
              borderRadius: '9px',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              animation: 'fadeIn 0.2s ease'
            }}>
              <Check size={14} />
              <span>{saveSuccessMsg}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => handleSaveAllSettings()}
            disabled={isSavingSettings}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: isSavingSettings ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            {isSavingSettings ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
            <span>{isSavingSettings ? 'Guardando...' : 'Guardar Configuración 💾'}</span>
          </button>
        </div>
      </div>

      {/* Barra de Navegación por Pestañas */}
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        padding: '6px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {SETTINGS_TABS.map(tab => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '12px',
                border: isActive ? '1.5px solid var(--color-cyan, #06b6d4)' : '1.5px solid transparent',
                background: isActive 
                  ? 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(99,102,241,0.06))' 
                  : 'transparent',
                color: isActive ? '#0891b2' : '#64748b',
                fontWeight: isActive ? 800 : 600,
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.18s ease',
                flex: '1 1 0',
                justifyContent: 'center',
                minWidth: 'fit-content'
              }}
            >
              <IconComp size={16} style={{ color: isActive ? '#0891b2' : '#94a3b8', flexShrink: 0 }} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '99px',
                  background: isActive ? '#0891b2' : '#f1f5f9',
                  color: isActive ? '#ffffff' : '#64748b',
                  border: isActive ? 'none' : '1px solid #e2e8f0',
                  lineHeight: '1.2',
                  flexShrink: 0
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── PESTAÑA 1: EMPRESA & SEDES ─── */}
      {activeTab === 'empresa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.2s ease' }}>
          {/* PANEL 0: SELECTOR DE GIRO COMERCIAL DEL NEGOCIO */}
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Store size={16} />
            Giro Comercial & Modalidad del Negocio
          </h3>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '3px 10px', borderRadius: '99px', border: '1px solid #e2e8f0' }}>
            {GIROS_COMERCIALES.length} Giros Disponibles
          </span>
        </div>

        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '18px', marginTop: 0 }}>
          Selecciona el giro de tu empresa. Próximamente los módulos del sistema se adaptarán de forma dinámica según las necesidades operativas de tu rubro.
        </p>

        {/* Barra de Píldoras de Giros Comerciales */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '16px', scrollbarWidth: 'thin' }}>
          {GIROS_COMERCIALES.map(giro => {
            const IconComp = giro.icon;
            const isSelected = currentGiro === giro.id || (currentGiro === 'restaurant' && giro.id === 'gastronomia') || (currentGiro === 'general' && giro.id === 'repuestos');

            return (
              <button
                key={giro.id}
                type="button"
                onClick={async () => {
                  const updates = { business_type: giro.id };
                  if (giro.id !== 'gastronomia') {
                    const userMods = companySettings.user_modules || {};
                    updates.user_modules = { ...userMods, tables: false };
                  }
                  const res = await updateCompanySettings(updates);
                  if (res.error) alert(res.error);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: '99px',
                  border: isSelected ? `2px solid ${giro.color}` : '1px solid #cbd5e1',
                  background: isSelected ? giro.gradient : '#ffffff',
                  color: isSelected ? '#ffffff' : '#0f172a',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? `0 4px 14px ${giro.color}40` : '0 1px 3px rgba(15,23,42,0.04)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  flexShrink: 0
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isSelected ? 'rgba(255,255,255,0.25)' : `${giro.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isSelected ? '#ffffff' : giro.color
                }}>
                  <IconComp size={14} />
                </div>
                <span>{giro.name}</span>
                {isSelected && <Check size={14} style={{ strokeWidth: 3 }} />}
              </button>
            );
          })}
        </div>

        {/* Tarjeta de Confirmación de Giro Seleccionado */}
        {selectedGiroObj && (
          <div style={{
            background: '#f8fafc',
            border: `1px solid ${selectedGiroObj.color}30`,
            borderLeft: `4px solid ${selectedGiroObj.color}`,
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            gap: '14px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: selectedGiroObj.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: `0 3px 10px ${selectedGiroObj.color}40`
              }}>
                {React.createElement(selectedGiroObj.icon, { size: 20 })}
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                  Giro Activo: {selectedGiroObj.name}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  {selectedGiroObj.desc}
                </div>
              </div>
            </div>

            <span style={{ fontSize: '11px', fontWeight: 700, color: selectedGiroObj.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={13} />
              Configurado para la tienda
            </span>
          </div>
        )}

      </div>

      {/* PANEL 0A: SUCURSALES Y CASAS MATRICES ANCLADAS */}
      <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={16} />
            Estructura de Sedes y Sucursales Ancladas
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '99px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              1 Matriz + {Math.max(0, branches.length - 1)} Sucursales
            </span>
            <button
              onClick={handleSyncBranchesFromDB}
              disabled={syncingBranches}
              title="Recargar sucursales desde el servidor (comparte las sucursales entre todas las cuentas de esta empresa)"
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 12px', borderRadius: '99px', cursor: 'pointer',
                background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.3)',
                color: 'var(--color-cyan)', fontSize: '11px', fontWeight: 800,
                opacity: syncingBranches ? 0.6 : 1, transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={12} style={{ animation: syncingBranches ? 'spin 1s linear infinite' : 'none' }} />
              {syncingBranches ? 'Sincronizando...' : 'Sincronizar desde servidor'}
            </button>
          </div>
        </div>

        {/* Mensaje de estado de sincronización */}
        {branchSyncMsg && (
          <div style={{
            padding: '8px 14px', borderRadius: '10px', marginBottom: '12px', fontSize: '12px', fontWeight: 700,
            background: branchSyncMsg.type === 'error' ? 'rgba(239,68,68,0.1)' : branchSyncMsg.type === 'warn' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
            color: branchSyncMsg.type === 'error' ? '#dc2626' : branchSyncMsg.type === 'warn' ? '#b45309' : '#059669',
            border: `1px solid ${branchSyncMsg.type === 'error' ? 'rgba(239,68,68,0.3)' : branchSyncMsg.type === 'warn' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`
          }}>
            {branchSyncMsg.text}
          </div>
        )}

        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px', marginTop: 0 }}>
          Las sucursales creadas quedan ancladas a la <strong>Matriz Principal</strong> de la empresa y son visibles para <strong>todas las cuentas</strong> del mismo establecimiento al sincronizarse con el servidor.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {branches.map(b => {
            const isActive = b.id === activeBranchId;
            return (
              <div
                key={b.id}
                onClick={() => switchBranch(b.id)}
                style={{
                  padding: '14px',
                  borderRadius: '14px',
                  border: isActive ? '2px solid var(--color-cyan)' : '1px solid #cbd5e1',
                  background: isActive ? 'rgba(6, 182, 212, 0.04)' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{b.name}</span>
                    <span style={{ fontSize: '9px', fontWeight: 900, padding: '2px 6px', borderRadius: '4px', background: b.is_main ? '#10b981' : '#06b6d4', color: '#fff' }}>
                      {b.is_main ? 'CASA MATRIZ' : 'SUCURSAL'}
                    </span>
                  </div>
                  {b.address && (
                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={11} />
                      <span>{b.address}</span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8' }}>Código: {b.code || 'SUC-01'}</span>
                  {isActive ? (
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-cyan)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Check size={12} /> Activa
                    </span>
                  ) : (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>Hacer clic para activar</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PANEL 3: HORARIOS COMERCIALES */}
      <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-cyan)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} />
          Horarios Comerciales
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label">Hora de Apertura</label>
            <input
              type="time"
              className="form-input"
              value={companySettings.opening_time || '09:00'}
              onChange={async (e) => {
                const res = await updateCompanySettings({ opening_time: e.target.value });
                if (res.error) alert(res.error);
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Hora de Cierre</label>
            <input
              type="time"
              className="form-input"
              value={companySettings.closing_time || '20:00'}
              onChange={async (e) => {
                const res = await updateCompanySettings({ closing_time: e.target.value });
                if (res.error) alert(res.error);
              }}
            />
          </div>
        </div>
      </div>

      {/* PANEL 3B: CANAL DE PEDIDOS & WHATSAPP OFICIAL DEL NEGOCIO */}
      <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={17} style={{ color: '#10b981' }} />
            Canal de Pedidos & WhatsApp Oficial del Negocio
          </h3>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '99px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            Receptor de Compras & Ventas
          </span>
        </div>

        <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px 0', lineHeight: '1.5' }}>
          Este es el número oficial al que los clientes enviarán sus compras y pedidos realizados desde la tienda online o código QR (delivery y retiro), y donde se remitirán los cierres de turno de caja.
        </p>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: +584121234567 o +56912345678 (con código de país)"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', fontSize: '13px', fontWeight: 700, borderRadius: '10px' }}
            />
          </div>

          <button
            type="button"
            onClick={() => handleSaveAllSettings()}
            disabled={isSavingSettings}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '10px',
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: isSavingSettings ? 'wait' : 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            {isSavingSettings ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            <span>Guardar WhatsApp 💾</span>
          </button>

          {whatsappPhone && (
            <a
              href={`https://wa.me/${cleanWhatsAppNumber(whatsappPhone, companySettings?.country || 'VE')}?text=${encodeURIComponent('Hola, este es un mensaje de prueba desde SoLago.')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '10px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '12px',
                textDecoration: 'none'
              }}
              title="Abrir chat de prueba para verificar que el número esté correcto"
            >
              <span>📲 Probar Chat</span>
            </a>
          )}
        </div>

        {whatsappPhone && (
          <div style={{ marginTop: '10px', fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 800, color: '#059669' }}>Formato Internacional Detectado:</span>
            <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, color: '#0f172a' }}>
              +{cleanWhatsAppNumber(whatsappPhone, companySettings?.country || 'VE')}
            </code>
            <span style={{ color: '#10b981' }}>✓ Listo para enviar pedidos directos</span>
          </div>
        )}
      </div>
    </div>
  )}

  {/* ─── PESTAÑA 2: MARCA & MENÚ QR ─── */}
  {activeTab === 'marca' && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.2s ease' }}>
      {/* PANEL 0B: IDENTIDAD DE MARCA, LOGO Y COLORES DEL MENÚ QR */}
      <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Palette size={16} />
            Identidad de Marca, Logo & Colores del Menú QR
          </h3>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '3px 10px', borderRadius: '99px' }}>
            Personalización para Clientes
          </span>
        </div>

        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '18px', marginTop: 0 }}>
          Define el logo y la paleta cromática de tu empresa. El menú digital QR aplicará automáticamente estos colores y compartirá el nombre de tu marca en cada link generado.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* Logo de la Empresa */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 800 }}>Logo de la Empresa (Subir o URL)</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {companySettings.logo_url ? (
                <img 
                  src={companySettings.logo_url} 
                  alt="Logo" 
                  style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                />
              ) : (
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <ImageIcon size={22} />
                </div>
              )}

              <input
                type="text"
                className="form-input"
                placeholder="https://ejemplo.com/logo.png"
                value={companySettings.logo_url || ''}
                onChange={async (e) => {
                  await updateCompanySettings({ logo_url: e.target.value });
                }}
                style={{ flex: 1, minWidth: '160px', fontSize: '12px' }}
              />

              <label 
                className="btn-secondary" 
                style={{ 
                  padding: '8px 12px', 
                  fontSize: '11px', 
                  fontWeight: 800, 
                  cursor: isUploadingLogo ? 'wait' : 'pointer', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  background: isUploadingLogo ? 'rgba(148, 163, 184, 0.15)' : 'rgba(6,182,212,0.08)',
                  border: isUploadingLogo ? '1px solid #cbd5e1' : '1px solid rgba(6,182,212,0.3)',
                  color: isUploadingLogo ? '#64748b' : 'var(--color-cyan)',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap'
                }}
                title="Selecciona una imagen desde tu equipo (PNG, JPG, SVG)"
              >
                {isUploadingLogo ? <RefreshCw size={13} className="spin" /> : <Upload size={13} />}
                <span>{isUploadingLogo ? 'Subiendo...' : 'Subir Imagen'}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  disabled={isUploadingLogo}
                  onChange={handleLogoFileUpload} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
            {logoSaveMsg ? (
              <span style={{ fontSize: '11px', color: logoSaveMsg.includes('⚠️') ? '#d97706' : '#059669', marginTop: '6px', display: 'block', fontWeight: 800 }}>
                {logoSaveMsg}
              </span>
            ) : (
              <span style={{ fontSize: '10.5px', color: '#059669', marginTop: '5px', display: 'block', fontWeight: 700 }}>
                💾 El logo se guarda en la Base de Datos Supabase y se mostrará en tu barra lateral y catálogo QR.
              </span>
            )}
          </div>

          {/* Nombre Comercial */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 800 }}>Nombre Comercial de la Empresa</label>
            <input
              type="text"
              className="form-input"
              value={companyName || 'Punto Nexus'}
              onChange={async (e) => {
                const val = e.target.value;
                await updateCompanyName(val);
              }}
              style={{ fontSize: '13px', fontWeight: 700 }}
            />
            <span style={{ fontSize: '10.5px', color: '#059669', marginTop: '5px', display: 'block', fontWeight: 700 }}>
              💾 El nombre se sincroniza automáticamente con la Base de Datos Supabase para todas las cuentas.
            </span>
          </div>
        </div>

        {/* Selección de Colores del Menú */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
          <label className="form-label" style={{ fontWeight: 800, marginBottom: '12px', display: 'block' }}>
            Paletas de Colores Predefinidas para el Menú QR
          </label>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {[
              { name: '🩵 Smartlean Cyan', brand: '#0f172a', accent: '#06b6d4' },
              { name: '🟢 Verde Esmeralda', brand: '#064e3b', accent: '#10b981' },
              { name: '🟣 Violeta Neón', brand: '#1e1b4b', accent: '#a855f7' },
              { name: '🟧 Ámbar Cálido', brand: '#451a03', accent: '#f59e0b' },
              { name: '🔴 Rojo Carmín', brand: '#450a0a', accent: '#ef4444' },
              { name: '🖤 Monocromo Elegante', brand: '#0f172a', accent: '#0f172a' }
            ].map(p => (
              <button
                key={p.name}
                type="button"
                onClick={async () => {
                  await updateCompanySettings({ 
                    brand_color: p.brand, 
                    accent_color: p.accent,
                    button_color: p.accent,
                    price_color: p.accent
                  });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: companySettings.brand_color === p.brand ? `2px solid ${p.accent}` : '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: p.brand }} />
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: p.accent }} />
                <span>{p.name}</span>
              </button>
            ))}
          </div>

          {/* 3 Controles de Color Específicos: Encabezado, Botón y Precio */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {/* Color del Encabezado */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 700 }}>🏙️ Fondo del Encabezado</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={companySettings.brand_color || '#0f172a'}
                  onChange={async (e) => await updateCompanySettings({ brand_color: e.target.value })}
                  style={{ width: '38px', height: '38px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={companySettings.brand_color || '#0f172a'}
                  onChange={async (e) => await updateCompanySettings({ brand_color: e.target.value })}
                  style={{ fontFamily: 'monospace', fontSize: '12px', flex: 1 }}
                />
              </div>
            </div>

            {/* Color de los Precios */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 700 }}>💵 Color de los Precios</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={companySettings.price_color || companySettings.accent_color || '#06b6d4'}
                  onChange={async (e) => await updateCompanySettings({ price_color: e.target.value })}
                  style={{ width: '38px', height: '38px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={companySettings.price_color || companySettings.accent_color || '#06b6d4'}
                  onChange={async (e) => await updateCompanySettings({ price_color: e.target.value })}
                  style={{ fontFamily: 'monospace', fontSize: '12px', flex: 1 }}
                />
              </div>
            </div>

            {/* Color de los Botones */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 700 }}>🔘 Color de Botones (+ AGREGAR)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={companySettings.button_color || companySettings.accent_color || '#06b6d4'}
                  onChange={async (e) => await updateCompanySettings({ button_color: e.target.value })}
                  style={{ width: '38px', height: '38px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={companySettings.button_color || companySettings.accent_color || '#06b6d4'}
                  onChange={async (e) => await updateCompanySettings({ button_color: e.target.value })}
                  style={{ fontFamily: 'monospace', fontSize: '12px', flex: 1 }}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Vista Previa de la Cabecera y Tarjeta de Producto */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Cabecera */}
          <div style={{
            background: companySettings.brand_color || '#0f172a',
            padding: '14px 18px',
            borderRadius: '12px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            borderBottom: `3px solid ${companySettings.button_color || companySettings.accent_color || '#06b6d4'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {companySettings.logo_url ? (
                <img src={companySettings.logo_url} alt="Logo Preview" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: companySettings.button_color || companySettings.accent_color || '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                  {companyName ? companyName.charAt(0) : 'P'}
                </div>
              )}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 900 }}>{companyName || 'Punto Nexus'}</div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Vista Previa del Menú Digital</div>
              </div>
            </div>

            <span style={{ fontSize: '10px', fontWeight: 900, background: `${companySettings.button_color || companySettings.accent_color || '#06b6d4'}30`, color: companySettings.button_color || companySettings.accent_color || '#06b6d4', padding: '3px 8px', borderRadius: '6px' }}>
              ENCABEZADO
            </span>
          </div>

          {/* Mini Tarjeta de Producto para probar precio y botón */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            boxShadow: '0 2px 8px rgba(15,23,42,0.04)'
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>1+1140 grs. Soprole</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: companySettings.price_color || companySettings.accent_color || '#06b6d4', marginTop: '2px' }}>
                $700.00 <span style={{ fontSize: '11px', color: '#64748b' }}>(Bs. 512.735)</span>
              </div>
            </div>

            <button
              type="button"
              style={{
                background: companySettings.button_color 
                  ? `linear-gradient(135deg, ${companySettings.button_color} 0%, ${companySettings.button_color}dd 100%)` 
                  : 'linear-gradient(135deg, #06b6d4, #0284c7)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 900,
                boxShadow: `0 4px 12px ${companySettings.button_color || '#06b6d4'}40`
              }}
            >
              + AGREGAR
            </button>
          </div>
        </div>

      </div>
    </div>
  )}

  {/* ─── PESTAÑA: COSTOS FIJOS ─── */}
  {activeTab === 'costos' && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.2s ease' }}>
      <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={18} />
              Plantilla de Costos Fijos Base de la Empresa
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
              Define los costos fijos mensuales asumidos por tu negocio. Por defecto todos inician en $0.00 para que ningún costo venga asumido por error.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleResetFixedCostsToZero}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '12px'
              }}
            >
              Restablecer todo a $0
            </button>
            <button
              type="button"
              onClick={handleSaveFixedCostsSettings}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                background: 'var(--color-cyan)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '12.5px',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
              }}
            >
              Guardar Costos Fijos
            </button>
          </div>
        </div>

        {savedFixedCostsMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '12.5px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={16} /> {savedFixedCostsMsg}
          </div>
        )}

        <form onSubmit={handleSaveFixedCostsSettings}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>🏠 Arriendo / Alquiler ($)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="form-input"
                placeholder="0"
                value={fixedCostsForm.rent !== undefined && fixedCostsForm.rent !== null ? fixedCostsForm.rent : ''}
                onChange={(e) => setFixedCostsForm({ ...fixedCostsForm, rent: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>Costo de arrendamiento mensual del local o tienda</span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>👥 Sueldos y Nómina Fija ($)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="form-input"
                placeholder="0"
                value={fixedCostsForm.salaries !== undefined && fixedCostsForm.salaries !== null ? fixedCostsForm.salaries : ''}
                onChange={(e) => setFixedCostsForm({ ...fixedCostsForm, salaries: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>Salarios de empleados y colaboradores fijos</span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>⚡ Servicios Públicos Fijos ($)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="form-input"
                placeholder="0"
                value={fixedCostsForm.services !== undefined && fixedCostsForm.services !== null ? fixedCostsForm.services : ''}
                onChange={(e) => setFixedCostsForm({ ...fixedCostsForm, services: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>Estimación mensual de electricidad, agua, internet, etc.</span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>💻 Software y POS ($)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="form-input"
                placeholder="0"
                value={fixedCostsForm.software !== undefined && fixedCostsForm.software !== null ? fixedCostsForm.software : ''}
                onChange={(e) => setFixedCostsForm({ ...fixedCostsForm, software: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>Licencias de sistemas, nube, dominio y software</span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>📢 Publicidad y Marketing Fijo ($)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="form-input"
                placeholder="0"
                value={fixedCostsForm.marketing !== undefined && fixedCostsForm.marketing !== null ? fixedCostsForm.marketing : ''}
                onChange={(e) => setFixedCostsForm({ ...fixedCostsForm, marketing: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>Pauta mensual en redes sociales o marketing recurrente</span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>📦 Otros Costos Fijos ($)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="form-input"
                placeholder="0"
                value={fixedCostsForm.other !== undefined && fixedCostsForm.other !== null ? fixedCostsForm.other : ''}
                onChange={(e) => setFixedCostsForm({ ...fixedCostsForm, other: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>Contabilidad, seguros o mantenimientos periódicos</span>
            </div>
          </div>

          {/* Resumen Total de Costos Fijos */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(2, 132, 199, 0.08) 100%)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>TOTAL COSTOS FIJOS MENSUALES ESTIMADOS:</div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                {totalFixedCostsSettings === 0 ? 'Sin costos fijos asignados ($0.00)' : 'Suma de los 6 conceptos recurrentes de la empresa'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <DualCurrencyDisplay amount={totalFixedCostsSettings} fontSize="20px" primaryColor="var(--color-cyan)" showSwap={false} align="right" />
            </div>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* ─── PESTAÑA 3: RÉGIMEN FISCAL & IVA ─── */}
  {activeTab === 'impuestos' && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.2s ease' }}>
      {/* PANEL 1: LOCALIZACIÓN GEOGRÁFICA Y TRIBUTOS */}
      <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-cyan)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={16} />
            Localización y Régimen Tributario (IVA / Impuestos)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div className="form-group">
              <label className="form-label">País de Operación</label>
              <select
                className="form-input"
                style={{ width: '100%' }}
                value={companySettings.country || 'CL'}
                onChange={async (e) => {
                  const country = e.target.value;
                  let updates = { country };
                  if (country === 'VE') {
                    updates = {
                      ...updates,
                      currency_code: 'VES',
                      currency_symbol: 'Bs.',
                      use_usd_pricing: true,
                      exchange_rate_source: 'bcv'
                    };
                  } else if (country === 'CO') {
                    updates = {
                      ...updates,
                      currency_code: 'COP',
                      currency_symbol: 'Col$',
                      use_usd_pricing: false,
                      exchange_rate_source: 'manual',
                      exchange_rate: 1.0
                    };
                  } else if (country === 'AR') {
                    updates = {
                      ...updates,
                      currency_code: 'ARS',
                      currency_symbol: 'AR$',
                      use_usd_pricing: false,
                      exchange_rate_source: 'manual',
                      exchange_rate: 1.0
                    };
                  } else {
                    // Chile por defecto
                    updates = {
                      ...updates,
                      currency_code: 'CLP',
                      currency_symbol: '$',
                      use_usd_pricing: false,
                      exchange_rate_source: 'manual',
                      exchange_rate: 1.0
                    };
                  }

                  // Si la empresa trabaja Con IVA, aplicar la tasa por defecto del nuevo país
                  if (isTaxEnabled) {
                    if (country === 'VE') updates.tax_rate = 0.16;
                    else if (country === 'AR') updates.tax_rate = 0.21;
                    else updates.tax_rate = 0.19;
                    updates.tax_name = 'IVA';
                    updates.tax_enabled = true;
                  } else {
                    // Si opera Sin IVA, mantener régimen exento
                    updates.tax_rate = 0.0;
                    updates.tax_enabled = false;
                  }

                  const res = await updateCompanySettings(updates);
                  if (res.error) alert(res.error);
                }}
              >
                <option value="CL">Chile (CLP / Moneda Local)</option>
                <option value="VE">Venezuela (VES / Fijación USD)</option>
                <option value="CO">Colombia (COP / Moneda Local)</option>
                <option value="AR">Argentina (ARS / Moneda Local)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estado Fiscal Actual</label>
              <div style={{ display: 'flex', alignItems: 'center', height: '42px', padding: '0 14px', borderRadius: '10px', background: isTaxEnabled ? 'rgba(16, 185, 129, 0.08)' : 'rgba(6, 182, 212, 0.08)', border: isTaxEnabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(6, 182, 212, 0.3)' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: isTaxEnabled ? '#059669' : 'var(--color-cyan, #06b6d4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isTaxEnabled ? (
                    <>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                      AFECTO A {companySettings.tax_name || 'IVA'} ({currentTaxPct}%)
                    </>
                  ) : (
                    <>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-cyan, #06b6d4)', display: 'inline-block' }}></span>
                      RÉGIMEN SIN IVA (EXENTO 0%)
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* SELECCIÓN DE RÉGIMEN FISCAL: CON IVA VS SIN IVA */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '12px', display: 'block' }}>
              Modalidad de Facturación e Impuestos de tu Negocio
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
              {/* Opción 1: CON IVA */}
              <div
                role="button"
                tabIndex={0}
                onClick={handleEnableTax}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleEnableTax(); }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: isTaxEnabled ? '2px solid #10b981' : '1px solid var(--border-glass, #cbd5e1)',
                  background: isTaxEnabled ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isTaxEnabled ? '#10b981' : '#64748b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  {isTaxEnabled ? <Check size={14} strokeWidth={3} /> : <Percent size={13} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: isTaxEnabled ? '#059669' : 'var(--text-primary)' }}>
                      Con IVA (Afecto a Impuesto)
                    </span>
                    {isTaxEnabled && (
                      <span style={{ fontSize: '10px', fontWeight: 900, background: '#10b981', color: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    Aplica y desglosa débito fiscal ({currentTaxPct || 19}%) en ventas, boletas y comprobantes fiscales.
                  </p>
                </div>
              </div>

              {/* Opción 2: SIN IVA */}
              <div
                role="button"
                tabIndex={0}
                onClick={handleDisableTax}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDisableTax(); }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: !isTaxEnabled ? '2px solid var(--color-cyan, #06b6d4)' : '1px solid var(--border-glass, #cbd5e1)',
                  background: !isTaxEnabled ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: !isTaxEnabled ? 'var(--color-cyan, #06b6d4)' : '#64748b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  {!isTaxEnabled ? <Check size={14} strokeWidth={3} /> : <ShieldCheck size={14} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: !isTaxEnabled ? 'var(--color-cyan, #06b6d4)' : 'var(--text-primary)' }}>
                      Sin IVA (Régimen Exento / 0%)
                    </span>
                    {!isTaxEnabled && (
                      <span style={{ fontSize: '10px', fontWeight: 900, background: 'var(--color-cyan, #06b6d4)', color: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    Precios netos directos sin recargo de IVA. No genera débito fiscal ni exige cálculos de impuestos.
                  </p>
                </div>
              </div>
            </div>

            {/* DETALLES ESPECÍFICOS SEGÚN LA MODALIDAD SELECCIONADA */}
            {isTaxEnabled ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '16px 20px', borderRadius: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>Nombre del Impuesto</label>
                  <input
                    type="text"
                    className="form-input"
                    value={companySettings.tax_name || 'IVA'}
                    onChange={async (e) => {
                      const res = await updateCompanySettings({ tax_name: e.target.value.toUpperCase() });
                      if (res.error) alert(res.error);
                    }}
                    placeholder="IVA"
                    style={{ width: '100%', fontSize: '13px' }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>Tasa de IVA Aplicada (%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      className="form-input"
                      value={currentTaxPct}
                      onChange={(e) => handleChangeTaxRate(e.target.value)}
                      style={{ width: '90px', fontSize: '14px', fontWeight: 800, textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>%</span>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      (Predeterminado: {companySettings.country === 'VE' ? '16% VE' : companySettings.country === 'AR' ? '21% AR' : '19% CL'})
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.2)', padding: '16px 20px', borderRadius: '12px' }}>
                <ShieldCheck size={26} color="var(--color-cyan, #06b6d4)" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Operación en Régimen Sin IVA Activa:</strong> Tu negocio operará con tasa 0% de IVA. En el Punto de Venta (POS) el cobro será limpio por el precio de los productos, en Inventario el precio neto será igual al precio de venta, y los comprobantes impresos no emitirán desglose de débito fiscal ni base gravable.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ─── PESTAÑA 4: MONEDA & TASAS ─── */}
    {activeTab === 'moneda' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.2s ease' }}>
        {/* PANEL 2: MONEDA Y TASAS DE CAMBIO */}
        <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-cyan)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={16} />
            Moneda Base y Fijación Cambiaria (Multidivisa)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Toggle de Precios en USD */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.1)', borderRadius: '12px', padding: '16px' }}>
              <input
                id="use-usd-pricing-checkbox"
                type="checkbox"
                checked={companySettings.use_usd_pricing || false}
                onChange={async (e) => {
                  const res = await updateCompanySettings({ use_usd_pricing: e.target.checked });
                  if (res.error) alert(res.error);
                }}
                style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--color-cyan)', cursor: 'pointer' }}
              />
              <div>
                <label htmlFor="use-usd-pricing-checkbox" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Fijar Precios de Venta en Dólares (USD)
                </label>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                  Activa esta casilla para registrar precios base en USD (recomendado para Venezuela) y multiplicarlos dinámicamente al tipo de cambio para pagos en moneda local.
                </p>
              </div>
            </div>

            {/* Configuración de Tasa de Cambio */}
            {companySettings.use_usd_pricing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.2s ease' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">Origen de la Tasa de Cambio</label>
                    <select
                      className="form-input"
                      value={companySettings.exchange_rate_source || 'manual'}
                      onChange={async (e) => {
                        const source = e.target.value;
                        const res = await updateCompanySettings({ exchange_rate_source: source });
                        if (res.error) alert(res.error);
                        if (source !== 'manual') {
                          await syncExchangeRate();
                        }
                      }}
                    >
                      <option value="manual">Manual (Ajuste Personalizado)</option>
                      <option value="bcv">Banco Central de Venezuela — USD (BCV Oficial)</option>
                      <option value="euro">Banco Central de Venezuela — EUR (Euro BCV)</option>
                      <option value="paralelo">Dólar Paralelo (Monitor Dólar)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      Tasa de Cambio ({companySettings.currency_code || 'VES'}/USD)
                      {companySettings.exchange_rate_source !== 'manual' && (
                        <button 
                          type="button"
                          onClick={async () => {
                            const res = await syncExchangeRate();
                            if (res.error) alert(res.error);
                            else alert(`Tasa de cambio sincronizada con éxito: ${res.rate} VES/USD\n\nFuente Oficial: ${companySettings.exchange_rate_source === 'bcv' ? 'https://ve.dolarapi.com/v1/dolares/oficial' : 'https://ve.dolarapi.com/v1/dolares/paralelo'}`);
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--color-cyan)', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontWeight: 700 }}
                        >
                          <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
                          Sincronizar Ahora
                        </button>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      className="form-input"
                      value={companySettings.exchange_rate || 1.0}
                      onChange={async (e) => {
                        const rate = Number(e.target.value);
                        if (rate > 0) {
                          await updateCompanySettings({ exchange_rate: rate });
                        }
                      }}
                      placeholder="Ej: 748.7864"
                    />
                  </div>
                </div>

                {/* Enlace transparente directo a la fuente oficial cambiaria */}
                {companySettings.exchange_rate_source !== 'manual' && (
                  <div style={{
                    fontSize: '11px',
                    color: '#64748b',
                    background: 'rgba(6, 182, 212, 0.04)',
                    border: '1px solid rgba(6, 182, 212, 0.15)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}>
                    <span>
                      🌐 <strong>Fuente Oficial Sincronizada:</strong> {companySettings.exchange_rate_source === 'bcv' ? 'Banco Central de Venezuela (API DolarApi)' : 'Monitor Dólar Paralelo'}
                    </span>
                    <a 
                      href={companySettings.exchange_rate_source === 'bcv' ? 'https://ve.dolarapi.com/v1/dolares/oficial' : 'https://ve.dolarapi.com/v1/dolares/paralelo'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#00d2ff', fontWeight: '700', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      Verificar JSON en vivo ↗
                    </a>
                  </div>
                )}

                {/* ── PANEL BCV OFICIAL: 3 TASAS EN TIEMPO REAL ── */}
                <div style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    {/* Logo BCV */}
                    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '10px', flexShrink: 0 }}>
                      <div style={{ fontSize: '9px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>BANCO CENTRAL</div>
                      <div style={{ fontSize: '9px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>DE VENEZUELA</div>
                    </div>

                    {/* Tasa USD BCV */}
                    <div style={{ borderRight: '1px solid rgba(255,255,255,0.07)', paddingRight: '14px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>🇺🇸 USD · BCV OFICIAL</div>
                      <div style={{ fontSize: '17px', fontWeight: 900, color: 'var(--color-cyan)', fontFamily: 'monospace' }}>
                        {bcvRate > 0 ? `Bs. ${bcvRate.toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}` : <span style={{ color: '#475569' }}>Cargando…</span>}
                      </div>
                    </div>

                    {/* Tasa EUR BCV */}
                    <div style={{ borderRight: '1px solid rgba(255,255,255,0.07)', paddingRight: '14px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>🇪🇺 EUR · BCV OFICIAL</div>
                      <div style={{ fontSize: '17px', fontWeight: 900, color: '#a78bfa', fontFamily: 'monospace' }}>
                        {euroRate > 0 ? `Bs. ${euroRate.toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}` : <span style={{ color: '#475569' }}>Cargando…</span>}
                      </div>
                    </div>

                    {/* Tasa Paralelo */}
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>🇺🇸 USD · PARALELO</div>
                      <div style={{ fontSize: '17px', fontWeight: 900, color: '#f472b6', fontFamily: 'monospace' }}>
                        {paraleloRate > 0 ? `Bs. ${paraleloRate.toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}` : <span style={{ color: '#475569' }}>Cargando…</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: '120px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: bcvLastUpdated === new Date().toISOString().split('T')[0] ? '#10b981' : '#f59e0b' }}>
                      {bcvLastUpdated === new Date().toISOString().split('T')[0]
                        ? '✅ Actualizado hoy'
                        : bcvLastUpdated ? `⏳ Últ: ${bcvLastUpdated}` : '⏳ Sincronizando...'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>
                      <a href="https://ve.dolarapi.com/v1/cotizaciones" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-cyan)', textDecoration: 'underline' }}>ve.dolarapi.com ↗</a>
                    </div>
                    <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                      Ref: <a href="https://www.bcv.org.ve" target="_blank" rel="noopener noreferrer" style={{ color: '#64748b', textDecoration: 'underline' }}>bcv.org.ve ↗</a>
                    </div>
                  </div>
                </div>

                {/* Gráfica de Tendencia Diaria de la Moneda respecto al Dólar */}
                <ExchangeRateChart
                  currencyCode={companySettings.currency_code || 'VES'}
                  currentRate={companySettings.exchange_rate || 1.0}
                  bcvRate={bcvRate}
                  paraleloRate={paraleloRate}
                  rateHistory={rateHistory}
                  onSync={async (customRate) => {
                    if (typeof customRate === 'number' && customRate > 0) {
                      await updateCompanySettings({ exchange_rate: customRate });
                    } else if (companySettings.exchange_rate_source !== 'manual') {
                      const res = await syncExchangeRate();
                      if (res.error) alert(res.error);
                    }
                  }}
                  loading={loading}
                  companySettings={companySettings}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ─── PESTAÑA 5: SISTEMA & SEGURIDAD ─── */}
    {activeTab === 'sistema' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.2s ease' }}>
        {/* PANEL 3.5: GESTIÓN DE MÓDULOS & PERMISOS DE USUARIOS (SOLO ADMINS) */}
        <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} />
              Gestión de Módulos & Permisos de Usuarios
            </h3>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '3px 10px', borderRadius: '99px', border: '1px solid #bae6fd' }}>
              Configurable por Administrador
            </span>
          </div>

          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '18px', marginTop: 0 }}>
            Activa o desactiva qué módulos están habilitados en el sistema y visibles para las cuentas de <strong>Cajeros / Usuarios</strong>. Los Administradores conservan acceso a los módulos de control.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            {[
              { key: 'dashboard', label: '📊 Resumen del Negocio', desc: 'KPIs de ventas y métricas clave' },
              { key: 'pos', label: '🛒 Punto de Venta (POS)', desc: 'Terminal de cobro y boletas' },
              { key: 'tables', label: '🍽️ Mesas & Comandero', desc: 'Control de comandas de restaurante' },
              { key: 'inventory', label: '📦 Gestión de Inventario', desc: 'Control de productos y stock' },
              { key: 'finances', label: '⚖️ Finanzas & Equilibrio', desc: 'Punto de equilibrio y OPEX (Admin)' },
              { key: 'branches', label: '🏢 Control de Sucursales', desc: 'Resumen de sucursales y breakeven por sede' },
              { key: 'history', label: '📜 Historial de Ventas', desc: 'Consulta e impresión de transacciones' },
              { key: 'showcase', label: '📱 Vitrina Cliente QR', desc: 'Catálogo digital interactivo' },
            ].map(mod => {
              const userMods = companySettings.user_modules || {
                dashboard: true, pos: true, tables: true, inventory: true, finances: false, owner: false, history: true, showcase: true
              };
              const isChecked = userMods[mod.key] !== false;

              return (
                <div key={mod.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: isChecked ? 'rgba(6,182,212,0.04)' : '#f8fafc', border: isChecked ? '1px solid rgba(6,182,212,0.3)' : '1px solid #cbd5e1', borderRadius: '12px', padding: '12px 14px' }}>
                  <input
                    type="checkbox"
                    id={`mod-check-${mod.key}`}
                    checked={isChecked}
                    onChange={async (e) => {
                      const updatedMods = { ...userMods, [mod.key]: e.target.checked };
                      const res = await updateCompanySettings({ user_modules: updatedMods });
                      if (res.error) alert(res.error);
                    }}
                    style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#06b6d4', cursor: 'pointer' }}
                  />
                  <div>
                    <label htmlFor={`mod-check-${mod.key}`} style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', cursor: 'pointer', display: 'block' }}>
                      {mod.label}
                    </label>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      {mod.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL 3.8: PREFERENCIAS DE HARDWARE & AUTOMATIZACIONES POS */}
        <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-cyan)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Smartphone size={16} />
            Hardware, Sonido & Automatizaciones de Turno
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Control de Sonido del Escáner */}
            <div style={{ background: 'rgba(6, 182, 212, 0.04)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {soundEnabled ? <Volume2 size={18} style={{ color: '#0891b2' }} /> : <VolumeX size={18} style={{ color: '#94a3b8' }} />}
                  <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>Sonido del Escáner (Web Audio)</span>
                </div>
                <input
                  type="checkbox"
                  id="sound-toggle-pref"
                  checked={soundEnabled}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setSoundEnabledState(next);
                    setSoundEnabled(next);
                    if (next) playSound('scan');
                  }}
                  style={{ width: '18px', height: '18px', accentColor: '#06b6d4', cursor: 'pointer' }}
                />
              </div>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 10px 0', lineHeight: '1.5' }}>
                Emite un pitido de confirmación instantáneo cada vez que se escanea un código de barras o se agrega un producto al carrito.
              </p>
              {soundEnabled && (
                <button
                  type="button"
                  onClick={() => playSound('scan')}
                  style={{ background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', color: '#0891b2', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  🔊 Probar Sonido
                </button>
              )}
            </div>

            {/* Control de Alerta Sobresaliente de Ventas y Ruido */}
            <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BellRing size={18} style={{ color: '#10b981' }} />
                  <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>Alerta Sobresaliente de Ventas</span>
                </div>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#059669', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '12px' }}>
                  Activa
                </span>
              </div>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 10px 0', lineHeight: '1.5' }}>
                Emite un sonido de caja registradora ("cha-ching") y despliega un banner flotante destacado con los datos de la venta o pedido web/QR al instante.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (triggerSaleAlert) {
                      triggerSaleAlert({
                        id: 'test-' + Date.now(),
                        total: 18500,
                        customer: 'Cliente Prueba (Alerta)',
                        itemsCount: 2,
                        paymentMethod: 'Transferencia',
                        docType: 'Boleta',
                        branchName: 'Sede Principal',
                        isWebOrder: false
                      });
                    }
                  }}
                  style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#059669', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <BellRing size={13} />
                  <span>Probar Alerta y Sonido</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const perm = await requestNotificationPermission();
                    if (perm === 'granted') {
                      showNativeSaleNotification('🔔 ¡Notificaciones de Ventas Habilitadas!', {
                        body: 'SoLago te avisará con sonido y aviso emergente cuando entre un cobro.'
                      });
                      alert('✅ Notificaciones de escritorio / móvil permitidas con éxito.');
                    } else if (perm === 'denied') {
                      alert('⚠️ Las notificaciones están bloqueadas en tu navegador. Puedes habilitarlas en el icono de candado de la barra de direcciones.');
                    } else {
                      alert('Aviso: Tu navegador no soporta notificaciones push en este entorno.');
                    }
                  }}
                  style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Habilitar en Windows / Móvil
                </button>
              </div>
            </div>

            {/* Teléfono WhatsApp para Cierres de Turno */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={18} style={{ color: '#10b981' }} />
                  <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>WhatsApp del Dueño / Auditor</span>
                </div>
                {whatsappPhone && (
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#059669', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                    +{cleanWhatsAppNumber(whatsappPhone, companySettings?.country || 'VE')}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 10px 0', lineHeight: '1.5' }}>
                Número al que se enviará automáticamente el resumen de arqueo al cerrar turno de caja y los pedidos web (con código de país).
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: +584121234567 o +56912345678"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  style={{ flex: '1 1 200px', padding: '8px 12px', fontSize: '12.5px' }}
                />
                <button
                  type="button"
                  onClick={() => handleSaveAllSettings()}
                  disabled={isSavingSettings}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: isSavingSettings ? 'wait' : 'pointer'
                  }}
                >
                  <Save size={13} />
                  <span>Guardar</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 4: PERFIL DE USUARIO Y SEGURIDAD */}
        <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-cyan)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} />
            Perfil de Usuario & Seguridad
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', background: 'rgba(6, 182, 212, 0.04)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>Credenciales de Acceso y Nombre</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Modifica tu nombre visible o actualiza tu contraseña de acceso a Punto Nexus.</div>
            </div>
            {onOpenProfileModal && (
              <button 
                type="button"
                className="btn btn-primary"
                onClick={onOpenProfileModal}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
              >
                <ShieldCheck size={16} />
                <span>Cambiar Contraseña / Editar Perfil</span>
              </button>
            )}
          </div>
        </div>
      </div>
    )}

  </div>
);
}
