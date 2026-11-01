import React, { useEffect, useState, useRef } from 'react';
import { BellRing, ShoppingBag, ArrowRight, X } from 'lucide-react';

export default function SaleAlertBanner({ alert, onClose, onNavigate, formatCurrency }) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const DURATION_MS = 8000;
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!alert) return;

    setProgress(100);
    const stepMs = 100;
    const decrement = (stepMs / DURATION_MS) * 100;

    intervalRef.current = setInterval(() => {
      if (!isPaused) {
        setProgress(prev => {
          if (prev <= decrement) {
            clearInterval(intervalRef.current);
            onClose();
            return 0;
          }
          return prev - decrement;
        });
      }
    }, stepMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [alert, isPaused, onClose]);

  if (!alert) return null;

  const handleAction = () => {
    onClose();
    if (onNavigate) {
      if (alert.isWebOrder) {
        onNavigate('showcase');
      } else {
        onNavigate('history');
      }
    }
  };

  const formattedAmount = formatCurrency 
    ? formatCurrency(alert.amount) 
    : $ + Number(alert.amount || 0).toLocaleString('es-CL');

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 99999,
        maxWidth: '460px',
        width: 'calc(100vw - 40px)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.97) 0%, rgba(6, 78, 59, 0.95) 100%)',
        backdropFilter: 'blur(16px)',
        border: '1.5px solid #10b981',
        borderRadius: '16px',
        boxShadow: '0 12px 40px rgba(16, 185, 129, 0.35), 0 0 20px rgba(16, 185, 129, 0.2)',
        color: '#ffffff',
        overflow: 'hidden',
        animation: 'modalScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'default'
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div style={{ padding: '16px 18px 14px 18px' }}>
        {/* Cabecera de la notificación */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              fontSize: '10.5px',
              fontWeight: 800,
              color: '#34d399',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981'
              }}></span>
              {alert.isWebOrder ? 'Nuevo Pedido Web / QR' : 'Venta en Vivo'}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {alert.branchName || 'Sucursal'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#cbd5e1',
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
            title="Cerrar notificación"
          >
            <X size={14} />
          </button>
        </div>

        {/* Contenido Principal */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          {/* Icono animado */}
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
            flexShrink: 0
          }}>
            {alert.isWebOrder ? (
              <ShoppingBag size={24} style={{ color: '#ffffff' }} />
            ) : (
              <BellRing size={24} style={{ color: '#ffffff' }} />
            )}
          </div>

          {/* Detalles de la venta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {alert.title}
            </div>

            <div style={{
              fontSize: '22px',
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: '1.2',
              marginTop: '2px',
              textShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
            }}>
              {formattedAmount}
            </div>

            <div style={{ fontSize: '11.5px', color: '#cbd5e1', marginTop: '4px', lineHeight: '1.4' }}>
              <strong>{alert.customer}</strong> • {alert.itemsCount} {alert.itemsCount === 1 ? 'producto' : 'productos'} • {alert.docType} ({alert.paymentMethod})
            </div>
          </div>
        </div>

        {/* Botón de acción rápida */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button
            type="button"
            onClick={handleAction}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <span>{alert.isWebOrder ? 'Ver Pedido en Vitrina' : 'Ver en Historial'}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Barra de progreso de auto-cierre */}
      <div style={{ width: '100%', height: '3px', background: 'rgba(255, 255, 255, 0.1)' }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #10b981, #34d399)',
            transition: 'width 0.1s linear'
          }}
        />
      </div>
    </div>
  );
}
