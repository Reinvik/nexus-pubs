import React, { useState, useMemo } from 'react';
import { TrendingUp, Calendar, DollarSign, ShoppingCart, Award, BarChart2, Layers } from 'lucide-react';
import DualCurrencyDisplay from './DualCurrencyDisplay';

export default function SalesEvolutionChart({ sales = [], formatCurrency }) {
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'weekly'
  const [periodDays, setPeriodDays] = useState(14); // 7, 14, 30 para diaria
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Extraer la fecha YYYY-MM-DD sin problemas de desfase UTC/Local
  const getCanonicalDateKey = (dateInput) => {
    if (!dateInput) return null;
    
    // 1. Si es un string tipo "2026-07-25..." o "2026-07-25 18:30"
    if (typeof dateInput === 'string') {
      const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
    }

    // 2. Si es una fecha u objeto timestamp
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;

    const yLocal = d.getFullYear();
    const mLocal = String(d.getMonth() + 1).padStart(2, '0');
    const dayLocal = String(d.getDate()).padStart(2, '0');
    return `${yLocal}-${mLocal}-${dayLocal}`;
  };

  // Helper para formatear fecha YYYY-MM-DD
  const formatDateKey = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Helper para obtener el inicio de semana (Lunes)
  const getWeekStart = (dateObj) => {
    const d = new Date(dateObj);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar al lunes
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Procesamiento de datos según viewMode
  const chartData = useMemo(() => {
    const now = new Date();
    const activeSales = sales.filter(s => s.status !== 'Anulada' && !s.cancelled);

    if (viewMode === 'daily') {
      // Días (últimos N días)
      const result = [];
      for (let i = periodDays - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateKey = formatDateKey(d);

        // Filtrar ventas del día con coincidencia garantizada por formato YYYY-MM-DD y UTC fallback
        const daySales = activeSales.filter(s => {
          const rawDate = s.sold_at || s.created_at || s.fecha || s.date;
          if (!rawDate) return false;
          
          const sKey = getCanonicalDateKey(rawDate);
          if (sKey === dateKey) return true;

          // Fallback por UTC ISO String
          const dObj = new Date(rawDate);
          if (!isNaN(dObj.getTime())) {
            const yUtc = dObj.getUTCFullYear();
            const mUtc = String(dObj.getUTCMonth() + 1).padStart(2, '0');
            const dayUtc = String(dObj.getUTCDate()).padStart(2, '0');
            return `${yUtc}-${mUtc}-${dayUtc}` === dateKey;
          }
          return false;
        });

        const totalSell = daySales.reduce((acc, s) => acc + Number(s.total_sell || s.total || s.monto || 0), 0);
        const totalProfit = daySales.reduce((acc, s) => {
          const sell = Number(s.total_sell || s.total || s.monto || 0);
          const cost = Number(s.total_cost || s.costo || 0);
          return acc + (sell - cost);
        }, 0);
        const count = daySales.length;

        // Nombre del día abreviado en español
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const labelStr = `${dayNames[d.getDay()]} ${d.getDate()}`;

        result.push({
          key: dateKey,
          label: labelStr,
          totalSell,
          totalProfit,
          count,
          rawDate: d
        });
      }
      return result;
    } else {
      // Semanal (últimas 6 semanas)
      const numWeeks = 6;
      const result = [];
      const currentWeekStart = getWeekStart(now);

      for (let i = numWeeks - 1; i >= 0; i--) {
        const weekStart = new Date(currentWeekStart);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Filtrar ventas de la semana
        const weekSales = activeSales.filter(s => {
          const rawDate = s.sold_at || s.created_at || s.fecha || s.date;
          if (!rawDate) return false;
          const dObj = new Date(rawDate);
          if (isNaN(dObj.getTime())) return false;
          const sTime = dObj.getTime();
          return sTime >= weekStart.getTime() && sTime <= weekEnd.getTime();
        });

        const totalSell = weekSales.reduce((acc, s) => acc + Number(s.total_sell || s.total || s.monto || 0), 0);
        const totalProfit = weekSales.reduce((acc, s) => {
          const sell = Number(s.total_sell || s.total || s.monto || 0);
          const cost = Number(s.total_cost || s.costo || 0);
          return acc + (sell - cost);
        }, 0);
        const count = weekSales.length;

        const labelStr = `Sem ${weekStart.getDate()}/${weekStart.getMonth() + 1}`;

        result.push({
          key: formatDateKey(weekStart),
          label: labelStr,
          totalSell,
          totalProfit,
          count,
          rawDate: weekStart
        });
      }
      return result;
    }
  }, [sales, viewMode, periodDays]);

  // Usar estrictamente los datos reales sin proyecciones ni simulaciones
  const displayData = chartData;

  // Estadísticas del período
  const periodStats = useMemo(() => {
    const total = displayData.reduce((acc, d) => acc + d.totalSell, 0);
    const count = displayData.reduce((acc, d) => acc + d.count, 0);
    const maxDay = displayData.reduce((max, d) => d.totalSell > max.totalSell ? d : max, displayData[0] || { totalSell: 0 });
    const avg = displayData.length > 0 ? total / displayData.length : 0;

    return { total, count, maxDay, avg };
  }, [displayData]);

  // Dimensiones del SVG
  const svgWidth = 720;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  const maxVal = Math.max(...displayData.map(d => d.totalSell), 100);
  const drawableW = svgWidth - paddingX * 2;
  const drawableH = svgHeight - paddingY * 2;

  // Ancho de barra dinámico
  const barGap = 12;
  const numBars = displayData.length;
  const barWidth = Math.max(12, Math.min(36, (drawableW - (barGap * (numBars - 1))) / numBars));

  return (
    <div className="glass-panel" style={{ padding: '20px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(15,23,42,0.04)', marginBottom: '20px' }}>
      
      {/* Cabecera con Interruptor (Diario vs Semanal) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '6px', borderRadius: '8px', color: '#0284c7', display: 'flex' }}>
              <BarChart2 size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
              Evolución de Ventas & Facturación
            </h3>
          </div>
          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Visualiza el rendimiento comercial por {viewMode === 'daily' ? 'días' : 'semanas'} de operación.
          </p>
        </div>

        {/* Botón de Alternancia Diaria / Semanal */}
        <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setViewMode('daily')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: viewMode === 'daily' ? '#ffffff' : 'transparent',
              color: viewMode === 'daily' ? '#0284c7' : '#64748b',
              boxShadow: viewMode === 'daily' ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Calendar size={14} />
            Evolución Diaria
          </button>

          <button
            type="button"
            onClick={() => setViewMode('weekly')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: viewMode === 'weekly' ? '#ffffff' : 'transparent',
              color: viewMode === 'weekly' ? '#0284c7' : '#64748b',
              boxShadow: viewMode === 'weekly' ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={14} />
            Evolución Semanal
          </button>
        </div>
      </div>

      {/* Métricas rápidas del período */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '12px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>
            TOTAL PERÍODO
          </span>
          <div style={{ marginTop: '2px' }}>
            <DualCurrencyDisplay amount={periodStats.total} fontSize="15px" primaryColor="#0284c7" showSwap={true} />
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '12px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>
            TRANSACCIONES
          </span>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
            {periodStats.count} <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>ventas</span>
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '12px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>
            PROMEDIO {viewMode === 'daily' ? 'DIARIO' : 'SEMANAL'}
          </span>
          <div style={{ marginTop: '2px' }}>
            <DualCurrencyDisplay amount={periodStats.avg} fontSize="14px" primaryColor="#10b981" showSwap={false} />
          </div>
        </div>

        {periodStats.maxDay && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '12px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>
              PICO MÁXIMO ({periodStats.maxDay.label})
            </span>
            <div style={{ marginTop: '2px' }}>
              <DualCurrencyDisplay amount={periodStats.maxDay.totalSell} fontSize="14px" primaryColor="#f59e0b" showSwap={false} />
            </div>
          </div>
        )}
      </div>

      {/* Gráfico SVG de Barras con Hover e Interactividad */}
      <div style={{ position: 'relative', width: '100%', background: '#ffffff', borderRadius: '12px', padding: '10px 0', border: '1px solid #f1f5f9' }}>
        
        {/* Tooltip flotante */}
        {hoveredIndex !== null && displayData[hoveredIndex] && (
          <div style={{
            position: 'absolute',
            left: `${Math.min(Math.max(paddingX + hoveredIndex * ((drawableW) / numBars) - 60, 10), svgWidth - 150)}px`,
            top: '10px',
            background: '#0f172a',
            color: '#ffffff',
            padding: '8px 12px',
            borderRadius: '10px',
            fontSize: '11px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            zIndex: 20,
            pointerEvents: 'none',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontWeight: 800, color: '#38bdf8', marginBottom: '3px' }}>
              {displayData[hoveredIndex].label}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>
              Ventas: {formatCurrency(displayData[hoveredIndex].totalSell)}
            </div>
            <div style={{ fontSize: '10px', color: '#4ade80', marginTop: '2px' }}>
              Ganancia Est.: {formatCurrency(displayData[hoveredIndex].totalProfit)}
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
              {displayData[hoveredIndex].count} transacciones
            </div>
          </div>
        )}

        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          <defs>
            <linearGradient id="barGradientCyan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Guías horizontales */}
          {[0, 0.5, 1].map((ratio, idx) => {
            const y = (svgHeight - paddingY) - ratio * drawableH;
            const val = maxVal * ratio;
            return (
              <g key={idx}>
                <line x1={paddingX} y1={y} x2={svgWidth - paddingX} y2={y} stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
                <text x={paddingX - 8} y={y + 3} fontSize="9" fill="#94a3b8" textAnchor="end" fontWeight="600">
                  {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Barras de la gráfica */}
          {displayData.map((item, idx) => {
            const stepX = drawableW / numBars;
            const x = paddingX + idx * stepX + (stepX - barWidth) / 2;
            const heightRatio = maxVal > 0 ? item.totalSell / maxVal : 0;
            const barH = Math.max(4, heightRatio * drawableH);
            const y = (svgHeight - paddingY) - barH;
            const isHovered = hoveredIndex === idx;

            return (
              <g key={idx} onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)} style={{ cursor: 'pointer' }}>
                {/* Hitbox amplio transparente */}
                <rect x={x - 4} y={svgHeight - paddingY - drawableH} width={barWidth + 8} height={drawableH} fill="transparent" />
                
                {/* Barra principal */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx="6"
                  ry="6"
                  fill={isHovered ? "url(#barGradientHover)" : "url(#barGradientCyan)"}
                  style={{ transition: 'all 0.2s ease', transformOrigin: 'bottom' }}
                />

                {/* Etiqueta X */}
                <text
                  x={x + barWidth / 2}
                  y={svgHeight - 8}
                  fontSize="9"
                  fill={isHovered ? "#0284c7" : "#64748b"}
                  fontWeight={isHovered ? "800" : "600"}
                  textAnchor="middle"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

    </div>
  );
}
