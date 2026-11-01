import React, { useState, useMemo, useEffect } from 'react';
import { usePuntoNexus } from '../context/PuntoNexusContext';
import {
  QrCode, Beer, Utensils, CreditCard, Users, CheckCircle2, AlertTriangle,
  Plus, Minus, ShoppingBag, Sparkles, ShieldCheck, ArrowRight, Clock,
  ChefHat, BellRing, Receipt, RefreshCw, UserPlus, Check, X
} from 'lucide-react';

// Generador determinístico de matriz QR SVG limpia para el Pase de Salida
function VisualQRBox({ code = 'QR-MESA-01', color = '#10b981', size = 148 }) {
  const cells = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < code.length; i++) {
      seed = (seed * 31 + code.charCodeAt(i)) >>> 0;
    }
    const grid = 15;
    const matrix = [];
    const isFinder = (r, c) =>
      (r < 4 && c < 4) || (r < 4 && c >= grid - 4) || (r >= grid - 4 && c < 4);

    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        if (isFinder(r, c)) {
          const lr = r >= grid - 4 ? r - (grid - 4) : r;
          const lc = c >= grid - 4 ? c - (grid - 4) : c;
          const border = lr === 0 || lr === 3 || lc === 0 || lc === 3;
          const center = lr >= 1 && lr <= 2 && lc >= 1 && lc <= 2;
          if (border || center) matrix.push({ r, c });
        } else {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          if ((seed & 3) !== 0) matrix.push({ r, c });
        }
      }
    }
    return { grid, matrix };
  }, [code]);

  const cellSize = size / cells.grid;

  return (
    <div style={{
      background: '#ffffff',
      padding: '12px',
      borderRadius: '18px',
      display: 'inline-flex',
      boxShadow: `0 0 28px ${color}40`,
      border: `2.5px solid ${color}`
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill="#ffffff" rx="6" />
        {cells.matrix.map(({ r, c }, idx) => (
          <rect
            key={idx}
            x={c * cellSize + 0.6}
            y={r * cellSize + 0.6}
            width={Math.max(1, cellSize - 1.2)}
            height={Math.max(1, cellSize - 1.2)}
            rx={1.5}
            fill="#0f172a"
          />
        ))}
      </svg>
    </div>
  );
}

const KDS_STATUS_BADGE = {
  pending:   { label: 'Recibido en Barra/Cocina', color: '#f59e0b', bg: 'rgba(245,158,11,0.14)' },
  preparing: { label: 'Preparando ahora',         color: '#06b6d4', bg: 'rgba(6,182,212,0.16)' },
  ready:     { label: '¡Listo! Runner en camino', color: '#10b981', bg: 'rgba(16,185,129,0.2)' },
  delivered: { label: 'Servido en mesa',          color: '#94a3b8', bg: 'rgba(148,163,184,0.14)' }
};

const CHILE_PAYMENT_METHODS = [
  { id: 'Webpay Plus / Redcompra', short: 'Webpay / Redcompra', sub: 'Débito · Crédito · Prepago', accent: '#06b6d4', icon: '💳' },
  { id: 'Mercado Pago',            short: 'Mercado Pago / Mach', sub: 'QR · Billetera digital 1-clic', accent: '#3b82f6', icon: '💙' },
  { id: 'Fintoc Transferencia',    short: 'Fintoc Bancario',     sub: 'Transferencia directa sin tarjeta', accent: '#10b981', icon: '🏦' }
];

export default function PubGuestQRView({ initialQrCode = null, onBackToAdmin = null }) {
  const {
    tables,
    inventory,
    companyName,
    activeBranch,
    formatCurrency,
    getTableFinancials,
    joinTableFromQR,
    placeGuestQROrder,
    payTableSplitBill
  } = usePuntoNexus();

  // Resolver qué tarjeta QR / mesa se está escaneando
  const urlQueryParam = useMemo(() => {
    if (initialQrCode) return initialQrCode;
    if (typeof window === 'undefined') return '';
    const p = new URLSearchParams(window.location.search);
    return p.get('qr') || p.get('tarjeta') || p.get('mesa') || p.get('table') || '';
  }, [initialQrCode]);

  const [selectedTableId, setSelectedTableId] = useState('');

  useEffect(() => {
    if (!tables || tables.length === 0) return;
    if (selectedTableId && tables.some(t => t.id === selectedTableId)) return;

    const cleanQ = String(urlQueryParam || '').trim().toLowerCase();
    if (cleanQ) {
      const matched = tables.find(t =>
        String(t.qr_code || '').toLowerCase() === cleanQ ||
        String(t.id || '').toLowerCase() === cleanQ ||
        String(t.number || '').toLowerCase() === cleanQ ||
        String(t.name || '').toLowerCase().includes(cleanQ)
      );
      if (matched) {
        setSelectedTableId(matched.id);
        return;
      }
    }
    setSelectedTableId(tables[0].id);
  }, [tables, urlQueryParam, selectedTableId]);

  const activeTable = useMemo(() => {
    return (tables || []).find(t => t.id === selectedTableId) || tables?.[0] || null;
  }, [tables, selectedTableId]);

  const financials = useMemo(() => getTableFinancials(activeTable), [activeTable, getTableFinancials]);

  // Pestañas móviles del cliente: 'menu' | 'bill' | 'exit'
  const [activeTab, setActiveTab] = useState('menu');

  // Comensal actual en este celular
  const [currentDiner, setCurrentDiner] = useState('');
  const [isAddingDiner, setIsAddingDiner] = useState(false);
  const [newDinerInput, setNewDinerInput] = useState('');

  // Lista de participantes conocidos en la mesa
  const tableParticipants = useMemo(() => {
    if (!activeTable) return [];
    const setNames = new Set();
    (activeTable.dinersNames || []).forEach(n => { if (n && n.trim()) setNames.add(n.trim()); });
    (activeTable.items || []).forEach(it => {
      const p = (it.participant_name || it.participantName || '').trim();
      if (p && p !== 'General') setNames.add(p);
    });
    return Array.from(setNames);
  }, [activeTable]);

  useEffect(() => {
    if (!activeTable) return;
    const savedKey = `nexus_pub_guest_diner_${activeTable.id}`;
    const savedName = localStorage.getItem(savedKey);
    if (savedName) {
      setCurrentDiner(savedName);
    } else if (tableParticipants.length > 0) {
      setCurrentDiner(tableParticipants[0]);
    } else {
      setCurrentDiner('');
    }
  }, [activeTable?.id]);

  const handleSelectDiner = (name) => {
    setCurrentDiner(name);
    if (activeTable) {
      localStorage.setItem(`nexus_pub_guest_diner_${activeTable.id}`, name);
    }
  };

  const handleRegisterNewDiner = (e) => {
    e.preventDefault();
    const clean = newDinerInput.trim();
    if (!clean || !activeTable) return;
    joinTableFromQR(activeTable.id, clean);
    handleSelectDiner(clean);
    setNewDinerInput('');
    setIsAddingDiner(false);
  };

  // ── ESTADO PESTAÑA 1: CARTA & CARRITO DE RONDA ─────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [roundCart, setRoundCart] = useState([]); // [{ product, quantity }]
  const [roundNotes, setRoundNotes] = useState('');
  const [isRoundCheckoutOpen, setIsRoundCheckoutOpen] = useState(false);
  const [prepayTipPct, setPrepayTipPct] = useState(10);
  const [prepayMethod, setPrepayMethod] = useState(CHILE_PAYMENT_METHODS[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackVoucher, setFeedbackVoucher] = useState(null);

  const categories = useMemo(() => {
    const cats = new Set();
    (inventory || []).forEach(p => { if (p.category) cats.add(p.category); });
    return ['TODOS', ...Array.from(cats)];
  }, [inventory]);

  const filteredMenu = useMemo(() => {
    return (inventory || []).filter(p =>
      selectedCategory === 'TODOS' || p.category === selectedCategory
    );
  }, [inventory, selectedCategory]);

  const addToRound = (product) => {
    setRoundCart(prev => {
      const idx = prev.findIndex(c => c.product.id === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateRoundQty = (productId, delta) => {
    setRoundCart(prev =>
      prev
        .map(c => c.product.id === productId ? { ...c, quantity: c.quantity + delta } : c)
        .filter(c => c.quantity > 0)
    );
  };

  const roundCount = roundCart.reduce((acc, c) => acc + c.quantity, 0);
  const roundSubtotal = roundCart.reduce((acc, c) => acc + (Number(c.product.sell_price) || 0) * c.quantity, 0);
  const prepayTipAmount = Math.round(roundSubtotal * (prepayTipPct / 100));

  const handleConfirmRound = async (payImmediately = false) => {
    if (!activeTable || roundCart.length === 0) return;
    const effectiveDiner = currentDiner.trim() || 'Invitado QR';
    if (!currentDiner.trim()) {
      handleSelectDiner(effectiveDiner);
    }

    setIsProcessing(true);
    await new Promise(r => setTimeout(r, payImmediately ? 850 : 350));

    const payloadCart = roundCart.map(c => ({
      product: c.product,
      quantity: c.quantity,
      notes: roundNotes.trim()
    }));

    const res = await placeGuestQROrder(activeTable.id, payloadCart, effectiveDiner, {
      payImmediately,
      paymentMethod: prepayMethod,
      tipAmount: payImmediately ? prepayTipAmount : 0
    });

    setIsProcessing(false);
    if (res?.error) {
      alert(res.error);
      return;
    }

    setRoundCart([]);
    setRoundNotes('');
    setIsRoundCheckoutOpen(false);

    setFeedbackVoucher({
      type: payImmediately ? 'prepaid_order' : 'tab_order',
      title: payImmediately ? '⚡ Ronda Pagada y Enviada a Barra/Cocina' : '🍺 ¡Ronda Enviada a Barra y Cocina!',
      diner: effectiveDiner,
      qrCode: activeTable.qr_code || activeTable.name,
      subtotal: res.subtotal,
      tip: res.tip || 0,
      total: res.totalCharged,
      method: payImmediately ? prepayMethod : 'Cargado a Tarjeta QR'
    });
    setActiveTab('bill');
  };

  // ── ESTADO PESTAÑA 2: SPLIT BILL (DIVIDIR Y PAGAR CUENTA) ──────────────────
  const [splitMode, setSplitMode] = useState('items'); // 'items' | 'equal' | 'full'
  const [selectedUnitsMap, setSelectedUnitsMap] = useState({}); // { [realIndex]: qty }
  const [equalWays, setEqualWays] = useState(2);
  const [customPayAmount, setCustomPayAmount] = useState('');
  const [tipPct, setTipPct] = useState(10); // Ley 20.729 Chile: 10% sugerida
  const [selectedPayMethod, setSelectedPayMethod] = useState(CHILE_PAYMENT_METHODS[0].id);

  // Auto-seleccionar los ítems pendientes del comensal actual al entrar a 'bill'
  const selectItemsForDiner = (targetName) => {
    if (!activeTable) return;
    const nextMap = {};
    (activeTable.items || []).forEach((it, idx) => {
      if (it.paid || activeTable.isPaid) return;
      const owner = (it.participant_name || it.participantName || 'General').trim();
      if (!targetName || targetName === 'ALL' || owner.toLowerCase() === targetName.toLowerCase()) {
        nextMap[idx] = Number(it.quantity ?? it.cantidad ?? 1);
      }
    });
    setSelectedUnitsMap(nextMap);
  };

  useEffect(() => {
    if (!activeTable) return;
    if (currentDiner) {
      const hasOwnUnpaid = (activeTable.items || []).some(
        it => !it.paid && (it.participant_name || '').toLowerCase() === currentDiner.toLowerCase()
      );
      if (hasOwnUnpaid) {
        selectItemsForDiner(currentDiner);
        return;
      }
    }
    selectItemsForDiner('ALL');
  }, [activeTable?.id, currentDiner, activeTable?.items?.length]);

  const toggleItemSelection = (realIndex, maxQty) => {
    setSelectedUnitsMap(prev => {
      const copy = { ...prev };
      if (copy[realIndex]) {
        delete copy[realIndex];
      } else {
        copy[realIndex] = maxQty;
      }
      return copy;
    });
  };

  const adjustItemSelectedQty = (realIndex, delta, maxQty) => {
    setSelectedUnitsMap(prev => {
      const current = prev[realIndex] || 0;
      const next = Math.min(maxQty, Math.max(0, current + delta));
      const copy = { ...prev };
      if (next <= 0) delete copy[realIndex];
      else copy[realIndex] = next;
      return copy;
    });
  };

  const calculatedShareSubtotal = useMemo(() => {
    if (financials.pendingAmount <= 0) return 0;
    if (splitMode === 'items') {
      let sum = 0;
      Object.entries(selectedUnitsMap).forEach(([idxStr, qty]) => {
        const it = activeTable?.items?.[Number(idxStr)];
        if (it && !it.paid) {
          sum += (Number(it.unit_price) || 0) * Number(qty);
        }
      });
      return Math.min(financials.pendingAmount, sum);
    }
    if (splitMode === 'equal') {
      return Math.ceil(financials.pendingAmount / Math.max(2, equalWays));
    }
    // 'full' o monto libre
    if (customPayAmount && Number(customPayAmount) > 0) {
      return Math.min(financials.pendingAmount, Math.round(Number(customPayAmount)));
    }
    return financials.pendingAmount;
  }, [splitMode, selectedUnitsMap, activeTable, financials.pendingAmount, equalWays, customPayAmount]);

  const calculatedTip = Math.round(calculatedShareSubtotal * (tipPct / 100));
  const calculatedGrandTotal = calculatedShareSubtotal + calculatedTip;

  const handlePaySplitShare = async () => {
    if (!activeTable || calculatedShareSubtotal <= 0) return;
    const payer = currentDiner.trim() || 'Comensal QR';
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 900));

    const itemSelections = Object.entries(selectedUnitsMap).map(([idxStr, qty]) => ({
      index: Number(idxStr),
      qty: Number(qty)
    }));

    const res = await payTableSplitBill(activeTable.id, {
      mode: splitMode === 'full' && customPayAmount ? 'custom' : splitMode,
      itemSelections,
      amount: calculatedShareSubtotal,
      tip: calculatedTip,
      payerName: payer,
      paymentMethod: selectedPayMethod
    });

    setIsProcessing(false);
    if (res?.error) {
      alert(res.error);
      return;
    }

    setSelectedUnitsMap({});
    setCustomPayAmount('');
    setFeedbackVoucher({
      type: 'split_payment',
      title: res.isTableFullyPaid ? '🟢 ¡Mesa 100% Pagada! Pase de Salida Activado' : '✅ ¡Tu Pago Fue Aprobado!',
      diner: payer,
      qrCode: activeTable.qr_code || activeTable.name,
      subtotal: res.paidAmount,
      tip: res.tip,
      total: res.totalCharged,
      method: selectedPayMethod,
      isTableFullyPaid: res.isTableFullyPaid
    });

    if (res.isTableFullyPaid) {
      setActiveTab('exit');
    }
  };

  if (!activeTable) {
    return (
      <div style={{ minHeight: '100vh', background: '#050811', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        Cargando Tarjeta QR de Nexus Pub...
      </div>
    );
  }

  const paidPercent = financials.totalAmount > 0
    ? Math.min(100, Math.round((financials.paidAmount / financials.totalAmount) * 100))
    : 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, #0f172a 0%, #050811 65%)',
      color: '#f8fafc',
      fontFamily: "'Inter', system-ui, sans-serif",
      paddingBottom: roundCount > 0 && activeTab === 'menu' ? '120px' : '90px'
    }}>
      {/* Barra superior de Simulación / Conmutador de Tarjeta QR para Pruebas */}
      <div style={{
        background: 'rgba(2, 6, 23, 0.92)',
        borderBottom: '1px solid rgba(6, 182, 212, 0.25)',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap',
        position: 'sticky',
        top: 0,
        zIndex: 60,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8' }}>📱 TARJETA QR:</span>
          <select
            value={activeTable.id}
            onChange={(e) => {
              setSelectedTableId(e.target.value);
              const t = tables.find(tb => tb.id === e.target.value);
              if (t && typeof window !== 'undefined' && !onBackToAdmin) {
                const url = new URL(window.location.href);
                url.searchParams.set('qr', t.qr_code || t.id);
                window.history.replaceState({}, '', url.toString());
              }
            }}
            style={{
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid rgba(6, 182, 212, 0.45)',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            {tables.map(t => {
              const f = getTableFinancials(t);
              const dot = !f.hasConsumption ? '⚪' : f.isFullyPaid ? '🟢' : '🔴';
              return (
                <option key={t.id} value={t.id}>
                  {dot} {t.qr_code || t.number} · {t.name}
                </option>
              );
            })}
          </select>
        </div>

        {onBackToAdmin && (
          <button
            type="button"
            onClick={onBackToAdmin}
            style={{
              background: 'rgba(6, 182, 212, 0.16)',
              border: '1px solid #06b6d4',
              color: '#ffffff',
              padding: '5px 11px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            ⚙️ Volver al Panel Admin
          </button>
        )}
      </div>

      {/* Contenedor Móvil Centrado */}
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '14px 14px 24px' }}>

        {/* Cabecera del Pub & Estado de la Tarjeta QR */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.75) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '16px',
          marginBottom: '14px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(245,158,11,0.2))',
                border: '1px solid rgba(6,182,212,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <img src="/pub-logo.svg" alt="Nexus Pub" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 900, letterSpacing: '-0.02em' }}>
                  <span style={{ color: '#06b6d4' }}>Nexus</span> <span style={{ color: '#f59e0b' }}>Pub</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginLeft: '6px' }}>
                    {activeBranch?.name?.split('·')[0] || 'Chile'}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#e2e8f0', marginTop: '2px' }}>
                  {activeTable.name} · <span style={{ color: '#38bdf8' }}>{activeTable.qr_code || `MESA-${activeTable.number}`}</span>
                </div>
              </div>
            </div>

            {/* Píldora Semáforo en Vivo */}
            <div
              onClick={() => setActiveTab('exit')}
              style={{
                cursor: 'pointer',
                padding: '5px 10px',
                borderRadius: '999px',
                fontSize: '10.5px',
                fontWeight: 900,
                background: !financials.hasConsumption
                  ? 'rgba(148,163,184,0.15)'
                  : financials.isFullyPaid
                    ? 'rgba(16,185,129,0.2)'
                    : 'rgba(239,68,68,0.18)',
                border: `1px solid ${!financials.hasConsumption ? '#64748b' : financials.isFullyPaid ? '#10b981' : '#ef4444'}`,
                color: !financials.hasConsumption ? '#cbd5e1' : financials.isFullyPaid ? '#34d399' : '#fca5a5',
                whiteSpace: 'nowrap'
              }}
            >
              {!financials.hasConsumption
                ? '⚪ SIN CARGOS'
                : financials.isFullyPaid
                  ? '🟢 AL DÍA ($0)'
                  : `🔴 DEBE ${formatCurrency(financials.pendingAmount)}`}
            </div>
          </div>

          {/* Selector de Identidad del Comensal en la Mesa */}
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '7px' }}>
              👤 ¿Quién eres en esta mesa? (Para separar tu cuenta)
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {tableParticipants.map(name => {
                const isMe = currentDiner.toLowerCase() === name.toLowerCase();
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSelectDiner(name)}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: isMe ? 'linear-gradient(135deg, #06b6d4, #2563eb)' : 'rgba(255,255,255,0.06)',
                      border: isMe ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                      color: '#ffffff',
                      transition: 'all 0.15s'
                    }}
                  >
                    {isMe ? '✓ ' : ''}{name}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setIsAddingDiner(prev => !prev)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: 'rgba(245, 158, 11, 0.14)',
                  border: '1px dashed rgba(245, 158, 11, 0.5)',
                  color: '#fbbf24',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <UserPlus size={12} /> + Tu Nombre
              </button>
            </div>

            {isAddingDiner && (
              <form onSubmit={handleRegisterNewDiner} style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                <input
                  type="text"
                  placeholder="Escribe tu nombre (ej: Rodrigo)..."
                  value={newDinerInput}
                  onChange={(e) => setNewDinerInput(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    background: '#050811',
                    border: '1px solid rgba(6,182,212,0.5)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: '#06b6d4',
                    color: '#050811',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontWeight: 900,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Unirme
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Navegación Principal (3 Tabs de la Tarjeta QR) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '6px',
          background: 'rgba(15, 23, 42, 0.9)',
          padding: '5px',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '16px'
        }}>
          {[
            { id: 'menu', label: '🍺 Pedir', badge: roundCount > 0 ? roundCount : null },
            { id: 'bill', label: '💳 Cuenta / Split', badge: financials.unpaidItems.length > 0 ? financials.unpaidItems.length : null },
            { id: 'exit', label: '🚦 Pase Salida', badge: null }
          ].map(t => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '10px 6px',
                  borderRadius: '10px',
                  border: active ? '1px solid rgba(6,182,212,0.5)' : '1px solid transparent',
                  background: active ? 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(37,99,235,0.25))' : 'transparent',
                  color: active ? '#ffffff' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                <span>{t.label}</span>
                {t.badge && (
                  <span style={{
                    background: t.id === 'bill' ? '#f59e0b' : '#06b6d4',
                    color: '#050811',
                    fontSize: '10px',
                    fontWeight: 900,
                    padding: '1px 6px',
                    borderRadius: '999px'
                  }}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* PESTAÑA 1: CARTA DIGITAL DEL PUB (PEDIR A BARRA / COCINA)         */}
        {/* ================================================================= */}
        {activeTab === 'menu' && (
          <div>
            {/* Chips de Categorías */}
            <div style={{ display: 'flex', gap: '7px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '10px' }}>
              {categories.map(cat => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '7px 13px',
                      borderRadius: '999px',
                      whiteSpace: 'nowrap',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: active ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.1)',
                      background: active ? '#06b6d4' : 'rgba(15, 23, 42, 0.8)',
                      color: active ? '#050811' : '#cbd5e1'
                    }}
                  >
                    {cat === 'TODOS' ? '🔥 Toda la Carta' : cat}
                  </button>
                );
              })}
            </div>

            {/* Lista de Productos del Pub */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredMenu.map(prod => {
                const inCart = roundCart.find(c => c.product.id === prod.id);
                const qty = inCart ? inCart.quantity : 0;
                const isBar = prod.station === 'bar' || String(prod.sku || '').startsWith('BAR-');

                return (
                  <div
                    key={prod.id}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: qty > 0 ? '1px solid rgba(6, 182, 212, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '16px',
                      padding: '10px',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ width: '78px', height: '78px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, position: 'relative', background: '#1e293b' }}>
                      {prod.image_url && (
                        <img src={prod.image_url} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                      <span style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '4px',
                        fontSize: '9px',
                        fontWeight: 900,
                        padding: '2px 5px',
                        borderRadius: '5px',
                        background: isBar ? 'rgba(6,182,212,0.9)' : 'rgba(245,158,11,0.9)',
                        color: '#050811'
                      }}>
                        {isBar ? '🍺 BARRA' : '🍔 COCINA'}
                      </span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', lineHeight: 1.25 }}>
                        {prod.name}
                      </div>
                      <div style={{
                        fontSize: '11.5px',
                        color: '#94a3b8',
                        marginTop: '3px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {prod.description}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 900, color: '#38bdf8' }}>
                          {formatCurrency(prod.sell_price)}
                        </span>

                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => addToRound(prod)}
                            style={{
                              background: 'rgba(6, 182, 212, 0.16)',
                              border: '1px solid rgba(6, 182, 212, 0.5)',
                              color: '#38bdf8',
                              borderRadius: '10px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Plus size={14} /> Pedir
                          </button>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#050811', padding: '4px 8px', borderRadius: '10px', border: '1px solid #06b6d4' }}>
                            <button
                              type="button"
                              onClick={() => updateRoundQty(prod.id, -1)}
                              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                            >
                              <Minus size={15} />
                            </button>
                            <span style={{ fontSize: '13px', fontWeight: 900, color: '#fff', minWidth: '16px', textAlign: 'center' }}>{qty}</span>
                            <button
                              type="button"
                              onClick={() => updateRoundQty(prod.id, 1)}
                              style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', display: 'flex' }}
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PESTAÑA 2: CUENTA EN VIVO & DIVISIÓN DE CUENTA (SPLIT BILL)       */}
        {/* ================================================================= */}
        {activeTab === 'bill' && (
          <div>
            {/* Resumen Financiero de la Mesa */}
            <div style={{
              background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '18px',
              padding: '16px',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Saldo Pendiente Mesa</span>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: financials.isFullyPaid ? '#10b981' : '#f8fafc' }}>
                    {formatCurrency(financials.pendingAmount)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Consumo Total: {formatCurrency(financials.totalAmount)}</span>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                    ✅ Pagado: {formatCurrency(financials.paidAmount)} ({paidPercent}%)
                  </div>
                </div>
              </div>

              {/* Barra de Progreso de Pago de la Mesa */}
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  width: `${paidPercent}%`,
                  height: '100%',
                  background: financials.isFullyPaid ? '#10b981' : 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                  transition: 'width 0.35s ease'
                }} />
              </div>
            </div>

            {!financials.hasConsumption ? (
              <div style={{ textAlign: 'center', padding: '42px 20px', background: 'rgba(15,23,42,0.7)', borderRadius: '18px', border: '1px dashed rgba(255,255,255,0.12)' }}>
                <Beer size={38} color="#38bdf8" style={{ marginBottom: '10px', opacity: 0.7 }} />
                <div style={{ fontSize: '15px', fontWeight: 800 }}>Aún no hay pedidos en esta Tarjeta QR</div>
                <p style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '4px', marginBottom: '14px' }}>
                  Pide tu primera ronda de schops, tragos o tablas directo a barra.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('menu')}
                  style={{ background: '#06b6d4', color: '#050811', border: 'none', borderRadius: '10px', padding: '10px 18px', fontWeight: 900, cursor: 'pointer' }}
                >
                  🍺 Ir a la Carta
                </button>
              </div>
            ) : (
              <>
                {/* Selector de Modo de División si queda saldo por pagar */}
                {financials.pendingAmount > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                      ✂️ ¿Cómo quieres pagar tu parte?
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                      {[
                        { id: 'items', title: '👤 Por Consumo', desc: 'Lo mío o ítems' },
                        { id: 'equal', title: '➗ Partes Iguales', desc: 'Dividir saldo ÷ N' },
                        { id: 'full',  title: '💯 Saldo / Libre', desc: 'Todo o un abono' }
                      ].map(m => {
                        const active = splitMode === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSplitMode(m.id)}
                            style={{
                              padding: '10px 8px',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              textAlign: 'center',
                              background: active ? 'rgba(6, 182, 212, 0.18)' : 'rgba(15, 23, 42, 0.8)',
                              border: active ? '1.5px solid #06b6d4' : '1px solid rgba(255,255,255,0.08)',
                              color: '#fff'
                            }}
                          >
                            <div style={{ fontSize: '12px', fontWeight: 900, color: active ? '#38bdf8' : '#e2e8f0' }}>{m.title}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{m.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Controles específicos del modo 'items' */}
                {financials.pendingAmount > 0 && splitMode === 'items' && (
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '6px' }}>
                    <button
                      type="button"
                      onClick={() => selectItemsForDiner('ALL')}
                      style={{
                        padding: '5px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800,
                        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', cursor: 'pointer', whiteSpace: 'nowrap'
                      }}
                    >
                      Marcar todo pendiente
                    </button>
                    {tableParticipants.map(pName => {
                      const personPending = (activeTable.items || [])
                        .filter(it => !it.paid && (it.participant_name || '').toLowerCase() === pName.toLowerCase())
                        .reduce((acc, it) => acc + (Number(it.unit_price) || 0) * Number(it.quantity ?? it.cantidad ?? 1), 0);
                      if (personPending <= 0) return null;
                      return (
                        <button
                          key={pName}
                          type="button"
                          onClick={() => selectItemsForDiner(pName)}
                          style={{
                            padding: '5px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800,
                            background: 'rgba(6,182,212,0.14)', border: '1px solid rgba(6,182,212,0.45)', color: '#38bdf8', cursor: 'pointer', whiteSpace: 'nowrap'
                          }}
                        >
                          👤 Solo {pName} ({formatCurrency(personPending)})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Controles específicos del modo 'equal' */}
                {financials.pendingAmount > 0 && splitMode === 'equal' && (
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(6,182,212,0.35)',
                    borderRadius: '14px',
                    padding: '14px',
                    marginBottom: '14px'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, marginBottom: '10px', color: '#e2e8f0' }}>
                      ¿Entre cuántas personas dividirán el saldo de {formatCurrency(financials.pendingAmount)}?
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[2, 3, 4, 5, 6].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setEqualWays(n)}
                          style={{
                            flex: 1,
                            padding: '10px 0',
                            borderRadius: '10px',
                            fontWeight: 900,
                            fontSize: '14px',
                            cursor: 'pointer',
                            background: equalWays === n ? '#06b6d4' : 'rgba(255,255,255,0.06)',
                            color: equalWays === n ? '#050811' : '#fff',
                            border: 'none'
                          }}
                        >
                          ÷ {n}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '12.5px', color: '#38bdf8', fontWeight: 800, textAlign: 'center' }}>
                      Tu cuota (1 de {equalWays}): {formatCurrency(calculatedShareSubtotal)}
                    </div>
                  </div>
                )}

                {/* Controles específicos del modo 'full' / monto libre */}
                {financials.pendingAmount > 0 && splitMode === 'full' && (
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(6,182,212,0.35)',
                    borderRadius: '14px',
                    padding: '14px',
                    marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800 }}>Pagar saldo completo o abonar monto CLP:</span>
                      <button
                        type="button"
                        onClick={() => setCustomPayAmount('')}
                        style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '11px', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        100% ({formatCurrency(financials.pendingAmount)})
                      </button>
                    </div>
                    <input
                      type="number"
                      placeholder={`Dejar vacío para pagar todo (${formatCurrency(financials.pendingAmount)}) o escribe monto...`}
                      value={customPayAmount}
                      onChange={(e) => setCustomPayAmount(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#050811',
                        border: '1px solid rgba(255,255,255,0.18)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 800
                      }}
                    />
                  </div>
                )}

                {/* Detalle de todos los Consumos de la Tarjeta QR */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {(activeTable.items || []).map((item, idx) => {
                    const isPaid = !!(item.paid || activeTable.isPaid);
                    const maxQty = Number(item.quantity ?? item.cantidad ?? 1);
                    const selQty = selectedUnitsMap[idx] || 0;
                    const isSelected = !isPaid && splitMode === 'items' && selQty > 0;
                    const kds = KDS_STATUS_BADGE[item.kitchen_status] || KDS_STATUS_BADGE.pending;
                    const owner = item.participant_name || item.participantName || 'General';

                    return (
                      <div
                        key={`bill-item-${idx}`}
                        onClick={() => {
                          if (!isPaid && splitMode === 'items') toggleItemSelection(idx, maxQty);
                        }}
                        style={{
                          background: isPaid
                            ? 'rgba(15, 23, 42, 0.45)'
                            : isSelected
                              ? 'rgba(6, 182, 212, 0.13)'
                              : 'rgba(15, 23, 42, 0.85)',
                          border: isPaid
                            ? '1px solid rgba(16, 185, 129, 0.25)'
                            : isSelected
                              ? '1.5px solid #06b6d4'
                              : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '14px',
                          padding: '11px 12px',
                          cursor: !isPaid && splitMode === 'items' ? 'pointer' : 'default',
                          opacity: isPaid ? 0.78 : 1
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flex: 1 }}>
                            {/* Checkbox interactivo en modo items */}
                            {!isPaid && splitMode === 'items' && (
                              <div style={{
                                width: '20px', height: '20px', borderRadius: '6px', marginTop: '2px', flexShrink: 0,
                                background: isSelected ? '#06b6d4' : 'transparent',
                                border: isSelected ? 'none' : '2px solid #64748b',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                {isSelected && <Check size={14} color="#050811" strokeWidth={3} />}
                              </div>
                            )}

                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13.5px', fontWeight: 800, color: isPaid ? '#cbd5e1' : '#ffffff' }}>
                                {maxQty}× {item.name}
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' }}>
                                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#38bdf8', background: 'rgba(56,189,248,0.12)', padding: '2px 7px', borderRadius: '6px' }}>
                                  👤 {owner}
                                </span>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: kds.color, background: kds.bg, padding: '2px 7px', borderRadius: '6px' }}>
                                  {kds.label}
                                </span>
                                {isPaid && (
                                  <span style={{ fontSize: '10px', fontWeight: 900, color: '#10b981', background: 'rgba(16,185,129,0.16)', padding: '2px 7px', borderRadius: '6px' }}>
                                    ✅ Pagado {item.paid_by ? `por ${item.paid_by}` : ''}
                                  </span>
                                )}
                              </div>

                              {/* Si el ítem tiene cantidad > 1 y está seleccionado en modo items, permitir pagar solo 1 unidad (ej: 1 de 2 schops) */}
                              {!isPaid && splitMode === 'items' && isSelected && maxQty > 1 && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#050811', padding: '3px 8px', borderRadius: '8px', border: '1px solid rgba(6,182,212,0.4)' }}
                                >
                                  <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 700 }}>Pagar unidades:</span>
                                  <button type="button" onClick={() => adjustItemSelectedQty(idx, -1, maxQty)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 900 }}>−</button>
                                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#38bdf8' }}>{selQty} de {maxQty}</span>
                                  <button type="button" onClick={() => adjustItemSelectedQty(idx, 1, maxQty)} style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', fontWeight: 900 }}>+</button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 900, color: isPaid ? '#10b981' : '#ffffff' }}>
                              {formatCurrency((Number(item.unit_price) || 0) * (isSelected ? selQty : maxQty))}
                            </div>
                            {maxQty > 1 && (
                              <div style={{ fontSize: '10px', color: '#64748b' }}>
                                {formatCurrency(item.unit_price)} c/u
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Caja de Checkout Chileno (Propina 10% + Webpay / Mercado Pago / Fintoc) */}
                {financials.pendingAmount > 0 ? (
                  <div style={{
                    background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.98))',
                    border: '1.5px solid rgba(6, 182, 212, 0.4)',
                    borderRadius: '20px',
                    padding: '16px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.45)'
                  }}>
                    {/* Propina Legal Sugerida 10% Chile */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#cbd5e1' }}>
                          🇨🇱 Propina Voluntaria (Art. 64 bis · Sugerida 10%)
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: '#fbbf24' }}>
                          +{formatCurrency(calculatedTip)}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: '6px' }}>
                        {[
                          { pct: 0,  label: '0% (Sin)' },
                          { pct: 10, label: '👍 10% Legal' },
                          { pct: 15, label: '🔥 15% Extra' }
                        ].map(opt => (
                          <button
                            key={opt.pct}
                            type="button"
                            onClick={() => setTipPct(opt.pct)}
                            style={{
                              padding: '8px 6px',
                              borderRadius: '10px',
                              fontSize: '11.5px',
                              fontWeight: 900,
                              cursor: 'pointer',
                              background: tipPct === opt.pct ? 'rgba(245, 158, 11, 0.22)' : 'rgba(255,255,255,0.05)',
                              border: tipPct === opt.pct ? '1.5px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                              color: tipPct === opt.pct ? '#fbbf24' : '#94a3b8'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selector de Pasarela Chilena */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#cbd5e1', marginBottom: '7px' }}>
                        Medio de Pago Rápido
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {CHILE_PAYMENT_METHODS.map(pm => {
                          const active = selectedPayMethod === pm.id;
                          return (
                            <button
                              key={pm.id}
                              type="button"
                              onClick={() => setSelectedPayMethod(pm.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: active ? 'rgba(6, 182, 212, 0.14)' : 'rgba(255,255,255,0.04)',
                                border: active ? `1.5px solid ${pm.accent}` : '1px solid rgba(255,255,255,0.08)',
                                color: '#fff',
                                textAlign: 'left'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '18px' }}>{pm.icon}</span>
                                <div>
                                  <div style={{ fontSize: '12.5px', fontWeight: 900 }}>{pm.short}</div>
                                  <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>{pm.sub}</div>
                                </div>
                              </div>
                              <div style={{
                                width: '18px', height: '18px', borderRadius: '50%',
                                border: active ? `5px solid ${pm.accent}` : '2px solid #475569'
                              }} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Botón Pagar Ahora */}
                    <button
                      type="button"
                      disabled={isProcessing || calculatedShareSubtotal <= 0}
                      onClick={handlePaySplitShare}
                      style={{
                        width: '100%',
                        padding: '15px',
                        borderRadius: '14px',
                        border: 'none',
                        background: calculatedShareSubtotal > 0
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : '#334155',
                        color: '#ffffff',
                        fontSize: '14.5px',
                        fontWeight: 900,
                        cursor: calculatedShareSubtotal > 0 ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: calculatedShareSubtotal > 0 ? '0 8px 22px rgba(16,185,129,0.35)' : 'none'
                      }}
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw size={17} className="animate-spin" />
                          <span>Autorizando pago en Chile...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard size={18} />
                          <span>PAGAR MI PARTE: {formatCurrency(calculatedGrandTotal)}</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.14)',
                    border: '1.5px solid #10b981',
                    borderRadius: '18px',
                    padding: '18px',
                    textAlign: 'center'
                  }}>
                    <CheckCircle2 size={34} color="#10b981" style={{ marginBottom: '6px' }} />
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#34d399' }}>
                      ¡Cuenta 100% Pagada!
                    </div>
                    <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '4px 0 12px' }}>
                      Muestra tu Pase QR verde en la salida del local para retirarte sin filas.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('exit')}
                      style={{
                        background: '#10b981', color: '#050811', border: 'none', borderRadius: '10px',
                        padding: '10px 18px', fontWeight: 900, fontSize: '12.5px', cursor: 'pointer'
                      }}
                    >
                      🚦 Ver Pase QR de Salida →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* PESTAÑA 3: PASE DE SALIDA (SEMÁFORO EN EL CELULAR DEL CLIENTE)    */}
        {/* ================================================================= */}
        {activeTab === 'exit' && (
          <div>
            <div style={{
              background: financials.semaphore === 'green'
                ? 'linear-gradient(145deg, rgba(6, 78, 59, 0.85), rgba(15, 23, 42, 0.95))'
                : financials.semaphore === 'red'
                  ? 'linear-gradient(145deg, rgba(127, 29, 29, 0.8), rgba(15, 23, 42, 0.95))'
                  : 'linear-gradient(145deg, #0f172a, #1e293b)',
              border: `2px solid ${financials.semaphore === 'green' ? '#10b981' : financials.semaphore === 'red' ? '#ef4444' : '#475569'}`,
              borderRadius: '24px',
              padding: '24px 18px',
              textAlign: 'center',
              boxShadow: financials.semaphore === 'green'
                ? '0 0 40px rgba(16,185,129,0.28)'
                : financials.semaphore === 'red'
                  ? '0 0 40px rgba(239,68,68,0.25)'
                  : 'none'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 900,
                marginBottom: '14px',
                background: financials.semaphore === 'green' ? '#10b981' : financials.semaphore === 'red' ? '#ef4444' : '#475569',
                color: financials.semaphore === 'green' ? '#050811' : '#ffffff'
              }}>
                {financials.semaphore === 'green'
                  ? '🟢 SALIDA AUTORIZADA · CUENTA EN $0'
                  : financials.semaphore === 'red'
                    ? '🔴 SALDO PENDIENTE EN LA MESA'
                    : '⚪ TARJETA SIN CONSUMOS'}
              </div>

              <div style={{ margin: '6px 0 16px' }}>
                <VisualQRBox
                  code={activeTable.qr_code || activeTable.id}
                  color={financials.semaphore === 'green' ? '#10b981' : financials.semaphore === 'red' ? '#ef4444' : '#64748b'}
                />
              </div>

              <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '0.04em', color: '#ffffff' }}>
                {activeTable.qr_code || `MESA-${activeTable.number}`}
              </div>
              <div style={{ fontSize: '12.5px', color: '#cbd5e1', marginTop: '2px' }}>
                {activeTable.name} · {activeTable.diners || tableParticipants.length || 0} comensales
              </div>

              {financials.semaphore === 'green' && (
                <div style={{ marginTop: '14px', fontSize: '13px', color: '#a7f3d0', fontWeight: 700, lineHeight: 1.5 }}>
                  Todo el consumo ({formatCurrency(financials.totalAmount)}) está pagado. Muestra este código al anfitrión en puerta al salir.
                </div>
              )}

              {financials.semaphore === 'red' && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#fecaca', marginBottom: '10px' }}>
                    Faltan {formatCurrency(financials.pendingAmount)} por cubrir en esta tarjeta
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bill')}
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '11px 20px',
                      fontWeight: 900,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    💳 Ir a Pagar Saldo Pendiente →
                  </button>
                </div>
              )}
            </div>

            {/* Historial de Pagos & Boletas Emitidas en esta Tarjeta */}
            {Array.isArray(activeTable.payments) && activeTable.payments.length > 0 && (
              <div style={{
                marginTop: '16px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '18px',
                padding: '14px'
              }}>
                <div style={{ fontSize: '11.5px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>
                  🧾 Pagos &amp; Boletas Registradas ({activeTable.payments.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeTable.payments.map(p => (
                    <div key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '9px 11px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                      border: '1px solid rgba(16,185,129,0.2)'
                    }}>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#fff' }}>
                          ✅ {p.payerName} · <span style={{ color: '#38bdf8' }}>{p.method}</span>
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                          Consumo {formatCurrency(p.amount)} {p.tip > 0 ? `+ Propina ${formatCurrency(p.tip)}` : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#10b981' }}>
                        {formatCurrency(p.totalCharged || (p.amount + (p.tip || 0)))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barra Flotante Inferior cuando hay ítems en la Ronda */}
      {activeTab === 'menu' && roundCount > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '14px',
          left: '14px',
          right: '14px',
          maxWidth: '492px',
          margin: '0 auto',
          zIndex: 70
        }}>
          <button
            type="button"
            onClick={() => setIsRoundCheckoutOpen(true)}
            style={{
              width: '100%',
              padding: '15px 18px',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 900,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 12px 30px rgba(6, 182, 212, 0.45)'
            }}
          >
            <span>🍺 Ver mi Ronda ({roundCount} {roundCount === 1 ? 'ítem' : 'ítems'})</span>
            <span>{formatCurrency(roundSubtotal)} →</span>
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL / DRAWER DE CONFIRMACIÓN DE RONDA (CARGAR A QR vs PRE-PAGO) */}
      {/* ================================================================= */}
      {isRoundCheckoutOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200000,
          background: 'rgba(2, 6, 23, 0.88)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <div style={{
            width: '100%', maxWidth: '520px',
            background: '#0f172a',
            borderTop: '2px solid #06b6d4',
            borderRadius: '24px 24px 0 0',
            padding: '20px 18px 26px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900 }}>
                🍺 Confirmar Ronda · {currentDiner || 'Invitado QR'}
              </h3>
              <button
                type="button"
                onClick={() => setIsRoundCheckoutOpen(false)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={17} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {roundCart.map(c => (
                <div key={c.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '9px 12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800 }}>
                    {c.quantity}× {c.product.name}
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#38bdf8' }}>
                    {formatCurrency(c.product.sell_price * c.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <input
              type="text"
              placeholder="Nota opcional para Barra/Cocina (ej: Poco hielo, sin cebolla)..."
              value={roundNotes}
              onChange={(e) => setRoundNotes(e.target.value)}
              style={{
                width: '100%',
                background: '#050811',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                padding: '10px 12px',
                color: '#fff',
                fontSize: '12.5px',
                marginBottom: '14px'
              }}
            />

            {/* Opción A: Cargar a la Tarjeta QR */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleConfirmRound(false)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                border: '1.5px solid #06b6d4',
                background: 'rgba(6, 182, 212, 0.16)',
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: 900,
                cursor: 'pointer',
                marginBottom: '14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span>📋 ENVIAR A BARRA/COCINA ({formatCurrency(roundSubtotal)})</span>
              <span style={{ fontSize: '10.5px', color: '#38bdf8', fontWeight: 700 }}>
                Se carga a tu nombre en la Tarjeta QR · Pagas o divides al final
              </span>
            </button>

            {/* Separador Pago Anticipado */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '16px',
              padding: '14px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#34d399', marginBottom: '8px' }}>
                ⚡ O PAGA ESTA RONDA POR ANTICIPADO (QUEDA PAGADA AL INSTANTE)
              </div>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                {[0, 10, 15].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setPrepayTipPct(pct)}
                    style={{
                      flex: 1, padding: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                      background: prepayTipPct === pct ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.05)',
                      border: prepayTipPct === pct ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                      color: prepayTipPct === pct ? '#fbbf24' : '#94a3b8'
                    }}
                  >
                    Propina {pct}%
                  </button>
                ))}
              </div>

              <select
                value={prepayMethod}
                onChange={(e) => setPrepayMethod(e.target.value)}
                style={{
                  width: '100%', background: '#050811', color: '#fff', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '10px', padding: '9px 10px', fontSize: '12px', fontWeight: 800, marginBottom: '10px'
                }}
              >
                {CHILE_PAYMENT_METHODS.map(pm => (
                  <option key={pm.id} value={pm.id}>{pm.icon} {pm.short}</option>
                ))}
              </select>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleConfirmRound(true)}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(16,185,129,0.3)'
                }}
              >
                {isProcessing ? 'Procesando...' : `⚡ PAGAR AHORA Y PEDIR: ${formatCurrency(roundSubtotal + prepayTipAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL DE COMPROBANTE / BOLETA DIGITAL CHILENA                     */}
      {/* ================================================================= */}
      {feedbackVoucher && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200001,
          background: 'rgba(2, 6, 23, 0.88)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '18px'
        }}>
          <div style={{
            width: '100%', maxWidth: '390px',
            background: '#0f172a',
            border: '1.5px solid #10b981',
            borderRadius: '22px',
            padding: '22px 18px',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <CheckCircle2 size={42} color="#10b981" style={{ marginBottom: '8px' }} />
            <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 900, color: '#fff' }}>
              {feedbackVoucher.title}
            </h3>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>
              {feedbackVoucher.qrCode} · Comensal: <strong style={{ color: '#fff' }}>{feedbackVoucher.diner}</strong>
            </div>

            <div style={{
              background: '#050811',
              borderRadius: '14px',
              padding: '12px 14px',
              textAlign: 'left',
              fontSize: '12.5px',
              marginBottom: '16px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: '#94a3b8' }}>Consumo (IVA 19% incl.):</span>
                <span style={{ fontWeight: 800 }}>{formatCurrency(feedbackVoucher.subtotal)}</span>
              </div>
              {feedbackVoucher.tip > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ color: '#94a3b8' }}>Propina Voluntaria:</span>
                  <span style={{ fontWeight: 800, color: '#fbbf24' }}>{formatCurrency(feedbackVoucher.tip)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.12)', fontSize: '14px', fontWeight: 900, color: '#10b981' }}>
                <span>Total:</span>
                <span>{formatCurrency(feedbackVoucher.total)}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '6px', fontWeight: 700 }}>
                Estado: {feedbackVoucher.method}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFeedbackVoucher(null)}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                background: '#10b981', color: '#050811', fontWeight: 900, fontSize: '13.5px', cursor: 'pointer'
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
