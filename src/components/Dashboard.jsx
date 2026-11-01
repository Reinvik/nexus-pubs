import React, { useState } from 'react';
import { usePuntoNexus } from '../context/PuntoNexusContext';
import DualCurrencyDisplay from './DualCurrencyDisplay';
import SalesEvolutionChart from './SalesEvolutionChart';
import SalesHistory from './SalesHistory';
import { DollarSign, AlertTriangle, TrendingUp, ShoppingBag, ArrowRight, Receipt, CreditCard, PieChart, LayoutDashboard, History } from 'lucide-react';

export default function Dashboard({ setActiveTab, initialSubTab = 'overview' }) {
  const { sales, inventory, lowStockItems, lowStockCount, formatCurrency, companySettings } = usePuntoNexus();
  const [subTab, setSubTab] = useState(initialSubTab);

  // Filtrar solo ventas válidas (excluir anuladas)
  const validSales = sales.filter(sale => sale.status !== 'Anulada' && !sale.cancelled);

  // Cálculos de KPIs
  const totalSales = validSales.reduce((acc, sale) => acc + Number(sale.total_sell || sale.total || sale.monto || 0), 0);
  const totalCost = validSales.reduce((acc, sale) => acc + Number(sale.total_cost || sale.costo || 0), 0);
  const totalProfit = totalSales - totalCost;
  const averageMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
  const salesCount = validSales.length;
  const averageTicket = salesCount > 0 ? totalSales / salesCount : 0;

  // Productos más rentables
  const productProfitability = {};
  validSales.forEach(sale => {
    sale.items.forEach(item => {
      const pid = item.part_id || item.id || item.nombre;
      if (!productProfitability[pid]) {
        productProfitability[pid] = {
          name: item.nombre || item.name,
          sku: item.sku,
          quantity: 0,
          totalRevenue: 0,
          totalCost: 0
        };
      }
      productProfitability[pid].quantity += (item.cantidad || item.quantity || 1);
      productProfitability[pid].totalRevenue += (item.subtotal || (item.precio_unitario * (item.cantidad || 1)));
      productProfitability[pid].totalCost += ((item.cantidad || 1) * (item.cost_price || 0));
    });
  });

  const sortedProfitability = Object.values(productProfitability)
    .map(p => ({
      ...p,
      profit: p.totalRevenue - p.totalCost
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      
      {/* Sub-Navegación de Pestañas en Dashboard */}
      <div className="glass-panel" style={{
        padding: '6px 8px',
        display: 'inline-flex',
        gap: '6px',
        marginBottom: '20px',
        borderRadius: '14px'
      }}>
        <button
          type="button"
          onClick={() => setSubTab('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: subTab === 'overview' ? 'var(--color-cyan)' : 'transparent',
            color: subTab === 'overview' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: subTab === 'overview' ? '0 4px 12px rgba(6, 182, 212, 0.25)' : 'none'
          }}
        >
          <LayoutDashboard size={16} />
          <span>Resumen & Gráficos</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('history')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: subTab === 'history' ? 'var(--color-cyan)' : 'transparent',
            color: subTab === 'history' ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: subTab === 'history' ? '0 4px 12px rgba(6, 182, 212, 0.25)' : 'none'
          }}
        >
          <History size={16} />
          <span>Historial de Ventas</span>
          {sales.length > 0 && (
            <span style={{
              fontSize: '10.5px',
              padding: '2px 7px',
              borderRadius: '20px',
              background: subTab === 'history' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(148, 163, 184, 0.15)',
              color: subTab === 'history' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 800
            }}>
              {sales.length}
            </span>
          )}
        </button>
      </div>

      {subTab === 'history' ? (
        <SalesHistory />
      ) : (
        <>
      {/* Grid de KPIs Expandido */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '20px' }}>
        
        {/* KPI 1: Ventas Totales */}
        <div className="kpi-card glass-panel cyan-glow">
          <div className="kpi-card-header">
            <span>Ventas Totales</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-cyan)' }}>
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ marginTop: '4px' }}>
            <DualCurrencyDisplay amount={totalSales} fontSize="24px" primaryColor="var(--color-cyan)" showSwap={true} />
          </div>
          <div className="kpi-card-footer" style={{ marginTop: '8px' }}>
            Ingreso bruto acumulado ({salesCount} transacciones).
          </div>
        </div>

        {/* KPI 2: Ticket Promedio */}
        <div className="kpi-card glass-panel">
          <div className="kpi-card-header">
            <span>Ticket Promedio</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
              <Receipt size={18} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ marginTop: '4px' }}>
            <DualCurrencyDisplay amount={averageTicket} fontSize="22px" primaryColor="#6366f1" showSwap={false} />
          </div>
          <div className="kpi-card-footer" style={{ marginTop: '8px' }}>
            Promedio de consumo por orden cobrada.
          </div>
        </div>

        {/* KPI 3: Costo de Inventario */}
        <div className="kpi-card glass-panel amber-glow">
          <div className="kpi-card-header">
            <span>Costo Inventario Vendido</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-amber)' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ marginTop: '4px' }}>
            <DualCurrencyDisplay amount={totalCost} fontSize="22px" primaryColor="var(--color-amber)" showSwap={false} />
          </div>
          <div className="kpi-card-footer" style={{ marginTop: '8px' }}>
            Costo de adquisición del stock despachado.
          </div>
        </div>

        {/* KPI 4: Ganancia Neta */}
        <div className="kpi-card glass-panel emerald-glow">
          <div className="kpi-card-header">
            <span>Ganancia Neta</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-emerald)' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ marginTop: '4px' }}>
            <DualCurrencyDisplay amount={totalProfit} fontSize="22px" primaryColor="var(--color-emerald)" showSwap={true} />
          </div>
          <div className="kpi-card-footer" style={{ marginTop: '8px' }}>
            Margen comercial promedio: <strong>{averageMargin.toFixed(1)}%</strong>
          </div>
        </div>

      </div>

      {/* Gráfico de Evolución Diaria o Semanal */}
      <SalesEvolutionChart sales={sales} formatCurrency={formatCurrency} />

      <div className="dashboard-rentable-alerts-grid" style={{ marginBottom: '20px' }}>
        {/* Productos más vendidos y rentables */}
        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} style={{ color: 'var(--color-cyan)' }} />
            Productos Más Rentables
          </h3>
          {sortedProfitability.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '14px' }}>
              Aún no hay ventas registradas para este periodo.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedProfitability.map((p, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <div style={{ overflow: 'hidden', paddingRight: '12px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 650, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{p.name}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>SKU: {p.sku || 'S/N'} • {p.quantity} unidades vendidas</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, color: 'var(--color-emerald)' }}>
                      <DualCurrencyDisplay amount={p.profit} fontSize="13px" primaryColor="var(--color-emerald)" align="right" showSwap={false} />
                    </div>
                    <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>Ganancia</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas de inventario bajo ("Punto Nexus") */}
        <div className="glass-panel" style={{ padding: '16px 20px', borderColor: lowStockCount > 0 ? 'rgba(217, 119, 6, 0.2)' : 'var(--border-glass)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: lowStockCount > 0 ? 'var(--color-amber)' : 'var(--text-primary)' }}>
            <AlertTriangle size={16} />
            Alertas Punto Nexus ({lowStockCount})
          </h3>

          {lowStockCount === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', color: 'var(--color-emerald)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>✓</div>
              <p style={{ fontSize: '12.5px', fontWeight: 700 }}>¡Inventario Excelente!</p>
              <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Ningún producto está por debajo del stock mínimo.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '160px', overflowY: 'auto', paddingRight: '4px' }}>
              {lowStockItems.map((item, idx) => (
                <div key={item.id || item.sku || `dash-low-${idx}`} style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '11.5px', fontWeight: 700 }}>{item.name}</span>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '2px', fontSize: '10.5px' }}>
                      <span style={{ color: 'var(--color-rose)', fontWeight: 650 }}>Stock actual: {item.stock}</span>
                      <span style={{ color: 'var(--text-muted)' }}>Mínimo: {item.min_stock ?? (companySettings?.default_min_stock || 5)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('inventory')}
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '10.5px', gap: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                  >
                    Reponer
                    <ArrowRight size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
