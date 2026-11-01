import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePuntoNexus } from '../context/PuntoNexusContext';
import DualCurrencyDisplay from './DualCurrencyDisplay';
import KitchenView from './KitchenView';
import TableQRModal from './TableQRModal';
import QRPrintStudio from './QRPrintStudio';
import { 
  Utensils, 
  Plus, 
  Users, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  Search, 
  ShoppingCart, 
  FileText, 
  Receipt, 
  X, 
  PlusCircle, 
  MinusCircle, 
  AlertCircle,
  Sparkles,
  ChefHat,
  BellRing,
  ArrowLeft,
  ShoppingBag,
  Filter,
  Wine,
  Coffee,
  QrCode,
  ShieldCheck,
  Smartphone,
  RotateCcw,
  ExternalLink,
  Printer
} from 'lucide-react';

const getProductImage = (prod) => {
  if (prod?.image_url) return prod.image_url;
  const name = (prod?.name || '').toLowerCase();
  const cat = (prod?.category || '').toLowerCase();
  if (name.includes('combo')) return '/images/combo_nexus.jpg';
  if (name.includes('hamburg') || name.includes('burger') || cat.includes('hamburg')) return '/images/burger_nexus.jpg';
  if (name.includes('pepito') || cat.includes('pepito')) return '/images/pepito_mixto.jpg';
  if (name.includes('tequeño') || name.includes('tequeno')) return '/images/tequenos_gourmet.jpg';
  if (name.includes('arepa') || cat.includes('arepa')) return '/images/arepa_reina.jpg';
  if (name.includes('pizza') || cat.includes('pizza')) return '/images/pizza_pepperoni.jpg';
  if (name.includes('malteada') || name.includes('batido') || name.includes('oreo')) return '/images/malteada_oreo.jpg';
  if (name.includes('papas') || name.includes('fries') || cat.includes('papas')) return 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80';
  if (name.includes('perro') || name.includes('hot dog')) return 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=600&q=80';
  if (name.includes('bebida') || name.includes('soda') || name.includes('jugo') || name.includes('coca') || cat.includes('bebida')) return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80';
  if (name.includes('café') || name.includes('coffee') || cat.includes('café')) return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80';
  if (name.includes('torta') || name.includes('postre') || cat.includes('postre')) return '/images/malteada_oreo.jpg';
  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80';
};

export default function TablesModule({ setActiveTab, setPosCart, onOpenGuestSimulator = null }) {
  const { 
    tables, 
    addTable, 
    toggleTablePaidStatus,
    deleteTable, 
    openTable, 
    addItemToTable, 
    updateTableItemQuantity, 
    updateTableItemStatus, 
    updateTableItemParticipant, 
    removeTableItem, 
    clearTable,
    inventory,
    formatCurrency,
    companySettings,
    activeBranch,
    kitchenAlertInfo,
    kitchenReadyInfo,
    sendTableOrderToKitchen,
    getTableFinancials,
    resetDemoPubTables
  } = usePuntoNexus();

  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'available', 'occupied', 'takeout', 'temporary'
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);

  // Mesa activa resincronizada en tiempo real desde el contexto global `tables`
  const activeTable = useMemo(() => {
    if (!selectedTable) return null;
    return tables.find(t => t.id === selectedTable.id) || selectedTable;
  }, [tables, selectedTable]);
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isTempModalOpen, setIsTempModalOpen] = useState(false);
  const [tempNameInput, setTempNameInput] = useState('');
  const [isKitchenOpen, setIsKitchenOpen] = useState(false);
  const [selectedQrTable, setSelectedQrTable] = useState(null);
  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(false);
  const [printStudioTableId, setPrintStudioTableId] = useState(null);
  
  // Estado para pedido para llevar
  const [isTakeoutModalOpen, setIsTakeoutModalOpen] = useState(false);
  const [takeoutClientInput, setTakeoutClientInput] = useState('');
  const [takeoutPaymentTiming, setTakeoutPaymentTiming] = useState('later'); // 'later', 'instant'

  // Estado para crear mesa
  const [newTable, setNewTable] = useState({ number: '', name: '', capacity: 4 });

  // Estado para abrir mesa con comensales y sus nombres
  const [dinersInput, setDinersInput] = useState(2);
  const [dinerNamesInput, setDinerNamesInput] = useState(['', '']);

  const handleDinersCountChange = (newCount) => {
    const count = Math.max(1, newCount);
    setDinersInput(count);
    setDinerNamesInput(prev => {
      const updated = [...prev];
      if (updated.length < count) {
        while (updated.length < count) updated.push('');
      } else if (updated.length > count) {
        updated.length = count;
      }
      return updated;
    });
  };

  const getProductImage = (prod) => {
    if (prod?.image_url) return prod.image_url;
    const name = (prod?.name || '').toLowerCase();
    const cat = (prod?.category || '').toLowerCase();
    if (name.includes('combo')) return '/images/combo_nexus.jpg';
    if (name.includes('hamburg') || name.includes('burger') || cat.includes('hamburg')) return '/images/burger_nexus.jpg';
    if (name.includes('pepito') || cat.includes('pepito')) return '/images/pepito_mixto.jpg';
    if (name.includes('tequeño') || name.includes('tequeno')) return '/images/tequenos_gourmet.jpg';
    if (name.includes('arepa') || cat.includes('arepa')) return '/images/arepa_reina.jpg';
    if (name.includes('pizza') || cat.includes('pizza')) return '/images/pizza_pepperoni.jpg';
    if (name.includes('malteada') || name.includes('batido') || name.includes('oreo')) return '/images/malteada_oreo.jpg';
    if (name.includes('papas') || name.includes('fries') || cat.includes('papas')) return 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80';
    if (name.includes('perro') || name.includes('hot dog')) return 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=600&q=80';
    if (name.includes('bebida') || name.includes('soda') || name.includes('jugo') || name.includes('coca') || cat.includes('bebida')) return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80';
    if (name.includes('café') || name.includes('coffee') || cat.includes('café')) return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80';
    if (name.includes('torta') || name.includes('postre') || cat.includes('postre')) return '/images/malteada_oreo.jpg';
    return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80';
  };

  // Buscador de productos para comandero
  const [searchTerm, setSearchTerm] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [activeCategory, setActiveCategory] = useState('todos');
  const [activeParticipantInput, setActiveParticipantInput] = useState('General');
  const [selectedParticipantFilter, setSelectedParticipantFilter] = useState('ALL');

  // Extraer TODOS los participantes/comensales registrados de la mesa activa con sus subtotales y saldo pendiente
  const tableParticipants = useMemo(() => {
    if (!activeTable) return [];
    const map = new Map();

    // 1. Incluir siempre todos los comensales registrados al abrir la mesa (ej: carlos, juan)
    if (Array.isArray(activeTable.dinersNames) && activeTable.dinersNames.length > 0) {
      activeTable.dinersNames.forEach(name => {
        const clean = (name || '').trim();
        if (clean) map.set(clean, { subtotal: 0, pendingSubtotal: 0 });
      });
    }

    // 2. Acumular consumos de los ítems existentes
    if (Array.isArray(activeTable.items)) {
      activeTable.items.forEach(item => {
        const pName = (item.participant_name || item.participantName || 'General').trim() || 'General';
        const sub = (Number(item.unit_price) || 0) * Number(item.quantity ?? item.cantidad ?? 1);
        const prev = map.get(pName) || { subtotal: 0, pendingSubtotal: 0 };
        map.set(pName, {
          subtotal: prev.subtotal + sub,
          pendingSubtotal: prev.pendingSubtotal + (item.paid ? 0 : sub)
        });
      });
    }

    return Array.from(map.entries()).map(([name, vals]) => ({
      name,
      subtotal: vals.subtotal,
      pendingSubtotal: vals.pendingSubtotal
    }));
  }, [activeTable]);

  // Cálculos de KPIs
  const availableCount = useMemo(() => tables.filter(t => t.status === 'available').length, [tables]);
  const occupiedCount = useMemo(() => tables.filter(t => t.status === 'occupied').length, [tables]);
  const takeoutCount = useMemo(() => tables.filter(t => t.isTakeout).length, [tables]);
  
  const getTableSubtotal = (table) => {
    if (!table || !Array.isArray(table.items)) return 0;
    return table.items.reduce((acc, item) => acc + ((Number(item.unit_price) || 0) * Number(item.quantity ?? item.cantidad ?? 0)), 0);
  };

  const totalAcumulado = useMemo(() => {
    return tables.reduce((acc, t) => acc + getTableSubtotal(t), 0);
  }, [tables]);

  // Filtrado de mesas
  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      if (activeFilter === 'available' && t.status !== 'available') return false;
      if (activeFilter === 'occupied' && t.status !== 'occupied') return false;
      if (activeFilter === 'takeout' && !t.isTakeout) return false;
      if (activeFilter === 'temporary' && !t.isTemporary) return false;

      if (tableSearchQuery.trim()) {
        const q = tableSearchQuery.toLowerCase().trim();
        const matchName = t.name.toLowerCase().includes(q);
        const matchNumber = t.number && t.number.toString().toLowerCase().includes(q);
        const matchQr = t.qr_code && t.qr_code.toLowerCase().includes(q);
        return matchName || matchNumber || matchQr;
      }

      return true;
    });
  }, [tables, activeFilter, tableSearchQuery]);

  // Categorías del inventario para comanda
  const categories = useMemo(() => {
    const set = new Set();
    inventory.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [inventory]);

  // Filtrado de productos para comanda
  const filteredProducts = useMemo(() => {
    return inventory.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = activeCategory === 'todos' || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchTerm, activeCategory]);

  const getTableIcon = (name = '', isTakeout = false) => {
    if (isTakeout) return <ShoppingBag size={18} style={{ color: '#d97706' }} />;
    const n = name.toLowerCase();
    if (n.includes('barra')) return <Wine size={18} style={{ color: '#8b5cf6' }} />;
    if (n.includes('terraza') || n.includes('jardín')) return <Coffee size={18} style={{ color: '#10b981' }} />;
    return <Utensils size={18} style={{ color: 'var(--color-cyan)' }} />;
  };

  const handleAddTableSubmit = (e) => {
    e.preventDefault();
    if (!newTable.name.trim()) return;
    addTable(newTable.number.trim(), newTable.name.trim(), newTable.capacity);
    setNewTable({ number: '', name: '', capacity: 4 });
    setIsAddTableModalOpen(false);
  };

  const handleOpenOrderDrawer = (table) => {
    setSelectedTable(table);
    const dCount = table.diners || 2;
    setDinersInput(dCount);
    if (Array.isArray(table.dinersNames) && table.dinersNames.length > 0) {
      setDinerNamesInput(table.dinersNames);
    } else {
      setDinerNamesInput(Array.from({ length: dCount }).map((_, i) => `Persona ${i + 1}`));
    }
    setIsOrderModalOpen(true);
  };

  const handleConfirmOpenTable = (tableId) => {
    const validNames = dinerNamesInput.map((n, i) => n.trim() || `Persona ${i + 1}`);
    openTable(tableId, dinersInput, validNames);
    
    // Si hay nombres válidos, establecer el primer nombre como participante activo por defecto
    if (validNames.length > 0) {
      setActiveParticipantInput(validNames[0]);
    }

    setTimeout(() => {
      const refreshed = tables.find(t => t.id === tableId);
      if (refreshed) setSelectedTable(refreshed);
    }, 50);
  };

  const handleAddItem = (product) => {
    if (!selectedTable) return;
    const pName = activeParticipantInput.trim() || 'General';
    addItemToTable(selectedTable.id, product, 1, itemNotes.trim(), pName);
    setItemNotes('');
    
    setTimeout(() => {
      const refreshed = tables.find(t => t.id === selectedTable.id);
      if (refreshed) setSelectedTable(refreshed);
    }, 50);
  };

  const handleCheckoutToPOS = (targetParticipantName = null) => {
    const liveTable = activeTable || selectedTable;
    if (!liveTable || !liveTable.items || liveTable.items.length === 0) {
      alert('La mesa no tiene consumos registrados para cobrar.');
      return;
    }

    const fin = getTableFinancials ? getTableFinancials(liveTable) : null;
    if (!targetParticipantName && fin && fin.isFullyPaid) {
      alert('🟢 Esta Tarjeta QR ya está 100% pagada ($0 pendiente). Puedes liberar la mesa directamente o verificarla en el Semáforo de Salida.');
      return;
    }

    const unpaidItems = liveTable.items.filter(i => !i.paid);
    const itemsToCheckout = targetParticipantName
      ? unpaidItems.filter(i => (i.participant_name || i.participantName || 'General').trim() === targetParticipantName.trim())
      : unpaidItems;

    if (itemsToCheckout.length === 0) {
      alert(
        targetParticipantName
          ? `✅ "${targetParticipantName}" ya no tiene consumos pendientes de pago.`
          : '🟢 Todos los consumos de esta mesa ya fueron pagados.'
      );
      return;
    }

    const posItems = itemsToCheckout.map(item => {
      const realProd = (inventory || []).find(p => p.id === item.product_id || p.sku === item.sku || p.name === item.name);
      const pName = (item.participant_name || item.participantName || 'General').trim();
      return {
        part: {
          id: realProd?.id || item.product_id || `table-item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: item.name,
          sku: item.sku || realProd?.sku || 'MESA-ITEM',
          sell_price: item.unit_price,
          cost_price: item.cost_price || realProd?.cost_price || 0,
          stock: realProd ? realProd.stock : 50,
          notes: item.notes || '',
          participantName: pName
        },
        cantidad: item.quantity ?? item.cantidad ?? 1,
        participantName: pName,
        originTableId: liveTable.id,
        originParticipantName: targetParticipantName ? targetParticipantName.trim() : null
      };
    });

    // Sellar ítems en borrador y enviarlos a cocina al cobrar
    sendTableOrderToKitchen(liveTable.id);

    if (setPosCart) {
      setPosCart(posItems);
    }
    
    setIsOrderModalOpen(false);
    setActiveTab('pos');
  };

  // Solicitar / Enviar pedido a la mesa (guardar comanda sin cobrar de inmediato)
  const handleSendOrderToTable = () => {
    if (!selectedTable) return;
    if (!selectedTable.items || selectedTable.items.length === 0) {
      alert('Debes agregar al menos un platillo o bebida a la comanda antes de solicitar a la mesa.');
      return;
    }

    sendTableOrderToKitchen(selectedTable.id);
    alert(`👨‍🍳 Pedido enviado a cocina para la mesa "${selectedTable.name}". Los platillos quedaron en preparación.`);
    setIsOrderModalOpen(false);
  };

  const handleClearCurrentTable = () => {
    if (!selectedTable) return;
    if (confirm(`¿Estás seguro de liberar ${selectedTable.name}? Se borrarán los consumos actuales.`)) {
      clearTable(selectedTable.id);
      setIsOrderModalOpen(false);
      setSelectedTable(null);
    }
  };

  return (
    <div className="tables-module-wrapper">
      {/* ── VISTA COCINA (fullscreen overlay via portal con colores claros y barra de botones) ── */}
      {isKitchenOpen && (
        <KitchenView 
          onClose={() => setIsKitchenOpen(false)} 
          onNavigateToGatekeeper={() => {
            setIsKitchenOpen(false);
            if (setActiveTab) setActiveTab('gatekeeper');
          }}
          onOpenPersonalQr={() => {
            setTempNameInput(`Tarjeta Barra #${Math.floor(10 + Math.random() * 89)}`);
            setIsTempModalOpen(true);
          }}
        />
      )}
      
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
      
      {/* ── ALERTA DE COCINA: Tiempo sin atender con mayor atraso ── */}
      {kitchenAlertInfo?.hasAlert && (
        <div 
          className={`alert-banner ${kitchenAlertInfo.maxDelayMins >= 15 ? 'red-glow' : 'amber-glow'}`}
          style={{
            background: kitchenAlertInfo.maxDelayMins >= 15 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
            border: kitchenAlertInfo.maxDelayMins >= 15 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
            color: kitchenAlertInfo.maxDelayMins >= 15 ? '#dc2626' : '#b45309',
            marginBottom: '20px'
          }}
        >
          <ChefHat size={18} style={{ color: kitchenAlertInfo.maxDelayMins >= 15 ? '#dc2626' : '#d97706' }} />
          <span>
            <strong>¡Alerta de Cocina ({activeBranch?.name || 'Sucursal'})!</strong> Tienes {kitchenAlertInfo.pendingItemsCount} {kitchenAlertInfo.pendingItemsCount === 1 ? 'comanda pendiente' : 'comandas pendientes'} en cocina.
            {kitchenAlertInfo.oldestTable && (
              <>
                {' '}Comanda de <strong>{kitchenAlertInfo.oldestTable.name}</strong> ({kitchenAlertInfo.oldestItem?.name || 'Platillo'}) lleva <strong>{kitchenAlertInfo.maxDelayMins} min sin atender</strong> (Mayor Atraso).
              </>
            )}
          </span>
          <button 
            className="alert-banner-btn" 
            onClick={() => setIsKitchenOpen(true)}
            style={{
              background: kitchenAlertInfo.maxDelayMins >= 15 ? '#dc2626' : '#d97706',
              color: '#ffffff'
            }}
          >
            Ver Vista Cocina
          </button>
        </div>
      )}

      {/* Banner de aviso de Platillos Listos para Servir (Verde Emerald Glow) */}
      {kitchenReadyInfo?.hasReadyAlert && (
        <div 
          className="alert-banner emerald-glow"
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.45)',
            color: '#047857',
            marginBottom: '16px',
            boxShadow: '0 0 16px rgba(16, 185, 129, 0.2)'
          }}
        >
          <BellRing size={18} style={{ color: '#10b981' }} />
          <span>
            <strong>🛎️ ¡Platillos Listos para Servir ({activeBranch?.name || 'Sucursal'})!</strong> Tienes {kitchenReadyInfo.readyItemsCount} {kitchenReadyInfo.readyItemsCount === 1 ? 'platillo listo' : 'platillos listos'} en cocina esperando ser entregados a la mesa.
            {kitchenReadyInfo.oldestReadyTable && (
              <>
                {' '}Pedido de <strong>{kitchenReadyInfo.oldestReadyTable.name}</strong> ({kitchenReadyInfo.oldestReadyItem?.name || 'Platillo'}) lleva <strong>{kitchenReadyInfo.maxReadyDelayMins} min listo</strong> sin entregar.
              </>
            )}
          </span>
          <button 
            className="alert-banner-btn" 
            onClick={() => setIsKitchenOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            🛎️ Ver Vista Cocina
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 1. TARJETAS DE MÉTRICAS KPI / ESTILO DASHBOARD SMARTLEAN 🌟 */}
      {/* ========================================================================= */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '20px' }}>
        
        {/* KPI: Disponibles */}
        <div className="kpi-card glass-panel emerald-glow" onClick={() => setActiveFilter('available')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-header">
            <span>Disponibles</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-emerald)' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ marginTop: '4px' }}>
            {availableCount} <span style={{ fontSize: '12px', color: 'var(--color-emerald)', fontWeight: 700 }}>mesas libres</span>
          </div>
          <div className="kpi-card-footer">
            Listas para recibir comensales.
          </div>
        </div>

        {/* KPI: Ocupadas */}
        <div className="kpi-card glass-panel amber-glow" onClick={() => setActiveFilter('occupied')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-header">
            <span>Ocupadas / En Cuenta</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-amber)' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ marginTop: '4px' }}>
            {occupiedCount} <span style={{ fontSize: '12px', color: 'var(--color-amber)', fontWeight: 700 }}>en comanda</span>
          </div>
          <div className="kpi-card-footer">
            Atención activa en salón.
          </div>
        </div>

        {/* KPI: Para Llevar */}
        <div className="kpi-card glass-panel">
          <div className="kpi-card-header">
            <span>Para Llevar</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#d97706' }}>
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ marginTop: '4px' }}>
            {takeoutCount} <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 700 }}>pedidos</span>
          </div>
          <div className="kpi-card-footer">
            Retiro pendiente por cliente.
          </div>
        </div>

        {/* KPI: Total en Cuentas */}
        <div className="kpi-card glass-panel cyan-glow">
          <div className="kpi-card-header">
            <span>Total en Cuentas</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-cyan)' }}>
              <Receipt size={18} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ marginTop: '4px' }}>
            <DualCurrencyDisplay amount={totalAcumulado} fontSize="22px" primaryColor="var(--color-cyan)" showSwap={true} />
          </div>
          <div className="kpi-card-footer">
            Consumo activo en mesa por cobrar.
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 🛠️ 2. BARRA DE FILTROS Y ACCIONES RÁPIDAS (PANEL LIGERO GLASS) 🛠️ */}
      {/* ========================================================================= */}
      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Píldoras de Filtro */}
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '12px' }}>
          <button 
            onClick={() => setActiveFilter('all')}
            className={`tables-filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
          >
            Todas ({tables.length})
          </button>
          <button 
            onClick={() => setActiveFilter('available')}
            className={`tables-filter-tab ${activeFilter === 'available' ? 'active' : ''}`}
            style={{ color: activeFilter === 'available' ? 'var(--color-emerald)' : undefined }}
          >
            Disponibles ({availableCount})
          </button>
          <button 
            onClick={() => setActiveFilter('occupied')}
            className={`tables-filter-tab ${activeFilter === 'occupied' ? 'active' : ''}`}
            style={{ color: activeFilter === 'occupied' ? 'var(--color-amber)' : undefined }}
          >
            Ocupadas ({occupiedCount})
          </button>
          <button 
            onClick={() => setActiveFilter('takeout')}
            className={`tables-filter-tab ${activeFilter === 'takeout' ? 'active' : ''}`}
            style={{ color: activeFilter === 'takeout' ? '#b45309' : undefined }}
          >
            🛍️ Para Llevar ({takeoutCount})
          </button>
        </div>

        {/* Buscador de Mesas */}
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', padding: '7px 10px 7px 30px', fontSize: '12px', borderRadius: '10px' }}
            placeholder="Buscar mesa o cliente..."
            value={tableSearchQuery}
            onChange={(e) => setTableSearchQuery(e.target.value)}
          />
          {tableSearchQuery && (
            <button onClick={() => setTableSearchQuery('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Botones de Acción */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('gatekeeper')}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#047857',
              cursor: 'pointer'
            }}
          >
            <ShieldCheck size={15} />
            🚦 Semáforo de Salida
          </button>

          <button 
            onClick={() => {
              setTempNameInput(`Tarjeta #${Math.floor(10 + Math.random() * 89)}`);
              setIsTempModalOpen(true);
            }}
            className="btn-secondary"
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              color: '#7e22ce'
            }}
          >
            <QrCode size={14} />
            + Tarjeta QR Personal
          </button>

          <button 
            type="button"
            onClick={() => {
              setPrintStudioTableId(null);
              setIsPrintStudioOpen(true);
            }}
            className="btn-secondary"
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(2, 132, 199, 0.08)',
              border: '1px solid rgba(2, 132, 199, 0.35)',
              color: '#0284c7',
              cursor: 'pointer'
            }}
            title="Abrir Centro de Impresión para generar acrílicos de mesa, tarjetas PVC y posavasos"
          >
            <Printer size={14} />
            🖨️ Imprimir Tarjetas QR
          </button>

          {/* ── BOTÓN KDS BARRA & COCINA ── */}
          {(() => {
            const allItems = tables.flatMap(t => t.items || []);
            const pending   = allItems.filter(i => i.kitchen_status === 'pending').length;
            const preparing = allItems.filter(i => i.kitchen_status === 'preparing').length;
            const ready     = allItems.filter(i => i.kitchen_status === 'ready').length;
            const urgent    = allItems.filter(i => {
              if (!i.ordered_at || i.kitchen_status === 'delivered') return false;
              return (Date.now() - new Date(i.ordered_at).getTime()) / 60000 > 8;
            }).length;
            return (
              <button
                onClick={() => setIsKitchenOpen(true)}
                style={{
                  position: 'relative',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.15))',
                  border: urgent > 0 ? '1px solid rgba(245,158,11,0.7)' : '1px solid rgba(6,182,212,0.5)',
                  color: urgent > 0 ? '#f59e0b' : '#0284c7',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: urgent > 0 ? '0 0 12px rgba(245,158,11,0.2)' : 'none'
                }}
              >
                <ChefHat size={14} />
                🍺🍔 KDS Barra &amp; Cocina
                {(pending + preparing + ready) > 0 && (
                  <span style={{
                    background: urgent > 0 ? '#f59e0b' : '#06b6d4',
                    color: 'white', borderRadius: '999px',
                    padding: '1px 7px', fontSize: '10px', fontWeight: 900, marginLeft: '2px'
                  }}>
                    {pending + preparing + ready}
                  </span>
                )}
              </button>
            );
          })()}

          {resetDemoPubTables && (
            <button
              type="button"
              onClick={resetDemoPubTables}
              className="btn-secondary"
              title="Restaurar escenario demostrativo del Pub (3 mesas activas + 3 libres)"
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <RotateCcw size={13} /> Demo Pub
            </button>
          )}

          <button 
            onClick={() => setIsAddTableModalOpen(true)}
            className="btn-primary"
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={14} />
            Nueva Mesa
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 🗺️ 3. GRID DE TARJETAS DE MESAS CON IDENTIDAD SMARTLEAN 🗺️ */}
      {/* ========================================================================= */}
      {filteredTables.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No se encontraron mesas o comandas activas con los filtros aplicados.
        </div>
      ) : (
        <div className="tables-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {filteredTables.map((table, idx) => {
            const isOccupied = table.status === 'occupied';
            const subtotal = getTableSubtotal(table);
            const itemCount = table.items ? table.items.reduce((acc, i) => acc + (i.quantity ?? i.cantidad ?? 0), 0) : 0;

            const cardThemeClass = table.isTakeout 
              ? 'theme-takeout' 
              : table.isTemporary 
              ? 'theme-temporary' 
              : isOccupied 
              ? 'theme-occupied' 
              : 'theme-available';

            return (
              <div 
                key={table.id || table.number || `table-card-${idx}`}
                onClick={() => handleOpenOrderDrawer(table)}
                className={`table-card glass-panel ${cardThemeClass}`}
              >
                {/* Header de la tarjeta con Icono & Botón Eliminar */}
                <div className="table-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="table-card-icon-box">
                      {getTableIcon(table.name, table.isTakeout)}
                    </div>
                    <div>
                      <h3 className="table-card-title" title={table.name}>
                        {table.name}
                      </h3>
                      <span style={{ fontSize: '10px', color: 'var(--color-cyan)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <QrCode size={10} /> {table.qr_code || `#${table.number}`}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteTable(table.id); }}
                    className="table-card-delete-btn"
                    title="Eliminar Mesa"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Subtítulo de Capacidad & Estado */}
                <div className="table-card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span className={`table-status-pill ${cardThemeClass}`}>
                      {table.isTakeout ? '🛍️ PARA LLEVAR' : table.isTemporary ? '⚡ TARJETA QR' : isOccupied ? '🟡 OCUPADA' : '🟢 DISPONIBLE'}
                    </span>
                    {(() => {
                      const fin = getTableFinancials ? getTableFinancials(table) : null;
                      if (!fin || !fin.hasConsumption) return null;
                      return fin.isFullyPaid ? (
                        <span style={{ fontSize: '9.5px', fontWeight: 900, background: 'rgba(16,185,129,0.16)', color: '#059669', border: '1px solid rgba(16,185,129,0.4)', padding: '2px 7px', borderRadius: '6px' }}>
                          🟢 PAGADO $0 (SALIDA OK)
                        </span>
                      ) : fin.paidAmount > 0 ? (
                        <span style={{ fontSize: '9.5px', fontWeight: 900, background: 'rgba(245,158,11,0.15)', color: '#b45309', border: '1px solid rgba(245,158,11,0.4)', padding: '2px 7px', borderRadius: '6px' }}>
                          🟠 DEBE {formatCurrency(fin.pendingAmount)} (Abonado {formatCurrency(fin.paidAmount)})
                        </span>
                      ) : (
                        <span style={{ fontSize: '9.5px', fontWeight: 900, background: 'rgba(239,68,68,0.12)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.35)', padding: '2px 7px', borderRadius: '6px' }}>
                          🔴 SALDO {formatCurrency(fin.pendingAmount)}
                        </span>
                      );
                    })()}
                    {(() => {
                      const readyCount = Array.isArray(table.items) ? table.items.filter(i => i.kitchen_status === 'ready').reduce((acc, i) => acc + (i.quantity ?? i.cantidad ?? 1), 0) : 0;
                      return readyCount > 0 ? (
                        <span className="badge-ready-pulse" style={{ fontSize: '9.5px', fontWeight: 900, background: 'rgba(16, 185, 129, 0.18)', color: '#047857', border: '1px solid rgba(16, 185, 129, 0.45)', padding: '2px 7px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          🛎️ {readyCount} {readyCount === 1 ? 'listo' : 'listos'} para servir
                        </span>
                      ) : null;
                    })()}
                    {table.isTakeout && (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '800',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        background: table.isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: table.isPaid ? '#059669' : '#b45309',
                        border: table.isPaid ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                      }}>
                        {table.isPaid ? '✅ PAGADO' : '⏳ PENDIENTE'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={12} style={{ color: isOccupied ? '#d97706' : 'var(--color-emerald)' }} />
                      {isOccupied ? `${table.diners}/${table.capacity} pers.` : `Cap: ${table.capacity}`}
                    </span>
                    {isOccupied && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-cyan)', fontWeight: 700 }}>
                        <ShoppingCart size={12} />
                        {itemCount} uds
                      </span>
                    )}
                  </div>
                </div>

                {/* Botón Rápido para Ver QR en grande o Simular Celular Cliente */}
                <div style={{ padding: '0 14px 10px', display: 'flex', gap: '5px' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedQrTable(table);
                    }}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '8px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    }}
                    title="Ver código QR en alta resolución, copiar enlace o descargar imagen"
                  >
                    <QrCode size={12} color="#0284c7" />
                    <span>Ver QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenGuestSimulator) {
                        onOpenGuestSimulator(table.qr_code || table.id);
                      } else {
                        window.open(`/?qr=${encodeURIComponent(table.qr_code || table.id)}`, '_blank');
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 7px',
                      borderRadius: '8px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      background: 'rgba(6, 182, 212, 0.1)',
                      border: '1px solid rgba(6, 182, 212, 0.35)',
                      color: '#0284c7',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                    title="Simular comanda de cliente en celular"
                  >
                    <Smartphone size={12} />
                    <span>Celular Cliente</span>
                  </button>
                  <a
                    href={`/?qr=${encodeURIComponent(table.qr_code || table.id)}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Abrir Tarjeta QR en nueva pestaña (sincroniza en vivo)"
                    style={{
                      padding: '6px 8px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>

                {/* Footer de la tarjeta con Consumo y Botón de Acción */}
                <div className="table-card-footer">
                  <div>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '800', display: 'block' }}>
                      CONSUMO
                    </span>
                    <DualCurrencyDisplay amount={subtotal} fontSize="13px" primaryColor={isOccupied ? 'var(--color-cyan)' : 'var(--text-muted)'} align="left" showSwap={false} />
                  </div>

                  <span className={`table-action-btn ${cardThemeClass}`}>
                    {table.isTakeout ? (table.isPaid ? 'ENTREGAR' : 'VER PEDIDO') : isOccupied ? 'VER COMANDA' : '+ ABRIR'}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* ========================================================================= */}
      {/* ➕ MODAL: Crear Nueva Mesa ➕ */}
      {/* ========================================================================= */}
      {isAddTableModalOpen && createPortal(
        <div className="modal-overlay" style={{ zIndex: 200000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '420px', padding: '24px', background: '#090f1e', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '24px', color: '#ffffff' }}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', color: '#ffffff' }}>Agregar Nueva Mesa</h3>
              <button className="modal-close" onClick={() => setIsAddTableModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTableSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ color: '#94a3b8' }}>Número o Código de Mesa</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="Ej: 5, Barra 2, Terraza A" 
                  value={newTable.number}
                  onChange={(e) => setNewTable({ ...newTable, number: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ color: '#94a3b8' }}>Nombre Descriptivo *</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="Ej: Mesa 5 - Zona Principal" 
                  value={newTable.name}
                  onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ color: '#94a3b8' }}>Capacidad Máxima (Personas)</label>
                <input 
                  type="number" 
                  className="form-input"
                  min="1"
                  max="50"
                  value={newTable.capacity}
                  onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsAddTableModalOpen(false)} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Crear Mesa
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* 🛍️ MODAL: Crear Pedido Para Llevar 🛍️ */}
      {/* ========================================================================= */}
      {isTakeoutModalOpen && createPortal(
        <div className="modal-overlay" style={{ zIndex: 200000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '420px', padding: '24px', background: '#090f1e', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '24px', color: '#ffffff' }}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                <ShoppingBag size={20} />
                <h3 className="modal-title" style={{ fontSize: '18px', color: '#ffffff' }}>Nuevo Pedido Para Llevar</h3>
              </div>
              <button className="modal-close" onClick={() => setIsTakeoutModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
              Ingresa el nombre del cliente para identificar el pedido. Se generará un código de retiro temporal.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              const isPaid = takeoutPaymentTiming === 'instant';
              const code = `LL-${Math.floor(100 + Math.random() * 900)}`;
              const clientName = takeoutClientInput.trim();
              const fullName = clientName ? `🛍️ ${code} - ${clientName}` : `🛍️ Pedido ${code}`;
              const created = addTable(code, fullName, 1, true, true, [], isPaid);
              setIsTakeoutModalOpen(false);
              setTakeoutClientInput('');
              if (created) {
                setSelectedTable(created);
                setIsOrderModalOpen(true);
              }
            }}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ color: '#f59e0b' }}>Nombre del Cliente / Persona (Opcional)</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="Ej: Pedro Pérez, Carlos, María..." 
                  value={takeoutClientInput}
                  onChange={(e) => setTakeoutClientInput(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Selector de Modalidad de Pago */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ color: '#f59e0b', marginBottom: '6px', display: 'block' }}>¿Cuándo Paga el Cliente?</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setTakeoutPaymentTiming('later')}
                    className={`btn-secondary ${takeoutPaymentTiming === 'later' ? 'active' : ''}`}
                    style={{ padding: '8px', fontSize: '11px', fontWeight: 800, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
                  >
                    <Clock size={14} />
                    <span>⏳ Paga al Retirar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTakeoutPaymentTiming('instant')}
                    className={`btn-secondary ${takeoutPaymentTiming === 'instant' ? 'active' : ''}`}
                    style={{ padding: '8px', fontSize: '11px', fontWeight: 800, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
                  >
                    <CheckCircle2 size={14} />
                    <span>💳 Paga en el Momento</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsTakeoutModalOpen(false)} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: 'none' }}>
                  Abrir Comanda
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* ⚡ MODAL: Crear Cuenta Temporal ⚡ */}
      {/* ========================================================================= */}
      {isTempModalOpen && createPortal(
        <div className="modal-overlay" style={{ zIndex: 200000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '420px', padding: '24px', background: '#090f1e', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '24px', color: '#ffffff' }}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc' }}>
                <Sparkles size={20} />
                <h3 className="modal-title" style={{ fontSize: '18px', color: '#ffffff' }}>Cuenta Temporal</h3>
              </div>
              <button className="modal-close" onClick={() => setIsTempModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
              Ingresa un nombre de cliente o identificador para esta cuenta de un solo uso.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!tempNameInput.trim()) return;
              const tempNum = `T-${Math.floor(100 + Math.random() * 900)}`;
              const created = addTable(tempNum, tempNameInput.trim(), 4, true);
              setIsTempModalOpen(false);
              if (created) {
                setSelectedTable(created);
                setIsOrderModalOpen(true);
              }
            }}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ color: '#c084fc' }}>Nombre / Identificador de la Cuenta *</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="Ej: Cliente Carlos, Barra Evento 2..." 
                  value={tempNameInput}
                  onChange={(e) => setTempNameInput(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsTempModalOpen(false)} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)', border: 'none' }}>
                  Abrir Comanda
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* 🍽️ MODAL DE COMANDERO EN PANTALLA COMPLETA 🍽️ */}
      {/* ========================================================================= */}
      {isOrderModalOpen && selectedTable && createPortal(
        <div className="modal-overlay" style={{ zIndex: 200000, padding: 0 }}>
          <div style={{ background: '#ffffff', width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Header del Comandero */}
            <div style={{ padding: '12px 24px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, boxShadow: '0 2px 10px rgba(15,23,42,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button 
                  onClick={() => setIsOrderModalOpen(false)} 
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 }}
                >
                  <ArrowLeft size={16} />
                  <span>Volver al Salón</span>
                </button>

                <div style={{ height: '24px', width: '1px', background: '#e2e8f0' }} />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{selectedTable.name}</h3>
                    <span className={`table-status-pill ${selectedTable.status === 'occupied' ? 'theme-occupied' : 'theme-available'}`}>
                      {selectedTable.status === 'occupied' ? '🟡 OCUPADA' : '🟢 DISPONIBLE'}
                    </span>
                    {selectedTable.diners > 0 && (
                      <span style={{ fontSize: '11px', color: '#475569', background: '#f8fafc', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: '600' }}>
                        👥 {selectedTable.diners} Comensales
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                    Comanda activa • Registro de consumos para la mesa
                  </span>
                </div>
              </div>

              <button className="modal-close" onClick={() => setIsOrderModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Si la mesa está disponible, pedir apertura con cantidad y nombres de comensales */}
            {selectedTable.status === 'available' ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', width: '100%', boxSizing: 'border-box' }}>
                <Users size={48} style={{ color: 'var(--color-cyan)', marginBottom: '12px' }} />
                <h4 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', marginBottom: '4px' }}>Abrir {selectedTable.name}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginBottom: '18px' }}>
                  Selecciona la cantidad e ingresa opcionalmente los nombres de los comensales para cobrar por separado.
                </p>

                {/* Selector de cantidad de comensales */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
                  <button 
                    type="button"
                    onClick={() => handleDinersCountChange(dinersInput - 1)}
                    className="btn-secondary"
                    style={{ width: '42px', height: '42px', borderRadius: '12px', fontSize: '20px', justifyContent: 'center' }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', minWidth: '36px' }}>{dinersInput}</span>
                  <button 
                    type="button"
                    onClick={() => handleDinersCountChange(dinersInput + 1)}
                    className="btn-secondary"
                    style={{ width: '42px', height: '42px', borderRadius: '12px', fontSize: '20px', justifyContent: 'center' }}
                  >
                    +
                  </button>
                </div>

                {/* Campo dinámico para Nombres de Comensales */}
                <div style={{ width: '100%', maxWidth: '380px', marginBottom: '22px', textAlign: 'left', background: '#ffffff', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                  <label style={{ fontSize: '11px', fontWeight: 900, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', textTransform: 'uppercase' }}>
                    <Users size={14} />
                    Nombres de Comensales (Opcional - Para pagar por separado)
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                    {Array.from({ length: dinersInput }).map((_, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', width: '75px', flexShrink: 0 }}>
                          Persona {idx + 1}:
                        </span>
                        <input
                          type="text"
                          className="form-input"
                          placeholder={`Ej: ${idx === 0 ? 'Juan' : idx === 1 ? 'María' : 'Comensal ' + (idx + 1)}`}
                          value={dinerNamesInput[idx] || ''}
                          onChange={(e) => {
                            const newNames = [...dinerNamesInput];
                            newNames[idx] = e.target.value;
                            setDinerNamesInput(newNames);
                          }}
                          style={{ flex: 1, padding: '6px 10px', fontSize: '12px', borderRadius: '8px', fontWeight: 700 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => handleConfirmOpenTable(selectedTable.id)}
                  className="btn-primary"
                  style={{ width: '100%', maxWidth: '380px', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: '800' }}
                >
                  🚀 INICIAR MESA CON {dinersInput} {dinersInput === 1 ? 'COMENSAL' : 'COMENSALES'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden', width: '100%' }}>
                
                {/* Columna Izquierda: Buscador + Filtros por Categoría + Tarjetas de Productos */}
                <div style={{ flex: '1.2', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: '16px', overflowY: 'auto' }}>
                  
                  {/* Asignación de Participante Activo para el Garzón */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '8px 12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--color-cyan)', textTransform: 'uppercase', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      👤 Asignar a:
                    </span>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Ej: Juan, María, General..." 
                      value={activeParticipantInput}
                      onChange={(e) => setActiveParticipantInput(e.target.value)}
                      style={{ flex: 1, padding: '4px 8px', fontSize: '12px', fontWeight: 700, borderRadius: '6px', borderColor: '#cbd5e1' }}
                    />
                    {tableParticipants.length > 0 && (
                      <select 
                        value={activeParticipantInput}
                        onChange={(e) => setActiveParticipantInput(e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                      >
                        <option value="General">General</option>
                        {tableParticipants.map(p => {
                                const isDinerPaid = p.subtotal > 0 && p.pendingSubtotal === 0;
                                return (
                                  <button
                                    key={p.name}
                                    type="button"
                                    onClick={() => handleCheckoutToPOS(p.name)}
                                    className="btn-secondary"
                                    style={{
                                      padding: '6px 8px',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      borderColor: isDinerPaid ? '#10b981' : 'var(--color-cyan)',
                                      color: isDinerPaid ? '#059669' : 'var(--color-cyan)',
                                      background: isDinerPaid ? 'rgba(16,185,129,0.1)' : 'rgba(6,182,212,0.06)'
                                    }}
                                  >
                                    <span>👤 {p.name}</span>
                                    <span>{isDinerPaid ? '✅ Pagado' : `${formatCurrency(p.pendingSubtotal)} ↗`}</span>
                                  </button>
                                );
                              })}
                      </select>
                    )}
                  </div>

                  {/* Buscador de Platillos */}
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Buscar platillo, bebida o servicio..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px 9px 36px', fontSize: '13px', borderRadius: '10px' }}
                    />
                  </div>

                  {/* Chips de Categorías */}
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' }}>
                    <button
                      onClick={() => setActiveCategory('todos')}
                      className={`tables-category-chip ${activeCategory === 'todos' ? 'active' : ''}`}
                    >
                      Todos ({inventory.length})
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`tables-category-chip ${activeCategory === cat ? 'active' : ''}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Campo de Nota Especial para Cocina */}
                  <div style={{ marginBottom: '12px' }}>
                    <input 
                      type="text"
                      className="form-input"
                      placeholder="Nota para cocina/bar (ej: Sin cebolla, extra salsa)..."
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      style={{ width: '100%', padding: '7px 12px', fontSize: '12px', borderRadius: '8px' }}
                    />
                  </div>

                  {/* Catalogo de Platillos Rápido con Fotos */}
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '8px', overflowY: 'auto', alignContent: 'start' }}>
                    {filteredProducts.map((prod, idx) => {
                      const imageUrl = getProductImage(prod);
                      return (
                        <div
                          key={prod.id || prod.sku || `tbl-prod-${idx}`}
                          onClick={() => handleAddItem(prod)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: '0 2px 6px rgba(15,23,42,0.04)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                        >
                          <div style={{ height: '80px', width: '100%', position: 'relative', overflow: 'hidden', background: '#f1f5f9' }}>
                            <img src={imageUrl} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {prod.category && (
                              <span style={{ position: 'absolute', top: '4px', left: '4px', fontSize: '8.5px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: 'rgba(15,23,42,0.75)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                                {prod.category}
                              </span>
                            )}
                          </div>
                          <div style={{ padding: '8px' }}>
                            <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a', lineHeight: '1.25', height: '28px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={prod.name}>
                              {prod.name}
                            </div>
                            <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <DualCurrencyDisplay amount={prod.sell_price} fontSize="11px" primaryColor="var(--color-cyan)" showSwap={false} />
                              <span style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--color-cyan)', padding: '2px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                                <Plus size={11} />
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Columna Derecha: Consumos de la Mesa + Acciones de Cobro */}
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', background: '#ffffff', padding: '18px' }}>
                  
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                        Consumos ({selectedTable.items?.length || 0} platillos)
                      </h4>
                      {tableParticipants.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedParticipantFilter('ALL')}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '10.5px',
                              fontWeight: selectedParticipantFilter === 'ALL' ? 900 : 600,
                              background: selectedParticipantFilter === 'ALL' ? 'var(--color-cyan)' : '#f1f5f9',
                              color: selectedParticipantFilter === 'ALL' ? '#ffffff' : '#64748b',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            Todos
                          </button>
                          {tableParticipants.map(p => (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => {
                                setSelectedParticipantFilter(p.name);
                                setActiveParticipantInput(p.name);
                              }}
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '10.5px',
                                fontWeight: selectedParticipantFilter === p.name ? 900 : 600,
                                background: selectedParticipantFilter === p.name ? 'rgba(6, 182, 212, 0.2)' : '#f1f5f9',
                                color: selectedParticipantFilter === p.name ? 'var(--color-cyan)' : '#64748b',
                                border: selectedParticipantFilter === p.name ? '1px solid var(--color-cyan)' : 'none',
                                cursor: 'pointer'
                              }}
                            >
                              👤 {p.name} ({formatCurrency(p.subtotal)})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {activeTable && activeTable.items && activeTable.items.length === 0 ? (
                      <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', border: '2px dashed #e2e8f0', borderRadius: '14px', background: '#f8fafc' }}>
                        <Utensils size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>No hay platillos añadidos todavía.</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>Selecciona platillos a la izquierda para cargarlos.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(activeTable?.items || [])
                          .map((item, realIndex) => ({ ...item, realIndex }))
                          .filter(item => selectedParticipantFilter === 'ALL' || (item.participant_name || item.participantName || 'General').trim() === selectedParticipantFilter)
                          .map((item) => {
                            const itemPName = (item.participant_name || item.participantName || 'General').trim();
                            return (
                              <div key={`table-item-${item.realIndex}`} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                                    {(item.paid || activeTable.isPaid) && (
                                      <span style={{ fontSize: '9.5px', fontWeight: 900, padding: '1px 6px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
                                        ✅ PAGADO {item.paid_by ? `(${item.paid_by})` : ''}
                                      </span>
                                    )}
                                    
                                    {/* Selector para cambiar a qué comensal pertenece este platillo */}
                                    <select
                                      value={itemPName}
                                      onChange={(e) => updateTableItemParticipant(activeTable.id, item.realIndex, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      title="Cambiar a qué comensal pertenece este platillo"
                                      style={{
                                        fontSize: '9.5px',
                                        fontWeight: 800,
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid #bae6fd',
                                        background: '#e0f2fe',
                                        color: '#0369a1',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value="General">👤 General</option>
                                      {tableParticipants.map(p => (
                                        <option key={p.name} value={p.name}>👤 {p.name}</option>
                                      ))}
                                    </select>

                                    {/* Selector de Estado de Cocina / Entrega en Mesa */}
                                    <select
                                      value={item.kitchen_status || 'pending'}
                                      onChange={(e) => updateTableItemStatus(activeTable.id, item.realIndex, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        fontSize: '9.5px',
                                        fontWeight: 800,
                                        padding: '1px 6px',
                                        borderRadius: '6px',
                                        border: item.kitchen_status === 'delivered' ? '1px solid #10b981' : item.kitchen_status === 'ready' ? '1px solid #06b6d4' : item.kitchen_status === 'draft' ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                        background: item.kitchen_status === 'delivered' ? '#dcfce7' : item.kitchen_status === 'ready' ? '#e0f2fe' : item.kitchen_status === 'draft' ? '#fef3c7' : '#ffffff',
                                        color: item.kitchen_status === 'delivered' ? '#15803d' : item.kitchen_status === 'ready' ? '#0369a1' : item.kitchen_status === 'draft' ? '#b45309' : '#334155',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value="draft">📋 Por enviar</option>
                                      <option value="pending">🧑‍🍳 En cocina</option>
                                      <option value="preparing">👨‍🍳 En preparación</option>
                                      <option value="ready">🔔 Listo para servir</option>
                                      <option value="delivered">✅ Entregado</option>
                                    </select>
                                  </div>
                                  {item.notes && <div style={{ fontSize: '10px', color: '#d97706', fontStyle: 'italic' }}>Nota: {item.notes}</div>}
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    <DualCurrencyDisplay amount={item.unit_price} fontSize="10px" primaryColor="var(--text-muted)" showSwap={false} /> c/u
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#ffffff', padding: '2px 6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                    <button type="button" onClick={() => updateTableItemQuantity(activeTable.id, item.realIndex, -1)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Reducir 1 unidad">
                                      <MinusCircle size={14} />
                                    </button>
                                    <span style={{ fontSize: '13px', fontWeight: '800', minWidth: '16px', textAlign: 'center' }}>{item.quantity ?? item.cantidad ?? 1}</span>
                                    <button type="button" onClick={() => updateTableItemQuantity(activeTable.id, item.realIndex, 1)} style={{ background: 'transparent', border: 'none', color: 'var(--color-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Agregar 1 unidad">
                                      <PlusCircle size={14} />
                                    </button>
                                  </div>

                                  <div style={{ minWidth: '65px', textAlign: 'right' }}>
                                    <DualCurrencyDisplay amount={(item.unit_price || 0) * (item.quantity ?? item.cantidad ?? 1)} fontSize="13px" primaryColor="var(--color-cyan)" align="right" showSwap={false} />
                                  </div>

                                  <button type="button" onClick={() => removeTableItem(activeTable.id, item.realIndex)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }} title="Eliminar del pedido">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Panel de Cobro y Entrega Adaptativo */}
                  {selectedTable.isPaid ? (
                    <div style={{ marginTop: '12px' }}>
                      {/* Banner Informativo de Pedido Pagado */}
                      <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 800, fontSize: '12px' }}>
                          <CheckCircle2 size={16} />
                          <span>PAGADO EN EL MOMENTO</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            toggleTablePaidStatus(selectedTable.id, false);
                            setSelectedTable(prev => ({ ...prev, isPaid: false }));
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                        >
                          Cambiar a Pendiente
                        </button>
                      </div>

                      <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>TOTAL COBRADO</span>
                          <DualCurrencyDisplay amount={getTableSubtotal(activeTable)} fontSize="20px" primaryColor="var(--color-emerald)" align="right" showSwap={true} />
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={() => {
                          alert(`✅ Pedido para llevar entregado y cerrado exitosamente.`);
                          clearTable(activeTable.id);
                          setIsOrderModalOpen(false);
                          setSelectedTable(null);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: '800',
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                          transition: 'all 0.2s ease',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em'
                        }}
                      >
                        <ShoppingBag size={17} />
                        <span>ENTREGAR Y CERRAR PEDIDO (PAGADO)</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Botón SOLICITAR / PEDIR A MESA (Sin Cobrar de Inmediato) */}
                      <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                        <button 
                          type="button"
                          onClick={handleSendOrderToTable}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: '800',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                            transition: 'all 0.2s ease',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em'
                          }}
                        >
                          <Utensils size={17} />
                          <span>SOLICITAR / PEDIR A MESA (GUARDAR ORDEN)</span>
                        </button>
                      </div>

                      {/* Total & Botones de Cobro */}
                      <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>TOTAL CONSUMO MESA</span>
                          <DualCurrencyDisplay amount={getTableSubtotal(activeTable)} fontSize="18px" primaryColor="var(--color-cyan)" align="right" showSwap={true} />
                        </div>

                        {(() => {
                          const fin = getTableFinancials ? getTableFinancials(activeTable) : null;
                          if (!fin || fin.paidAmount <= 0) return null;
                          return (
                            <div style={{ marginBottom: '10px', padding: '8px 10px', borderRadius: '8px', background: fin.isFullyPaid ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', border: `1px solid ${fin.isFullyPaid ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}`, fontSize: '11.5px', fontWeight: 800 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                                <span>✅ Abonado vía Tarjeta QR:</span>
                                <span>{formatCurrency(fin.paidAmount)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: fin.isFullyPaid ? '#059669' : '#dc2626', marginTop: '2px', fontSize: '12.5px' }}>
                                <span>{fin.isFullyPaid ? '🟢 Saldo Pendiente (Salida OK):' : '🔴 Saldo Pendiente por Cobrar:'}</span>
                                <span>{formatCurrency(fin.pendingAmount)}</span>
                              </div>
                            </div>
                          );
                        })()}

                        {selectedTable.isTakeout && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                toggleTablePaidStatus(selectedTable.id, true);
                                setSelectedTable(prev => ({ ...prev, isPaid: true }));
                              }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--color-cyan)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              💳 Marcar como Pagado en el Momento
                            </button>
                          </div>
                        )}

                        {/* Selección de Cobro por Participante Individual */}
                        {tableParticipants.length > 0 && (
                          <div style={{ marginBottom: '10px', padding: '10px', background: '#ffffff', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                              👤 Cobrar por Participante Individual:
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: tableParticipants.length > 1 ? '1fr 1fr' : '1fr', gap: '6px' }}>
                              {tableParticipants.map(p => (
                                <button
                                  key={p.name}
                                  type="button"
                                  onClick={() => handleCheckoutToPOS(p.name)}
                                  className="btn-secondary"
                                  style={{
                                    padding: '6px 8px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    display: 'flex',
                                    justify: 'space-between',
                                    alignItems: 'center',
                                    borderColor: 'var(--color-cyan)',
                                    color: 'var(--color-cyan)',
                                    background: 'rgba(6,182,212,0.06)'
                                  }}
                                >
                                  <span>👤 {p.name}</span>
                                  <span>{formatCurrency(p.subtotal)} ↗</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {(() => {
                          const fin = getTableFinancials ? getTableFinancials(activeTable) : null;
                          return (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={handleClearCurrentTable}
                                style={{
                                  padding: '10px 14px',
                                  borderRadius: '10px',
                                  background: fin && fin.isFullyPaid ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.08)',
                                  border: `1px solid ${fin && fin.isFullyPaid ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.25)'}`,
                                  color: fin && fin.isFullyPaid ? '#059669' : '#dc2626',
                                  fontWeight: '800',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                {fin && fin.isFullyPaid ? '✅ Liberar Tarjeta QR' : 'Liberar Mesa'}
                              </button>
                              <button
                                onClick={() => {
                                  if (fin && fin.isFullyPaid) {
                                    setIsOrderModalOpen(false);
                                    setActiveTab('gatekeeper');
                                  } else {
                                    handleCheckoutToPOS(null);
                                  }
                                }}
                                className="btn-primary"
                                style={{
                                  flex: 1,
                                  padding: '10px',
                                  borderRadius: '10px',
                                  fontWeight: '800',
                                  fontSize: '13px',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: fin && fin.isFullyPaid ? 'linear-gradient(135deg, #10b981, #059669)' : undefined
                                }}
                              >
                                <Receipt size={16} />
                                {fin && fin.isFullyPaid
                                  ? '🟢 VER EN SEMÁFORO DE SALIDA'
                                  : fin && fin.paidAmount > 0
                                    ? `COBRAR SALDO (${formatCurrency(fin.pendingAmount)}) ↗`
                                    : 'COBRAR CUENTA COMPLETA ↗'}
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  )}

                </div>

              </div>
            )}

          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: VER QR EN GRANDE ── */}
      <TableQRModal
        isOpen={Boolean(selectedQrTable)}
        onClose={() => setSelectedQrTable(null)}
        table={selectedQrTable}
        onOpenPrintStudio={(tableId) => {
          setPrintStudioTableId(tableId);
          setIsPrintStudioOpen(true);
        }}
        onOpenGuestSimulator={onOpenGuestSimulator}
      />

      {/* ── MODAL: CENTRO DE IMPRESIÓN DE TARJETAS QR ── */}
      <QRPrintStudio
        isOpen={isPrintStudioOpen}
        onClose={() => {
          setIsPrintStudioOpen(false);
          setPrintStudioTableId(null);
        }}
        tables={tables}
        initialSelectedTableId={printStudioTableId}
      />

    </div>
  );
}
