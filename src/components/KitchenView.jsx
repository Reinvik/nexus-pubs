import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePuntoNexus } from '../context/PuntoNexusContext';
import {
  ChefHat, Clock, CheckCircle2, Beer,
  Utensils, ShoppingBag, ArrowRight, RotateCcw, X,
  ShieldCheck, QrCode, Sparkles, Filter, Check
} from 'lucide-react';

// ── Configuración de estados de Barra & Cocina (KDS) — MODO CLARO ─────────────
const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    color: '#92400e',      // Dark amber text
    accent: '#f59e0b',
    headerBg: '#fef3c7',  // Amber 100
    headerBorder: '#fde68a',
    borderTop: '#f59e0b',
    counterBg: '#f59e0b',
    badgeText: '#ffffff',
    cardBorder: '#fde68a',
    icon: <Clock size={14} />,
    next: 'preparing',
    nextLabel: 'Preparar →',
    btnGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
  },
  preparing: {
    label: 'Preparando',
    color: '#0369a1',      // Dark cyan text
    accent: '#06b6d4',
    headerBg: '#e0f2fe',  // Cyan 100
    headerBorder: '#bae6fd',
    borderTop: '#0284c7',
    counterBg: '#0284c7',
    badgeText: '#ffffff',
    cardBorder: '#bae6fd',
    icon: <ChefHat size={14} />,
    next: 'ready',
    nextLabel: '¡Listo p/ Runner! →',
    btnGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
  },
  ready: {
    label: '¡Listo p/ Runner!',
    color: '#166534',      // Dark emerald text
    accent: '#10b981',
    headerBg: '#dcfce7',  // Emerald 100
    headerBorder: '#bbf7d0',
    borderTop: '#059669',
    counterBg: '#059669',
    badgeText: '#ffffff',
    cardBorder: '#bbf7d0',
    icon: <CheckCircle2 size={14} />,
    next: 'delivered',
    nextLabel: 'Entregado en Mesa →',
    btnGradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
  },
  delivered: {
    label: 'Entregado',
    color: '#334155',      // Dark slate text
    accent: '#64748b',
    headerBg: '#f1f5f9',  // Slate 100
    headerBorder: '#e2e8f0',
    borderTop: '#64748b',
    counterBg: '#64748b',
    badgeText: '#ffffff',
    cardBorder: '#e2e8f0',
    icon: <CheckCircle2 size={14} />,
    next: null,
    nextLabel: null
  }
};

const inferStation = (item) => {
  if (item?.station) return item.station;
  const sku = String(item?.sku || '').toUpperCase();
  const name = String(item?.name || '').toLowerCase();
  if (
    sku.startsWith('BAR-') ||
    name.includes('schop') ||
    name.includes('pisco') ||
    name.includes('aperol') ||
    name.includes('gin ') ||
    name.includes('mojito') ||
    name.includes('limonada') ||
    name.includes('cerveza') ||
    name.includes('trago') ||
    name.includes('vino') ||
    name.includes('bebida')
  ) {
    return 'bar';
  }
  return 'kitchen';
};

// Tiempo transcurrido en formato legible
const elapsed = (isoStr) => {
  if (!isoStr) return '—';
  const diff = Math.max(0, Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
};

// Urgencia visual por tiempo: > 15 min = rojo, > 8 min = amarillo, else normal
const urgency = (isoStr) => {
  if (!isoStr) return 'normal';
  const mins = (Date.now() - new Date(isoStr).getTime()) / 60000;
  if (mins > 15) return 'critical';
  if (mins > 8)  return 'warning';
  return 'normal';
};

export default function KitchenView({ 
  onClose, 
  initialStation = 'all', 
  onNavigateToGatekeeper = null,
  onOpenPersonalQr = null 
}) {
  const { tables, addTable, updateTableItemStatus } = usePuntoNexus();

  // Filtros: Estado comanda ('active' | 'all'), Estación ('all' | 'bar' | 'kitchen'), Filtro de Mesa
  const [activeFilter, setActiveFilter] = useState('active'); 
  const [stationFilter, setStationFilter] = useState(initialStation);
  const [tableCategoryFilter, setTableCategoryFilter] = useState('all'); // 'all', 'available', 'occupied', 'takeout'

  // Modal rápido integrado para emitir Tarjeta QR Personal en Barra
  const [isQuickQrModalOpen, setIsQuickQrModalOpen] = useState(false);
  const [quickQrName, setQuickQrName] = useState('');

  // Tick para actualizar el tiempo en pantalla cada 15 segundos
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  // Conteos de Mesas para las píldoras de la barra superior (como en el salón)
  const tableStats = useMemo(() => {
    const total = tables.length;
    const available = tables.filter(t => t.status === 'available').length;
    const occupied = tables.filter(t => t.status === 'occupied').length;
    const takeout = tables.filter(t => t.isTakeout).length;
    return { total, available, occupied, takeout };
  }, [tables]);

  // Construir lista plana de comandas: { table, itemIndex, item, station }
  const allOrders = useMemo(() => {
    const list = [];
    tables.forEach(table => {
      if (!Array.isArray(table.items) || table.items.length === 0) return;

      // Filtrar por categoría de mesa si está activa
      if (tableCategoryFilter === 'available' && table.status !== 'available') return;
      if (tableCategoryFilter === 'occupied' && table.status !== 'occupied') return;
      if (tableCategoryFilter === 'takeout' && !table.isTakeout) return;

      table.items.forEach((item, idx) => {
        if (!item.kitchen_status || item.kitchen_status === 'draft') return;
        if (activeFilter === 'active' && item.kitchen_status === 'delivered') return;
        const station = inferStation(item);
        if (stationFilter !== 'all' && station !== stationFilter) return;
        list.push({ table, itemIndex: idx, item, station });
      });
    });

    list.sort((a, b) => {
      const ta = a.item.ordered_at ? new Date(a.item.ordered_at).getTime() : 0;
      const tb = b.item.ordered_at ? new Date(b.item.ordered_at).getTime() : 0;
      return ta - tb;
    });

    return list;
  }, [tables, activeFilter, stationFilter, tableCategoryFilter, tick]);

  // KPIs rápidos
  const kpis = useMemo(() => {
    const all = tables.flatMap(t => (t.items || []).filter(i => {
      if (!i.kitchen_status || i.kitchen_status === 'draft') return false;
      if (stationFilter === 'all') return true;
      return inferStation(i) === stationFilter;
    }));
    return {
      pending:   all.filter(i => i.kitchen_status === 'pending').length,
      preparing: all.filter(i => i.kitchen_status === 'preparing').length,
      ready:     all.filter(i => i.kitchen_status === 'ready').length,
      delivered: all.filter(i => i.kitchen_status === 'delivered').length,
      totalActive: all.filter(i => i.kitchen_status !== 'delivered').length
    };
  }, [tables, stationFilter, tick]);

  const handleAdvanceStatus = (tableId, itemIndex, currentStatus) => {
    const cfg = STATUS_CONFIG[currentStatus];
    if (!cfg?.next) return;
    updateTableItemStatus(tableId, itemIndex, cfg.next);
  };

  const handleResetStatus = (tableId, itemIndex) => {
    updateTableItemStatus(tableId, itemIndex, 'pending');
  };

  const handleCreatePersonalQrSubmit = (e) => {
    e.preventDefault();
    const cleanName = quickQrName.trim() || `Tarjeta Barra #${Math.floor(10 + Math.random() * 89)}`;
    const tempNum = `TB-${Math.floor(100 + Math.random() * 900)}`;
    addTable(tempNum, cleanName, 4, true);
    setQuickQrName('');
    setIsQuickQrModalOpen(false);
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 200000,
      background: '#f8fafc', // Modo Claro: slate 50 limpio
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: "'Inter', 'system-ui', sans-serif",
      color: '#0f172a'
    }}>

      {/* ─── FILA SUPERIOR: CABECERA & BOTONES SOLICITADOS (MODO CLARO) ─── */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)',
        flexShrink: 0
      }}>

        {/* Fila 1: Título / Estación + KPIs + Botón Cerrar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: stationFilter === 'bar'
                ? 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(37,99,235,0.15))'
                : stationFilter === 'kitchen'
                  ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.15))'
                  : 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(16,185,129,0.15))',
              border: '1.5px solid #06b6d4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(6,182,212,0.15)'
            }}>
              {stationFilter === 'bar' ? <Beer size={24} color="#0284c7" /> : <ChefHat size={24} color="#d97706" />}
            </div>

            <div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>KDS Nexus Pub</span>
                <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1', fontWeight: 800 }}>
                  {stationFilter === 'bar' ? '🍺 Estación Barra' : stationFilter === 'kitchen' ? '🍔 Estación Cocina' : 'Barra & Cocina'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                Comandas en tiempo real desde Tarjetas QR · Modo Runner
              </div>
            </div>
          </div>

          {/* Selector de Estación (Todo / Solo Barra / Solo Cocina) con diseño claro */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '3px', gap: '3px', border: '1px solid #e2e8f0' }}>
            {[
              { key: 'all',     label: '🔥 Todo el Pub' },
              { key: 'bar',     label: '🍺 Solo Barra (Schops/Tragos)' },
              { key: 'kitchen', label: '🍔 Solo Cocina (Tablas/Burgers)' }
            ].map(st => (
              <button
                key={st.key}
                type="button"
                onClick={() => setStationFilter(st.key)}
                style={{
                  background: stationFilter === st.key ? '#ffffff' : 'transparent',
                  border: stationFilter === st.key ? '1px solid #cbd5e1' : '1px solid transparent',
                  color: stationFilter === st.key ? '#0284c7' : '#64748b',
                  borderRadius: '9px',
                  padding: '7px 12px',
                  fontSize: '11.5px',
                  fontWeight: stationFilter === st.key ? 900 : 700,
                  cursor: 'pointer',
                  boxShadow: stationFilter === st.key ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Chips de conteo rápido + Filtro de estado + Cerrar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {[
              { label: 'Pendiente',  count: kpis.pending,   color: '#b45309', bg: '#fef3c7' },
              { label: 'Preparando', count: kpis.preparing, color: '#0369a1', bg: '#e0f2fe' },
              { label: 'Runner',     count: kpis.ready,     color: '#047857', bg: '#dcfce7' },
            ].map(k => (
              <div key={k.label} style={{
                background: k.bg,
                border: `1px solid ${k.color}30`,
                borderRadius: '10px',
                padding: '4px 9px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ fontSize: '15px', fontWeight: 900, color: k.color }}>{k.count}</span>
                <span style={{ fontSize: '11px', color: k.color, fontWeight: 700 }}>{k.label}</span>
              </div>
            ))}

            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '3px', border: '1px solid #e2e8f0' }}>
              {[
                { key: 'active', label: 'En curso' },
                { key: 'all',    label: 'Todos' }
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActiveFilter(f.key)}
                  style={{
                    background: activeFilter === f.key ? '#ffffff' : 'transparent',
                    border: activeFilter === f.key ? '1px solid #cbd5e1' : '1px solid transparent',
                    color: activeFilter === f.key ? '#0f172a' : '#64748b',
                    borderRadius: '8px',
                    padding: '4px 9px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: activeFilter === f.key ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              title="Cerrar y volver al Salón"
              style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '10px',
                padding: '8px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
                fontWeight: 800,
                transition: 'all 0.15s ease'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Fila 2: BOTONES DE ACCIÓN IDÉNTICOS A LA CAPTURA DEL USUARIO ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          paddingTop: '6px',
          borderTop: '1px dashed #e2e8f0'
        }}>
          
          {/* Píldoras de Filtro de Mesas (Todas, Disponibles, Ocupadas, Para Llevar) */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#f1f5f9',
            borderRadius: '12px',
            padding: '3px',
            gap: '3px',
            border: '1px solid #e2e8f0'
          }}>
            {[
              { id: 'all',       label: `Todas (${tableStats.total})`,       color: '#0f172a' },
              { id: 'available', label: `Disponibles (${tableStats.available})`, color: '#059669' },
              { id: 'occupied',  label: `Ocupadas (${tableStats.occupied})`,  color: '#d97706' },
              { id: 'takeout',   label: `🛍️ Para Llevar (${tableStats.takeout})`, color: '#0284c7' }
            ].map(tab => {
              const isActive = tableCategoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTableCategoryFilter(tab.id)}
                  style={{
                    background: isActive ? '#ffffff' : 'transparent',
                    border: isActive ? '1px solid #cbd5e1' : '1px solid transparent',
                    color: isActive ? tab.color : '#64748b',
                    borderRadius: '9px',
                    padding: '5px 11px',
                    fontSize: '11.5px',
                    fontWeight: isActive ? 900 : 700,
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Botones de Acción Solicitados: Semáforo + Tarjeta QR + Volver a Mesas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            
            {/* 1. Botón Semáforo de Salida */}
            <button
              type="button"
              onClick={() => {
                if (onNavigateToGatekeeper) {
                  onNavigateToGatekeeper();
                } else if (onClose) {
                  onClose();
                }
              }}
              style={{
                padding: '7px 14px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                color: '#047857',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(16, 185, 129, 0.1)',
                transition: 'all 0.15s ease'
              }}
              title="Abrir Semáforo de Salida para validar pago de tarjetas en puerta"
            >
              <ShieldCheck size={15} />
              <span>🚦 Semáforo de Salida</span>
            </button>

            {/* 2. Botón + Tarjeta QR Personal */}
            <button
              type="button"
              onClick={() => {
                if (onOpenPersonalQr) {
                  onOpenPersonalQr();
                } else {
                  setQuickQrName(`Tarjeta Barra #${Math.floor(10 + Math.random() * 89)}`);
                  setIsQuickQrModalOpen(true);
                }
              }}
              style={{
                padding: '7px 14px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(168, 85, 247, 0.12)',
                border: '1px solid rgba(168, 85, 247, 0.45)',
                color: '#7e22ce',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(168, 85, 247, 0.1)',
                transition: 'all 0.15s ease'
              }}
              title="Entregar una nueva Tarjeta QR a un cliente individual en barra"
            >
              <QrCode size={14} />
              <span>+ Tarjeta QR Personal</span>
            </button>

            {/* 3. Botón KDS Barra & Cocina / Volver al Salón */}
            <button
              type="button"
              onClick={onClose}
              style={{
                position: 'relative',
                padding: '7px 15px',
                borderRadius: '10px',
                fontWeight: 900,
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, rgba(6,182,212,0.18), rgba(59,130,246,0.12))',
                border: '1px solid rgba(6,182,212,0.5)',
                color: '#0284c7',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(6,182,212,0.15)',
                transition: 'all 0.15s ease'
              }}
              title="Ver Salón de Mesas y volver al mapa"
            >
              <ChefHat size={15} />
              <span>🍺 🍔 KDS Barra &amp; Cocina</span>
              {kpis.totalActive > 0 && (
                <span style={{
                  background: '#f59e0b',
                  color: '#ffffff',
                  borderRadius: '999px',
                  padding: '1px 7px',
                  fontSize: '10px',
                  fontWeight: 900,
                  marginLeft: '2px'
                }}>
                  {kpis.totalActive}
                </span>
              )}
            </button>

          </div>

        </div>

      </div>

      {/* ─── CUERPO: 4 COLUMNAS DE ESTADO CON COLORES CLAROS ─────────── */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0',
        overflow: 'hidden',
        background: '#f1f5f9'
      }}>
        {(['pending', 'preparing', 'ready', 'delivered']).map(status => {
          const cfg = STATUS_CONFIG[status];
          const colItems = allOrders.filter(o => o.item.kitchen_status === status);

          return (
            <div key={status} style={{
              display: 'flex',
              flexDirection: 'column',
              background: '#f8fafc',
              borderRight: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}>
              {/* Encabezado de Columna Claro */}
              <div style={{
                padding: '12px 16px',
                background: cfg.headerBg,
                borderBottom: `3px solid ${cfg.borderTop}`,
                borderTop: `1px solid ${cfg.headerBorder}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0
              }}>
                <span style={{ color: cfg.color }}>{cfg.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: 900, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {cfg.label}
                </span>
                <span style={{
                  marginLeft: 'auto',
                  background: cfg.counterBg,
                  color: cfg.badgeText,
                  borderRadius: '999px',
                  padding: '2px 9px',
                  fontSize: '11px',
                  fontWeight: 900,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  {colItems.length}
                </span>
              </div>

              {/* Lista de Comandas con Tarjetas Blancas Nítidas */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {colItems.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8', fontSize: '12.5px', fontWeight: 600 }}>
                    Sin comandas aquí
                  </div>
                )}

                {colItems.map(({ table, itemIndex, item, station }, i) => {
                  const urg = urgency(item.ordered_at);
                  const diner = item.participant_name || item.participantName || 'General';
                  const isPaid = !!(item.paid || table.isPaid);

                  return (
                    <div
                      key={`${table.id}-${itemIndex}-${i}`}
                      style={{
                        background: '#ffffff', // Tarjeta blanca sólida y clara
                        border: `1px solid ${urg === 'critical' ? '#fca5a5' : urg === 'warning' ? '#fde68a' : '#e2e8f0'}`,
                        borderLeft: `4px solid ${urg === 'critical' ? '#ef4444' : urg === 'warning' ? '#f59e0b' : cfg.borderTop}`,
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)',
                        transition: 'box-shadow 0.2s ease'
                      }}
                    >
                      {/* Cabecera de la Tarjeta (Mesa + Tiempo) */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        borderBottom: '1px solid #f1f5f9'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          {table.isTakeout ? (
                            <ShoppingBag size={14} color="#d97706" />
                          ) : (
                            <Utensils size={14} color="#0284c7" />
                          )}
                          <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {table.name}
                          </span>
                        </div>

                        {/* Tiempo de espera con semáforo */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: urg === 'critical' ? '#fee2e2' : urg === 'warning' ? '#fef3c7' : '#f1f5f9',
                          color: urg === 'critical' ? '#dc2626' : urg === 'warning' ? '#b45309' : '#64748b',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          flexShrink: 0
                        }}>
                          <Clock size={11} />
                          <span>{elapsed(item.ordered_at)}</span>
                        </div>
                      </div>

                      {/* Cuerpo de la Comanda */}
                      <div style={{ padding: '10px 12px 6px' }}>
                        {/* Etiquetas: Barra/Cocina + Runner Comensal + Estado de Pago */}
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: 900,
                            padding: '2px 6px',
                            borderRadius: '5px',
                            background: station === 'bar' ? '#e0f2fe' : '#fef3c7',
                            color: station === 'bar' ? '#0369a1' : '#b45309',
                            border: `1px solid ${station === 'bar' ? '#bae6fd' : '#fde68a'}`
                          }}>
                            {station === 'bar' ? '🍺 BARRA' : '🍔 COCINA'}
                          </span>

                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: 900,
                            padding: '2px 6px',
                            borderRadius: '5px',
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #e2e8f0'
                          }}>
                            👤 Entregar a: {diner}
                          </span>

                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: 900,
                            padding: '2px 6px',
                            borderRadius: '5px',
                            background: isPaid ? '#dcfce7' : '#f8fafc',
                            color: isPaid ? '#15803d' : '#64748b',
                            border: `1px solid ${isPaid ? '#bbf7d0' : '#e2e8f0'}`
                          }}>
                            {item.prepaid ? '⚡ PRE-PAGADO QR' : isPaid ? '✅ PAGADO' : '💳 Tarjeta Abierta'}
                          </span>
                        </div>

                        {/* Nombre del Platillo o Trago */}
                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', lineHeight: 1.3 }}>
                          × {item.quantity ?? item.cantidad ?? 1} — {item.name}
                        </div>

                        {/* Notas especiales del cliente */}
                        {item.notes && (
                          <div style={{
                            marginTop: '6px',
                            fontSize: '11px',
                            color: '#92400e',
                            background: '#fef3c7',
                            border: '1px solid #fde68a',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            display: 'inline-block',
                            fontWeight: 700
                          }}>
                            📝 Nota: {item.notes}
                          </div>
                        )}
                      </div>

                      {/* Botones de Acción de Estado */}
                      <div style={{ padding: '8px 12px', display: 'flex', gap: '6px', background: '#fafafa', borderTop: '1px solid #f1f5f9' }}>
                        {cfg.next && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStatus(table.id, itemIndex, status)}
                            style={{
                              flex: 1,
                              background: cfg.btnGradient,
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 10px',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                              transition: 'transform 0.1s ease'
                            }}
                          >
                            <ArrowRight size={14} />
                            <span>{cfg.nextLabel}</span>
                          </button>
                        )}

                        {status !== 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleResetStatus(table.id, itemIndex)}
                            title="Devolver comanda a Pendiente"
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              padding: '8px 10px',
                              color: '#64748b',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── PIE DE PÁGINA CLARO: LEYENDA SLA ───────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        padding: '8px 24px',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        fontSize: '11px',
        color: '#64748b',
        flexShrink: 0
      }}>
        <span style={{ fontWeight: 800, color: '#0f172a' }}>SLA Pub →</span>
        <span style={{ color: '#0284c7', fontWeight: 700 }}>● Normal (&lt;8 min)</span>
        <span style={{ color: '#d97706', fontWeight: 700 }}>● Atención (8-15 min)</span>
        <span style={{ color: '#dc2626', fontWeight: 700 }}>● Crítico (&gt;15 min)</span>
        <span style={{ marginLeft: 'auto', fontWeight: 600 }}>
          Modo Runner: cada comanda indica el comensal específico para entrega directa a la mesa
        </span>
      </div>

      {/* ─── MODAL RÁPIDO PARA + TARJETA QR PERSONAL (MODO CLARO) ─────── */}
      {isQuickQrModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200050,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '400px',
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7e22ce' }}>
                <QrCode size={20} />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                  + Tarjeta QR Personal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickQrModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
              Crea una tarjeta QR individual para un cliente en barra o terraza. Podrá escanearla, pedir y pagar desde su celular.
            </p>

            <form onSubmit={handleCreatePersonalQrSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#7e22ce', marginBottom: '6px' }}>
                  Nombre / Identificador de la Tarjeta *
                </label>
                <input
                  type="text"
                  value={quickQrName}
                  onChange={(e) => setQuickQrName(e.target.value)}
                  placeholder="Ej: Tarjeta Barra #24, Carlos Amigo..."
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #d8b4fe',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsQuickQrModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#64748b',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
                  }}
                >
                  Crear Tarjeta QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
}
