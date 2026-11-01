import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePuntoNexus } from '../context/PuntoNexusContext';
import { getCountryConfig } from '../utils/countryConfig';
import DualCurrencyDisplay from './DualCurrencyDisplay';
import AdminPasswordModal from './AdminPasswordModal';
import { printReceipt, downloadReceiptFile, getSaleWhatsAppReceiptUrl } from '../utils/receiptGenerator';
import { playSound, isSoundEnabled, setSoundEnabled } from '../utils/soundEffects';
import { formatShiftWhatsAppMessage, getWhatsAppShareUrl } from '../utils/shiftExport';
import { 
  Search, Plus, Minus, Trash2, CheckCircle, CheckCircle2, Printer, Download, XCircle, ShoppingBag, ShoppingCart, ShoppingBasket,
  CreditCard, DollarSign, QrCode, X, RefreshCw, Sparkles, Grid, LayoutGrid,
  List, Layers, SlidersHorizontal, Barcode, Volume2, VolumeX, Wifi, WifiOff, MessageCircle, Copy, Share2, Utensils, UtensilsCrossed,
  ArrowLeft, Receipt, FileText, Users, Clock, AlertCircle, AlertTriangle, Check, Banknote, Landmark, Building2, Package, Palette, Scissors
} from 'lucide-react';
import { hasProductVariants, getProductVariants, getVariantStock } from '../utils/productSpecs';
const getProductImage = (prod, isGastronomia = true) => {
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

  // Belleza & Barbería Fallbacks
  if (name.includes('corte') || name.includes('barber') || name.includes('fade')) return 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80';
  if (name.includes('barba') || name.includes('afeitad')) return 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80';
  if (name.includes('balayage') || name.includes('color') || name.includes('tinte')) return 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=600&q=80';
  if (name.includes('uñas') || name.includes('manicur')) return 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=80';
  if (name.includes('pase') || name.includes('membres')) return 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80';
  
  if (!isGastronomia) {
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
  }
  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80';
};

export default function POS({ initialCart, clearInitialCart, setActiveTab }) {
  const { user, inventory, processSale, cancelSale, companySettings, countryConfig, companyName, activeBranch, formatCurrency, loadSharedCart, syncExchangeRate, loading, addTable, removeTableItemsByParticipant, clearTable, activeShift, openShift, addShiftMovement, closeShiftBlind, isOnline, pendingOfflineCount, syncPendingSales, sales } = usePuntoNexus();

  const [soundActive, setSoundActive] = useState(() => isSoundEnabled());
  const [shiftWhatsAppModal, setShiftWhatsAppModal] = useState(null);

  const activeCountryConfig = useMemo(() => {
    return countryConfig || getCountryConfig(companySettings?.country || 'CL');
  }, [countryConfig, companySettings?.country]);

  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Múltiple'); // Pago Múltiple por defecto
  const [referenceNumber, setReferenceNumber] = useState(''); // N° de Referencia / Transacción
  const [changePayoutMode, setChangePayoutMode] = useState('single'); // 'single' | 'multiple'
  const [changePayoutMethod, setChangePayoutMethod] = useState(''); // Forma de vuelto: 'USD_EFECTIVO', 'VES_PAGO_MOVIL', 'BINANCE', 'ZELLE', 'MIXTO'
  const [changePayoutRef, setChangePayoutRef] = useState(''); // Ref de envío de vuelto
  const [splitChangeRows, setSplitChangeRows] = useState([
    { id: 1, method: 'USD_EFECTIVO', currency: 'USD', amount: '', ref_number: '' }
  ]);

  const addSplitChangeRow = () => {
    setSplitChangeRows(prev => [
      ...prev,
      { id: Date.now() + Math.random(), method: 'VES_PAGO_MOVIL', currency: 'VES', amount: '', ref_number: '' }
    ]);
  };

  const updateSplitChangeRow = (id, field, value) => {
    setSplitChangeRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeSplitChangeRow = (id) => {
    setSplitChangeRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  };

  const getChangePayoutLabel = (methodKey) => {
    switch (methodKey) {
      case 'USD_EFECTIVO': return '💵 Dólares en Efectivo ($USD)';
      case 'VES_PAGO_MOVIL': return '🇻🇪 Bolívares / Pago Móvil (Bs.)';
      case 'BINANCE': return '🟡 Binance USDT';
      case 'ZELLE': return '⚡ Zelle / Transf. USD';
      case 'MIXTO': return '🔀 Mixto / Billetes + Bs.';
      default: return methodKey || 'Sin especificar';
    }
  };

  const [documentType, setDocumentType] = useState(() => activeCountryConfig?.defaultDocType || 'Boleta');

  useEffect(() => {
    if (activeCountryConfig?.defaultDocType) {
      const isCurrentValid = activeCountryConfig.docTypes?.some(d => d.key === documentType);
      if (!isCurrentValid) {
        setDocumentType(activeCountryConfig.defaultDocType);
      }
    }
  }, [activeCountryConfig]);
  const [customerRut, setCustomerRut] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerGiro, setCustomerGiro] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [applyTax, setApplyTax] = useState(() => (companySettings?.tax_enabled !== false && Number(companySettings?.tax_rate ?? 0.16) > 0));

  useEffect(() => {
    const isTaxOn = companySettings?.tax_enabled !== false && Number(companySettings?.tax_rate ?? 0.16) > 0;
    setApplyTax(isTaxOn);
  }, [companySettings?.tax_enabled, companySettings?.tax_rate]);
  const [cashCurrency, setCashCurrency] = useState(() => companySettings.currency_code || 'CLP');
  const [cashReceived, setCashReceived] = useState('');
  const [givenChangeBill, setGivenChangeBill] = useState('');
  const [givenChangeCurrency, setGivenChangeCurrency] = useState('USD');
  const [viewDensity, setViewDensity] = useState('compact'); // 'compact', 'ultra', 'list'
  const [addedProdId, setAddedProdId] = useState(null);
  const [cartToast, setCartToast] = useState(null); // { name, qty } para el toast flotante
  const [tableOrigin, setTableOrigin] = useState(null); // { tableId, participantName }
  const [completedSaleModal, setCompletedSaleModal] = useState(null); // Modal comprobante emitido (boleta/factura)
  const [pendingPosAnnulSale, setPendingPosAnnulSale] = useState(null);
  const [selectedVariantModalProduct, setSelectedVariantModalProduct] = useState(null); // Modal selector de variante de color

  // ─── ESTADOS PARA GESTIÓN DE TURNOS Y CIERRE CIEGO DE CAJA ───
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [openInitialUSD, setOpenInitialUSD] = useState('');
  const [openInitialVES, setOpenInitialVES] = useState('');
  const [showOpenBillCounter, setShowOpenBillCounter] = useState(false);
  const [openBillCountsUSD, setOpenBillCountsUSD] = useState({ 1: '', 5: '', 10: '', 20: '', 50: '', 100: '' });
  const [openBillCountsVES, setOpenBillCountsVES] = useState({ 50: '', 100: '' });

  const totalOpenCalculatedUSD = useMemo(() => {
    return Object.entries(openBillCountsUSD).reduce((sum, [denom, count]) => sum + (Number(denom) * (Number(count) || 0)), 0);
  }, [openBillCountsUSD]);

  const totalOpenCalculatedVES = useMemo(() => {
    return Object.entries(openBillCountsVES).reduce((sum, [denom, count]) => sum + (Number(denom) * (Number(count) || 0)), 0);
  }, [openBillCountsVES]);

  const [showShiftMovModal, setShowShiftMovModal] = useState(false);
  const [movType, setMovType] = useState('in'); // 'in' (ingreso) | 'out' (retiro/gasto)
  const [movUSD, setMovUSD] = useState('');
  const [movVES, setMovVES] = useState('');
  const [movReason, setMovReason] = useState('');

  const [showBlindCloseModal, setShowBlindCloseModal] = useState(false);
  const [closeCashUSD, setCloseCashUSD] = useState('');
  const [closeCashVES, setCloseCashVES] = useState('');
  const [closeCardVES, setCloseCardVES] = useState('');
  const [closePagoMovilVES, setClosePagoMovilVES] = useState('');
  const [closeZelleUSD, setCloseZelleUSD] = useState('');
  const [closeBinanceUSDT, setCloseBinanceUSDT] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  
  const [showBillCounterUSD, setShowBillCounterUSD] = useState(false);
  const [billCountsUSD, setBillCountsUSD] = useState({ 1: '', 5: '', 10: '', 20: '', 50: '', 100: '' });
  const [showBillCounterVES, setShowBillCounterVES] = useState(false);
  const [billCountsVES, setBillCountsVES] = useState({ 50: '', 100: '' });

  const totalBillCalculatedUSD = useMemo(() => {
    return Object.entries(billCountsUSD).reduce((sum, [denom, count]) => sum + (Number(denom) * (Number(count) || 0)), 0);
  }, [billCountsUSD]);

  const totalBillCalculatedVES = useMemo(() => {
    return Object.entries(billCountsVES).reduce((sum, [denom, count]) => sum + (Number(denom) * (Number(count) || 0)), 0);
  }, [billCountsVES]);

  const handleOpenShiftSubmit = async (e) => {
    e.preventDefault();
    const res = await openShift({
      initial_cash_usd: Number(openInitialUSD) || 0,
      initial_cash_ves: Number(openInitialVES) || 0,
      initial_bills_usd: openBillCountsUSD,
      initial_bills_ves: openBillCountsVES
    });
    if (res.error) {
      alert(res.error);
    } else {
      setShowOpenShiftModal(false);
      setOpenInitialUSD('');
      setOpenInitialVES('');
      setOpenBillCountsUSD({ 1: '', 5: '', 10: '', 20: '', 50: '', 100: '' });
      setOpenBillCountsVES({ 50: '', 100: '' });
      alert("✅ Caja abierta con éxito. ¡Buen turno de trabajo!");
    }
  };

  const handleShiftMovSubmit = async (e) => {
    e.preventDefault();
    if ((!Number(movUSD) || Number(movUSD) <= 0) && (!Number(movVES) || Number(movVES) <= 0)) {
      alert("⚠️ Por favor ingresa al menos un monto en USD o Bolívares.");
      return;
    }
    const res = await addShiftMovement({
      type: movType,
      amount_usd: Number(movUSD) || 0,
      amount_ves: Number(movVES) || 0,
      reason: movReason
    });
    if (res.error) {
      alert(res.error);
    } else {
      setShowShiftMovModal(false);
      setMovUSD('');
      setMovVES('');
      setMovReason('');
      alert(`✅ ${movType === 'in' ? 'Ingreso de efectivo' : 'Retiro / Gasto de caja'} registrado en el turno.`);
    }
  };

  const handleBlindCloseSubmit = async (e) => {
    e.preventDefault();
    const res = await closeShiftBlind({
      declared_cash_usd: Number(closeCashUSD) || 0,
      declared_cash_ves: Number(closeCashVES) || 0,
      declared_card_ves: Number(closeCardVES) || 0,
      declared_pago_movil_ves: Number(closePagoMovilVES) || 0,
      declared_zelle_usd: Number(closeZelleUSD) || 0,
      declared_binance_usdt: Number(closeBinanceUSDT) || 0,
      declared_bills_usd: billCountsUSD,
      declared_bills_ves: billCountsVES,
      notes: closeNotes
    });

    if (res.error) {
      alert(res.error);
    } else {
      setShowBlindCloseModal(false);
      const closedShift = res.shift || activeShift;
      const shiftSalesList = (sales || []).filter(s => s.shift_id === closedShift?.id || !s.shift_id);
      const msg = formatShiftWhatsAppMessage({
        shift: closedShift,
        shiftSales: shiftSalesList,
        companySettings,
        companyName,
        activeBranch
      });

      setCloseCashUSD('');
      setCloseCashVES('');
      setCloseCardVES('');
      setClosePagoMovilVES('');
      setCloseZelleUSD('');
      setCloseBinanceUSDT('');
      setCloseNotes('');

      setShiftWhatsAppModal({
        isOpen: true,
        shift: closedShift,
        messageText: msg,
        copied: false
      });
    }
  };

  const confirmPosAnnulSale = async (reason) => {
    if (!pendingPosAnnulSale) return;
    const saleId = pendingPosAnnulSale.id;
    const docType = pendingPosAnnulSale.document_type || 'Venta';
    const cancelledBy = user?.full_name || user?.name || user?.email || 'Administrador';
    setPendingPosAnnulSale(null);

    const res = await cancelSale(saleId, reason, cancelledBy);
    if (res && res.error) {
      alert(`❌ Error al anular la venta: ${res.error}`);
    } else {
      alert(`✅ ${docType} N° PN-${String(saleId).slice(-8).toUpperCase()} anulada con éxito por ${cancelledBy}.\nMotivo registrado: "${reason || 'Sin motivo'}"`);
      setCompletedSaleModal(null);
    }
  };

  // Estados de Pago Múltiple / Dividido
  const [targetChangeInput, setTargetChangeInput] = useState(''); // Vuelto deseado en USD (para vuelto mixto)
  const [targetPaidBillUSD, setTargetPaidBillUSD] = useState(''); // Billete USD entregado
  const [targetPaidBillVES, setTargetPaidBillVES] = useState(''); // Monto en Bs entregado
  const [showTargetCalc, setShowTargetCalc] = useState(true);

  const [splitPayments, setSplitPayments] = useState([
    { id: 'split-1', method: 'Transferencia', currency: 'USD', amount: '' },
    { id: 'split-2', method: 'Efectivo', currency: companySettings.currency_code || 'VES', amount: '' }
  ]);

  const addSplitPaymentRow = () => {
    const defaultCurr = companySettings.currency_code || 'VES';
    setSplitPayments(prev => [
      ...prev,
      { id: `split-${Date.now()}`, method: 'Efectivo', currency: defaultCurr, amount: '' }
    ]);
  };

  const removeSplitPaymentRow = (id) => {
    if (splitPayments.length <= 1) return;
    setSplitPayments(prev => prev.filter(item => item.id !== id));
  };

  const updateSplitPaymentRow = (id, field, value) => {
    setSplitPayments(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // Cargar carrito precargado desde Mesas / Comandero
  useEffect(() => {
    if (initialCart && initialCart.length > 0) {
      const firstItem = initialCart[0];
      if (firstItem.originTableId) {
        setTableOrigin({
          tableId: firstItem.originTableId,
          participantName: firstItem.originParticipantName || null
        });
      } else {
        setTableOrigin(null);
      }

      const formattedCart = initialCart.map(item => {
        const pName = item.participantName || item.participant_name || item.part?.participantName || item.part?.participant_name || '';
        // Formato nuevo desde TablesModule: { part: {...}, cantidad }
        if (item.part) {
          return { 
            part: { ...item.part, participantName: pName }, 
            cantidad: item.cantidad,
            participantName: pName
          };
        }
        // Formato antiguo: { id, name, sell_price, ... }
        const productInInv = inventory.find(p => p.id === item.id) || {
          id: item.id || `temp-${Date.now()}`,
          name: item.name,
          sell_price: item.sell_price,
          cost_price: item.cost_price || 0,
          sku: item.sku || 'MESA-ITEM',
          stock: 999
        };
        return {
          part: { ...productInInv, participantName: pName },
          cantidad: item.cantidad,
          notes: item.notes || '',
          participantName: pName
        };
      });
      setCart(formattedCart);
      setShowScanModal(true);
      if (clearInitialCart) clearInitialCart();
    }
  }, [initialCart, inventory]);
  
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastSaleTotal, setLastSaleTotal] = useState(0);

  // Estados del popup del escáner
  const [showScanModal, setShowScanModal] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState(null);

  // Canasta compartida
  const [showLoadCartModal, setShowLoadCartModal] = useState(false);
  const [loadCartCode, setLoadCartCode] = useState('');

  // Pedido para llevar desde POS
  const [showSaveTakeoutModal, setShowSaveTakeoutModal] = useState(false);
  const [saveTakeoutClientInput, setSaveTakeoutClientInput] = useState('');

  const inputRef = useRef(null);
  const modalInputRef = useRef(null);

  const handleLoadCartSubmit = async (e) => {
    e.preventDefault();
    if (!loadCartCode.trim()) return;

    const res = await loadSharedCart(loadCartCode.trim());
    if (res.error) {
      alert(res.error);
    } else {
      setCart(res.cart);
      setShowLoadCartModal(false);
      setLoadCartCode('');
      
      const total = res.cart.reduce((sum, item) => sum + item.cantidad * item.part.sell_price, 0);
      speakTotal(total);
      alert("Canasta del cliente cargada con éxito.");
    }
  };

  const [posTakeoutPaymentStatus, setPosTakeoutPaymentStatus] = useState('later'); // 'later', 'instant'

  const handleSaveTakeoutSubmit = (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert("El carrito está vacío.");
      return;
    }

    const isPaid = posTakeoutPaymentStatus === 'instant';
    const code = `LL-${Math.floor(100 + Math.random() * 900)}`;
    const clientName = saveTakeoutClientInput.trim();
    const fullName = clientName ? `🛍️ ${code} - ${clientName}` : `🛍️ Pedido ${code}`;

    // Convertir carrito del POS al formato de ítems de mesa
    const tableItems = cart.map(item => ({
      product_id: item.part.id,
      name: item.part.name,
      sku: item.part.sku || '',
      unit_price: item.part.sell_price,
      cost_price: item.part.cost_price || 0,
      quantity: item.cantidad,
      notes: item.notes || ''
    }));

    addTable(code, fullName, 1, true, true, tableItems, isPaid);
    
    setCart([]);
    setDiscount('');
    setShowScanModal(false);
    setShowSaveTakeoutModal(false);
    setSaveTakeoutClientInput('');
    alert(`✅ Pedido para llevar "${fullName}" guardado (${isPaid ? 'Pagado en el momento' : 'Paga al retirar'}). Quedó activo en el módulo de Mesas.`);
  };

  // Síntesis de voz para dictar el total
  const speakTotal = (amount) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Detener cualquier audio en cola
      
      const { use_usd_pricing, exchange_rate } = companySettings;
      let text = '';
      if (use_usd_pricing) {
        const localVal = Math.round(amount * exchange_rate);
        text = `Total ${localVal} bolívares`;
      } else {
        text = `Total ${Math.round(amount)} pesos`;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = use_usd_pricing ? 'es-VE' : 'es-CL';
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Enfocar modal de escaneo únicamente al abrirse (evita robos de foco y saltos de scroll en móviles)
  useEffect(() => {
    if (showScanModal && modalInputRef.current) {
      modalInputRef.current.focus({ preventScroll: true });
    }
  }, [showScanModal]);

  const [selectedCategory, setSelectedCategory] = useState('TODOS');

  // Extraer categorías disponibles del inventario
  const availableCategories = useMemo(() => {
    const cats = new Set(['TODOS']);
    (inventory || []).forEach(p => {
      if (p?.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [inventory]);

  // Filtrar productos para el catálogo de fondo
  const filteredProducts = useMemo(() => {
    return (inventory || []).filter(p => {
      if (!p) return false;
      
      // Filtro por categoría elegida
      if (selectedCategory !== 'TODOS' && p.category !== selectedCategory) {
        return false;
      }

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const nameMatch = (p.name || '').toLowerCase().includes(q);
      const skuMatch = (p.sku || '').toLowerCase().includes(q);
      const catMatch = (p.category || '').toLowerCase().includes(q);

      return nameMatch || skuMatch || catMatch;
    });
  }, [inventory, searchQuery, selectedCategory]);

  // Filtrar productos rápidos para la modal de escaneo (máximo 5 resultados)
  const modalFilteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return (inventory || []).filter(p => {
      if (!p) return false;
      const nameMatch = (p.name || '').toLowerCase().includes(q);
      const skuMatch = (p.sku || '').toLowerCase().includes(q);
      const catMatch = (p.category || '').toLowerCase().includes(q);
      return nameMatch || skuMatch || catMatch;
    }).slice(0, 5);
  }, [inventory, searchQuery]);

  // Helper para identificar productos de forma única
  const getProdKey = (p) => p?.id || p?.sku || p?.name;

  // Helper para identificar ítems del carrito (soporta variantes de color individuales)
  const getCartItemKey = (item) => {
    if (!item) return '';
    const base = item.part?.id || item.part?.sku || item.part?.name || item.id || '';
    if (item.selectedVariant) {
      return `${base}__var_${item.selectedVariant.id || item.selectedVariant.color}`;
    }
    return String(base);
  };

  // Agregar al carrito (soporta variantes de color con stock individual, unidades y productos a granel/peso)
  const addToCart = (product, weightQtyOverride = null, selectedVariant = null) => {
    if (!product) return;

    // Si tiene variantes de color configuradas y no se ha seleccionado una variante, abrir selector
    if (hasProductVariants(product) && !selectedVariant) {
      setSelectedVariantModalProduct(product);
      return;
    }

    const isWeightProduct = product.is_weight_based || product.unit === 'Kg.' || product.unit === 'g';
    let weightQty = weightQtyOverride;

    if (isWeightProduct && weightQty === null) {
      let inputStr = window.prompt(
        `⚖️ Venta a Granel / Peso - "${product.name}":\n\n- Ingrese los GRAMOS (ej: 250, 400, 500, 750)\n- O ingrese los KILOS (ej: 0.250, 0.500, 1.5)\n\nPrecio por Kg: $${Number(product.sell_price || 0).toFixed(2)}`,
        "250"
      );
      if (!inputStr) return; // cancelado
      inputStr = inputStr.toLowerCase().trim().replace(',', '.').replace('g', '').replace('kg', '');
      
      let parsedNum = parseFloat(inputStr);
      if (isNaN(parsedNum) || parsedNum <= 0) {
        alert("Por favor ingrese un gramaje o peso válido.");
        return;
      }

      // Si se ingresó en gramos (ej: 250, 400, 750), convertir automáticamente a Kilos (dividir entre 1000)
      weightQty = parsedNum >= 10 ? parsedNum / 1000 : parsedNum;
    }

    const initialQty = weightQty !== null ? weightQty : 1;
    const isService = product.sku?.startsWith('SERV-') || product.stock === 999;
    
    // Validar stock disponible para la variante específica o producto general
    const maxStock = selectedVariant
      ? (Number(selectedVariant.stock) || 0)
      : (Number(product.stock) || 0);

    if (!isService && maxStock <= 0) {
      playSound('error');
      alert(`El color "${selectedVariant?.color || 'seleccionado'}" no tiene stock disponible.`);
      return;
    }

    const targetVariantId = selectedVariant ? (selectedVariant.id || selectedVariant.color) : null;
    const existing = cart.find(item => {
      const sameBase = getProdKey(item.part) === getProdKey(product);
      if (!sameBase) return false;
      if (selectedVariant) {
        const itemVarId = item.selectedVariant?.id || item.selectedVariant?.color;
        return itemVarId === targetVariantId;
      }
      return !item.selectedVariant;
    });

    if (existing) {
      const newQty = existing.cantidad + initialQty;
      if (!isService && newQty > maxStock) {
        playSound('error');
        alert(`No hay suficiente stock para "${selectedVariant ? `${product.name} (${selectedVariant.color})` : product.name}". Límite disponible: ${maxStock} unidades.`);
        return;
      }
      setCart(cart.map(item => 
        item === existing 
          ? { ...item, cantidad: Number(newQty.toFixed(3)) }
          : item
      ));
    } else {
      setCart([...cart, { 
        part: product, 
        cantidad: Number(initialQty.toFixed(3)),
        selectedVariant: selectedVariant || null
      }]);
    }

    setLastScannedItem(product);
    playSound('scan');
    const targetKey = getProdKey(product);
    setAddedProdId(targetKey);
    setTimeout(() => setAddedProdId(null), 600);

    // Mostrar toast flotante de confirmación (desaparece en 2.5 s)
    const toastLabel = selectedVariant ? `${product.name} (${selectedVariant.color})` : product.name;
    setCartToast({ name: toastLabel });
    setTimeout(() => setCartToast(null), 2500);
  };

  // Modificar cantidad del carrito (soporta items específicos con variantes o productos)
  const updateQty = (target, delta) => {
    if (!target) return;

    let itemToUpdate = null;
    if (target.part) {
      itemToUpdate = target;
    } else {
      const targetKey = typeof target === 'string' ? target : getProdKey(target);
      const matchingItems = cart.filter(i => getProdKey(i.part) === targetKey);
      if (matchingItems.length === 0) return;

      if (delta > 0 && hasProductVariants(matchingItems[0].part)) {
        // Si tiene variantes y pulsa +, abrir modal para que escoja qué color agregar
        setSelectedVariantModalProduct(matchingItems[0].part);
        return;
      }
      itemToUpdate = matchingItems[matchingItems.length - 1];
    }

    const newQty = itemToUpdate.cantidad + delta;
    if (newQty <= 0) {
      const newCart = cart.filter(i => i !== itemToUpdate);
      setCart(newCart);
      playSound('delete');
      if (newCart.length === 0) {
        setShowScanModal(false);
      }
      return;
    }

    const part = itemToUpdate.part;
    const isService = part?.sku?.startsWith('SERV-') || part?.stock === 999;
    const maxStock = itemToUpdate.selectedVariant
      ? (Number(itemToUpdate.selectedVariant.stock) || 0)
      : (Number(part?.stock) || 0);

    if (!isService && newQty > maxStock) {
      playSound('error');
      alert(`No hay suficiente stock para "${itemToUpdate.selectedVariant ? `${part.name} (${itemToUpdate.selectedVariant.color})` : part?.name}". Límite: ${maxStock} unidades.`);
      return;
    }

    playSound('click');
    setCart(cart.map(i => i === itemToUpdate ? { ...i, cantidad: Number(newQty.toFixed(3)) } : i));
  };

  // Remover del carrito (soporta item específico con variante o producto completo)
  const removeFromCart = (target) => {
    if (!target) return;
    let newCart;
    if (target.part) {
      newCart = cart.filter(item => item !== target);
    } else {
      const targetKey = typeof target === 'string' ? target : getProdKey(target);
      newCart = cart.filter(item => getProdKey(item.part) !== targetKey);
    }
    setCart(newCart);
    playSound('delete');
    if (newCart.length === 0) {
      setShowScanModal(false);
    }
  };

  // Cálculos de totales ─ Separación de Subtotal Exento, Base Imponible y Total IVA
  const isCompanyTaxEnabled = companySettings?.tax_enabled !== false && Number(companySettings?.tax_rate ?? 0.16) > 0;
  const taxRate = isCompanyTaxEnabled
    ? ((companySettings?.tax_rate !== undefined && companySettings?.tax_rate !== null) ? Number(companySettings.tax_rate) : 0.16)
    : 0;
  
  let cartExemptTotal = 0;
  let cartTaxableTotalWithTax = 0;

  cart.forEach(item => {
    const isExempt = !isCompanyTaxEnabled || !!item.part?.is_exempt || !!item.part?.is_tax_exempt;
    const sub = (item.cantidad || 1) * (item.part?.sell_price || 0);
    if (isExempt) {
      cartExemptTotal += sub;
    } else {
      cartTaxableTotalWithTax += sub;
    }
  });

  const numericDiscount = Number(discount) || 0;
  const cartTaxableBase = (taxRate > 0 && cartTaxableTotalWithTax > 0) ? (cartTaxableTotalWithTax / (1 + taxRate)) : cartTaxableTotalWithTax;
  const cartNetAfterDisc = Math.max(0, (cartExemptTotal + cartTaxableBase) - numericDiscount);
  const taxAmount = (isCompanyTaxEnabled && applyTax) ? (cartTaxableTotalWithTax - cartTaxableBase) : 0;
  const cartSubtotal = cartExemptTotal + cartTaxableTotalWithTax;
  const cartTotal = Math.max(0, cartSubtotal - numericDiscount);

  // Conversiones de Pago Múltiple / Dividido
  const convertSplitRowToBase = (row) => {
    const amount = Number(row.amount) || 0;
    const rate = Number(companySettings.exchange_rate) || 1.0;
    const isUsdBase = companySettings.use_usd_pricing;
    const rowCurr = row.currency || 'USD';

    if (isUsdBase) {
      if (rowCurr === 'USD') return amount;
      if (rowCurr === 'VES' || rowCurr === 'CLP' || rowCurr === 'COP') return rate > 0 ? amount / rate : amount;
      if (rowCurr === 'EUR') return amount * 1.08;
      return amount;
    } else {
      if (rowCurr === 'USD') return amount * rate;
      if (rowCurr === companySettings.currency_code) return amount;
      if (rowCurr === 'EUR') return amount * rate * 1.08;
      return amount;
    }
  };

  const totalSplitPaidInBase = useMemo(() => {
    return splitPayments.reduce((sum, row) => sum + convertSplitRowToBase(row), 0);
  }, [splitPayments, companySettings, cartTotal]);

  const splitRemainingInBase = useMemo(() => {
    return Math.max(0, cartTotal - totalSplitPaidInBase);
  }, [cartTotal, totalSplitPaidInBase]);

  const splitChangeInBase = useMemo(() => {
    return Math.max(0, totalSplitPaidInBase - cartTotal);
  }, [cartTotal, totalSplitPaidInBase]);

  const autoFillSplitRemaining = (rowId) => {
    if (splitRemainingInBase <= 0) return;
    const targetRow = splitPayments.find(r => r.id === rowId);
    if (!targetRow) return;

    const rate = Number(companySettings.exchange_rate) || 1.0;
    const isUsdBase = companySettings.use_usd_pricing;
    const rowCurr = targetRow.currency || 'USD';
    let neededAmount = 0;

    if (isUsdBase) {
      if (rowCurr === 'USD') neededAmount = splitRemainingInBase;
      else if (rowCurr === 'VES' || rowCurr === 'CLP' || rowCurr === 'COP') neededAmount = Math.round(splitRemainingInBase * rate * 100) / 100;
      else if (rowCurr === 'EUR') neededAmount = Math.round((splitRemainingInBase / 1.08) * 100) / 100;
      else neededAmount = splitRemainingInBase;
    } else {
      if (rowCurr === 'USD') neededAmount = rate > 0 ? Math.round((splitRemainingInBase / rate) * 100) / 100 : splitRemainingInBase;
      else if (rowCurr === companySettings.currency_code) neededAmount = Math.round(splitRemainingInBase * 100) / 100;
      else neededAmount = splitRemainingInBase;
    }

    updateSplitPaymentRow(rowId, 'amount', String(neededAmount));
  };

  // 🧮 Cálculo Inteligente de Vuelto Multidivisa (USD / Bolívares / Mixto)
  const targetChangeCalcResult = useMemo(() => {
    const rate = Number(companySettings.exchange_rate) || 1.0;
    const isUsdBase = companySettings.use_usd_pricing;
    
    // Total a cobrar en USD y Bs
    const cartTotalUSD = isUsdBase ? cartTotal : (rate > 0 ? cartTotal / rate : cartTotal);
    const cartTotalVES = cartTotalUSD * rate;

    const paidUSD = Math.max(0, Number(targetPaidBillUSD) || 0);
    const paidVES = Math.max(0, Number(targetPaidBillVES) || 0);
    const paidVESToUSD = rate > 0 ? paidVES / rate : 0;
    const totalPaidUSD = paidUSD + paidVESToUSD;

    const diffUSD = totalPaidUSD - cartTotalUSD;
    const isOverpaid = diffUSD > 0.001;
    const isUnderpaid = diffUSD < -0.001;

    // Vuelto total a entregar en USD y Bs
    const totalChangeUSD = isOverpaid ? diffUSD : 0;
    const totalChangeVES = totalChangeUSD * rate;

    // Restante por pagar en USD y Bs
    const remainingUSDToPay = isUnderpaid ? Math.abs(diffUSD) : 0;
    const remainingVESToPay = remainingUSDToPay * rate;

    // Vuelto Mixto: parte en USD billetes + parte en Bs
    const wantedUSDChange = Math.max(0, Number(targetChangeInput) || 0);
    const usdChangeDelivered = Math.min(totalChangeUSD, wantedUSDChange);
    const remainingChangeUSDForVES = Math.max(0, totalChangeUSD - usdChangeDelivered);
    const vesChangeDelivered = remainingChangeUSDForVES * rate;

    return {
      cartTotalUSD,
      cartTotalVES,
      paidUSD,
      paidVES,
      totalPaidUSD,
      diffUSD,
      isOverpaid,
      totalChangeUSD,
      totalChangeVES,
      isUnderpaid,
      remainingUSDToPay,
      remainingVESToPay,
      wantedUSDChange,
      usdChangeDelivered,
      vesChangeDelivered,
      rate
    };
  }, [cartTotal, targetPaidBillUSD, targetPaidBillVES, targetChangeInput, companySettings]);

  const applyTargetChangeCalculation = (changeType = 'auto') => {
    const { 
      paidUSD, 
      paidVES, 
      isOverpaid, 
      isUnderpaid, 
      remainingVESToPay
    } = targetChangeCalcResult;

    const rows = [];
    const vesCode = companySettings.currency_code || 'VES';

    if (isUnderpaid) {
      if (paidUSD > 0) {
        rows.push({ id: `split-usd-${Date.now()}`, method: 'Efectivo', currency: 'USD', amount: String(paidUSD) });
      }
      if (paidVES > 0) {
        rows.push({ id: `split-ves-in-${Date.now()}`, method: 'Efectivo', currency: vesCode, amount: String(paidVES) });
      }
      if (remainingVESToPay > 0) {
        rows.push({ id: `split-ves-rem-${Date.now()}`, method: 'Pago Móvil', currency: vesCode, amount: remainingVESToPay.toFixed(2) });
      }
    } else if (isOverpaid) {
      if (paidUSD > 0) {
        rows.push({ id: `split-usd-${Date.now()}`, method: 'Efectivo', currency: 'USD', amount: String(paidUSD) });
      }
      if (paidVES > 0) {
        rows.push({ id: `split-ves-${Date.now()}`, method: 'Efectivo', currency: vesCode, amount: String(paidVES) });
      }
    } else {
      if (paidUSD > 0) rows.push({ id: `split-usd-${Date.now()}`, method: 'Efectivo', currency: 'USD', amount: String(paidUSD) });
      if (paidVES > 0) rows.push({ id: `split-ves-${Date.now()}`, method: 'Efectivo', currency: vesCode, amount: String(paidVES) });
    }

    if (rows.length > 0) {
      setSplitPayments(rows);
      setPaymentMethod('Múltiple');
    }
  };

    // Manejar el lector de código de barras (Enter al final de la lectura USB)
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchQuery.trim();
      if (!query) return;

      // Buscar coincidencia exacta por SKU/Código
      const exactMatch = inventory.find(
        p => p.sku && p.sku.toLowerCase() === query.toLowerCase()
      );

      if (exactMatch) {
        addToCart(exactMatch);
        setSearchQuery('');
        
        // Calcular el nuevo total incluyendo el artículo agregado
        const isService = exactMatch.sku?.startsWith('SERV-') || exactMatch.stock === 999;
        const currentQtyInCart = cart.find(item => item.part.id === exactMatch.id)?.cantidad || 0;
        
        if (isService || currentQtyInCart < exactMatch.stock) {
          const newTotal = cartTotal + exactMatch.sell_price;
          speakTotal(newTotal);
        }
      } else if (filteredProducts.length === 1) {
        // Fallback: si hay un solo resultado, agregarlo
        const matchedProd = filteredProducts[0];
        addToCart(matchedProd);
        setSearchQuery('');
        
        const isService = matchedProd.sku?.startsWith('SERV-') || matchedProd.stock === 999;
        const currentQtyInCart = cart.find(item => item.part.id === matchedProd.id)?.cantidad || 0;
        
        if (isService || currentQtyInCart < matchedProd.stock) {
          const newTotal = cartTotal + matchedProd.sell_price;
          speakTotal(newTotal);
        }
      } else {
        playSound('error');
        alert(`No se encontró coincidencia para: "${query}"`);
        setSearchQuery('');
      }
    }
  };

  // Calcular Vueltas / Cambio en Efectivo segun la moneda seleccionada
  const calculateCashChange = (total, currency, received, settings) => {
    const numReceived = Number(received);
    if (!numReceived || numReceived <= 0) return 'Esperando monto...';

    const baseRate = Number(settings?.exchange_rate) || 1.0;
    const isUsdStore = settings?.use_usd_pricing;
    const localSymbol = settings?.currency_symbol || 'Bs.';

    let totalInSelectedCurrency = total;
    if (isUsdStore) {
      if (currency === 'VES' || currency === settings?.currency_code) {
        totalInSelectedCurrency = total * baseRate;
      } else if (currency === 'EUR') {
        totalInSelectedCurrency = total * 0.92;
      } else {
        totalInSelectedCurrency = total; // USD
      }
    } else {
      if (currency === 'USD') {
        totalInSelectedCurrency = baseRate > 1 ? (total / baseRate) : (total / 950);
      } else {
        totalInSelectedCurrency = total;
      }
    }

    const change = numReceived - totalInSelectedCurrency;
    if (change < 0) {
      const missingStr = Math.abs(change).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `Falta: ${missingStr} ${currency}`;
    }

    if (currency === 'USD' || currency === 'EUR') {
      return `Cambio: $${change.toFixed(2)} ${currency}`;
    } else if (currency === 'VES') {
      const formattedBs = change.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      return `Cambio: ${Math.round(change).toLocaleString()} ${currency}`;
    }
  };

  // Calcular Vueltas Mixtas / Desglose de Cambio (Ejemplo: Cambio $5.95, le dio billete de $5, te calcula el restante $0.95 en Bs o USD)
  const calculateDetailedChange = (total, selectedCashCurrency, received, givenBill, givenCurr, settings) => {
    const numReceived = Number(received);
    if (!numReceived || numReceived <= 0) {
      return { totalChangeUSD: 0, hasChange: false, statusText: 'Esperando monto...' };
    }

    const rate = Number(settings?.exchange_rate) || 1.0;
    const isUsdStore = settings?.use_usd_pricing;
    const localSymbol = settings?.currency_symbol || 'Bs.';
    const localCode = settings?.currency_code || 'VES';

    let totalInUSD = total;
    if (!isUsdStore) {
      totalInUSD = rate > 1 ? (total / rate) : total;
    }

    let receivedInUSD = 0;
    if (selectedCashCurrency === 'USD') {
      receivedInUSD = numReceived;
    } else if (selectedCashCurrency === 'VES' || selectedCashCurrency === localCode) {
      receivedInUSD = rate > 0 ? (numReceived / rate) : numReceived;
    } else if (selectedCashCurrency === 'EUR') {
      receivedInUSD = numReceived / 0.92;
    } else if (selectedCashCurrency === 'CLP') {
      receivedInUSD = numReceived / 950;
    } else {
      receivedInUSD = numReceived;
    }

    const changeTotalUSD = receivedInUSD - totalInUSD;

    if (changeTotalUSD < -0.009) {
      const missingUSD = Math.abs(changeTotalUSD);
      const missingLocal = missingUSD * rate;
      return {
        hasChange: false,
        isMissing: true,
        statusText: `Falta: $${missingUSD.toFixed(2)} USD (${localSymbol} ${missingLocal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
      };
    }

    if (changeTotalUSD <= 0.009) {
      return {
        hasChange: false,
        statusText: '✅ Pago Exacto (Sin vueltas)'
      };
    }

    const changeTotalLocal = changeTotalUSD * rate;

    const numGivenBill = Number(givenBill) || 0;
    let givenInUSD = 0;
    if (givenCurr === 'USD') {
      givenInUSD = numGivenBill;
    } else if (givenCurr === 'VES' || givenCurr === localCode) {
      givenInUSD = rate > 0 ? (numGivenBill / rate) : numGivenBill;
    } else if (givenCurr === 'EUR') {
      givenInUSD = numGivenBill / 0.92;
    } else {
      givenInUSD = numGivenBill;
    }

    const remainingChangeUSD = Math.max(0, changeTotalUSD - givenInUSD);
    const remainingChangeLocal = remainingChangeUSD * rate;
    const remainingChangeEUR = remainingChangeUSD * 0.92;

    return {
      hasChange: true,
      changeTotalUSD,
      changeTotalLocal,
      numGivenBill,
      givenInUSD,
      remainingChangeUSD,
      remainingChangeLocal,
      remainingChangeEUR,
      localSymbol,
      localCode,
      rate
    };
  };

  // Procesar venta
  const handlePayment = async () => {
    if (processing) return;
    if (cart.length === 0) {
      alert('El carrito está vacío.');
      return;
    }

    let finalPaymentMethodStr = paymentMethod;
    let cashDetails = null;
    const cleanRefNum = referenceNumber.trim();

    if (paymentMethod === 'Efectivo') {
      cashDetails = {
        currency: cashCurrency,
        received: Number(cashReceived) || 0,
        rate: companySettings.exchange_rate || 1.0,
        reference_number: cleanRefNum || null
      };
    } else if (paymentMethod === 'Múltiple') {
      if (splitRemainingInBase > 0.01) {
        const remainingFormatted = formatCurrency(splitRemainingInBase);
        alert(`⚠️ Pago Incompleto: Aún falta cubrir ${remainingFormatted} para completar la venta.`);
        return;
      }

      const validRows = splitPayments.filter(r => Number(r.amount) > 0);
      if (validRows.length === 0) {
        alert('⚠️ Por favor ingresa al menos un monto en los métodos de pago múltiple.');
        return;
      }

      const summaryParts = validRows.map(r => `${r.method} ${r.currency} (${r.amount})${r.ref_number ? ` [Ref: ${r.ref_number}]` : ''}`);
      finalPaymentMethodStr = `Múltiple: ${summaryParts.join(' + ')}`;
      
      const subRefs = validRows.map(r => r.ref_number).filter(Boolean);
      const combinedRef = cleanRefNum || (subRefs.length > 0 ? subRefs.join(' / ') : null);

      cashDetails = {
        is_split: true,
        split_payments: validRows,
        total_paid_base: totalSplitPaidInBase,
        remaining_base: splitRemainingInBase,
        change_base: splitChangeInBase,
        rate: companySettings.exchange_rate || 1.0,
        reference_number: combinedRef
      };
    } else {
      cashDetails = {
        reference_number: cleanRefNum || null
      };
    }

    // Validar si la venta requiere cambio/vuelto al cliente
    const activeChangeCalc = calculateDetailedChange(cartTotal, cashCurrency, cashReceived, givenChangeBill, givenChangeCurrency, companySettings);
    const hasChangeToReturn = (paymentMethod === 'Múltiple' ? splitChangeInBase > 0.01 : activeChangeCalc.hasChange);

    if (hasChangeToReturn) {
      const rateVal = Number(companySettings.exchange_rate) || 1.0;
      const totalChangeRequiredUSD = paymentMethod === 'Múltiple'
        ? (companySettings.use_usd_pricing ? splitChangeInBase : (rateVal > 0 ? splitChangeInBase / rateVal : splitChangeInBase))
        : activeChangeCalc.changeTotalUSD;
      const totalChangeRequiredVES = paymentMethod === 'Múltiple'
        ? (companySettings.use_usd_pricing ? splitChangeInBase * rateVal : splitChangeInBase)
        : activeChangeCalc.changeTotalLocal;

      const convertChangeRowToUSDLocal = (r) => {
        const amt = Number(r.amount) || 0;
        if (r.currency === 'USD') return amt;
        if (r.currency === 'VES' || r.currency === companySettings.currency_code) {
          return rateVal > 0 ? amt / rateVal : amt;
        }
        if (r.currency === 'EUR') return amt / 0.92;
        return amt;
      };

      const assignedChangeUSD = changePayoutMode === 'single'
        ? (changePayoutMethod ? totalChangeRequiredUSD : 0)
        : splitChangeRows.reduce((sum, r) => sum + convertChangeRowToUSDLocal(r), 0);

      const remainingChangeToAssignUSD = Math.max(0, totalChangeRequiredUSD - assignedChangeUSD);
      const isChangeFullyCovered = Math.abs(totalChangeRequiredUSD - assignedChangeUSD) < 0.01;

      if (changePayoutMode === 'single') {
        if (!changePayoutMethod) {
          alert('⚠️ ¡FORMA DE VUELTO REQUERIDA PARA CUADRE DE CAJA!\n\nExiste un vuelto a entregar al cliente. Por favor selecciona cómo estás entregando el vuelto (Dólares en efectivo, Bolívares / Pago Móvil, Binance USDT, Zelle, etc.) antes de registrar la venta.');
          return;
        }
      } else {
        if (!isChangeFullyCovered) {
          const remUSDStr = remainingChangeToAssignUSD.toFixed(2);
          const remVESStr = (remainingChangeToAssignUSD * rateVal).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          alert(`⚠️ ¡VUELTO INCOMPLETO PARA CUADRE DE CAJA!\n\nEl vuelto total a entregar es de $${totalChangeRequiredUSD.toFixed(2)} USD (Bs. ${totalChangeRequiredVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}).\n\nAún falta por especificar $${remUSDStr} USD (${companySettings.currency_symbol || 'Bs.'} ${remVESStr}) en el desglose de vuelto para completar el 100%.`);
          return;
        }
      }

      if (!cashDetails) cashDetails = {};

      const formattedRows = changePayoutMode === 'multiple'
        ? splitChangeRows.filter(r => Number(r.amount) > 0).map(r => ({
            method: r.method,
            method_label: getChangePayoutLabel(r.method),
            currency: r.currency,
            amount_original: Number(r.amount) || 0,
            amount_usd: convertChangeRowToUSDLocal(r),
            amount_local: convertChangeRowToUSDLocal(r) * rateVal,
            reference: (r.ref_number || '').trim() || null
          }))
        : [{
            method: changePayoutMethod,
            method_label: getChangePayoutLabel(changePayoutMethod),
            currency: 'USD',
            amount_original: totalChangeRequiredUSD,
            amount_usd: totalChangeRequiredUSD,
            amount_local: totalChangeRequiredVES,
            reference: (changePayoutRef || '').trim() || null
          }];

      cashDetails.change_payout_details = {
        mode: changePayoutMode,
        is_multiple: changePayoutMode === 'multiple',
        method: changePayoutMode === 'single' ? changePayoutMethod : 'MIXTO_MULTIPLE',
        method_label: changePayoutMode === 'single' ? getChangePayoutLabel(changePayoutMethod) : 'Vuelto Múltiple Combinado',
        amount_usd: totalChangeRequiredUSD,
        amount_local: totalChangeRequiredVES,
        payout_rows: formattedRows
      };
    }

    // Datos del cliente totalmente OPCIONALES
    const finalCustomerRut = customerRut.trim() || (activeCountryConfig.code === 'VE' ? 'V-00000000-0' : 'S/R');
    const finalCustomerName = customerName.trim() || 'Venta Mostrador / Consumidor Final';

    const customerDetails = {
      customer_rut: finalCustomerRut,
      customer_name: finalCustomerName,
      customer_giro: customerGiro.trim(),
      customer_address: customerAddress.trim()
    };

    setProcessing(true);
    const res = await processSale(cart, finalPaymentMethodStr, documentType, numericDiscount, applyTax, cashDetails, customerDetails);
    setProcessing(false);

    if (res && res.error) {
      playSound('error');
      alert(`Error al procesar la venta: ${res.error}`);
    } else {
      playSound('payment');
      setLastSaleTotal(cartTotal);
      setSuccess(true);
      if (res && res.sale) {
        setCompletedSaleModal(res.sale);
      }

      // Si la venta proviene de una mesa/comandero:
      if (tableOrigin && tableOrigin.tableId) {
        if (tableOrigin.participantName) {
          removeTableItemsByParticipant(tableOrigin.tableId, tableOrigin.participantName);
        } else {
          clearTable(tableOrigin.tableId);
        }
        setTableOrigin(null);
      }

      setCart([]);
      setDiscount('');
      setCashReceived('');
      setGivenChangeBill('');
      setReferenceNumber('');
      setChangePayoutMode('single');
      setChangePayoutMethod('');
      setChangePayoutRef('');
      setSplitChangeRows([{ id: 1, method: 'USD_EFECTIVO', currency: 'USD', amount: '', ref_number: '' }]);
      setCustomerRut('');
      setCustomerName('');
      setCustomerGiro('');
      setCustomerAddress('');
      setShowScanModal(false);
      setLastScannedItem(null);
      setTimeout(() => setSuccess(false), 4000);
    }
  };

  const formatCLP = (num) => {
    return formatCurrency(num);
  };

  const activeChangeCalc = calculateDetailedChange(cartTotal, cashCurrency, cashReceived, givenChangeBill, givenChangeCurrency, companySettings);
  const hasChangeToReturn = (paymentMethod === 'Múltiple' ? splitChangeInBase > 0.01 : activeChangeCalc.hasChange);

  const rateVal = Number(companySettings.exchange_rate) || 1.0;
  const totalChangeRequiredUSD = paymentMethod === 'Múltiple'
    ? (companySettings.use_usd_pricing ? splitChangeInBase : (rateVal > 0 ? splitChangeInBase / rateVal : splitChangeInBase))
    : activeChangeCalc.changeTotalUSD;
  const totalChangeRequiredVES = paymentMethod === 'Múltiple'
    ? (companySettings.use_usd_pricing ? splitChangeInBase * rateVal : splitChangeInBase)
    : activeChangeCalc.changeTotalLocal;

  const convertChangeRowToUSD = (r) => {
    const amt = Number(r.amount) || 0;
    if (r.currency === 'USD') return amt;
    if (r.currency === 'VES' || r.currency === companySettings.currency_code) {
      return rateVal > 0 ? amt / rateVal : amt;
    }
    if (r.currency === 'EUR') return amt / 0.92;
    return amt;
  };

  const assignedChangeUSD = changePayoutMode === 'single'
    ? (changePayoutMethod ? totalChangeRequiredUSD : 0)
    : splitChangeRows.reduce((sum, r) => sum + convertChangeRowToUSD(r), 0);

  const remainingChangeToAssignUSD = Math.max(0, totalChangeRequiredUSD - assignedChangeUSD);
  const remainingChangeToAssignVES = remainingChangeToAssignUSD * rateVal;
  const isChangeFullyCovered = Math.abs(totalChangeRequiredUSD - assignedChangeUSD) < 0.01;

  return (
    <div className="pos-layout" style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* ── TOAST FLOTANTE: confirmación de ítem agregado (sin bloquear clics) ── */}
      {cartToast && (
        <div style={{
          position: 'fixed', bottom: cart.length > 0 ? '80px' : '28px', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          border: '1px solid rgba(6,182,212,0.5)',
          borderRadius: '14px', padding: '10px 20px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 9999, animation: 'fadeIn 0.2s ease',
          maxWidth: '340px',
          pointerEvents: 'none',
          transition: 'all 0.2s ease'
        }}>
          <CheckCircle size={18} style={{ color: '#10b981', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
              {cartToast.name}
            </div>
            <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '1px' }}>Agregado a la venta</div>
          </div>
        </div>
      )}

      {/* ── BARRA FLOTANTE MÓVIL PUNTUAL AL LLEVAR PRODUCTOS ── */}
      {cart.length > 0 && !showScanModal && (
        <div 
          className="mobile-pos-floating-bar"
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 24px)',
            maxWidth: '500px',
            background: '#090f1e',
            border: '2px solid var(--color-cyan)',
            borderRadius: '16px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(6, 182, 212, 0.3)',
            zIndex: 9998,
            animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-cyan)'
            }}>
              <ShoppingCart size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                {cart.reduce((sum, item) => sum + item.cantidad, 0)} {cart.reduce((sum, item) => sum + item.cantidad, 0) === 1 ? 'unidad' : 'unidades'}
              </div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                Total: <strong style={{ color: '#10b981' }}>{formatCurrency(cartTotal)}</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowScanModal(true)}
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '9px 16px',
              fontSize: '12.5px',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(6, 182, 212, 0.35)',
              whiteSpace: 'nowrap'
            }}
          >
            <span>COBRAR →</span>
          </button>
        </div>
      )}

      {/* ── BARRERA FLOTANTE DE BLOQUEO DE PANTALLA SI LA CAJA ESTÁ CERRADA ── */}
      {(!activeShift || activeShift.status !== 'open') && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '460px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
            border: '2px solid #cbd5e1',
            animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '20px',
              background: '#fef3c7', border: '2px solid #f59e0b',
              color: '#d97706', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px auto'
            }}>
              <AlertTriangle size={32} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0' }}>
              🔒 Debe Abrir Caja para Comenzar a Facturar
            </h2>

            <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Para iniciar las ventas de este turno en <strong>{activeBranch?.name || 'Matriz'}</strong>, debes declarar el sencillo / fondo inicial de cambio de la gaveta.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowOpenShiftModal(true)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px 20px',
                  borderRadius: '14px',
                  fontSize: '15px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Sparkles size={18} />
                <span>Declarar Fondo Inicial y Abrir Caja</span>
              </button>

              {setActiveTab && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    style={{
                      background: 'rgba(6, 182, 212, 0.1)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      color: '#0284c7',
                      padding: '10px',
                      borderRadius: '12px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Package size={15} />
                    <span>📦 Ir a Inventario</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      padding: '10px',
                      borderRadius: '12px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <X size={15} />
                    <span>Salir al Menú</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Catálogo de Productos de Fondo (Izquierda) */}
      <div className="pos-catalog" style={{ gridColumn: 'span 2' }}>
        
        {/* BARRA DE ESTADO Y CONTROL DE TURNO DE CAJA */}
        <div style={{
          background: activeShift ? 'linear-gradient(135deg, #0f172a, #1e293b)' : 'linear-gradient(135deg, #451a03, #78350f)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '14px',
          boxShadow: '0 4px 14px rgba(15,23,42,0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: activeShift ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              border: `1px solid ${activeShift ? '#10b981' : '#ef4444'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: activeShift ? '#10b981' : '#f87171'
            }}>
              {activeShift ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{activeShift ? '🟢 TURNO DE CAJA ABIERTO' : '🔴 CAJA CERRADA / SIN TURNO ACTIVO'}</span>
                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '99px', fontWeight: 700 }}>
                  Sede: {activeBranch?.name || 'Matriz'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                {activeShift 
                  ? `Atendido por: ${activeShift.user_name} | Fondo Inicial: $${activeShift.initial_cash_usd.toFixed(2)} USD / Bs. ${activeShift.initial_cash_ves.toLocaleString('es-VE', {minimumFractionDigits: 2})}`
                  : 'Debe abrir caja declarando el fondo inicial para comenzar a facturar.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeShift ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowShiftMovModal(true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    padding: '7px 12px',
                    borderRadius: '10px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <DollarSign size={14} style={{ color: '#38bdf8' }} />
                  <span>💸 Caja Chica / Movimientos</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCloseCashUSD('');
                    setCloseCashVES('');
                    setCloseCardVES('');
                    setClosePagoMovilVES('');
                    setCloseZelleUSD('');
                    setCloseBinanceUSDT('');
                    setCloseNotes('');
                    setShowBlindCloseModal(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: '10px',
                    fontSize: '11.5px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <XCircle size={14} />
                  <span>🔒 Cerrar Turno (Cierre Ciego)</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowOpenShiftModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                }}
              >
                <Sparkles size={15} />
                <span>🚀 Abrir Turno de Caja</span>
              </button>
            )}
            {setActiveTab && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '8px', marginLeft: '4px' }}>
                {companySettings?.business_type === 'belleza' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('beauty')}
                    style={{
                      background: 'rgba(236, 72, 153, 0.15)',
                      border: '1px solid rgba(236, 72, 153, 0.4)',
                      color: '#f472b6',
                      padding: '7px 12px',
                      borderRadius: '10px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    title="Membresías & IA de Recompra Barbería / Estética"
                  >
                    <Scissors size={14} />
                    <span>✂️ Membresías & IA</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#38bdf8',
                    padding: '7px 12px',
                    borderRadius: '10px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  title="Ir al Inventario"
                >
                  <Package size={14} />
                  <span>📦 Inventario</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: '10px',
                    fontSize: '11.5px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
                    transition: 'all 0.2s ease'
                  }}
                  title="Cerrar POS y volver al Menú Principal"
                >
                  <X size={16} />
                  <span>Salir del POS</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="pos-search-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search className="pos-search-icon" size={16} style={{ pointerEvents: 'none', position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              ref={inputRef}
              type="text"
              className="form-input pos-search-input"
              style={{ width: '100%', padding: '10px 14px 10px 42px', fontSize: '13px', borderRadius: '12px' }}
              placeholder="Escanea el código de barras del producto o busca repuesto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyPress}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Selector de Densidad de Botones */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', gap: '2px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => setViewDensity('compact')}
              className={`pos-density-btn ${viewDensity === 'compact' ? 'active' : ''}`}
              title="Vista Grid Compacta"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewDensity('ultra')}
              className={`pos-density-btn ${viewDensity === 'ultra' ? 'active' : ''}`}
              title="Vista Ultra-Densidad (Botones pequeños)"
            >
              <Grid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewDensity('list')}
              className={`pos-density-btn ${viewDensity === 'list' ? 'active' : ''}`}
              title="Vista Lista Fila"
            >
              <List size={15} />
            </button>
          </div>

          {/* Botón de Sonido del Escáner */}
          <button
            type="button"
            onClick={() => {
              const next = !soundActive;
              setSoundActive(next);
              setSoundEnabled(next);
              if (next) playSound('scan');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: `1px solid ${soundActive ? 'rgba(6, 182, 212, 0.4)' : '#e2e8f0'}`,
              background: soundActive ? 'rgba(6, 182, 212, 0.1)' : '#f8fafc',
              color: soundActive ? '#0891b2' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
            title={soundActive ? "🔊 Sonido de Escáner Activado (Click para silenciar)" : "🔇 Sonido Silenciado (Click para activar)"}
          >
            {soundActive ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Indicador de Conectividad y Sincronización Offline */}
          {(!isOnline || pendingOfflineCount > 0) && (
            <button
              type="button"
              onClick={syncPendingSales}
              disabled={!isOnline || pendingOfflineCount === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: isOnline && pendingOfflineCount > 0 ? 'pointer' : 'default',
                background: !isOnline ? '#fee2e2' : '#fef3c7',
                color: !isOnline ? '#ef4444' : '#d97706',
                border: `1px solid ${!isOnline ? '#fca5a5' : '#fde68a'}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              title={!isOnline ? "Sin conexión a internet. Las ventas se guardan en IndexedDB local." : "Ventas guardadas sin conexión. Click para sincronizar con la nube."}
            >
              {!isOnline ? <WifiOff size={14} /> : <Wifi size={14} />}
              <span>{!isOnline ? 'Offline' : `Sincronizar (${pendingOfflineCount})`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowLoadCartModal(true)}
            className="btn-secondary"
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              color: 'var(--color-cyan)',
              fontSize: '12px',
              fontWeight: 700
            }}
            title="Cargar Canasta del Cliente"
          >
            <ShoppingCart size={14} />
            Cargar Canasta
          </button>
        </div>

        {/* Barra de Categorías */}
        {availableCategories.length > 1 && (
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px' }}>
            {availableCategories.map(cat => (
              <button
                key={`cat-${cat}`}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  border: selectedCategory === cat ? '1px solid var(--color-cyan)' : '1px solid #e2e8f0',
                  background: selectedCategory === cat ? 'rgba(6, 182, 212, 0.12)' : '#ffffff',
                  color: selectedCategory === cat ? 'var(--color-cyan)' : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 10px 0' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Haz clic para agregar. Cuando termines, pulsa <strong style={{color:'var(--color-cyan)'}}>Ver Canasta</strong>.</span>
            <span style={{ fontWeight: 700, color: 'var(--color-cyan)' }}>({filteredProducts.length} productos)</span>
          </span>
          {cart.length > 0 && (
            <button className="btn-primary" onClick={() => setShowScanModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', fontSize: '13px', borderRadius: '12px', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: '0 4px 14px rgba(6,182,212,0.35)', fontWeight: 800 }}>
              <ShoppingCart size={16} />
              <span>Ver Canasta</span>
              <span style={{ background: 'rgba(255,255,255,0.22)', borderRadius: '8px', padding: '2px 8px', fontSize: '12px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{cart.reduce((sum, item) => sum + item.cantidad, 0)} uds</span>
                <span>•</span>
                <span>{formatCurrency(cartTotal)}</span>
              </span>
            </button>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            No se encontraron productos en el inventario que coincidan con la búsqueda.
          </div>
        ) : (
          <div className={`pos-products-grid ${viewDensity}`}>
            {filteredProducts.map((product, idx) => {
              const isService = product.sku?.startsWith('SERV-') || product.stock === 999;
              const prodMinStock = (product.min_stock !== undefined && product.min_stock !== null && !isNaN(Number(product.min_stock)))
                ? Number(product.min_stock)
                : (Number(companySettings?.default_min_stock) || 5);
              const isLowStock = !isService && product.stock <= prodMinStock;
              const isOutOfStock = !isService && product.stock <= 0;
              const isJustAdded = addedProdId === product.id;
              const imageUrl = getProductImage(product, companySettings?.business_type === 'gastronomia');
              const cardKey = product.id ? `pos-card-${product.id}-${idx}` : `pos-card-sku-${product.sku || idx}-${idx}`;

              const matchingCartItems = cart.filter(c => getProdKey(c.part) === getProdKey(product));
              const cartQty = matchingCartItems.reduce((sum, c) => sum + (Number(c.cantidad) || 0), 0);
              const cartSubtotal = cartQty * (Number(product.sell_price) || 0);
              const prodVariants = getProductVariants(product);
              const hasVariants = prodVariants.length > 0;

              if (viewDensity === 'list') {
                return (
                  <div
                    key={cardKey}
                    className={`pos-product-list-item ${isOutOfStock ? 'is-out' : ''} ${isJustAdded ? 'just-added' : ''}`}
                    onClick={() => addToCart(product)}
                    style={{ opacity: isOutOfStock ? 0.6 : 1, border: cartQty > 0 ? '1px solid var(--color-cyan)' : undefined, background: cartQty > 0 ? 'rgba(6, 182, 212, 0.03)' : undefined }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <img src={imageUrl} alt={product.name} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
                      <span className="pos-sku-badge">{product.sku || 'S/N'}</span>
                      <span className="pos-product-name" style={{ minHeight: 'unset', marginBottom: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{product.name}</span>
                        {hasVariants && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap' }}>
                            <span style={{ fontSize: '9.5px', fontWeight: 800, background: '#ede9fe', color: '#6d28d9', padding: '1px 6px', borderRadius: '4px', border: '1px solid #ddd6fe', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Palette size={10} />
                              {prodVariants.length} colores:
                            </span>
                            {prodVariants.map((v, vIdx) => (
                              <span
                                key={v.id || vIdx}
                                title={`${v.color} (${v.stock} uds)`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: '#334155'
                                }}
                              >
                                <span
                                  style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    backgroundColor: v.hex || '#6366f1',
                                    border: '1.5px solid #ffffff',
                                    boxShadow: '0 0 0 1px #94a3b8',
                                    display: 'inline-block',
                                    flexShrink: 0
                                  }}
                                />
                                <span>{v.color}</span>
                              </span>
                            ))}
                          </span>
                        )}
                        {(product.is_exempt || product.is_tax_exempt) && (
                          <span style={{ fontSize: '9px', fontWeight: 900, background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                            (E)
                          </span>
                        )}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: '12px' }}>
                      {cartQty > 0 && (
                        <span style={{ 
                          background: '#0f172a', 
                          color: '#38bdf8', 
                          border: '1px solid #06b6d4', 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          fontSize: '11px', 
                          fontWeight: 900, 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          whiteSpace: 'nowrap'
                        }}>
                          <span>🛒 {cartQty} uds</span>
                          <span>•</span>
                          <span style={{ color: '#10b981' }}>{formatCurrency(cartSubtotal)}</span>
                        </span>
                      )}
                      <span className={`pos-stock-pill ${isOutOfStock ? 'out' : isLowStock ? 'low' : 'ok'}`}>
                        {isService ? 'Servicio' : `Stock: ${product.stock}`}
                      </span>
                      <div style={{ minWidth: '90px', textAlign: 'right' }}>
                        <DualCurrencyDisplay amount={product.sell_price} fontSize="13px" primaryColor={companySettings.price_color || companySettings.accent_color || 'var(--color-cyan)'} align="right" showSwap={false} />
                      </div>
                      {cartQty > 0 ? (
                        <div 
                          onClick={(e) => e.stopPropagation()} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '3px', 
                            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', 
                            borderRadius: '6px', 
                            padding: '2px 4px' 
                          }}
                        >
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); updateQty(product, -1); }}
                            style={{ background: 'rgba(0, 0, 0, 0.25)', border: 'none', color: '#ffffff', width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Quitar 1 unidad"
                          >
                            <Minus size={12} />
                          </button>
                          <span style={{ fontSize: '11px', fontWeight: 900, color: '#ffffff', padding: '0 4px', whiteSpace: 'nowrap' }}>
                            {cartQty} uds
                          </span>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); updateQty(product, 1); }}
                            style={{ background: 'rgba(0, 0, 0, 0.25)', border: 'none', color: '#ffffff', width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Agregar 1 unidad"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                          style={{
                            padding: '5px 10px',
                            fontSize: '11px',
                            fontWeight: 800,
                            borderRadius: '6px',
                            background: companySettings.button_color 
                              ? `linear-gradient(135deg, ${companySettings.button_color} 0%, ${companySettings.button_color}ee 100%)` 
                              : 'linear-gradient(135deg, #06b6d4, #0284c7)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Plus size={12} />
                          <span>AGREGAR</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={cardKey} 
                  className={`glass-panel ${isOutOfStock ? 'is-out' : ''} ${isJustAdded ? 'just-added' : ''}`}
                  onClick={() => addToCart(product)}
                  style={{ 
                    background: '#ffffff',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex', 
                    flexDirection: 'column', 
                    justify: 'space-between',
                    border: cartQty > 0 ? '2px solid var(--color-cyan)' : (isJustAdded ? '2px solid var(--color-emerald)' : '1px solid #e2e8f0'),
                    boxShadow: cartQty > 0 ? '0 4px 16px rgba(6,182,212,0.18)' : '0 2px 10px rgba(15,23,42,0.04)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    opacity: isOutOfStock ? 0.6 : 1,
                    position: 'relative'
                  }}
                >
                  {/* Imagen Gastronómica / Producto */}
                  <div style={{ width: '100%', height: viewDensity === 'ultra' ? '100px' : '135px', overflow: 'hidden', position: 'relative', background: '#f1f5f9' }}>
                    <img 
                      src={imageUrl} 
                      alt={product.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    {product.category && (
                      <span style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        fontSize: '9.5px',
                        fontWeight: 800,
                        padding: '3px 7px',
                        borderRadius: '6px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#ffffff',
                        backdropFilter: 'blur(4px)'
                      }}>
                        {product.category}
                      </span>
                    )}

                    <span style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      padding: '3px 7px',
                      borderRadius: '6px',
                      background: isOutOfStock ? 'rgba(239, 68, 68, 0.85)' : isLowStock ? 'rgba(245, 158, 11, 0.85)' : 'rgba(15, 23, 42, 0.75)',
                      color: '#ffffff',
                      backdropFilter: 'blur(4px)'
                    }}>
                      {isService ? 'SERV' : `Stk: ${product.stock}`}
                    </span>

                    {/* Insignia al estilo Vitrina Cliente con Cantidad y Subtotal */}
                    {cartQty > 0 && (
                      <span 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          left: '8px',
                          fontSize: '10.5px',
                          fontWeight: 900,
                          padding: '4px 8px',
                          borderRadius: '8px',
                          background: '#0f172a',
                          color: '#38bdf8',
                          border: '1px solid #06b6d4',
                          boxShadow: '0 4px 12px rgba(15,23,42,0.3)',
                          backdropFilter: 'blur(4px)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <span>🛒 {cartQty} uds</span>
                        <span style={{ color: '#ffffff', opacity: 0.9 }}>•</span>
                        <span style={{ color: '#10b981' }}>{formatCurrency ? formatCurrency(cartSubtotal) : `$${cartSubtotal.toFixed(2)}`}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFromCart(product); }}
                          style={{
                            background: 'rgba(239, 68, 68, 0.25)',
                            border: 'none',
                            color: '#f87171',
                            borderRadius: '4px',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            marginLeft: '2px'
                          }}
                          title="Eliminar del carrito"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    )}
                  </div>

                  {/* Contenido de la Tarjeta */}
                  <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: '1.3' }}>
                        {product.name}
                      </h4>
                      {product.sku && (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                          Ref: {product.sku}
                        </span>
                      )}
                      {hasVariants && (
                        <div style={{ marginTop: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                            <span style={{
                              fontSize: '9.5px',
                              fontWeight: 800,
                              background: '#ede9fe',
                              color: '#6d28d9',
                              padding: '2px 7px',
                              borderRadius: '5px',
                              border: '1px solid #ddd6fe',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Palette size={11} />
                              {prodVariants.length} colores disp.
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            {prodVariants.map((v, vIdx) => {
                              const vStock = Number(v.stock || 0);
                              const isOut = vStock <= 0;
                              return (
                                <div
                                  key={v.id || vIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(product, null, v);
                                  }}
                                  title={`Color: ${v.color} (${vStock} unids) - Clic para agregar`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    background: isOut ? '#f8fafc' : '#ffffff',
                                    border: isOut ? '1px solid #e2e8f0' : '1.5px solid #cbd5e1',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                    cursor: isOut ? 'not-allowed' : 'pointer',
                                    opacity: isOut ? 0.55 : 1,
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <span
                                    style={{
                                      width: '12px',
                                      height: '12px',
                                      borderRadius: '50%',
                                      backgroundColor: v.hex || '#6366f1',
                                      border: '1.5px solid #ffffff',
                                      boxShadow: '0 0 0 1px #94a3b8',
                                      display: 'inline-block',
                                      flexShrink: 0
                                    }}
                                  />
                                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#1e293b' }}>
                                    {v.color}
                                  </span>
                                  <span style={{ fontSize: '9px', fontWeight: 800, color: isOut ? '#ef4444' : '#059669' }}>
                                    ({vStock})
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <DualCurrencyDisplay 
                        amount={product.sell_price} 
                        fontSize="14px" 
                        primaryColor={companySettings.price_color || companySettings.accent_color || 'var(--color-cyan)'} 
                        showSwap={false} 
                      />
                      
                      {cartQty > 0 ? (
                        <div 
                          onClick={(e) => e.stopPropagation()} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '3px', 
                            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', 
                            borderRadius: '8px', 
                            padding: '3px 4px', 
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)' 
                          }}
                        >
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); updateQty(product, -1); }}
                            style={{ 
                              background: 'rgba(0, 0, 0, 0.25)', 
                              border: 'none', 
                              color: '#ffffff', 
                              width: '26px', 
                              height: '26px', 
                              borderRadius: '6px', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                            title="Quitar 1 unidad"
                          >
                            <Minus size={14} />
                          </button>
                          <span style={{ fontSize: '12px', fontWeight: 900, color: '#ffffff', padding: '0 6px', whiteSpace: 'nowrap' }}>
                            {cartQty} {cartQty === 1 ? 'ud' : 'uds'}
                          </span>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); updateQty(product, 1); }}
                            style={{ 
                              background: 'rgba(0, 0, 0, 0.25)', 
                              border: 'none', 
                              color: '#ffffff', 
                              width: '26px', 
                              height: '26px', 
                              borderRadius: '6px', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                            title="Agregar 1 unidad"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: companySettings.button_color 
                              ? `linear-gradient(135deg, ${companySettings.button_color} 0%, ${companySettings.button_color}ee 100%)` 
                              : 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: `0 4px 12px ${companySettings.button_color || '#06b6d4'}35`,
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Plus size={13} />
                          <span>AGREGAR</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* NOTIFICACIÓN DE ÉXITO DE COBRO FUERA DEL MODAL */}
      {success && (
        <div className="glass-panel" style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '20px 24px',
          background: '#ffffff',
          borderLeft: '4px solid var(--color-emerald)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          zIndex: 999,
          animation: 'fadeIn 0.25s ease-out',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-emerald)' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <h4 style={{ fontWeight: 800, fontSize: '14px' }}>¡Cobro Registrado Exitosamente!</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Monto total: <strong>{formatCLP(lastSaleTotal)}</strong>. Registrado en Nexus Gestión.
            </p>
          </div>
          <button onClick={() => setSuccess(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '12px' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 💥 VENTANA / POPUP DEL PUNTO DE VENTA (ARTÍCULOS AÑADIDOS CON EL ESCÁNER) 💥 */}
      {/* ========================================================================= */}
      {showScanModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel cyan-glow" style={{ maxWidth: '620px', width: '95%', padding: '24px' }}>
            
            {/* Cabecera del Popup */}
            <div className="modal-header" style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Barcode size={22} style={{ color: 'var(--color-cyan)' }} />
                <div>
                  <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 900 }}>Artículos Escaneados</h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Escanea otro producto para agregarlo al instante a esta lista.
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowScanModal(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Input fantasma de captura de escaneo dentro de la modal (siempre enfocado) */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={14} />
              <input
                ref={modalInputRef}
                type="text"
                className="form-input"
                style={{ width: '100%', padding: '10px 12px 10px 36px', fontSize: '12px' }}
                placeholder="Escaneando... (Lector USB activo)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyPress}
              />
              {/* Efecto visual de línea láser sobre el campo */}
              <div style={{ position: 'relative', width: '100%', height: '4px', overflow: 'hidden', marginTop: '4px', borderRadius: '2px' }}>
                <div className="laser-line"></div>
              </div>
            </div>

            {/* Resultados de búsqueda rápidos dentro de la modal */}
            {searchQuery.trim().length > 0 && (
              <div style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                marginTop: '-12px',
                marginBottom: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 100,
                position: 'relative'
              }}>
                {modalFilteredProducts.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No se encontraron productos para "{searchQuery}"
                  </div>
                ) : (
                  modalFilteredProducts.map(p => {
                    const isService = p.sku?.startsWith('SERV-') || p.stock === 999;
                    const isOutOfStock = !isService && p.stock <= 0;
                    
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          addToCart(p);
                          setSearchQuery('');
                          const isServiceProd = p.sku?.startsWith('SERV-') || p.stock === 999;
                          const currentQty = cart.find(item => item.part.id === p.id)?.cantidad || 0;
                          if (isServiceProd || currentQty < p.stock) {
                            const newTotal = cartTotal + p.sell_price;
                            speakTotal(newTotal);
                          }
                        }}
                        style={{
                          padding: '10px 16px',
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          opacity: isOutOfStock ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '70%', textAlign: 'left' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{p.name}</span>
                            {(p.is_exempt || p.is_tax_exempt) && (
                              <span style={{ fontSize: '9.5px', fontWeight: 900, background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: '4px', border: '1px solid #bae6fd' }}>
                                (E)
                              </span>
                            )}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            SKU: {p.sku || 'S/N'} • Stock: {isService ? 'Servicio' : p.stock}
                          </span>
                        </div>
                        <DualCurrencyDisplay amount={p.sell_price} fontSize="13px" primaryColor="var(--color-cyan)" align="right" showSwap={false} />
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Último Producto Escaneado */}
            {lastScannedItem && (
              <div style={{
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-emerald)', display: 'block', marginBottom: '2px' }}>
                    ¡Último Escaneado con Éxito!
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>{lastScannedItem.name}</span>
                </div>
                <DualCurrencyDisplay amount={lastScannedItem.sell_price} fontSize="14px" primaryColor="var(--color-emerald)" align="right" showSwap={false} />
              </div>
            )}

            {/* Lista Scrollable de Artículos en Carrito */}
            <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Lista de Compra ({cart.reduce((sum, item) => sum + item.cantidad, 0)} uds)
            </h4>
            <div style={{
              maxHeight: '180px',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '10px',
              background: '#f8fafc',
              marginBottom: '20px'
            }}>
              {cart.map((item, idx) => (
                <div key={getCartItemKey(item) ? `modal-cart-${getCartItemKey(item)}-${idx}` : `cart-row-${idx}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 4px',
                  borderBottom: '1px solid #edf2f7',
                  fontSize: '13px'
                }}>
                  <div style={{ width: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }} title={item.part?.name}>
                      <span>{item.part?.name}</span>
                      {item.selectedVariant?.color && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: '#4f46e5',
                          padding: '1px 7px',
                          borderRadius: '6px',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: item.selectedVariant.hex || '#6366f1',
                            display: 'inline-block',
                            border: '1px solid rgba(0,0,0,0.15)'
                          }} />
                          {item.selectedVariant.color}
                        </span>
                      )}
                      {(item.participantName || item.part?.participantName) && (
                        <span style={{ fontSize: '9.5px', fontWeight: 800, background: 'rgba(6, 182, 212, 0.15)', color: 'var(--color-cyan)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                          👤 {item.participantName || item.part?.participantName}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      SKU: {item.selectedVariant?.sku || item.part?.sku || 'S/N'}
                      {item.selectedVariant?.stock !== undefined && (
                        <span style={{ marginLeft: '6px', color: '#64748b' }}>
                          • Stock color: {item.selectedVariant.stock}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cantidades */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button className="pos-cart-item-btn" style={{ width: '22px', height: '22px' }} onClick={() => updateQty(item, -1)}>
                      <Minus size={8} />
                    </button>
                    <span style={{ fontWeight: 750, minWidth: '14px', textAlign: 'center' }}>{item.cantidad}</span>
                    <button className="pos-cart-item-btn" style={{ width: '22px', height: '22px' }} onClick={() => updateQty(item, 1)}>
                      <Plus size={8} />
                    </button>
                  </div>

                  <div style={{ minWidth: '75px', textAlign: 'right' }}>
                    <DualCurrencyDisplay amount={item.cantidad * item.part.sell_price} fontSize="13px" primaryColor="var(--color-cyan)" align="right" showSwap={false} />
                  </div>

                  <button className="pos-cart-item-remove" style={{ marginLeft: '10px' }} onClick={() => removeFromCart(item)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Ajustes de Pago Directamente en la Modal */}
            <div className="pos-checkout-document-grid">
              <div>
                <label className="form-label" style={{ marginBottom: '4px', display: 'block' }}>Comprobante ({activeCountryConfig.name} {activeCountryConfig.flag})</label>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${activeCountryConfig.docTypes?.length || 2}, 1fr)`, gap: '6px' }}>
                  {(activeCountryConfig.docTypes || []).map(doc => (
                    <button
                      key={doc.key}
                      type="button"
                      onClick={() => setDocumentType(doc.key)}
                      className={`btn-secondary ${documentType === doc.key ? 'active' : ''}`}
                      style={{ padding: '6px 4px', fontSize: '11px', justifyContent: 'center' }}
                    >
                      {doc.shortLabel || doc.key}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: '4px', display: 'block' }}>Método de Pago</label>
                <div className="pos-payment-methods-grid">
                  <button onClick={() => setPaymentMethod('Tarjeta')} className={`btn-secondary ${paymentMethod === 'Tarjeta' ? 'active' : ''}`} style={{ padding: '8px 4px', fontSize: '10.5px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <CreditCard size={14} />
                    Tarjeta
                  </button>
                  <button onClick={() => setPaymentMethod('Efectivo')} className={`btn-secondary ${paymentMethod === 'Efectivo' ? 'active' : ''}`} style={{ padding: '8px 4px', fontSize: '10.5px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Banknote size={14} />
                    Efectivo
                  </button>
                  <button onClick={() => setPaymentMethod('Transferencia')} className={`btn-secondary ${paymentMethod === 'Transferencia' ? 'active' : ''}`} style={{ padding: '8px 4px', fontSize: '10.5px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Landmark size={14} />
                    Transf.
                  </button>
                  <button onClick={() => setPaymentMethod('Múltiple')} className={`btn-secondary ${paymentMethod === 'Múltiple' ? 'active' : ''}`} style={{ padding: '8px 4px', fontSize: '10.5px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Layers size={14} />
                    Múltiple
                  </button>
                </div>
              </div>
            </div>

            {/* Campo N° de Referencia / Transacción en Modal */}
            <div style={{ marginTop: '10px', marginBottom: '14px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '8px 12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                <Receipt size={13} style={{ color: 'var(--color-cyan)' }} />
                <span>N° Transacción / Referencia (Pago Móvil, Zelle, Punto, Transf.)</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: 123456 (Ref. para conciliación bancaria)"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', fontSize: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            {/* FORMULARIO DE DATOS DE FACTURACIÓN (REQUERIDO PARA DOCUMENTOS FISCALES) */}
            {(() => {
              const currentDocObj = activeCountryConfig.docTypes?.find(d => d.key === documentType);
              const requiresTaxId = currentDocObj ? currentDocObj.requiresTaxId : (documentType === 'Factura' || documentType === 'Nota de Débito');

              if (!requiresTaxId) return null;

              return (
                <div style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1.5px solid rgba(6, 182, 212, 0.4)', borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-cyan)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={16} />
                    <span>Datos de Facturación ({activeCountryConfig.name}: {documentType})</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                        {activeCountryConfig.taxIdLabel} (Opcional)
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={activeCountryConfig.taxIdPlaceholder}
                        value={customerRut}
                        onChange={(e) => setCustomerRut(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: '8px', background: '#fff', border: '1px solid #cbd5e1' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                        {activeCountryConfig.customerNameLabel} (Opcional)
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: Razón Social o Nombre Completo"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: '8px', background: '#fff', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                        Giro / Actividad (Opcional)
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: Servicios / Comercio"
                        value={customerGiro}
                        onChange={(e) => setCustomerGiro(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: '8px', background: '#fff', border: '1px solid #cbd5e1' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                        Dirección Fiscal (Opcional)
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: Av. Principal N° 123"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: '8px', background: '#fff', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TOGGLE IVA Y DESCUENTO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              
              {/* Toggle de Aplicar IVA */}
              {isCompanyTaxEnabled ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: applyTax ? 'rgba(16, 185, 129, 0.06)' : '#f8fafc', border: applyTax ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="pos-apply-tax-check"
                      checked={applyTax}
                      onChange={(e) => setApplyTax(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer' }}
                    />
                    <label htmlFor="pos-apply-tax-check" style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', cursor: 'pointer', margin: 0 }}>
                      {companySettings.tax_name || 'IVA'} ({((companySettings.tax_rate ?? 0.19) * 100).toFixed(0)}%)
                    </label>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', background: applyTax ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)', color: applyTax ? '#059669' : '#64748b' }}>
                    {applyTax ? 'CON IVA' : 'SIN IVA'}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(6, 182, 212, 0.06)', border: '1px solid rgba(6, 182, 212, 0.25)', padding: '8px 12px', borderRadius: '12px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#0e7490' }}>
                    Régimen de la Empresa:
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.15)', color: '#0891b2' }}>
                    SIN IVA (0%)
                  </span>
                </div>
              )}

              {/* Descuento Directo */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>Descuento:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700' }}>{companySettings.use_usd_pricing ? 'USD' : companySettings.currency_symbol}</span>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: '75px', padding: '3px 6px', fontSize: '12px', textAlign: 'right' }}
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || ''))}
                  />
                </div>
              </div>

            </div>

            {/* SECCIÓN ESPECIAL: PAGO MÚLTIPLE / DIVIDIDO */}
            {paymentMethod === 'Múltiple' && (<>


              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '16px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={16} style={{ color: '#0284c7' }} />
                    Desglose de Pago Múltiple / Dividido
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#0284c7', fontWeight: '700' }}>
                    Tasa: {companySettings.use_usd_pricing ? `1 USD = ${companySettings.exchange_rate || 1.0} ${companySettings.currency_code || 'VES'}` : '1.00'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                  {splitPayments.map((row) => (
                    <div key={row.id} className="pos-split-payment-row">
                      {/* Método */}
                      <select
                        value={row.method}
                        onChange={(e) => updateSplitPaymentRow(row.id, 'method', e.target.value)}
                        style={{ padding: '6px', fontSize: '11px', fontWeight: '800', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', background: '#fff' }}
                      >
                        <option value="Transferencia">🏦 Transferencia</option>
                        <option value="Efectivo">💵 Efectivo</option>
                        <option value="Tarjeta">💳 Tarjeta / POS</option>
                        <option value="Pago Móvil">📱 Pago Móvil</option>
                        <option value="Zelle">⚡ Zelle</option>
                        <option value="Puntos">🎁 Puntos / Otro</option>
                      </select>

                      {/* Divisa */}
                      <select
                        value={row.currency}
                        onChange={(e) => updateSplitPaymentRow(row.id, 'currency', e.target.value)}
                        style={{ padding: '6px', fontSize: '11px', fontWeight: '800', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', background: '#fff' }}
                      >
                        <option value="USD">💵 USD ($)</option>
                        <option value="VES">🇻🇪 Bolívares (Bs.)</option>
                        <option value="CLP">🇨🇱 Pesos CLP</option>
                        <option value="COP">🇨🇴 Pesos COP</option>
                        <option value="EUR">💶 Euros (€)</option>
                      </select>

                      {/* Monto */}
                      <input
                        type="number"
                        step="any"
                        className="form-input"
                        style={{ padding: '6px 8px', fontSize: '12px', fontWeight: '800', textAlign: 'right' }}
                        placeholder="Monto"
                        value={row.amount}
                        onChange={(e) => updateSplitPaymentRow(row.id, 'amount', e.target.value)}
                      />

                      <div className="pos-split-row-actions">
                        {/* Botón Auto-Completar */}
                        {splitRemainingInBase > 0 && (!row.amount || Number(row.amount) === 0) && (
                          <button
                            type="button"
                            onClick={() => autoFillSplitRemaining(row.id)}
                            style={{ background: '#e0f2fe', border: '1px solid #0284c7', color: '#0369a1', padding: '5px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            title="Auto-completar el monto restante de la venta"
                          >
                            ⚡ Completar
                          </button>
                        )}

                        {/* Botón Borrar Fila */}
                        {splitPayments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSplitPaymentRow(row.id)}
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Remover este método"
                          >
                            <X size={14} />
                            <span>Quitar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={addSplitPaymentRow}
                    style={{ background: '#ffffff', border: '1px dashed #0284c7', color: '#0284c7', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={13} />
                    <span>+ Agregar otro método de pago</span>
                  </button>
                </div>

                {/* Resumen de Pago Dividido */}
                <div style={{ background: '#ffffff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>Total Ingresado:</span>
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#0369a1' }}>
                      {formatCurrency(totalSplitPaidInBase)}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>
                      {splitRemainingInBase <= 0.01 ? 'Estado del Pago:' : 'Pendiente por Pagar:'}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 900, color: splitRemainingInBase <= 0.01 ? '#10b981' : '#ef4444' }}>
                      {splitRemainingInBase <= 0.01 ? '✅ PAGO CUBIERTO' : formatCurrency(splitRemainingInBase)}
                    </span>
                  </div>

                  {splitChangeInBase > 0.01 && (
                    <div style={{ gridColumn: 'span 2', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '6px 10px', color: '#15803d', fontSize: '12px', fontWeight: 800 }}>
                      💵 Vueltas / Cambio a Entregar: {formatCurrency(splitChangeInBase)}
                    </div>
                  )}
                </div>
              </div>
            </>)}

            {/* SECCIÓN ESPECIAL: COBRO EN EFECTIVO MULTIDIVISA CON CAMBIO/VUELTAS */}
            {paymentMethod === 'Efectivo' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Banknote size={16} />
                    Moneda de Pago en Efectivo
                  </span>
                  
                  {/* Selector de Moneda de Efectivo */}
                  <select
                    value={cashCurrency}
                    onChange={(e) => setCashCurrency(e.target.value)}
                    style={{ background: '#ffffff', border: '1px solid #86efac', borderRadius: '8px', padding: '4px 8px', fontSize: '12px', fontWeight: '800', color: '#15803d', cursor: 'pointer', outline: 'none' }}
                  >
                    <option value="USD">💵 USD ($)</option>
                    <option value="VES">🇻🇪 Bolívares (Bs.)</option>
                    <option value="COP">🇨🇴 Pesos Col (COP)</option>
                    <option value="CLP">🇨🇱 Pesos Chilenos (CLP)</option>
                    <option value="EUR">💶 Euros (€)</option>
                  </select>
                </div>

                {(() => {
                  const changeInfo = calculateDetailedChange(cartTotal, cashCurrency, cashReceived, givenChangeBill, givenChangeCurrency, companySettings);
                  return (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
                        {/* Campo Recibido */}
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: '#166534', marginBottom: '4px', display: 'block' }}>
                            Paga con ({cashCurrency})
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder={`Ej: ${cashCurrency === 'USD' ? '20' : cashCurrency === 'VES' ? '500' : '10000'}`}
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: '8px', border: '1px solid #86efac', background: '#ffffff', color: '#0f172a', fontWeight: '800', fontSize: '14px', outline: 'none' }}
                          />
                        </div>

                        {/* Vueltas / Cambio Resumen */}
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: '#166534', marginBottom: '4px', display: 'block' }}>
                            Vueltas / Cambio Total
                          </label>
                          <div style={{ padding: '8px 12px', borderRadius: '8px', background: changeInfo.isMissing ? '#fef2f2' : '#dcfce7', border: `1px solid ${changeInfo.isMissing ? '#fca5a5' : '#86efac'}`, fontWeight: '800', fontSize: '13px', color: changeInfo.isMissing ? '#dc2626' : '#15803d', minHeight: '35px', display: 'flex', alignItems: 'center' }}>
                            {changeInfo.hasChange 
                              ? `Cambio: $${changeInfo.changeTotalUSD.toFixed(2)} USD (${changeInfo.localSymbol} ${changeInfo.changeTotalLocal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                              : (changeInfo.statusText || calculateCashChange(cartTotal, cashCurrency, cashReceived, companySettings))}
                          </div>
                        </div>
                      </div>

                      {/* CALCULADORA DE VUELTAS MIXTAS / DESGLOSE DE CAMBIO */}
                      {changeInfo.hasChange && (
                        <div style={{ marginTop: '12px', background: '#ffffff', border: '1.5px solid #86efac', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 12px rgba(22, 101, 52, 0.06)' }}>
                          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#166534', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>💵 Desglose de Vueltas Entregadas:</span>
                            <span style={{ fontSize: '12.5px', color: '#15803d', fontWeight: 900 }}>
                              Total: ${changeInfo.changeTotalUSD.toFixed(2)} USD
                            </span>
                          </div>

                          {/* Input de Billete / Monto entregado */}
                          <div style={{ background: '#f0fdf4', padding: '10px 12px', borderRadius: '10px', border: '1px solid #bbf7d0', marginBottom: '8px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#166534', display: 'block', marginBottom: '4px' }}>
                              ¿Entregaste algún billete de vuelto? (Ej: $5 USD):
                            </label>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <input
                                type="number"
                                step="any"
                                className="form-input"
                                placeholder="Ej: 5"
                                value={givenChangeBill}
                                onChange={(e) => setGivenChangeBill(e.target.value)}
                                style={{ width: '90px', padding: '6px 10px', fontSize: '13px', fontWeight: 800, borderRadius: '8px', background: '#fff', border: '1px solid #86efac' }}
                              />
                              <select
                                value={givenChangeCurrency}
                                onChange={(e) => setGivenChangeCurrency(e.target.value)}
                                style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 800, borderRadius: '8px', background: '#fff', border: '1px solid #86efac', color: '#15803d' }}
                              >
                                <option value="USD">💵 USD ($)</option>
                                <option value="VES">🇻🇪 Bolívares (Bs.)</option>
                                <option value="EUR">💶 Euros (€)</option>
                              </select>

                              {/* Botones Rápidos de Billetes */}
                              <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                                {[1, 5, 10, 20].map(val => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => { setGivenChangeBill(String(val)); setGivenChangeCurrency('USD'); }}
                                    style={{ background: givenChangeBill === String(val) && givenChangeCurrency === 'USD' ? '#166534' : '#dcfce7', color: givenChangeBill === String(val) && givenChangeCurrency === 'USD' ? '#fff' : '#15803d', border: '1px solid #86efac', borderRadius: '6px', padding: '3px 7px', fontSize: '10.5px', fontWeight: 800, cursor: 'pointer' }}
                                  >
                                    ${val}
                                  </button>
                                ))}
                                {givenChangeBill && (
                                  <button
                                    type="button"
                                    onClick={() => setGivenChangeBill('')}
                                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '3px 7px', fontSize: '10.5px', fontWeight: 800, cursor: 'pointer' }}
                                  >
                                    Borrar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Restante por Entregar */}
                          <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '10px', padding: '10px 12px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '6px' }}>
                              ⚡ Restante por entregar al cliente:
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '8px', border: '1px solid #86efac' }}>
                                <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: 700 }}>En Bolívares (Bs.):</span>
                                <span style={{ fontSize: '14px', color: '#059669', fontWeight: 900 }}>
                                  {changeInfo.localSymbol} {changeInfo.remainingChangeLocal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '8px', border: '1px solid #86efac' }}>
                                <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: 700 }}>En USD ($):</span>
                                <span style={{ fontSize: '14px', color: '#0284c7', fontWeight: 900 }}>
                                  ${changeInfo.remainingChangeUSD.toFixed(2)} USD
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Campo N° de Referencia / Transacción en Panel Lateral */}
            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px', textTransform: 'uppercase' }}>
                <Receipt size={14} style={{ color: 'var(--color-cyan)' }} />
                <span>N° Transacción / Referencia (Pago Móvil, Zelle, Punto, Transf.)</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: 123456 (Ref. para conciliación bancaria)"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: '12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            {/* SECCIÓN OBLIGATORIA: REGISTRO DE FORMA DE ENTREGA DE VUELTO (CUADRE DE CAJA MULTI-DIVISA) */}
            {hasChangeToReturn && (
              <div style={{
                background: (changePayoutMode === 'single' ? changePayoutMethod : isChangeFullyCovered)
                  ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' 
                  : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: `2px solid ${(changePayoutMode === 'single' ? changePayoutMethod : isChangeFullyCovered) ? '#10b981' : '#f59e0b'}`,
                borderRadius: '16px',
                padding: '14px',
                marginBottom: '16px',
                boxShadow: `0 4px 14px ${(changePayoutMode === 'single' ? changePayoutMethod : isChangeFullyCovered) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}`,
                transition: 'all 0.25s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 900, color: (changePayoutMode === 'single' ? changePayoutMethod : isChangeFullyCovered) ? '#047857' : '#b45309', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {(changePayoutMode === 'single' ? changePayoutMethod : isChangeFullyCovered) ? <CheckCircle2 size={16} style={{ color: '#10b981' }} /> : <AlertTriangle size={16} style={{ color: '#d97706' }} />}
                    <span>FORMA EN QUE ENTREGAS EL VUELTO AL CLIENTE</span>
                  </span>

                  {/* Selector de Modo: Simple o Múltiple */}
                  <div style={{ display: 'flex', gap: '3px', background: '#ffffff', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <button
                      type="button"
                      onClick={() => setChangePayoutMode('single')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '10.5px',
                        fontWeight: changePayoutMode === 'single' ? 900 : 700,
                        background: changePayoutMode === 'single' ? '#0f172a' : 'transparent',
                        color: changePayoutMode === 'single' ? '#ffffff' : '#64748b',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ 100% Único
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChangePayoutMode('multiple');
                        if (splitChangeRows.length === 0 || !splitChangeRows[0].amount) {
                          setSplitChangeRows([
                            { id: 1, method: 'USD_EFECTIVO', currency: 'USD', amount: '', ref_number: '' }
                          ]);
                        }
                      }}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '10.5px',
                        fontWeight: changePayoutMode === 'multiple' ? 900 : 700,
                        background: changePayoutMode === 'multiple' ? '#d97706' : 'transparent',
                        color: changePayoutMode === 'multiple' ? '#ffffff' : '#64748b',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      🔀 Desglose Múltiple
                    </button>
                  </div>
                </div>

                {/* Resumen del Vuelto a Entregar */}
                <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                    Vuelto Total a Entregar:
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 900, color: '#047857' }}>
                    ${totalChangeRequiredUSD.toFixed(2)} USD <span style={{ fontSize: '11px', color: '#64748b' }}>(Bs. {totalChangeRequiredVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                  </span>
                </div>

                {/* MODO 1: ENTREGA SIMPLE (100%) */}
                {changePayoutMode === 'single' ? (
                  <>
                    <p style={{ fontSize: '11px', color: '#78350f', margin: '0 0 8px 0' }}>
                      Selecciona el método por donde sale el 100% del cambio:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '6px', marginBottom: '10px' }}>
                      {[
                        { key: 'USD_EFECTIVO', label: '💵 USD Efectivo' },
                        { key: 'VES_PAGO_MOVIL', label: '🇻🇪 Bolívares / Pago Móvil' },
                        { key: 'BINANCE', label: '🟡 Binance USDT' },
                        { key: 'ZELLE', label: '⚡ Zelle / Transf.' }
                      ].map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setChangePayoutMethod(opt.key)}
                          style={{
                            padding: '8px 6px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: changePayoutMethod === opt.key ? 900 : 700,
                            background: changePayoutMethod === opt.key ? '#d97706' : '#ffffff',
                            color: changePayoutMethod === opt.key ? '#ffffff' : '#451a03',
                            border: changePayoutMethod === opt.key ? '2px solid #b45309' : '1px solid #fcd34d',
                            cursor: 'pointer',
                            textAlign: 'center',
                            boxShadow: changePayoutMethod === opt.key ? '0 2px 8px rgba(217, 119, 6, 0.3)' : 'none'
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {(changePayoutMethod === 'VES_PAGO_MOVIL' || changePayoutMethod === 'BINANCE' || changePayoutMethod === 'ZELLE') && (
                      <div style={{ marginTop: '6px', background: '#ffffff', padding: '6px 10px', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                        <label style={{ fontSize: '10.5px', fontWeight: 800, color: '#78350f', display: 'block', marginBottom: '4px' }}>
                          N° Ref / Comprobante de Envío de Vuelto (Opcional):
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Ej: Ref # de Pago Móvil o Binance enviado"
                          value={changePayoutRef}
                          onChange={(e) => setChangePayoutRef(e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  /* MODO 2: DESGLOSE MÚLTIPLE DE VUELTO */
                  <div>
                    {/* Estado del Balance de Vuelto */}
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: isChangeFullyCovered ? '#dcfce7' : '#fef2f2',
                      border: `1px solid ${isChangeFullyCovered ? '#86efac' : '#fca5a5'}`,
                      marginBottom: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 900, color: isChangeFullyCovered ? '#15803d' : '#dc2626' }}>
                        {isChangeFullyCovered 
                          ? '✅ Vuelto 100% Cubierto y Cuadrado' 
                          : `⚠️ Vuelto Incompleto: Falta $${remainingChangeToAssignUSD.toFixed(2)} USD (Bs. ${(remainingChangeToAssignUSD * rateVal).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})})`}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: isChangeFullyCovered ? '#15803d' : '#dc2626' }}>
                        Asignado: ${assignedChangeUSD.toFixed(2)} USD
                      </span>
                    </div>

                    {/* Lista de Filas de Vuelto Múltiple */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                      {splitChangeRows.map((row) => (
                        <div key={row.id} style={{
                          background: '#ffffff',
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          {/* Fila Principal: Método, Moneda, Monto y Borrar */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 1fr 28px', gap: '6px', alignItems: 'center' }}>
                            <select
                              value={row.method}
                              onChange={(e) => updateSplitChangeRow(row.id, 'method', e.target.value)}
                              style={{ padding: '6px', fontSize: '11px', fontWeight: 800, borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', background: '#fff', width: '100%', boxSizing: 'border-box' }}
                            >
                              <option value="USD_EFECTIVO">💵 USD Efectivo</option>
                              <option value="VES_PAGO_MOVIL">🇻🇪 Bolívares / Pago Móvil</option>
                              <option value="BINANCE">🟡 Binance USDT</option>
                              <option value="ZELLE">⚡ Zelle / Transf.</option>
                              <option value="MIXTO">🔀 Otro / Mixto</option>
                            </select>

                            <select
                              value={row.currency}
                              onChange={(e) => updateSplitChangeRow(row.id, 'currency', e.target.value)}
                              style={{ padding: '6px', fontSize: '11px', fontWeight: 800, borderRadius: '6px', border: '1px solid #cbd5e1', color: '#0f172a', background: '#fff', width: '100%', boxSizing: 'border-box' }}
                            >
                              <option value="USD">USD ($)</option>
                              <option value="VES">Bolívares (Bs.)</option>
                              <option value="EUR">Euros (€)</option>
                            </select>

                            <input
                              type="number"
                              step="any"
                              className="form-input"
                              placeholder="Monto"
                              value={row.amount}
                              onChange={(e) => updateSplitChangeRow(row.id, 'amount', e.target.value)}
                              style={{ padding: '6px 8px', fontSize: '12px', fontWeight: 800, textAlign: 'right', width: '100%', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            />

                            <button
                              type="button"
                              onClick={() => removeSplitChangeRow(row.id)}
                              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '30px' }}
                              title="Eliminar fila"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* Fila Secundaria (N° Referencia) si es Pago Móvil, Binance, Zelle o si ya ingresaron referencia */}
                          {(row.method === 'VES_PAGO_MOVIL' || row.method === 'BINANCE' || row.method === 'ZELLE' || row.ref_number) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="N° Ref / Comprobante de vuelto (Opcional)"
                                value={row.ref_number}
                                onChange={(e) => updateSplitChangeRow(row.id, 'ref_number', e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '5px 8px', fontSize: '11px', borderRadius: '6px', border: '1px dashed #94a3b8', background: '#f8fafc' }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Acciones de Vuelto Múltiple */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                      <button
                        type="button"
                        onClick={addSplitChangeRow}
                        style={{ background: '#ffffff', border: '1px dashed #d97706', color: '#b45309', padding: '5px 10px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        + Agregar otra forma de vuelto
                      </button>

                      {!isChangeFullyCovered && remainingChangeToAssignUSD > 0.009 && (
                        <button
                          type="button"
                          onClick={() => {
                            const remUSD = remainingChangeToAssignUSD;
                            setSplitChangeRows(prev => [
                              ...prev,
                              { id: Date.now(), method: 'VES_PAGO_MOVIL', currency: 'VES', amount: String((remUSD * rateVal).toFixed(2)), ref_number: '' }
                            ]);
                          }}
                          style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 900, cursor: 'pointer' }}
                        >
                          ⚡ Completar Restante en Bs.
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN CRÍTICA: TOTAL A DIGITAR EN LA MÁQUINA */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              color: '#ffffff',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(15,23,42,0.15)'
            }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                  {companySettings.use_usd_pricing ? 'Total a Cobrar' : 'Total a Digitar en la Máquina'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <DualCurrencyDisplay 
                    amount={cartTotal} 
                    fontSize="32px" 
                    primaryColor="#06b6d4" 
                    showSwap={true} 
                  />
                  <button
                    type="button"
                    onClick={() => speakTotal(cartTotal)}
                    style={{
                      background: 'rgba(6,182,212,0.2)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#06b6d4',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                    title="Escuchar Dictado de Voz"
                  >
                    <Volume2 size={14} />
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>
                  {paymentMethod}
                </span>
                {isCompanyTaxEnabled ? (
                  <>
                    <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '6px', fontWeight: 800 }}>
                      Subtotal Exento (E): {formatCurrency(cartExemptTotal)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
                      Base Imponible (Gravable): {formatCurrency(cartTaxableBase)}
                    </div>
                    {applyTax && (
                      <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px', fontWeight: 800 }}>
                        Total {companySettings.tax_name || 'IVA'} ({(taxRate * 100).toFixed(0)}%): +{formatCurrency(taxAmount)}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '6px', fontWeight: 800 }}>
                    Régimen Sin IVA (0%)
                  </div>
                )}
              </div>
            </div>

            {/* Botones de Acción de la Ventana */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1.3fr', gap: '8px' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowScanModal(false)} style={{ padding: '12px 6px', justifyContent: 'center', fontSize: '12px' }}>
                Seguir Escaneando
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setSaveTakeoutClientInput('');
                  setShowSaveTakeoutModal(true);
                }} 
                style={{ 
                  padding: '12px 6px', 
                  justifyContent: 'center', 
                  background: 'rgba(245, 158, 11, 0.15)', 
                  border: '1px solid rgba(245, 158, 11, 0.4)', 
                  color: '#fbbf24', 
                  borderRadius: '12px', 
                  fontWeight: '700', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px'
                }}
              >
                <ShoppingBag size={14} />
                Para Llevar
              </button>
              <button type="button" className="btn-primary" onClick={handlePayment} style={{ padding: '12px 6px', justifyContent: 'center', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} disabled={processing}>
                <Printer size={15} />
                <span>{processing ? 'Procesando...' : (documentType === 'Factura' ? 'Emitir e Imprimir Factura' : 'Registrar Venta')}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL SELECCIÓN DE COLOR / VARIANTE DISPONIBLE EN POS */}
      {selectedVariantModalProduct && (
        <div className="modal-overlay" style={{ zIndex: 12000 }}>
          <div className="modal-content glass-panel cyan-glow" style={{ maxWidth: '520px', width: '95%', padding: '24px' }}>
            <div className="modal-header" style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                  <Palette size={22} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>
                    Seleccionar Color Disponible
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', margin: 0, fontWeight: 600 }}>
                    {selectedVariantModalProduct.name} {selectedVariantModalProduct.sku ? `• Ref: ${selectedVariantModalProduct.sku}` : ''}
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelectedVariantModalProduct(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
                Colores en Inventario y Cantidad Disponible
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-cyan)' }}>
                Precio: <DualCurrencyDisplay amount={selectedVariantModalProduct.sell_price} fontSize="12px" primaryColor="var(--color-cyan)" showSwap={false} />
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
              {getProductVariants(selectedVariantModalProduct).map((v) => {
                const vStock = Number(v.stock || 0);
                const isOutOfStock = vStock <= 0;
                const vInCart = cart.find(c => {
                  const sameBase = getProdKey(c.part) === getProdKey(selectedVariantModalProduct);
                  const varId = c.selectedVariant?.id || c.selectedVariant?.color;
                  return sameBase && varId === (v.id || v.color);
                })?.cantidad || 0;
                const remaining = Math.max(0, vStock - vInCart);

                return (
                  <div
                    key={v.id || v.color}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: isOutOfStock ? '1.5px solid #e2e8f0' : '1.5px solid #cbd5e1',
                      background: isOutOfStock ? '#f8fafc' : '#ffffff',
                      opacity: isOutOfStock ? 0.6 : 1,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: v.hex || '#6366f1',
                          border: '2px solid #ffffff',
                          boxShadow: '0 0 0 1px #cbd5e1',
                          flexShrink: 0
                        }}
                      />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                          {v.color}
                        </div>
                        <div style={{ fontSize: '11.5px', color: isOutOfStock ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                          {isOutOfStock ? '● Agotado (0 unids)' : `● ${vStock} unidades disponibles`}
                          {vInCart > 0 && (
                            <span style={{ marginLeft: '6px', color: '#2563eb', fontWeight: 700 }}>
                              ({vInCart} en carrito)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={remaining <= 0}
                      onClick={() => {
                        addToCart(selectedVariantModalProduct, null, v);
                        setSelectedVariantModalProduct(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: 800,
                        borderRadius: '8px',
                        border: 'none',
                        cursor: remaining <= 0 ? 'not-allowed' : 'pointer',
                        background: remaining <= 0 ? '#e2e8f0' : 'linear-gradient(135deg, #06b6d4, #0284c7)',
                        color: remaining <= 0 ? '#94a3b8' : '#ffffff',
                        boxShadow: remaining <= 0 ? 'none' : '0 2px 8px rgba(6, 182, 212, 0.3)'
                      }}
                    >
                      <Plus size={14} />
                      <span>{remaining <= 0 ? (vStock <= 0 ? 'Agotado' : 'Límite alcanzado') : 'Agregar'}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedVariantModalProduct(null)}
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GUARDAR PEDIDO PARA LLEVAR DESDE POS */}
      {showSaveTakeoutModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '400px', background: '#0f172a', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '20px', padding: '24px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={20} />
                Guardar Pedido Para Llevar
              </h3>
              <button onClick={() => setShowSaveTakeoutModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
              Ingresa el nombre del cliente o receptor para que quede activo en el comandero de Mesas hasta su retiro y pago.
            </p>

            <form onSubmit={handleSaveTakeoutSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#fbbf24', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Nombre del Cliente / Persona (Opcional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: '#1e293b', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fff', fontSize: '14px' }}
                  placeholder="Ej: Pedro Pérez, Carlos, Juan..."
                  value={saveTakeoutClientInput}
                  onChange={(e) => setSaveTakeoutClientInput(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Selector de Estado de Pago */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#fbbf24', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Estado del Pago
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPosTakeoutPaymentStatus('later')}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: posTakeoutPaymentStatus === 'later' ? '1px solid #f59e0b' : '1px solid #334155',
                      background: posTakeoutPaymentStatus === 'later' ? 'rgba(245, 158, 11, 0.2)' : '#1e293b',
                      color: posTakeoutPaymentStatus === 'later' ? '#fbbf24' : '#94a3b8',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Clock size={13} />
                    <span>⏳ Paga al Retirar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosTakeoutPaymentStatus('instant')}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: posTakeoutPaymentStatus === 'instant' ? '1px solid #10b981' : '1px solid #334155',
                      background: posTakeoutPaymentStatus === 'instant' ? 'rgba(16, 185, 129, 0.2)' : '#1e293b',
                      color: posTakeoutPaymentStatus === 'instant' ? '#34d399' : '#94a3b8',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <CreditCard size={13} />
                    <span>💳 Paga en el Momento</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowSaveTakeoutModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: 'none', color: '#fff', fontWeight: '800' }}>
                  Guardar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CARGAR CANASTA */}
      {showLoadCartModal && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal-content glass-panel cyan-glow" style={{ maxWidth: '360px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Cargar Canasta Compartida</h3>
              <button className="modal-close" onClick={() => setShowLoadCartModal(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Ingresa el código de 4 dígitos generado por el cliente en su celular.
            </p>
            <form onSubmit={handleLoadCartSubmit}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: '24px', letterSpacing: '4px', textAlign: 'center', padding: '10px', fontFamily: 'monospace' }}
                  placeholder="0000"
                  maxLength={4}
                  value={loadCartCode}
                  onChange={(e) => setLoadCartCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowLoadCartModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Cargar Artículos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL COMPROBANTE EMITIDO (BOLETA / FACTURA DESCARGABLE O IMPRIMIBLE) */}
      {completedSaleModal && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content glass-panel cyan-glow" style={{ maxWidth: '480px', padding: '24px', background: '#090f1e', color: '#fff', borderRadius: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', border: '2px solid #10b981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', marginBottom: '10px' }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#ffffff' }}>
                ¡Venta Registrada con Éxito!
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--color-cyan)', fontWeight: 800, marginTop: '4px' }}>
                {completedSaleModal.document_type || 'Comprobante'} N° PN-{String(completedSaleModal.id).slice(-8).toUpperCase()}
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '14px', marginBottom: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', color: '#94a3b8' }}>
                <span>Forma de Pago: <strong>{completedSaleModal.payment_method}</strong></span>
                <span>Artículos: <strong>{((typeof completedSaleModal.items === 'string' ? (JSON.parse(completedSaleModal.items || '[]')) : (completedSaleModal.items || [])) || []).reduce((sum, i) => sum + Number(i.cantidad || 1), 0)}</strong></span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>Total Cobrado:</span>
                <DualCurrencyDisplay amount={completedSaleModal.total_sell} fontSize="20px" primaryColor="#10b981" align="right" showSwap={false} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%', padding: '12px', justifyContent: 'center', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }}
                onClick={() => printReceipt(completedSaleModal, companySettings, companyName, activeBranch?.name)}
              >
                <Printer size={16} />
                <span>🖨️ IMPRIMIR / DESCARGAR PDF ({completedSaleModal.document_type || 'COMPROBANTE'})</span>
              </button>

              <a
                href={getSaleWhatsAppReceiptUrl(completedSaleModal, companySettings, companyName, activeBranch?.name)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '11px',
                  borderRadius: '10px',
                  background: '#16a34a',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
                }}
              >
                <MessageCircle size={15} />
                <span>📲 Compartir Ticket por WhatsApp</span>
              </a>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '10px', justifyContent: 'center', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => downloadReceiptFile(completedSaleModal, companySettings, companyName, activeBranch?.name)}
                >
                  <Download size={14} />
                  <span>Descargar HTML</span>
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '10px', justifyContent: 'center', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.08)' }}
                  onClick={() => setPendingPosAnnulSale(completedSaleModal)}
                >
                  <XCircle size={14} />
                  <span>Anular Venta</span>
                </button>
              </div>

              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: '6px', padding: '10px', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}
                onClick={() => setCompletedSaleModal(null)}
              >
                + NUEVA VENTA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CLAVE ADMIN PARA ANULAR VENTA DESDE POS */}
      <AdminPasswordModal
        isOpen={!!pendingPosAnnulSale}
        onClose={() => setPendingPosAnnulSale(null)}
        onConfirm={confirmPosAnnulSale}
        requireReason={true}
        user={user}
        title="Autorización y Justificación de Anulación"
        actionName={pendingPosAnnulSale ? `anular la ${pendingPosAnnulSale.document_type || 'Venta'} N° PN-${String(pendingPosAnnulSale.id).slice(-8).toUpperCase()}` : "anular esta venta"}
      />

      {/* ── MODAL 1: APERTURA DE TURNO DE CAJA ── */}
      {showOpenShiftModal && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '500px', background: '#ffffff', border: '2px solid #10b981', borderRadius: '20px', padding: '24px', color: '#0f172a', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#047857', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} />
                Apertura de Turno de Caja
              </h3>
              {activeShift && (
                <button onClick={() => setShowOpenShiftModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              )}
            </div>

            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', lineHeight: 1.4 }}>
              Ingresa el sencillo o fondo inicial entregado en la gaveta. Puedes digitar el total o usar el desglosador por billetes.
            </p>

            <form onSubmit={handleOpenShiftSubmit}>
              {/* Botón alternador para mostrar/ocultar el desglose de billetes */}
              <div style={{ marginBottom: '14px', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => setShowOpenBillCounter(!showOpenBillCounter)}
                  style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#047857', fontSize: '11px', fontWeight: 800, padding: '5px 12px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  {showOpenBillCounter ? 'Ocultar Desglose Billetes' : '🧮 Desglosar por Billetes (USD y Bs.)'}
                </button>
              </div>

              {/* Paneles de Desglose de Billetes en Apertura */}
              {showOpenBillCounter && (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '14px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Billetes USD */}
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#059669', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>💵 Billetes en USD ($)</span>
                      <span>Suma: ${totalOpenCalculatedUSD.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {[1, 5, 10, 20, 50, 100].map(denom => (
                        <div key={`open-usd-${denom}`}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b' }}>Billete ${denom}</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={openBillCountsUSD[denom] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const next = { ...openBillCountsUSD, [denom]: val };
                              setOpenBillCountsUSD(next);
                              const sum = Object.entries(next).reduce((s, [d, c]) => s + (Number(d) * (Number(c) || 0)), 0);
                              setOpenInitialUSD(sum > 0 ? String(sum) : '');
                            }}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '4px 6px', fontSize: '12px', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Billetes Bolívares */}
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0284c7', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>🇻🇪 Billetes en Bolívares (Bs.)</span>
                      <span>Suma: Bs. {totalOpenCalculatedVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {[50, 100].map(denom => (
                        <div key={`open-ves-${denom}`}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b' }}>Billete Bs. {denom}</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={openBillCountsVES[denom] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const next = { ...openBillCountsVES, [denom]: val };
                              setOpenBillCountsVES(next);
                              const sum = Object.entries(next).reduce((s, [d, c]) => s + (Number(d) * (Number(c) || 0)), 0);
                              setOpenInitialVES(sum > 0 ? String(sum) : '');
                            }}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '4px 6px', fontSize: '12px', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Campos Totales de Entrada */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Fondo Inicial USD ($)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-input"
                      placeholder="0.00"
                      value={openInitialUSD}
                      onChange={(e) => setOpenInitialUSD(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px 10px 28px', fontSize: '15px', fontWeight: 800, background: '#f8fafc', borderColor: '#cbd5e1' }}
                    />
                    <span style={{ position: 'absolute', left: '10px', top: '10px', fontWeight: 800, color: '#059669' }}>$</span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Fondo Inicial Bs. (Bs.)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-input"
                      placeholder="0.00"
                      value={openInitialVES}
                      onChange={(e) => setOpenInitialVES(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px 10px 32px', fontSize: '15px', fontWeight: 800, background: '#f8fafc', borderColor: '#cbd5e1' }}
                    />
                    <span style={{ position: 'absolute', left: '10px', top: '10px', fontWeight: 800, color: '#0284c7', fontSize: '12px' }}>Bs.</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                {activeShift && (
                  <button type="button" className="btn-secondary" onClick={() => setShowOpenShiftModal(false)}>
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontSize: '13.5px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                    flex: 1
                  }}
                >
                  🚀 Confirmar Apertura de Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: MOVIMIENTOS EXTRAORDINARIOS (CAJA CHICA / SANGRÍA / APORTE) ── */}
      {showShiftMovModal && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '440px', background: '#ffffff', borderRadius: '20px', padding: '24px', color: '#0f172a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={20} style={{ color: '#0284c7' }} />
                Movimiento Extraordinario de Caja
              </h3>
              <button onClick={() => setShowShiftMovModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleShiftMovSubmit}>
              {/* Toggle Ingreso vs Retiro */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                <button
                  type="button"
                  onClick={() => setMovType('in')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: movType === 'in' ? '#10b981' : 'transparent',
                    color: movType === 'in' ? '#ffffff' : '#64748b',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  ➕ Ingreso (Aporte Sencillo)
                </button>
                <button
                  type="button"
                  onClick={() => setMovType('out')}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: movType === 'out' ? '#ef4444' : 'transparent',
                    color: movType === 'out' ? '#ffffff' : '#64748b',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  ➖ Retiro / Gasto Caja Chica
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Monto USD ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="form-input"
                    placeholder="0.00"
                    value={movUSD}
                    onChange={(e) => setMovUSD(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '14px', fontWeight: 800 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Monto Bs. (Bs.)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="form-input"
                    placeholder="0.00"
                    value={movVES}
                    onChange={(e) => setMovVES(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '14px', fontWeight: 800 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Motivo / Concepto del Movimiento
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={movType === 'in' ? "Ej: Inyección de sencillo billetes $1 por el dueño" : "Ej: Pago botellón de agua / Recarga caja chica"}
                  value={movReason}
                  onChange={(e) => setMovReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '12.5px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowShiftMovModal(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: movType === 'in' ? '#10b981' : '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: CIERRE CIEGO DE TURNO ── */}
      {showBlindCloseModal && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '520px', background: '#ffffff', border: '2px solid #ef4444', borderRadius: '24px', padding: '24px', color: '#0f172a', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={22} />
                Cierre Ciego de Turno (Arqueo de Caja)
              </h3>
              <button onClick={() => setShowBlindCloseModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#991b1b', lineHeight: 1.4 }}>
              <strong>🔒 Arqueo Físico Ciego:</strong> Ingresa exactamente los montos que contaste en efectivo y puntos de venta. Los resultados calculados por el sistema permanecen ocultos para garantizar la transparencia.
            </div>

            <form onSubmit={handleBlindCloseSubmit}>
              {/* Sección Efectivo USD */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
                    💵 Conteo Efectivo USD en Gaveta ($)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowBillCounterUSD(!showBillCounterUSD)}
                    style={{ background: '#e0f2fe', border: '1px solid #7dd3fc', color: '#0369a1', fontSize: '10.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    {showBillCounterUSD ? 'Ocultar Desglose Billetes' : '🧮 Contar Billetes ($)'}
                  </button>
                </div>

                {showBillCounterUSD && (
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px', marginBottom: '10px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[1, 5, 10, 20, 50, 100].map(denom => (
                      <div key={`close-usd-${denom}`}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b' }}>Billete ${denom}</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={billCountsUSD[denom] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const next = { ...billCountsUSD, [denom]: val };
                            setBillCountsUSD(next);
                            const sum = Object.entries(next).reduce((s, [d, c]) => s + (Number(d) * (Number(c) || 0)), 0);
                            setCloseCashUSD(sum > 0 ? String(sum) : '');
                          }}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '4px 6px', fontSize: '12px', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </div>
                    ))}
                    <div style={{ gridColumn: 'span 3', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: '#059669', paddingTop: '4px' }}>
                      Suma por billetes: ${totalBillCalculatedUSD.toFixed(2)} USD
                      <button
                        type="button"
                        onClick={() => setCloseCashUSD(String(totalBillCalculatedUSD))}
                        style={{ marginLeft: '8px', background: '#10b981', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 800 }}
                      >
                        Usar esta suma
                      </button>
                    </div>
                  </div>
                )}

                <input
                  type="number"
                  step="any"
                  min="0"
                  className="form-input"
                  placeholder="0.00"
                  value={closeCashUSD}
                  onChange={(e) => setCloseCashUSD(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '15px', fontWeight: 800, color: '#059669' }}
                  required
                />
              </div>

              {/* Grid para otras monedas / métodos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155' }}>
                      🇻🇪 Efectivo Bolívares (Bs.)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowBillCounterVES(!showBillCounterVES)}
                      style={{ background: '#e0f2fe', border: '1px solid #7dd3fc', color: '#0369a1', fontSize: '9.5px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {showBillCounterVES ? 'Ocultar' : '🧮 Billetes Bs.'}
                    </button>
                  </div>

                  {showBillCounterVES && (
                    <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', marginBottom: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {[50, 100].map(denom => (
                        <div key={`close-ves-${denom}`}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b' }}>Bs. {denom}</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={billCountsVES[denom] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const next = { ...billCountsVES, [denom]: val };
                              setBillCountsVES(next);
                              const sum = Object.entries(next).reduce((s, [d, c]) => s + (Number(d) * (Number(c) || 0)), 0);
                              setCloseCashVES(sum > 0 ? String(sum) : '');
                            }}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '4px 6px', fontSize: '11px', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </div>
                      ))}
                      <div style={{ gridColumn: 'span 2', textAlign: 'right', fontSize: '10px', fontWeight: 800, color: '#0284c7', paddingTop: '2px' }}>
                        Suma: Bs. {totalBillCalculatedVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}

                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="form-input"
                    placeholder="0.00"
                    value={closeCashVES}
                    onChange={(e) => setCloseCashVES(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13.5px', fontWeight: 800 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    💳 Cierre Lote Punto de Venta (Bs.)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="form-input"
                    placeholder="0.00"
                    value={closeCardVES}
                    onChange={(e) => setCloseCardVES(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13.5px', fontWeight: 800 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    📲 Pago Móvil Conciliado (Bs.)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="form-input"
                    placeholder="0.00"
                    value={closePagoMovilVES}
                    onChange={(e) => setClosePagoMovilVES(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13.5px', fontWeight: 800 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    🌐 Total Zelle ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="form-input"
                    placeholder="0.00"
                    value={closeZelleUSD}
                    onChange={(e) => setCloseZelleUSD(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13.5px', fontWeight: 800 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  🪙 Binance Pay / Crypto (USDT)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="form-input"
                  placeholder="0.00"
                  value={closeBinanceUSDT}
                  onChange={(e) => setCloseBinanceUSDT(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13.5px', fontWeight: 800 }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Observaciones / Notas del Arqueo
                </label>
                <textarea
                  className="form-input"
                  placeholder="Ej: Se entregó vuelto en Bs por falta de billetes de $1..."
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  rows="2"
                  style={{ width: '100%', padding: '8px 10px', fontSize: '12px' }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowBlindCloseModal(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                    flex: 1
                  }}
                >
                  🔒 Enviar Cierre Ciego y Cerrar Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Resumen de Cierre de Turno por WhatsApp */}
      {shiftWhatsAppModal && shiftWhatsAppModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '520px',
            background: '#0f172a',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(16, 185, 129, 0.2)',
            borderRadius: '24px',
            padding: '28px',
            color: '#ffffff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid #10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981'
                }}>
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                    Turno Cerrado con Éxito
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                    Arqueo de caja auditado y registrado
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShiftWhatsAppModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Vista previa del mensaje */}
            <div style={{
              background: '#090d16',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '16px',
              maxHeight: '220px',
              overflowY: 'auto',
              fontSize: '12px',
              lineHeight: '1.6',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              color: '#e2e8f0',
              marginBottom: '20px'
            }}>
              {shiftWhatsAppModal.messageText}
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  const phone = companySettings.owner_whatsapp_phone || '';
                  const url = getWhatsAppShareUrl(phone, shiftWhatsAppModal.messageText);
                  window.open(url, '_blank');
                }}
                style={{
                  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '14px',
                  fontWeight: 900,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)'
                }}
              >
                <Share2 size={18} />
                <span>📲 Enviar Reporte por WhatsApp</span>
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shiftWhatsAppModal.messageText);
                    setShiftWhatsAppModal(prev => ({ ...prev, copied: true }));
                    setTimeout(() => {
                      setShiftWhatsAppModal(prev => prev ? ({ ...prev, copied: false }) : null);
                    }, 2500);
                  }}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: shiftWhatsAppModal.copied ? '#10b981' : '#ffffff',
                    padding: '12px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {shiftWhatsAppModal.copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{shiftWhatsAppModal.copied ? '¡Copiado al Portapapeles!' : 'Copiar Texto'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShiftWhatsAppModal(null)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
