import React, { useState } from 'react';
import { usePuntoNexus } from '../context/PuntoNexusContext';
import { ArrowUpDown } from 'lucide-react';

export default function DualCurrencyDisplay({ 
  amount, 
  fontSize = '24px', 
  primaryColor = 'var(--color-cyan)',
  showSwap = true,
  align = 'left',
  style = {} 
}) {
  const { companySettings, isCurrencySwapped, toggleCurrencyOrder, formatCurrency } = usePuntoNexus();
  const [animating, setAnimating] = useState(false);

  const handleSwap = (e) => {
    e.stopPropagation();
    setAnimating(true);
    toggleCurrencyOrder();
    setTimeout(() => setAnimating(false), 300);
  };

  const num = Number(amount) || 0;

  // Si la tienda no usa precios en dólares / multidivisa, mostrar formato estándar único
  if (!companySettings?.use_usd_pricing) {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start', ...style }}>
        <span style={{ fontSize, fontWeight: 900, fontFamily: 'var(--font-title)', color: primaryColor }}>
          {formatCurrency(num)}
        </span>
      </div>
    );
  }

  const currencyCode = companySettings?.currency_code || (companySettings?.country === 'CL' ? 'CLP' : 'VES');
  const currencySymbol = (companySettings?.currency_symbol && companySettings.currency_symbol !== 'null')
    ? companySettings.currency_symbol
    : (currencyCode === 'CLP' ? '$' : 'Bs.');
  const rate = Number(companySettings?.exchange_rate) || 1.0;
  const localVal = num * rate;

  const formattedLocal = currencyCode === 'CLP'
    ? `${currencySymbol} ${Math.round(localVal).toLocaleString('es-CL')}`
    : `${currencySymbol} ${localVal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formattedUSD = `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const primaryText = isCurrencySwapped ? formattedUSD : formattedLocal;
  const secondaryText = isCurrencySwapped ? formattedLocal : formattedUSD;

  return (
    <div 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px', 
        justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
        ...style 
      }}
    >
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
          opacity: animating ? 0.4 : 1,
          transform: animating ? 'scale(0.95)' : 'scale(1)'
        }}
      >
        {/* Moneda Principal (Grande Arriba) */}
        <span 
          style={{
            fontSize: fontSize,
            fontWeight: 900,
            fontFamily: 'var(--font-title)',
            color: primaryColor,
            lineHeight: '1.1',
            letterSpacing: '-0.02em',
            transition: 'color 0.2s ease'
          }}
        >
          {primaryText}
        </span>

        {/* Moneda Secundaria (Pequeña Abajo) */}
        <span 
          style={{
            fontSize: `calc(${fontSize} * 0.45 + 4px)`,
            fontWeight: 700,
            color: '#94a3b8',
            marginTop: '2px',
            lineHeight: '1',
            letterSpacing: '0.02em'
          }}
        >
          {secondaryText}
        </span>
      </div>

      {/* Botón Pequeño de Intercambio Animado */}
      {showSwap && (
        <button
          type="button"
          onClick={handleSwap}
          title="Intercambiar moneda principal y secundaria"
          style={{
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.35)',
            borderRadius: '50%',
            width: '26px',
            height: '26px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-cyan)',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: isCurrencySwapped ? 'rotate(180deg)' : 'rotate(0deg)',
            boxShadow: '0 2px 8px rgba(6, 182, 212, 0.2)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = `${isCurrencySwapped ? 'rotate(180deg)' : 'rotate(0deg)'} scale(1.15)`}
          onMouseLeave={(e) => e.currentTarget.style.transform = `${isCurrencySwapped ? 'rotate(180deg)' : 'rotate(0deg)'} scale(1)`}
        >
          <ArrowUpDown size={13} />
        </button>
      )}
    </div>
  );
}
