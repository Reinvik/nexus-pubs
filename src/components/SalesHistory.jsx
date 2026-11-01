import React, { useState, useMemo } from 'react';
import { usePuntoNexus } from '../context/PuntoNexusContext';
import DualCurrencyDisplay from './DualCurrencyDisplay';
import AdminPasswordModal from './AdminPasswordModal';
import { Calendar, Search, CreditCard, Receipt, TrendingUp, Info, Trash2, Printer, Download, XCircle, AlertTriangle, Edit, Building2, Check, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { printReceipt, downloadReceiptFile } from '../utils/receiptGenerator';

export default function SalesHistory() {
  const { user, sales, allSales, branches = [], activeBranchId, activeBranch, extractSaleBranchId, formatCurrency, clearSalesHistory, cancelSale, deleteSalePermanently, updateSaleInvoiceDetails, companySettings, countryConfig, companyName } = usePuntoNexus();
  const taxIdShort = countryConfig?.taxIdShortLabel || (companySettings?.country === 'VE' ? 'R.I.F. / C.I.' : 'R.U.T.');
  const [searchTerm, setSearchTerm] = useState('');
  const [branchScope, setBranchScope] = useState('active'); // 'active' | 'all' | branchId
  const [selectedSale, setSelectedSale] = useState(null);
  const [annulLoading, setAnnulLoading] = useState(false);
  const [pendingAnnulSale, setPendingAnnulSale] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pendingDeleteSale, setPendingDeleteSale] = useState(null);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [clearHistoryLoading, setClearHistoryLoading] = useState(false);

  // Estados de edición de Factura / Cliente
  const [editingInvoiceSale, setEditingInvoiceSale] = useState(null);
  const [editDocType, setEditDocType] = useState('Factura');
  const [editRut, setEditRut] = useState('');
  const [editName, setEditName] = useState('');
  const [editGiro, setEditGiro] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Recálculo dinámico de totales financieros para la venta seleccionada
  const selectedSaleTotals = useMemo(() => {
    if (!selectedSale) return { items: [], exemptTotal: 0, taxableBase: 0, taxAmount: 0, totalSell: 0, netTotal: 0 };

    let items = selectedSale.items || [];
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (e) { items = []; }
    }

    const isTaxFreeSale = selectedSale.apply_tax === false ||
      (selectedSale.tax_rate !== undefined && selectedSale.tax_rate !== null ? Number(selectedSale.tax_rate) === 0 : false) ||
      (companySettings?.tax_enabled === false) ||
      (Number(companySettings?.tax_rate) === 0);

    const taxRate = isTaxFreeSale 
      ? 0 
      : ((selectedSale.tax_rate !== undefined && selectedSale.tax_rate !== null) 
        ? Number(selectedSale.tax_rate) 
        : ((companySettings?.tax_rate !== undefined && companySettings?.tax_rate !== null) ? Number(companySettings.tax_rate) : 0.16));

    let exemptTotal = 0;
    let taxableTotalWithTax = 0;

    items.forEach(it => {
      const sub = Number(it.subtotal || ((it.cantidad || 1) * (it.precio_unitario || it.sell_price || 0))) || 0;
      if (isTaxFreeSale || it.is_exempt || it.is_tax_exempt) {
        exemptTotal += sub;
      } else {
        taxableTotalWithTax += sub;
      }
    });

    const hasExemptItems = items.some(it => it.is_exempt || it.is_tax_exempt);
    if (!hasExemptItems && Number(selectedSale.tax_amount) === 0 && items.length > 0 && !isTaxFreeSale) {
      exemptTotal = items.reduce((sum, it) => sum + Number(it.subtotal || ((it.cantidad || 1) * (it.precio_unitario || 0))), 0);
      taxableTotalWithTax = 0;
    }

    const discount = Number(selectedSale.discount) || 0;
    const itemsTotalSum = exemptTotal + taxableTotalWithTax;

    const taxableBase = (taxRate > 0 && taxableTotalWithTax > 0) ? (taxableTotalWithTax / (1 + taxRate)) : taxableTotalWithTax;
    const calcTaxAmount = (!isTaxFreeSale && selectedSale.apply_tax !== false && taxableTotalWithTax > 0) ? (taxableTotalWithTax - taxableBase) : 0;

    const totalSell = itemsTotalSum > 0 ? Math.max(0, itemsTotalSum - discount) : (Number(selectedSale.total_sell) || 0);
    const netTotal = isTaxFreeSale ? totalSell : (itemsTotalSum > 0 ? Math.max(0, (exemptTotal + taxableBase) - discount) : (Number(selectedSale.net_total) || totalSell));

    return {
      items,
      totalSell,
      netTotal,
      taxAmount: calcTaxAmount,
      taxRate,
      isTaxFreeSale
    };
  }, [selectedSale, companySettings]);

  const displaySaleId = selectedSale?.id && String(selectedSale.id) !== 'null' && String(selectedSale.id) !== 'undefined'
    ? String(selectedSale.id).slice(-8).toUpperCase()
    : 'NEXUS';

  // Obtener nombre de sucursal por ID
  const getBranchName = (bId) => {
    if (!bId || bId === 'branch-matriz') return 'Matriz Principal';
    const found = branches.find(b => b.id === bId);
    return found ? found.name : 'Sucursal';
  };

  // Determinar conjunto de ventas base según el filtro seleccionado
  const baseSales = useMemo(() => {
    const sourcePool = (allSales && allSales.length > 0) ? allSales : sales;
    
    if (branchScope === 'all') {
      return sourcePool;
    }
    if (branchScope === 'active') {
      return sales;
    }
    
    return sourcePool.filter(s => {
      const bId = extractSaleBranchId ? extractSaleBranchId(s, 'branch-matriz') : (s.branch_id || 'branch-matriz');
      return bId === branchScope;
    });
  }, [branchScope, sales, allSales, extractSaleBranchId]);

  const handleClearHistory = () => {
    setShowClearHistoryModal(true);
  };

  const confirmClearSalesHistory = async () => {
    setShowClearHistoryModal(false);
    setClearHistoryLoading(true);
    try {
      await clearSalesHistory();
      alert("✅ Historial de ventas eliminado correctamente. El sistema ha comenzado desde cero.");
    } catch (e) {
      alert("❌ Error al vaciar el historial de ventas: " + (e?.message || e));
    } finally {
      setClearHistoryLoading(false);
    }
  };

  const requestCancelSale = (sale) => {
    if (sale.status === 'Anulada' || sale.cancelled) {
      alert("⚠️ Esta venta ya fue anulada previamente.");
      return;
    }
    setPendingAnnulSale(sale);
  };

  const confirmCancelSale = async (reason) => {
    if (!pendingAnnulSale) return;
    const sale = pendingAnnulSale;
    const docType = sale.document_type || 'Venta';
    const cancelledBy = user?.full_name || user?.name || user?.email || 'Administrador';

    setAnnulLoading(true);
    const res = await cancelSale(sale, reason, cancelledBy);
    setAnnulLoading(false);
    setPendingAnnulSale(null);

    if (res && res.error) {
      alert(`❌ Error al anular la venta: ${res.error}`);
    } else {
      const displayId = sale.id ? String(sale.id).slice(-8).toUpperCase() : 'DOCUMENTO';
      alert(`✅ ${docType} N° ${displayId} anulada con éxito por ${cancelledBy}.\nMotivo registrado: "${reason || 'Sin motivo'}"`);
      if (selectedSale) {
        setSelectedSale(res.sale || { ...sale, status: 'Anulada', cancelled: true, cancelled_by: cancelledBy, cancellation_reason: reason });
      }
    }
  };

  const requestDeleteSale = (sale) => {
    setPendingDeleteSale(sale);
  };

  const confirmDeleteSale = async () => {
    if (!pendingDeleteSale) return;
    const saleToDelete = pendingDeleteSale;
    setDeleteLoading(true);
    const res = await deleteSalePermanently(saleToDelete);
    setDeleteLoading(false);
    setPendingDeleteSale(null);

    if (res && res.error) {
      alert(`❌ Error al eliminar la venta: ${res.error}`);
    } else {
      const displayId = saleToDelete.id ? String(saleToDelete.id).slice(-8).toUpperCase() : 'DOCUMENTO';
      alert(`✅ Venta N° ${displayId} eliminada permanentemente del sistema e inventario devuelto.`);
      if (selectedSale && (selectedSale.id === saleToDelete.id || selectedSale.sold_at === saleToDelete.sold_at)) {
        setSelectedSale(null);
      }
    }
  };

  // Abrir Modal de Edición de Datos de Facturación
  const openEditInvoiceModal = (sale) => {
    setEditingInvoiceSale(sale);
    setEditDocType(sale.document_type || 'Factura');
    setEditRut(sale.customer_rut || '');
    setEditName(sale.customer_name || '');
    setEditGiro(sale.customer_giro || '');
    setEditAddress(sale.customer_address || '');
  };

  // Guardar Cambios de Facturación
  const handleSaveInvoiceEdits = async (e) => {
    e.preventDefault();
    if (!editingInvoiceSale) return;

    if (editDocType === 'Factura' && (!editRut.trim() || !editName.trim())) {
      alert("⚠️ Para emision de Facturas es obligatorio indicar el R.U.T. y la Razón Social / Nombre Empresa.");
      return;
    }

    const res = await updateSaleInvoiceDetails(editingInvoiceSale.id, {
      document_type: editDocType,
      customer_rut: editRut,
      customer_name: editName,
      customer_giro: editGiro,
      customer_address: editAddress
    });

    if (res && res.error) {
      alert(`❌ Error al actualizar datos de facturación: ${res.error}`);
    } else {
      alert("✅ Datos de facturación actualizados correctamente.");
      setEditingInvoiceSale(null);
      if (selectedSale && selectedSale.id === editingInvoiceSale.id) {
        setSelectedSale(res.sale);
      }
    }
  };

  // Filtrar ventas por término de búsqueda
  const filteredSales = useMemo(() => {
    return baseSales.filter(sale => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      
      const bName = getBranchName(extractSaleBranchId ? extractSaleBranchId(sale, 'branch-matriz') : sale.branch_id);
      
      return (
        String(sale.id).toLowerCase().includes(q) ||
        bName.toLowerCase().includes(q) ||
        (sale.reference_number && sale.reference_number.toLowerCase().includes(q)) ||
        (sale.cash_details?.reference_number && String(sale.cash_details.reference_number).toLowerCase().includes(q)) ||
        (sale.customer_rut && sale.customer_rut.toLowerCase().includes(q)) ||
        (sale.customer_name && sale.customer_name.toLowerCase().includes(q)) ||
        (sale.payment_method && sale.payment_method.toLowerCase().includes(q)) ||
        (sale.document_type && sale.document_type.toLowerCase().includes(q)) ||
        (sale.status && sale.status.toLowerCase().includes(q)) ||
        (sale.items && sale.items.some(item => (item.nombre && item.nombre.toLowerCase().includes(q)) || (item.sku && item.sku.toLowerCase().includes(q))))
      );
    });
  }, [baseSales, searchTerm, extractSaleBranchId, branches]);

  const formatDate = (isoString) => {
    try {
      const date = parseISO(isoString);
      return format(date, "dd MMM yyyy, HH:mm 'hrs'", { locale: es });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      
      {/* Controles de Cabecera */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px', maxWidth: '380px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '48px', width: '100%' }}
            placeholder="Buscar por boleta, sucursal, RUT, cliente o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Selector de Alcance de Sucursales (Filtro Matriz vs Sucursal Activa) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.04)', padding: '6px 14px', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
          <Building2 size={16} style={{ color: 'var(--color-cyan)' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Filtro Sucursal:</span>
          <select
            value={branchScope}
            onChange={(e) => setBranchScope(e.target.value)}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="active">🏢 Esta Sucursal ({activeBranch.name})</option>
            <option value="all">🌐 Todas las Sucursales (Consolidado Matriz)</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {b.is_main ? '🏛️' : '🏬'} {b.name} {b.id === activeBranchId ? '(Activa)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Ventas registradas: <strong>{filteredSales.length}</strong>
          </div>

          <button
            type="button"
            onClick={handleClearHistory}
            disabled={clearHistoryLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#ef4444',
              fontSize: '12px',
              fontWeight: 700,
              cursor: clearHistoryLoading ? 'not-allowed' : 'pointer',
              opacity: clearHistoryLoading ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
            title="Borrar todo el historial de ventas para empezar desde 0"
          >
            <Trash2 size={15} />
            <span>{clearHistoryLoading ? 'Borrando...' : 'Borrar Historial de Ventas'}</span>
          </button>
        </div>
      </div>

      {/* Historial en Tabla */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Sucursal / Sede</th>
                <th>N° Documento / Folio</th>
                <th>Receptor / Cliente</th>
                <th>Medio de Pago</th>
                <th style={{ textAlign: 'right' }}>Total Venta</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No se registran ventas históricas que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale, index) => {
                  const isAnulada = sale.status === 'Anulada' || sale.cancelled;
                  const isFactura = sale.document_type === 'Factura';
                  const totalQty = (sale.items || []).reduce((sum, i) => sum + Number(i.cantidad || i.quantity || 1), 0);
                  const saleBranchId = extractSaleBranchId ? extractSaleBranchId(sale, 'branch-matriz') : (sale.branch_id || 'branch-matriz');
                  const saleBranchName = getBranchName(saleBranchId);
                  const isMainBranch = saleBranchId === 'branch-matriz';

                  return (
                    <tr key={sale.id || `sale-${sale.sold_at || index}`} style={{ opacity: isAnulada ? 0.65 : 1 }}>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                          {formatDate(sale.sold_at)}
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          background: isMainBranch ? 'rgba(6, 182, 212, 0.12)' : 'rgba(168, 85, 247, 0.12)', 
                          color: isMainBranch ? 'var(--color-cyan)' : '#c084fc', 
                          border: isMainBranch ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(168, 85, 247, 0.3)',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <Building2 size={12} />
                          {saleBranchName}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className={`badge ${isFactura ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px', padding: '2px 7px' }}>
                              {sale.document_type || 'Boleta'}
                            </span>
                            {isAnulada && (
                              <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                                ANULADA
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 900, fontFamily: 'monospace', color: isAnulada ? '#ef4444' : 'var(--color-cyan)' }}>
                            {sale.id && String(sale.id).toLowerCase() !== 'null'
                              ? `N° PN-${String(sale.id).slice(-8).toUpperCase()}`
                              : (sale.sold_at ? `N° PN-${new Date(sale.sold_at).getTime().toString().slice(-8)}` : 'N° PN-PROV')}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            📦 {totalQty} {totalQty === 1 ? 'producto' : 'productos'}
                          </div>
                        </div>
                      </td>
                      <td>
                        {sale.customer_rut || sale.customer_name ? (
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                              {sale.customer_name || 'Empresa'}
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--color-cyan)', fontFamily: 'monospace' }}>
                              {taxIdShort}: {sale.customer_rut || `Sin ${taxIdShort}`}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Venta Mostrador</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{sale.payment_method}</span>
                        {(sale.reference_number || sale.cash_details?.reference_number) && (
                          <div style={{ marginTop: '2px' }}>
                            <span style={{ fontSize: '9.5px', fontWeight: 800, background: 'rgba(6, 182, 212, 0.12)', color: 'var(--color-cyan)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                              Ref: #{sale.reference_number || sale.cash_details?.reference_number}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: isAnulada ? '#ef4444' : 'var(--color-cyan)', textDecoration: isAnulada ? 'line-through' : 'none' }}>
                        <DualCurrencyDisplay amount={sale.total_sell} fontSize="13px" primaryColor={isAnulada ? '#ef4444' : 'var(--color-cyan)'} align="right" showSwap={false} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center', flexWrap: 'nowrap' }}>
                          {/* Botón Ver Detalle */}
                          <button
                            className="btn-secondary"
                            style={{ padding: '5px 8px', borderRadius: '8px', fontSize: '11px', gap: '4px' }}
                            onClick={() => setSelectedSale(sale)}
                            title="Ver Detalle de Venta"
                          >
                            <Info size={13} />
                            Ver
                          </button>

                          {/* Botón Descargar / Imprimir Factura o Boleta */}
                          <button
                            className="btn-secondary"
                            style={{ padding: '5px 8px', borderRadius: '8px', fontSize: '11px', gap: '4px', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)' }}
                            onClick={() => downloadReceiptFile(sale, companySettings, companyName, activeBranch?.name)}
                            title={isFactura ? "Descargar Factura Electrónica" : "Descargar Boleta Electrónica"}
                          >
                            <Download size={13} />
                            <span>{isFactura ? 'Factura' : 'Boleta'}</span>
                          </button>

                          <button
                            className="btn-secondary"
                            style={{ padding: '5px 6px', borderRadius: '8px', fontSize: '11px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                            onClick={() => printReceipt(sale, companySettings, companyName, activeBranch?.name)}
                            title="Imprimir Comprobante"
                          >
                            <Printer size={13} />
                          </button>

                          {/* Botón Editar Factura / Cliente */}
                          {!isAnulada && (
                            <button
                              className="btn-secondary"
                              style={{ padding: '5px 6px', borderRadius: '8px', fontSize: '11px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                              onClick={() => openEditInvoiceModal(sale)}
                              title="Editar RUT / Datos de Facturación"
                            >
                              <Edit size={13} />
                            </button>
                          )}

                          {/* Botón Anular Venta */}
                          {!isAnulada && (
                            <button
                              className="btn-secondary"
                              style={{ padding: '5px 6px', borderRadius: '8px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                              onClick={() => requestCancelSale(sale)}
                              title="Anular Venta con clave Admin"
                            >
                              <XCircle size={13} />
                            </button>
                          )}

                          {/* Botón Eliminar Venta Definitivamente */}
                          <button
                            className="btn-secondary"
                            style={{ padding: '5px 6px', borderRadius: '8px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)' }}
                            onClick={() => requestDeleteSale(sale)}
                            title="Eliminar permanentemente del sistema"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALLE COMPLETO DE VENTA */}
      {selectedSale && (
        <div className="modal-overlay">
            <div className="modal-content glass-panel cyan-glow" style={{ maxWidth: '600px', width: '95%', padding: '24px' }}>
              
              <div className="modal-header" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Receipt size={22} style={{ color: 'var(--color-cyan)' }} />
                  <h3 className="modal-title">
                    {selectedSale.document_type || 'Comprobante'} (N° {displaySaleId})
                  </h3>
                </div>
                <button className="modal-close" onClick={() => setSelectedSale(null)}>
                  ×
                </button>
              </div>

              {/* BANNER DE ANULADO SI APLICA */}
              {(selectedSale.status === 'Anulada' || selectedSale.cancelled) && (
                <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', color: '#f87171' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 900, color: '#ef4444' }}>
                    <AlertTriangle size={18} />
                    <span>DOCUMENTO ANULADO (STOCK RESTITUÍDO AL INVENTARIO)</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: '#090f1e', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '12px' }}>
                    <div>📝 <strong style={{ color: '#fff' }}>Motivo de Anulación:</strong> <span style={{ color: 'var(--color-cyan)', fontWeight: 700 }}>"{selectedSale.cancellation_reason || 'Sin motivo especificado'}"</span></div>
                    <div>👤 <strong style={{ color: '#fff' }}>Autorizado / Anulado por:</strong> <span style={{ color: '#fff', fontWeight: 700 }}>{selectedSale.cancelled_by || 'Administrador'}</span></div>
                    {selectedSale.cancelled_at && <div>📅 <strong style={{ color: '#fff' }}>Fecha y Hora:</strong> {formatDate(selectedSale.cancelled_at)}</div>}
                  </div>
                </div>
              )}

              {/* SECCIÓN DE DATOS DE FACTURACIÓN SI EXISTEN */}
              {(selectedSale.customer_rut || selectedSale.customer_name || selectedSale.document_type === 'Factura') && (
                <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-cyan)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={15} />
                    <span>Datos de Receptor / Facturación</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>R.U.T.: <strong>{selectedSale.customer_rut || 'Sin especificar'}</strong></div>
                    <div>Razón Social: <strong>{selectedSale.customer_name || 'Sin especificar'}</strong></div>
                    {selectedSale.customer_giro && <div>Giro: <strong>{selectedSale.customer_giro}</strong></div>}
                    {selectedSale.customer_address && <div>Dirección: <strong>{selectedSale.customer_address}</strong></div>}
                  </div>
                </div>
              )}

              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>ID Venta:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{selectedSale.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Fecha Venta:</span>
                  <strong>{formatDate(selectedSale.sold_at)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Tipo Documento:</span>
                  <strong>{selectedSale.document_type}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Medio de Pago:</span>
                  <strong>{selectedSale.payment_method}</strong>
                </div>
                {(selectedSale.reference_number || selectedSale.cash_details?.reference_number) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-cyan)', fontWeight: 800 }}>
                    <span>N° Ref / Transacción:</span>
                    <span style={{ fontFamily: 'monospace' }}>#{selectedSale.reference_number || selectedSale.cash_details?.reference_number}</span>
                  </div>
                )}
              </div>

              <h4 style={{ fontSize: '13px', fontWeight: 800, marginBottom: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>Detalle de Productos</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', maxHeight: '180px', overflowY: 'auto' }}>
                {selectedSaleTotals.items.map((item, idx) => {
                  const isExempt = selectedSaleTotals.isTaxFreeSale || !!(item.is_exempt || item.is_tax_exempt || selectedSaleTotals.taxAmount === 0);
                  const rawUnit = Number(item.precio_unitario || item.sell_price || 0);
                  const rawSub = Number(item.subtotal || ((item.cantidad || 1) * rawUnit)) || 0;
                  const taxRate = selectedSaleTotals.taxRate;

                  const netUnit = (!isExempt && selectedSale?.apply_tax !== false && taxRate > 0) ? (rawUnit / (1 + taxRate)) : rawUnit;
                  const netSub = (!isExempt && selectedSale?.apply_tax !== false && taxRate > 0) ? (rawSub / (1 + taxRate)) : rawSub;

                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <div style={{ maxWidth: '65%' }}>
                        <div style={{ fontWeight: 650, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>{item.nombre || item.name}</span>
                          {(item.selectedVariant?.color || item.color) && (
                            <span style={{ fontSize: '9.5px', fontWeight: 800, background: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                              🎨 {item.selectedVariant?.color || item.color}
                            </span>
                          )}
                          {!selectedSaleTotals.isTaxFreeSale && isExempt && (
                            <span style={{ fontSize: '9.5px', fontWeight: 900, background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                              (E) Exento
                            </span>
                          )}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{item.cantidad} x</span>
                          <DualCurrencyDisplay amount={netUnit} fontSize="10px" primaryColor="var(--text-muted)" showSwap={false} />
                        </div>
                      </div>
                      <DualCurrencyDisplay amount={netSub} fontSize="12px" primaryColor="var(--text-primary)" align="right" showSwap={false} />
                    </div>
                  );
                })}
              </div>

              <h4 style={{ fontSize: '13px', fontWeight: 800, marginBottom: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Cómputo Financiero</span>
                <span style={{ fontSize: '11px', color: 'var(--color-cyan)', fontWeight: 700 }}>
                  {selectedSaleTotals.isTaxFreeSale ? 'Régimen Sin IVA (0%)' : `IVA (${(selectedSaleTotals.taxRate * 100).toFixed(0)}%) Reflejado`}
                </span>
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginBottom: '24px' }}>
                {/* Subtotal Neto / Exento */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {selectedSaleTotals.isTaxFreeSale ? 'Subtotal Venta:' : 'Subtotal Neto / Exento:'}
                  </span>
                  <DualCurrencyDisplay 
                    amount={selectedSaleTotals.netTotal} 
                    fontSize="13px" 
                    primaryColor="var(--text-secondary)" 
                    align="right" 
                    showSwap={false} 
                  />
                </div>

                {/* Descuento si aplica */}
                {(selectedSale.discount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Descuento Aplicado:</span>
                    <DualCurrencyDisplay amount={selectedSale.discount} fontSize="13px" primaryColor="var(--color-rose)" align="right" showSwap={false} />
                  </div>
                )}

                {/* Monto del IVA */}
                {!selectedSaleTotals.isTaxFreeSale && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Monto IVA ({(selectedSaleTotals.taxRate * 100).toFixed(0)}%):
                    </span>
                    <DualCurrencyDisplay 
                      amount={selectedSaleTotals.taxAmount} 
                      fontSize="13px" 
                      primaryColor={selectedSaleTotals.taxAmount > 0 ? '#0284c7' : '#10b981'} 
                      align="right" 
                      showSwap={false} 
                    />
                  </div>
                )}

                {/* Total Final Recibido */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-glass)', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Ingreso Total Recibido:</span>
                  <DualCurrencyDisplay amount={selectedSaleTotals.totalSell} fontSize="15px" primaryColor="var(--color-cyan)" align="right" showSwap={false} />
                </div>
              </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Imprimir / PDF */}
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => printReceipt(selectedSale, companySettings, companyName, activeBranch?.name)}
                >
                  <Printer size={15} />
                  <span>Imprimir / PDF</span>
                </button>

                {/* Descargar Archivo HTML */}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => downloadReceiptFile(selectedSale, companySettings, companyName, activeBranch?.name)}
                >
                  <Download size={15} />
                  <span>Descargar Factura/Boleta</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Editar Datos de Factura */}
                {selectedSale.status !== 'Anulada' && !selectedSale.cancelled && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.1)' }}
                    onClick={() => openEditInvoiceModal(selectedSale)}
                  >
                    <Edit size={14} />
                    <span>Editar Factura</span>
                  </button>
                )}

                {/* Anular Venta desde Modal */}
                {selectedSale.status !== 'Anulada' && !selectedSale.cancelled && (
                  <button
                    type="button"
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#ef4444',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    disabled={annulLoading}
                    onClick={() => requestCancelSale(selectedSale)}
                  >
                    <XCircle size={15} />
                    <span>Anular Venta</span>
                  </button>
                )}

                {/* Eliminar Venta Definitivamente desde Modal */}
                <button
                  type="button"
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#ef4444',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  disabled={deleteLoading}
                  onClick={() => requestDeleteSale(selectedSale)}
                >
                  <Trash2 size={15} />
                  <span>Eliminar Venta</span>
                </button>

                <button className="btn-secondary" onClick={() => setSelectedSale(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR DATOS DE FACTURACIÓN */}
      {editingInvoiceSale && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content glass-panel cyan-glow" style={{ maxWidth: '480px', padding: '24px', background: '#090f1e', color: '#fff', borderRadius: '20px' }}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} style={{ color: 'var(--color-cyan)' }} />
                <h3 className="modal-title" style={{ margin: 0, fontSize: '17px', color: '#fff' }}>
                  Editar Datos de Facturación (N° {String(editingInvoiceSale.id).slice(-8).toUpperCase()})
                </h3>
              </div>
              <button className="modal-close" onClick={() => setEditingInvoiceSale(null)}>×</button>
            </div>

            <form onSubmit={handleSaveInvoiceEdits}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-cyan)', display: 'block', marginBottom: '6px' }}>
                  Tipo de Documento
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn-secondary ${editDocType === 'Boleta' ? 'active' : ''}`}
                    onClick={() => setEditDocType('Boleta')}
                    style={{ padding: '8px', fontSize: '12px', justifyContent: 'center' }}
                  >
                    Boleta
                  </button>
                  <button
                    type="button"
                    className={`btn-secondary ${editDocType === 'Factura' ? 'active' : ''}`}
                    onClick={() => setEditDocType('Factura')}
                    style={{ padding: '8px', fontSize: '12px', justifyContent: 'center' }}
                  >
                    Factura
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  R.U.T. Empresa / Cliente *
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '13px' }}
                  placeholder="Ej: 76.543.210-K"
                  value={editRut}
                  onChange={(e) => setEditRut(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Razón Social / Nombre Empresa *
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '13px' }}
                  placeholder="Ej: Inversiones y Servicios SpA"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Giro Comercial (Opcional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '13px' }}
                  placeholder="Ej: Servicios / Comercio"
                  value={editGiro}
                  onChange={(e) => setEditGiro(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Dirección / Comuna (Opcional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '13px' }}
                  placeholder="Ej: Av. Providencia 1234, Santiago"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setEditingInvoiceSale(null)}>
                  Cancelar
                </button>

                <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={16} />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SOLICITUD CLAVE ADMIN PARA ANULAR VENTA / FACTURA */}
      <AdminPasswordModal
        isOpen={!!pendingAnnulSale}
        onClose={() => setPendingAnnulSale(null)}
        onConfirm={confirmCancelSale}
        requireReason={true}
        user={user}
        title="Autorización & Motivo de Anulación"
        actionName={pendingAnnulSale ? `anular la ${pendingAnnulSale.document_type || 'Venta'} N° ${String(pendingAnnulSale.id).slice(-8).toUpperCase()}` : "anular esta venta"}
      />

      {/* MODAL SOLICITUD CLAVE ADMIN PARA ELIMINAR VENTA PERMANENTEMENTE */}
      <AdminPasswordModal
        isOpen={!!pendingDeleteSale}
        onClose={() => setPendingDeleteSale(null)}
        onConfirm={confirmDeleteSale}
        requireReason={false}
        user={user}
        title="Autorización para Eliminar Venta"
        actionName={pendingDeleteSale ? `eliminar definitivamente la ${pendingDeleteSale.document_type || 'Venta'} N° ${String(pendingDeleteSale.id).slice(-8).toUpperCase()} del sistema y devolver su stock` : "eliminar definitivamente esta venta"}
      />

      {/* MODAL SOLICITUD CLAVE ADMIN Y ESCRIBIR "Eliminar" PARA BORRAR HISTORIAL COMPLETO */}
      <AdminPasswordModal
        isOpen={showClearHistoryModal}
        onClose={() => setShowClearHistoryModal(false)}
        onConfirm={confirmClearSalesHistory}
        requireReason={false}
        requireConfirmationWord="Eliminar"
        user={user}
        title="⚠️ Borrar Historial de Ventas"
        actionName="eliminar TODO el historial de ventas de la empresa"
        description="Esta acción es irreversible y eliminará definitivamente todas las ventas e ingresos registrados para empezar desde cero. Para proceder, ingresa la clave de administrador y escribe la palabra de confirmación."
        confirmButtonText="Eliminar Todo el Historial"
        isDanger={true}
      />

    </div>
  );
}
