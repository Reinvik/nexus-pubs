import React, { useState, useMemo } from 'react';
import { usePuntoNexus } from '../context/PuntoNexusContext';
import {
  QrCode, ShieldCheck, AlertOctagon, CheckCircle2, CreditCard, Search,
  Users, Beer, Banknote, Smartphone, ExternalLink, RotateCcw, Unlock
} from 'lucide-react';

export default function ExitGatekeeperView({ onOpenGuestSimulator = null }) {
  const {
    tables,
    formatCurrency,
    getTableFinancials,
    payTableSplitBill,
    clearTable,
    resetDemoPubTables
  } = usePuntoNexus();

  const [scanInput, setScanInput] = useState('');
  const [selectedTableId, setSelectedTableId] = useState(() => tables?.[0]?.id || '');
  const [includeDoorTip, setIncludeDoorTip] = useState(true);
  const [doorProcessing, setDoorProcessing] = useState(false);

  // Filtrar tarjetas por código QR, número o nombre
  const filteredCards = useMemo(() => {
    const q = scanInput.trim().toLowerCase();
    return (tables || []).filter(t => {
      if (!q) return true;
      return (
        String(t.qr_code || '').toLowerCase().includes(q) ||
        String(t.name || '').toLowerCase().includes(q) ||
        String(t.number || '').toLowerCase().includes(q) ||
        (t.dinersNames || []).some(n => String(n).toLowerCase().includes(q))
      );
    });
  }, [tables, scanInput]);

  // Si el portero escanea con pistola 2D QR un código exacto y presiona Enter, seleccionarla al instante
  const handleScanSubmit = (e) => {
    e.preventDefault();
    const q = scanInput.trim().toLowerCase();
    if (!q) return;
    const exact = (tables || []).find(t =>
      String(t.qr_code || '').toLowerCase() === q ||
      String(t.number || '').toLowerCase() === q
    );
    if (exact) {
      setSelectedTableId(exact.id);
    } else if (filteredCards.length > 0) {
      setSelectedTableId(filteredCards[0].id);
    }
  };

  const selectedTable = useMemo(() => {
    return (tables || []).find(t => t.id === selectedTableId) || filteredCards[0] || tables?.[0] || null;
  }, [tables, selectedTableId, filteredCards]);

  const fin = useMemo(() => getTableFinancials(selectedTable), [selectedTable, getTableFinancials]);

  // KPIs globales de Puerta
  const kpis = useMemo(() => {
    let greenCount = 0;
    let redCount = 0;
    let freeCount = 0;
    let totalTips = 0;
    let totalPendingAll = 0;

    (tables || []).forEach(t => {
      const f = getTableFinancials(t);
      totalTips += f.totalTips;
      totalPendingAll += f.pendingAmount;
      if (!f.hasConsumption) freeCount++;
      else if (f.isFullyPaid) greenCount++;
      else redCount++;
    });

    return { greenCount, redCount, freeCount, totalTips, totalPendingAll };
  }, [tables, getTableFinancials]);

  const doorTipAmount = includeDoorTip ? Math.round(fin.pendingAmount * 0.10) : 0;

  const handleExpressDoorSettle = async (methodLabel) => {
    if (!selectedTable || fin.pendingAmount <= 0) return;
    setDoorProcessing(true);
    await new Promise(r => setTimeout(r, 450));

    await payTableSplitBill(selectedTable.id, {
      mode: 'full',
      amount: fin.pendingAmount,
      tip: doorTipAmount,
      payerName: 'Cobro Puerta / Salida',
      paymentMethod: methodLabel
    });

    setDoorProcessing(false);
  };

  const handleReleaseCard = () => {
    if (!selectedTable) return;
    clearTable(selectedTable.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* KPIs Rápidos de Control Puerta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className="glass-panel" style={{ padding: '14px 18px', borderLeft: '4px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>🟢 Salida Autorizada</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#059669' }}>{kpis.greenCount} tarjetas</div>
          </div>
          <CheckCircle2 size={28} color="#10b981" />
        </div>

        <div className="glass-panel" style={{ padding: '14px 18px', borderLeft: '4px solid #ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>🔴 Con Saldo Pendiente</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#dc2626' }}>{kpis.redCount} ({formatCurrency(kpis.totalPendingAll)})</div>
          </div>
          <AlertOctagon size={28} color="#ef4444" />
        </div>

        <div className="glass-panel" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>💰 Propinas Digitales 10%</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#d97706' }}>{formatCurrency(kpis.totalTips)}</div>
          </div>
          <Beer size={28} color="#f59e0b" />
        </div>
      </div>

      {/* Layout Principal: Lector / Tarjetas a la Izquierda + Semáforo Gigante a la Derecha */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(290px, 1fr) minmax(360px, 1.5fr)', gap: '18px', alignItems: 'start' }}>

        {/* Columna Izquierda: Escáner de Tarjeta QR y Listado en Vivo */}
        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <QrCode size={18} color="var(--color-cyan)" />
              Escanear Tarjeta QR
            </h3>
            <button
              type="button"
              onClick={resetDemoPubTables}
              title="Restaurar mesas demostrativas del Pub"
              style={{
                background: 'rgba(6,182,212,0.1)',
                border: '1px solid rgba(6,182,212,0.35)',
                color: '#0284c7',
                borderRadius: '8px',
                padding: '4px 9px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RotateCcw size={12} /> Demo Pub
            </button>
          </div>

          <form onSubmit={handleScanSubmit} style={{ position: 'relative', marginBottom: '14px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Pistola QR o busca ej: QR-MESA-01, Matías..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              autoFocus
              style={{ width: '100%', paddingLeft: '36px', fontWeight: 700, fontSize: '13px' }}
            />
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
            {filteredCards.map(t => {
              const f = getTableFinancials(t);
              const isSelected = selectedTable?.id === t.id;
              const badgeBg = f.semaphore === 'green' ? '#dcfce7' : f.semaphore === 'red' ? '#fee2e2' : '#f1f5f9';
              const badgeColor = f.semaphore === 'green' ? '#15803d' : f.semaphore === 'red' ? '#b91c1c' : '#64748b';
              const dot = f.semaphore === 'green' ? '🟢' : f.semaphore === 'red' ? '🔴' : '⚪';

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTableId(t.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(6, 182, 212, 0.08)' : '#ffffff',
                    border: isSelected ? '2px solid var(--color-cyan)' : '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{dot}</span>
                      <span>{t.qr_code || `MESA-${t.number}`}</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                      {t.name} {(t.dinersNames?.length > 0) ? `· ${t.dinersNames.join(', ')}` : ''}
                    </div>
                  </div>

                  <span style={{
                    padding: '4px 9px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 900,
                    background: badgeBg,
                    color: badgeColor
                  }}>
                    {f.semaphore === 'green'
                      ? 'PAGADO $0'
                      : f.semaphore === 'red'
                        ? `DEBE ${formatCurrency(f.pendingAmount)}`
                        : 'LIBRE'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: SEMÁFORO DE SALIDA DE ALTO CONTRASTE */}
        {selectedTable && (
          <div style={{
            borderRadius: '24px',
            overflow: 'hidden',
            background: '#0f172a',
            color: '#ffffff',
            border: `3px solid ${fin.semaphore === 'green' ? '#10b981' : fin.semaphore === 'red' ? '#ef4444' : '#475569'}`,
            boxShadow: fin.semaphore === 'green'
              ? '0 16px 45px rgba(16, 185, 129, 0.25)'
              : fin.semaphore === 'red'
                ? '0 16px 45px rgba(239, 68, 68, 0.25)'
                : '0 10px 30px rgba(15, 23, 42, 0.15)'
          }}>
            {/* Banner Superior del Semáforo */}
            <div style={{
              padding: '24px',
              background: fin.semaphore === 'green'
                ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                : fin.semaphore === 'red'
                  ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                  : 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.9 }}>
                  CONTROL DE PUERTA · {selectedTable.qr_code || selectedTable.name}
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, marginTop: '4px', letterSpacing: '-0.02em' }}>
                  {fin.semaphore === 'green'
                    ? '🟢 TODO PAGADO — SALIDA AUTORIZADA'
                    : fin.semaphore === 'red'
                      ? '🔴 ALTO — SALDO PENDIENTE EN MESA'
                      : '⚪ TARJETA LIBRE / SIN CONSUMOS'}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.92, marginTop: '4px', fontWeight: 600 }}>
                  {selectedTable.name} · Comensales: {(selectedTable.dinersNames || []).join(', ') || `${selectedTable.diners || 0} registrados`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={`/?qr=${encodeURIComponent(selectedTable.qr_code || selectedTable.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => {
                    if (onOpenGuestSimulator) {
                      e.preventDefault();
                      onOpenGuestSimulator(selectedTable.qr_code || selectedTable.id);
                    }
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    border: '1px solid rgba(255,255,255,0.35)',
                    color: '#ffffff',
                    padding: '9px 14px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Smartphone size={15} /> Simular Celular QR <ExternalLink size={13} />
                </a>
              </div>
            </div>

            {/* Cuerpo de Auditoría de la Tarjeta */}
            <div style={{ padding: '22px 24px' }}>
              {/* Métricas de la Tarjeta */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Consumo Total</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '2px' }}>{formatCurrency(fin.totalAmount)}</div>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.08)', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <div style={{ fontSize: '10.5px', color: '#6ee7b7', fontWeight: 800, textTransform: 'uppercase' }}>Ya Pagado (QR)</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#34d399', marginTop: '2px' }}>{formatCurrency(fin.paidAmount)}</div>
                </div>
                <div style={{
                  background: fin.pendingAmount > 0 ? 'rgba(239,68,68,0.14)' : 'rgba(255,255,255,0.04)',
                  padding: '12px 14px', borderRadius: '14px',
                  border: fin.pendingAmount > 0 ? '1px solid rgba(239,68,68,0.45)' : '1px solid rgba(255,255,255,0.08)'
                }}>
                  <div style={{ fontSize: '10.5px', color: fin.pendingAmount > 0 ? '#fca5a5' : '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Saldo por Cobrar</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: fin.pendingAmount > 0 ? '#f87171' : '#10b981', marginTop: '2px' }}>
                    {formatCurrency(fin.pendingAmount)}
                  </div>
                </div>
              </div>

              {/* CASO ROJO: Ítems pendientes y Cobro Express en Puerta */}
              {fin.semaphore === 'red' && (
                <>
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 900, color: '#fca5a5', textTransform: 'uppercase', marginBottom: '8px' }}>
                      ⚠️ Detalle de Consumos No Pagados ({fin.unpaidItems.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      {fin.unpaidItems.map((it, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.28)',
                          padding: '10px 14px', borderRadius: '12px'
                        }}>
                          <div>
                            <span style={{ fontWeight: 800, fontSize: '13.5px' }}>
                              {it.quantity ?? it.cantidad ?? 1}× {it.name}
                            </span>
                            <span style={{
                              marginLeft: '8px', fontSize: '11px', fontWeight: 800,
                              background: 'rgba(56,189,248,0.16)', color: '#38bdf8',
                              padding: '2px 8px', borderRadius: '6px'
                            }}>
                              👤 {it.participant_name || 'General'}
                            </span>
                          </div>
                          <span style={{ fontWeight: 900, fontSize: '14px', color: '#fca5a5' }}>
                            {formatCurrency(it.lineTotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cobro Express en Puerta con POS Transbank / Efectivo */}
                  <div style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '16px',
                    padding: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 900 }}>
                        ⚡ Liquidar Saldo en Puerta y Autorizar Salida
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#fbbf24', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={includeDoorTip}
                          onChange={(e) => setIncludeDoorTip(e.target.checked)}
                        />
                        Incluir 10% Propina Legal (+{formatCurrency(Math.round(fin.pendingAmount * 0.10))})
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                      <button
                        type="button"
                        disabled={doorProcessing}
                        onClick={() => handleExpressDoorSettle('POS Transbank (Puerta)')}
                        style={{
                          padding: '13px 12px', borderRadius: '12px', border: 'none',
                          background: 'linear-gradient(135deg, #06b6d4, #2563eb)', color: '#fff',
                          fontWeight: 900, fontSize: '12.5px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                      >
                        <CreditCard size={16} /> POS Transbank ({formatCurrency(fin.pendingAmount + doorTipAmount)})
                      </button>

                      <button
                        type="button"
                        disabled={doorProcessing}
                        onClick={() => handleExpressDoorSettle('Efectivo CLP (Puerta)')}
                        style={{
                          padding: '13px 12px', borderRadius: '12px', border: 'none',
                          background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                          fontWeight: 900, fontSize: '12.5px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                      >
                        <Banknote size={16} /> Efectivo ({formatCurrency(fin.pendingAmount + doorTipAmount)})
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* CASO VERDE: Todo pagado -> Botón de Liberar Mesa y Resetear Tarjeta QR */}
              {fin.semaphore === 'green' && (
                <div>
                  {Array.isArray(selectedTable.payments) && selectedTable.payments.length > 0 && (
                    <div style={{ marginBottom: '18px' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 900, color: '#6ee7b7', textTransform: 'uppercase', marginBottom: '8px' }}>
                        ✅ Comprobantes Verificados ({selectedTable.payments.length}) · Propinas: {formatCurrency(fin.totalTips)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {selectedTable.payments.map(p => (
                          <div key={p.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                            padding: '9px 12px', borderRadius: '10px', fontSize: '12.5px'
                          }}>
                            <span><strong>{p.payerName}</strong> · {p.method}</span>
                            <span style={{ fontWeight: 900, color: '#34d399' }}>
                              {formatCurrency(p.totalCharged || (p.amount + (p.tip || 0)))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleReleaseCard}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      fontSize: '15px',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 8px 25px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    <Unlock size={19} />
                    CONFIRMAR SALIDA Y RESETEAR TARJETA {selectedTable.qr_code} PARA NUEVO CLIENTE
                  </button>
                </div>
              )}

              {fin.semaphore === 'neutral' && (
                <div style={{ textAlign: 'center', padding: '18px', color: '#94a3b8', fontSize: '13.5px' }}>
                  Esta Tarjeta QR está disponible y sin deuda. Lista para entregar al próximo grupo en la entrada.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
