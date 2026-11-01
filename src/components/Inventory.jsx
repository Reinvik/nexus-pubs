import React, { useState, useMemo, useRef } from 'react';
import { usePuntoNexus } from '../context/PuntoNexusContext';
import DualCurrencyDisplay from './DualCurrencyDisplay';
import { Plus, Edit3, Trash2, ShieldAlert, ShieldCheck, ArrowDownCircle, RefreshCw, X, Settings, Globe, ChevronDown, CheckCircle2, FileSpreadsheet, Upload, Download, Package, DollarSign, CreditCard, Utensils, ShoppingCart, Scissors, Store, Percent, Sparkles, TrendingUp, ChevronUp, Check, AlertTriangle, Ruler, Layers, MessageSquare, Star, Image as ImageIcon, ChevronLeft, ChevronRight, FileText, Palette } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseProductSpecs, serializeProductSpecs, getProductVariants, getTotalVariantsStock, normalizeVariants } from '../utils/productSpecs';

export default function Inventory() {
  const { 
    inventory, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    replenishProduct, 
    loading,
    companySettings,
    updateCompanySettings,
    updateMinStockBatch,
    formatCurrency,
    syncExchangeRate,
    resetToRestaurantCatalog,
    resetCatalogForGiro,
    activeBranchId,
    persistLocalInventory
  } = usePuntoNexus();
  const [search, setSearch] = useState('');
  const [activeStockFilter, setActiveStockFilter] = useState('all'); // 'all' | 'low_stock'
  
  const fileInputRef = useRef(null);
  const productImageInputRef = useRef(null);

  // Estados para subida y compresión de imagen de productos
  const [imageMode, setImageMode] = useState('upload'); // 'upload' | 'url'
  const [compressingImage, setCompressingImage] = useState(false);
  const [imageStats, setImageStats] = useState(null); // { originalSize, compressedSize, savingsPct }

  // Utility: Formatear bytes a KB / MB
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Utility: Compresión de imágenes mediante Canvas (Máx 600x600px, 0.75 calidad JPEG/WebP)
  const compressImage = (file, maxWidth = 600, maxHeight = 600, quality = 0.75) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const compressedBytes = Math.round((dataUrl.length * 3) / 4);
          resolve({
            dataUrl,
            originalSize: file.size,
            compressedSize: compressedBytes
          });
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Estados y métodos para multi-fotos de productos
  const [urlImageInput, setUrlImageInput] = useState('');

  // Procesar archivo seleccionado o arrastrado (soporta múltiples fotos sucesivas)
  const handleProductImageFileSelect = async (file) => {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP, etc.).');
      return;
    }

    setCompressingImage(true);
    try {
      const result = await compressImage(file, 600, 600, 0.75);
      setProductForm(prev => {
        const currentImgs = Array.isArray(prev.images) && prev.images.length > 0
          ? [...prev.images]
          : (prev.image_url ? [prev.image_url] : []);
        const nextImgs = [...currentImgs, result.dataUrl];
        return {
          ...prev,
          images: nextImgs,
          image_url: nextImgs[0] || result.dataUrl
        };
      });
      const savingsPct = result.originalSize > 0 
        ? Math.max(0, Math.round(((result.originalSize - result.compressedSize) / result.originalSize) * 100))
        : 0;

      setImageStats({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        savingsPct
      });
    } catch (err) {
      console.error("Error al comprimir la imagen del producto:", err);
      alert("No se pudo procesar la imagen. Intenta con otra imagen o un enlace URL.");
    } finally {
      setCompressingImage(false);
      if (productImageInputRef.current) productImageInputRef.current.value = '';
    }
  };

  // Agregar foto mediante enlace URL
  const handleAddImageUrl = () => {
    const trimmed = urlImageInput.trim();
    if (!trimmed) return;
    setProductForm(prev => {
      const currentImgs = Array.isArray(prev.images) && prev.images.length > 0
        ? [...prev.images]
        : (prev.image_url ? [prev.image_url] : []);
      if (currentImgs.includes(trimmed)) return prev;
      const nextImgs = [...currentImgs, trimmed];
      return {
        ...prev,
        images: nextImgs,
        image_url: nextImgs[0] || trimmed
      };
    });
    setUrlImageInput('');
  };

  // Quitar foto en un índice específico
  const handleRemoveImageAtIndex = (indexToRemove) => {
    setProductForm(prev => {
      const currentImgs = Array.isArray(prev.images) && prev.images.length > 0
        ? [...prev.images]
        : (prev.image_url ? [prev.image_url] : []);
      const nextImgs = currentImgs.filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        images: nextImgs,
        image_url: nextImgs[0] || ''
      };
    });
    setImageStats(null);
  };

  // Definir una foto como portada / principal (mover al índice 0)
  const handleSetPrimaryImage = (indexToPrimary) => {
    setProductForm(prev => {
      const currentImgs = Array.isArray(prev.images) && prev.images.length > 0
        ? [...prev.images]
        : (prev.image_url ? [prev.image_url] : []);
      if (indexToPrimary <= 0 || indexToPrimary >= currentImgs.length) return prev;
      const target = currentImgs[indexToPrimary];
      const remaining = currentImgs.filter((_, idx) => idx !== indexToPrimary);
      const nextImgs = [target, ...remaining];
      return {
        ...prev,
        images: nextImgs,
        image_url: nextImgs[0]
      };
    });
  };

  // --- DESCARGAR PLANTILLA EXCEL ---
  const handleDownloadTemplate = () => {
    const headers = [[
      "Nombre",
      "SKU",
      "Categoría",
      "Unidad",
      "Cantidad / Stock",
      "Costo Unitario",
      "Precio Venta",
      "Stock Mínimo Alerta",
      "Tipo de Pago",
      "Proveedor",
      "Días Expiración",
      "Exento de IVA",
      "Imagen (URL)"
    ]];

    // Fila de ejemplo para orientar al usuario
    const exampleRow = [
      "Coca-Cola 350ml",
      "BEB-001",
      "Bebidas",
      "Un.",
      100,
      0.50,
      1.00,
      10,
      "Contado",
      "Distribuidora Ejemplo",
      10,
      "No",
      "https://ejemplo.com/imagen.jpg"
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers[0], exampleRow]);

    // Ajustar ancho de columnas para legibilidad excelente
    worksheet['!cols'] = [
      { wch: 25 }, // Nombre
      { wch: 14 }, // SKU
      { wch: 20 }, // Categoría
      { wch: 12 }, // Unidad
      { wch: 18 }, // Cantidad / Stock
      { wch: 16 }, // Costo Unitario
      { wch: 16 }, // Precio Venta
      { wch: 20 }, // Stock Mínimo Alerta
      { wch: 18 }, // Tipo de Pago
      { wch: 22 }, // Proveedor
      { wch: 16 }, // Días Expiración
      { wch: 16 }, // Exento de IVA
      { wch: 40 }  // Imagen (URL)
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla_Inventario");
    XLSX.writeFile(workbook, "Plantilla_Inventario_Punto_Nexus.xlsx");
  };

  // --- CARGAR E IMPORTAR EXCEL ---
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonData || jsonData.length === 0) {
          alert("El archivo Excel está vacío o no tiene un formato válido.");
          return;
        }

        // Tasa de IVA base del sistema (ej: 0.16 = 16% o 0 si la empresa opera sin IVA)
        const isTaxFreeCompany = companySettings?.tax_enabled === false || Number(companySettings?.tax_rate) === 0;
        const defaultTaxRate = isTaxFreeCompany ? 0 : (companySettings?.tax_rate !== undefined && companySettings?.tax_rate !== null ? Number(companySettings.tax_rate) : 0.16);

        let successCount = 0;
        let errorCount = 0;

        for (const row of jsonData) {
          // Extraer campos mapeando posibles nombres de columnas en español o inglés
          const name = row["Nombre"] || row["nombre"] || row["Product"] || row["Producto"];
          if (!name || !String(name).trim()) {
            errorCount++;
            continue;
          }

          const costPrice = Number(row["Costo Unitario"] || row["costo_unitario"] || row["Costo"] || row["cost_price"]) || 0;
          const sellPrice = Number(row["Precio Venta"] || row["precio_venta"] || row["Precio"] || row["sell_price"]) || 0;
          const rawMinStock = row["Stock Mínimo Alerta"] ?? row["min_stock"] ?? row["Stock Minimo"];
          const minStock = (rawMinStock !== undefined && rawMinStock !== null && String(rawMinStock).trim() !== '' && !isNaN(Number(rawMinStock)))
            ? Math.max(0, Math.floor(Number(rawMinStock)))
            : 5;
          const sku = String(row["SKU"] || row["sku"] || row["Codigo"] || row["Código"] || '').trim();
          const category = String(row["Categoría"] || row["Categoria"] || row["category"] || '').trim();
          const unit = String(row["Unidad"] || row["unidad"] || 'Un.').trim();
          const paymentType = String(row["Tipo de Pago"] || row["tipo_pago"] || 'contado').trim().toLowerCase().includes('cuenta') ? 'cuenta_por_pagar' : 'contado';
          const supplier = String(row["Proveedor"] || row["proveedor"] || '').trim();
          const expirationDays = Number(row["Días Expiración"] || row["dias_expiracion"] || 10);

          // ── NUEVA LÓGICA 1: Exento de IVA ──────────────────────────────
          // Si la celda dice "Sí" / "Si" / "S" / "YES" / "1" → exento (0%)
          // Si dice "No", está vacía o cualquier otro valor → IVA normal del sistema
          const exentoRaw = String(row["Exento de IVA"] || row["exento_iva"] || row["Exento"] || '').trim().toLowerCase();
          const isExento = ['sí', 'si', 's', 'yes', 'y', '1', 'true', 'exento'].includes(exentoRaw);
          const taxRate = isExento ? 0 : defaultTaxRate;
          const taxLabel = isExento ? '(E)' : '';

          // ── NUEVA LÓGICA 2: Imagen URL ──────────────────────────────────
          // Si viene URL válida (comienza con http/https) → se guarda como image_url
          // Si está vacía → se deja en blanco (el POS y vitrina asignan imagen por defecto)
          const imageRaw = String(row["Imagen (URL)"] || row["imagen_url"] || row["Imagen"] || row["image_url"] || '').trim();
          const imageUrl = (imageRaw.startsWith('http://') || imageRaw.startsWith('https://')) ? imageRaw : '';

          const productPayload = {
            name: String(name).trim(),
            unit,
            cost_price: costPrice,
            sell_price: sellPrice,
            stock,
            min_stock: minStock,
            category,
            sku,
            payment_type: paymentType,
            supplier,
            expiration_days: expirationDays,
            is_paid: paymentType === 'contado',
            // Campos nuevos:
            tax_rate: taxRate,
            tax_label: taxLabel,
            is_tax_exempt: isExento,
            image_url: imageUrl,
            updated_at: new Date().toISOString()
          };

          const res = await addProduct(productPayload);
          if (res && res.error) {
            errorCount++;
          } else {
            successCount++;
          }
        }

        alert(`✅ Carga finalizada:\n- ${successCount} productos agregados correctamente.\n${errorCount > 0 ? `- ${errorCount} filas omitidas por no tener nombre válido.` : ''}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error("Error al procesar el archivo Excel:", err);
        alert(`Error al leer el archivo Excel: ${err.message}`);
      }
    };

    reader.readAsArrayBuffer(file);
  };
  // Modales
  const [showProductModal, setShowProductModal] = useState(false);
  const [showReplenishModal, setShowReplenishModal] = useState(false);

  // ASISTENTE DE MARGENES
  const [showMarginAssistant, setShowMarginAssistant] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [marginTarget, setMarginTarget] = useState('40');
  const [marginType, setMarginType] = useState('margin'); // 'margin' = sobre venta (por defecto) | 'markup' = sobre costo
  const [marginApplying, setMarginApplying] = useState(false);
  const [marginPreview, setMarginPreview] = useState(false);

  // STOCK MÍNIMO: CONFIGURACIÓN GENERAL E INDIVIDUAL
  const defaultMinStock = (companySettings?.default_min_stock !== undefined && companySettings?.default_min_stock !== null && !isNaN(Number(companySettings.default_min_stock)))
    ? Number(companySettings.default_min_stock)
    : 5;

  const [showMinStockModal, setShowMinStockModal] = useState(false);
  const [globalMinStockInput, setGlobalMinStockInput] = useState(String(defaultMinStock));
  const [savingGlobalMinStock, setSavingGlobalMinStock] = useState(false);

  const [quickMinStockProduct, setQuickMinStockProduct] = useState(null);
  const [quickMinStockInput, setQuickMinStockInput] = useState('');
  const [savingQuickMinStock, setSavingQuickMinStock] = useState(false);

  const toggleSelectAll = () => {
    if (selectedProductIds.size === filteredProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const toggleSelectProduct = (id) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [replenishTarget, setReplenishTarget] = useState(null);
  
  // Formularios con todas las propiedades de las imágenes y especificaciones técnicas
  const [productForm, setProductForm] = useState({
    name: '',
    unit: 'Kg.',
    quantity: '10',
    cost_price: '0',
    cost_total: '0',
    sell_price: '0',
    margin_pct: '0',
    category: '',
    sku: '',
    image_url: '',
    images: [],
    description: '',
    dimensions: '',
    materials: '',
    owner_notes: '',
    min_stock: String(defaultMinStock),
    payment_type: 'contado', // 'contado' | 'cuenta_por_pagar'
    supplier: '',
    expiration_days: '10',
    is_exempt: false,
    has_variants: false,
    variants: []
  });

  const [replenishForm, setReplenishForm] = useState({
    quantity: '', unit_cost: ''
  });

  // Funciones de autocálculo instantáneo de precios, totales y margen %
  const isCompanyTaxFree = companySettings?.tax_enabled === false || Number(companySettings?.tax_rate) === 0;
  const getSafeTaxRate = () => {
    if (isCompanyTaxFree) return 0;
    return (companySettings?.tax_rate !== undefined && companySettings?.tax_rate !== null) ? Number(companySettings.tax_rate) : 0.16;
  };

  const handleCostPriceChange = (val) => {
    const cost = Number(val) || 0;
    const qty = Number(productForm.quantity) || 1;
    const total = (cost * qty).toFixed(2);
    const sell = Number(productForm.sell_price) || 0;
    const taxRate = getSafeTaxRate();
    const netSell = (isCompanyTaxFree || productForm.is_exempt) ? sell : sell / (1 + taxRate);
    let margin = productForm.margin_pct;
    if (cost > 0) {
      if (marginType === 'markup') {
        margin = (((netSell - cost) / cost) * 100).toFixed(1);
      } else {
        margin = netSell > 0 ? (((netSell - cost) / netSell) * 100).toFixed(1) : '0';
      }
    }
    setProductForm(prev => ({
      ...prev,
      cost_price: val,
      cost_total: String(parseFloat(total)),
      margin_pct: margin
    }));
  };

  const handleCostTotalChange = (val) => {
    const total = Number(val) || 0;
    const qty = Number(productForm.quantity) || 1;
    const cost = qty > 0 ? (total / qty).toFixed(2) : '0';
    const sell = Number(productForm.sell_price) || 0;
    const taxRate = getSafeTaxRate();
    const netSell = (isCompanyTaxFree || productForm.is_exempt) ? sell : sell / (1 + taxRate);
    let margin = productForm.margin_pct;
    if (cost > 0) {
      if (marginType === 'markup') {
        margin = (((netSell - Number(cost)) / Number(cost)) * 100).toFixed(1);
      } else {
        margin = netSell > 0 ? (((netSell - Number(cost)) / netSell) * 100).toFixed(1) : '0';
      }
    }
    setProductForm(prev => ({
      ...prev,
      cost_total: val,
      cost_price: String(parseFloat(cost)),
      margin_pct: margin
    }));
  };

  const handleQuantityChange = (val) => {
    const qty = Number(val) || 0;
    const cost = Number(productForm.cost_price) || 0;
    const total = (cost * qty).toFixed(2);
    setProductForm(prev => ({
      ...prev,
      quantity: val,
      stock: val,
      cost_total: String(parseFloat(total))
    }));
  };

  const PRESET_COLORS = [
    { name: 'Negro', hex: '#1e293b' },
    { name: 'Blanco', hex: '#ffffff' },
    { name: 'Gris Ceniza', hex: '#9ca3af' },
    { name: 'Gris Oscuro', hex: '#4b5563' },
    { name: 'Beige Arena', hex: '#e8d8c3' },
    { name: 'Azul Petróleo', hex: '#1e3a8a' },
    { name: 'Azul Marino', hex: '#0f172a' },
    { name: 'Rojo Terracota', hex: '#b91c1c' },
    { name: 'Verde Oliva', hex: '#15803d' },
    { name: 'Marrón Café', hex: '#78350f' },
    { name: 'Mostaza', hex: '#d97706' },
    { name: 'Rosa Palo', hex: '#f472b6' }
  ];

  const handleToggleVariants = (enabled) => {
    if (enabled) {
      const currentVars = (productForm.variants && productForm.variants.length > 0)
        ? productForm.variants
        : [
            { id: `var-${Date.now()}-1`, color: 'Beige Arena', stock: Math.max(1, Math.floor(Number(productForm.quantity) / 2) || 5), hex: '#e8d8c3', sku: '', image_url: '' },
            { id: `var-${Date.now()}-2`, color: 'Gris Ceniza', stock: Math.max(1, Math.ceil(Number(productForm.quantity) / 2) || 5), hex: '#9ca3af', sku: '', image_url: '' }
          ];
      const totalQty = getTotalVariantsStock(currentVars);
      const cost = Number(productForm.cost_price) || 0;
      setProductForm(prev => ({
        ...prev,
        has_variants: true,
        variants: currentVars,
        quantity: String(totalQty),
        cost_total: String(parseFloat((cost * totalQty).toFixed(2)))
      }));
    } else {
      setProductForm(prev => ({
        ...prev,
        has_variants: false
      }));
    }
  };

  const handleAddVariant = (preset = null) => {
    const defaultColor = preset ? preset.name : '';
    const defaultHex = preset ? preset.hex : '#64748b';
    const newVariant = {
      id: `var-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      color: defaultColor,
      stock: 5,
      hex: defaultHex,
      sku: '',
      image_url: ''
    };
    const nextVariants = [...(productForm.variants || []), newVariant];
    const totalQty = getTotalVariantsStock(nextVariants);
    const cost = Number(productForm.cost_price) || 0;
    setProductForm(prev => ({
      ...prev,
      has_variants: true,
      variants: nextVariants,
      quantity: String(totalQty),
      cost_total: String(parseFloat((cost * totalQty).toFixed(2)))
    }));
  };

  const handleUpdateVariant = (index, field, value) => {
    const nextVariants = [...(productForm.variants || [])];
    if (!nextVariants[index]) return;
    nextVariants[index] = { ...nextVariants[index], [field]: value };
    const totalQty = getTotalVariantsStock(nextVariants);
    const cost = Number(productForm.cost_price) || 0;
    setProductForm(prev => ({
      ...prev,
      variants: nextVariants,
      quantity: String(totalQty),
      cost_total: String(parseFloat((cost * totalQty).toFixed(2)))
    }));
  };

  const handleRemoveVariant = (index) => {
    const nextVariants = (productForm.variants || []).filter((_, i) => i !== index);
    const totalQty = getTotalVariantsStock(nextVariants);
    const cost = Number(productForm.cost_price) || 0;
    setProductForm(prev => ({
      ...prev,
      variants: nextVariants,
      has_variants: nextVariants.length > 0,
      quantity: String(totalQty),
      cost_total: String(parseFloat((cost * totalQty).toFixed(2)))
    }));
  };

  const handleSellPriceChange = (val) => {
    const sell = Number(val) || 0;
    const cost = Number(productForm.cost_price) || 0;
    const taxRate = getSafeTaxRate();
    const netSell = (isCompanyTaxFree || productForm.is_exempt) ? sell : sell / (1 + taxRate);
    let margin = productForm.margin_pct;
    if (cost > 0) {
      if (marginType === 'markup') {
        margin = (((netSell - cost) / cost) * 100).toFixed(1);
      } else {
        margin = netSell > 0 ? (((netSell - cost) / netSell) * 100).toFixed(1) : '0';
      }
    }
    setProductForm(prev => ({
      ...prev,
      sell_price: val,
      margin_pct: margin
    }));
  };

  const handleMarginChange = (val) => {
    const margin = Number(val) || 0;
    const cost = Number(productForm.cost_price) || 0;
    const taxRate = getSafeTaxRate();
    let netSell = 0;
    if (cost > 0) {
      if (marginType === 'markup') {
        netSell = cost * (1 + margin / 100);
      } else {
        netSell = margin < 100 ? cost / (1 - margin / 100) : cost;
      }
    }
    const finalSellPrice = (isCompanyTaxFree || productForm.is_exempt) ? netSell : netSell * (1 + taxRate);
    setProductForm(prev => ({
      ...prev,
      margin_pct: val,
      sell_price: String(parseFloat(finalSellPrice.toFixed(2)))
    }));
  };

  const lowStockProductsCount = useMemo(() => {
    return inventory.filter(p => p.stock !== 999 && !p.sku?.startsWith('SERV-') && (p.stock <= (p.min_stock !== undefined && p.min_stock !== null && !isNaN(Number(p.min_stock)) ? Number(p.min_stock) : defaultMinStock))).length;
  }, [inventory, defaultMinStock]);

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    return inventory.filter(p => {
      const isService = p.stock === 999 || p.sku?.startsWith('SERV-');
      const prodMin = (p.min_stock !== undefined && p.min_stock !== null && !isNaN(Number(p.min_stock))) ? Number(p.min_stock) : defaultMinStock;
      const isLowStock = !isService && (p.stock <= prodMin);

      if (activeStockFilter === 'low_stock' && !isLowStock) {
        return false;
      }

      const q = search.toLowerCase().trim();
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)) || (p.category && p.category.toLowerCase().includes(q));
    });
  }, [inventory, search, activeStockFilter, defaultMinStock]);

  // Simulación en tiempo real para el modal de stock mínimo
  const simulatedLowStockCount = useMemo(() => {
    const inputThreshold = Math.max(0, Math.floor(Number(globalMinStockInput) || 0));
    return (inventory || []).filter(p => {
      const isService = p.stock === 999 || p.sku?.startsWith('SERV-');
      if (isService) return false;
      return p.stock <= inputThreshold;
    }).length;
  }, [inventory, globalMinStockInput]);

  // Alertas de cuentas por pagar a proveedores
  const accountsPayableAlerts = useMemo(() => {
    return inventory.filter(p => p.payment_type === 'cuenta_por_pagar' && !p.is_paid);
  }, [inventory]);

  const handleMarkAsPaid = async (id) => {
    const res = await updateProduct(id, { is_paid: true });
    if (res && res.error) alert(`Error: ${res.error}`);
  };

  // Calcular precio de venta segun tipo de margen
  const calcNewPrice = (costPrice, targetPct, type) => {
    const cost = Number(costPrice) || 0;
    const pct  = Number(targetPct) || 0;
    if (cost <= 0) return null;
    if (type === 'markup') {
      // Markup sobre costo: Precio = Costo x (1 + pct/100)
      return cost * (1 + pct / 100);
    } else {
      // Margen sobre precio de venta: Precio = Costo / (1 - pct/100)
      // Ejemplo: Costo 4.50, Margen 50% => 4.50 / (1 - 0.50) = 4.50 / 0.50 = 9.00
      if (pct >= 100) return null;
      return cost / (1 - (pct / 100));
    }
  };

  // Preview de precios para los productos seleccionados (o todos si no hay ninguno marcado explícitamente)
  const marginPreviewData = useMemo(() => {
    const targets = selectedProductIds.size > 0 
      ? filteredProducts.filter(p => selectedProductIds.has(p.id))
      : filteredProducts;

    return targets.map(p => ({
      id: p.id,
      name: p.name,
      cost: p.cost_price,
      oldPrice: p.sell_price,
      newPrice: calcNewPrice(p.cost_price, marginTarget, marginType)
    }));
  }, [selectedProductIds, marginTarget, marginType, filteredProducts]);

  // Aplicar precios masivamente
  const handleApplyMargin = async () => {
    const valid = marginPreviewData.filter(p => p.newPrice !== null && p.newPrice > 0 && !isNaN(p.newPrice) && isFinite(p.newPrice));
    if (valid.length === 0) {
      alert('No hay productos con precio de costo válido para calcular el margen. Asegúrate de que tengan un precio de costo mayor a $0.00.');
      return;
    }
    const formulaText = marginType === 'margin' ? 'Margen sobre Precio de Venta' : 'Markup sobre Costo';
    if (!window.confirm(
      `¿Aplicar ${formulaText} del ${marginTarget}% a ${valid.length} producto(s)?\n\nEjemplo: Costo $4.50 con Margen 50% => Precio Venta = $9.00`
    )) return;

    setMarginApplying(true);

    try {
      // 1. Ejecutar todas las actualizaciones de base de datos en paralelo
      const promises = valid.map(async (item) => {
        try {
          const roundedPrice = Math.round(item.newPrice * 100) / 100;
          return await updateProduct(item.id, { sell_price: roundedPrice }, true); // skipPersist = true
        } catch (e) {
          return { error: e.message };
        }
      });

      const results = await Promise.all(promises);
      const fails = results.filter(r => r && r.error).length;
      const ok = valid.length - fails;

      // 2. Realizar una ÚNICA actualización masiva del estado local e interfaz
      const priceMap = new Map(valid.map(item => [item.id, Math.round(item.newPrice * 100) / 100]));
      const finalUpdatedInventory = inventory.map(p => {
        if (priceMap.has(p.id)) {
          return { ...p, sell_price: priceMap.get(p.id) };
        }
        return p;
      });

      // Guardar el estado completo de todos los productos a la vez en memoria y localStorage
      if (persistLocalInventory) {
        persistLocalInventory(finalUpdatedInventory);
      } else {
        const compId = companySettings.company_id || localStorage.getItem('punto_nexus_company_id');
        const branchInvKey = `punto_nexus_inventory_${compId}_${activeBranchId}`;
        localStorage.setItem(branchInvKey, JSON.stringify(finalUpdatedInventory));
        localStorage.setItem(`punto_nexus_inventory_${compId}`, JSON.stringify(finalUpdatedInventory));
      }
      
      // Limpiar selección y cerrar asistente
      setSelectedProductIds(new Set());
      setMarginPreview(false);
      setShowMarginAssistant(false);
      
      // Mostrar alerta de éxito sin reiniciar la aplicación
      alert(`✅ ${ok} producto(s) actualizado(s) correctamente con ${marginTarget}% de ${formulaText}.${fails > 0 ? `\n⚠️ ${fails} fallaron.` : ''}`);

    } catch (err) {
      console.error("Error al aplicar cambios masivos:", err);
      alert("Excepción al procesar la actualización masiva de precios.");
    } finally {
      setMarginApplying(false);
    }
  };

  // --- MANEJADORES DE STOCK MÍNIMO GENERAL E INDIVIDUAL ---

  // Guardar stock mínimo predeterminado de la empresa
  const handleSaveDefaultMinStock = async () => {
    const val = Math.max(0, Math.floor(Number(globalMinStockInput) || 0));
    setSavingGlobalMinStock(true);
    try {
      await updateCompanySettings({ default_min_stock: val });
      alert(`¡Stock mínimo predeterminado guardado en ${val} unidades para toda la tienda!`);
    } catch (e) {
      alert("Error al guardar: " + (e.message || e));
    } finally {
      setSavingGlobalMinStock(false);
    }
  };

  // Aplicar stock mínimo masivamente a todos o a seleccionados
  const handleApplyMinStockToTargets = async (targetIds = null) => {
    const val = Math.max(0, Math.floor(Number(globalMinStockInput) || 0));
    const isSelection = Array.isArray(targetIds) && targetIds.length > 0;
    const targetCount = isSelection ? targetIds.length : inventory.length;
    const scopeLabel = isSelection ? `${targetCount} producto(s) seleccionado(s)` : `TODO el inventario (${targetCount} productos)`;

    if (!window.confirm(`¿Confirmas aplicar un stock mínimo de ${val} unidades a ${scopeLabel}?`)) {
      return;
    }

    setSavingGlobalMinStock(true);
    try {
      await updateMinStockBatch(val, targetIds);
      if (!isSelection) {
        await updateCompanySettings({ default_min_stock: val });
      }
      alert(`¡Éxito! Se actualizó el stock mínimo a ${val} unidades en ${targetCount} producto(s).`);
      setShowMinStockModal(false);
    } catch (e) {
      alert("Error al aplicar stock mínimo masivo: " + (e.message || e));
    } finally {
      setSavingGlobalMinStock(false);
    }
  };

  // Edición rápida individual
  const handleOpenQuickMinStock = (product) => {
    setQuickMinStockProduct(product);
    const currentVal = (product.min_stock !== undefined && product.min_stock !== null && !isNaN(Number(product.min_stock)))
      ? Number(product.min_stock)
      : defaultMinStock;
    setQuickMinStockInput(String(currentVal));
  };

  const handleSaveQuickMinStock = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!quickMinStockProduct) return;
    const val = Math.max(0, Math.floor(Number(quickMinStockInput) || 0));
    setSavingQuickMinStock(true);
    try {
      await updateProduct(quickMinStockProduct.id, { min_stock: val });
      setQuickMinStockProduct(null);
    } catch (e) {
      alert("Error al actualizar producto: " + (e.message || e));
    } finally {
      setSavingQuickMinStock(false);
    }
  };

  // Abrir Modal de Creación
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setImageStats(null);
    setImageMode('upload');
    setUrlImageInput('');
    setProductForm({
      name: '',
      unit: 'Un.',
      quantity: '',
      cost_price: '',
      cost_total: '',
      sell_price: '',
      margin_pct: '',
      category: '',
      sku: '',
      image_url: '',
      images: [],
      description: '',
      dimensions: '',
      materials: '',
      owner_notes: '',
      min_stock: String(defaultMinStock),
      payment_type: 'contado',
      supplier: '',
      expiration_days: '30',
      is_exempt: false,
      has_variants: false,
      variants: []
    });
    setShowProductModal(true);
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setImageStats(null);
    setUrlImageInput('');
    const specs = parseProductSpecs(product);
    const productImages = (specs.images && specs.images.length > 0)
      ? specs.images
      : (product.image_url ? [product.image_url] : []);
    const img = productImages[0] || product.image_url || '';
    if (img.startsWith('http://') || img.startsWith('https://')) {
      setImageMode('url');
    } else {
      setImageMode('upload');
    }
    const isExempt = isCompanyTaxFree || !!product.is_exempt || !!product.is_tax_exempt;
    const taxRate = isExempt ? 0 : getSafeTaxRate();
    const sellPrice = Number(product.sell_price) || 0;
    const costPrice = Number(product.cost_price) || 0;
    const netSell = isExempt ? sellPrice : sellPrice / (1 + taxRate);
    let marginPct = '0';
    if (costPrice > 0) {
      if (marginType === 'markup') {
        marginPct = (((netSell - costPrice) / costPrice) * 100).toFixed(1);
      } else {
        marginPct = netSell > 0 ? (((netSell - costPrice) / netSell) * 100).toFixed(1) : '0';
      }
    }

    const productVariants = specs.variants && specs.variants.length > 0
      ? specs.variants
      : normalizeVariants(product.variants);
    const hasActiveVariants = productVariants.length > 0;
    const currentStockVal = hasActiveVariants ? getTotalVariantsStock(productVariants) : (product.stock || 0);

    setProductForm({
      name: product.name || '',
      unit: product.unit || 'Kg.',
      quantity: String(currentStockVal),
      cost_price: String(product.cost_price || 0),
      cost_total: String((product.cost_price || 0) * currentStockVal),
      sell_price: String(product.sell_price || 0),
      margin_pct: marginPct,
      category: product.category || '',
      sku: product.sku || '',
      image_url: img,
      images: productImages,
      description: specs.description || '',
      dimensions: specs.dimensions || '',
      materials: specs.materials || '',
      owner_notes: specs.owner_notes || '',
      min_stock: String(product.min_stock !== undefined && product.min_stock !== null && String(product.min_stock).trim() !== '' ? product.min_stock : defaultMinStock),
      payment_type: product.payment_type || 'contado',
      supplier: product.supplier || '',
      expiration_days: String(product.expiration_days || 10),
      is_exempt: isExempt,
      has_variants: hasActiveVariants,
      variants: productVariants
    });
    setShowProductModal(true);
  };

  // Abrir Modal de Reabastecimiento
  const handleOpenReplenish = (product) => {
    setReplenishTarget(product);
    setReplenishForm({
      quantity: '',
      unit_cost: String(product.cost_price || '')
    });
    setShowReplenishModal(true);
  };

  // Guardar Producto (Crear/Editar)
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productForm.name) {
      alert("Por favor ingresa el nombre del producto.");
      return;
    }

    const minStockVal = (productForm.min_stock !== undefined && productForm.min_stock !== null && String(productForm.min_stock).trim() !== '' && !isNaN(Number(productForm.min_stock)))
      ? Math.max(0, Math.floor(Number(productForm.min_stock)))
      : defaultMinStock;

    let currentImages = Array.isArray(productForm.images) ? [...productForm.images] : [];
    if (urlImageInput && urlImageInput.trim() && !currentImages.includes(urlImageInput.trim())) {
      currentImages.push(urlImageInput.trim());
    }

    const allImages = currentImages.length > 0
      ? currentImages
      : (productForm.image_url ? [productForm.image_url] : []);

    const productVariants = productForm.has_variants ? normalizeVariants(productForm.variants) : [];
    const totalVariantStock = productVariants.length > 0 ? getTotalVariantsStock(productVariants) : (Number(productForm.quantity) || 0);

    const serializedSpecs = serializeProductSpecs({
      description: productForm.description || '',
      dimensions: productForm.dimensions || '',
      materials: productForm.materials || '',
      owner_notes: productForm.owner_notes || '',
      images: allImages,
      variants: productVariants
    });

    const payload = {
      name: productForm.name,
      unit: productForm.unit,
      cost_price: Number(productForm.cost_price) || 0,
      sell_price: Number(productForm.sell_price) || 0,
      stock: totalVariantStock,
      min_stock: minStockVal,
      category: productForm.category,
      sku: productForm.sku,
      image_url: allImages[0] || '',
      images: allImages,
      description: serializedSpecs,
      dimensions: productForm.dimensions || '',
      materials: productForm.materials || '',
      owner_notes: productForm.owner_notes || '',
      variants: productVariants,
      payment_type: productForm.payment_type,
      supplier: productForm.supplier,
      expiration_days: Number(productForm.expiration_days) || 10,
      is_paid: productForm.payment_type === 'contado',
      is_exempt: !!productForm.is_exempt,
      is_tax_exempt: !!productForm.is_exempt,
      updated_at: new Date().toISOString()
    };

    let res;
    if (editingProduct) {
      res = await updateProduct(editingProduct.id, payload);
    } else {
      res = await addProduct(payload);
    }

    if (res && res.error) {
      alert(`Error al guardar producto: ${res.error}`);
    } else {
      setShowProductModal(false);
    }
  };

  // Guardar Compra/Reabastecimiento
  const handleReplenishSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(replenishForm.quantity);
    const cost = Number(replenishForm.unit_cost);

    if (!qty || qty <= 0 || !cost || cost <= 0) {
      alert("Por favor ingresa cantidades y costos válidos.");
      return;
    }

    const res = await replenishProduct(replenishTarget.id, qty, cost);
    if (res && res.error) {
      alert(`Error al registrar compra: ${res.error}`);
    } else {
      setShowReplenishModal(false);
    }
  };

  // Eliminar producto
  const handleDelete = async (id, name) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar "${name}" del inventario?`)) {
      const res = await deleteProduct(id);
      if (res && res.error) {
        alert(`Error al eliminar: ${res.error}`);
      }
    }
  };

  const formatCLP = (num) => {
    return formatCurrency(num);
  };

  // Valor total del inventario (Costo total)
  const totalInventoryValue = inventory.reduce((acc, p) => {
    // No sumar servicios o stock virtual infinito
    if (p.sku?.startsWith('SERV-') || p.stock === 999) return acc;
    return acc + (p.stock * p.cost_price);
  }, 0);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* BANNER DE ALERTAS DE CUENTAS POR PAGAR A PROVEEDORES */}
      {accountsPayableAlerts.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', border: '1px solid #fde68a', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', borderRadius: '16px', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <ShieldAlert size={22} style={{ color: '#d97706' }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#78350f' }}>
                Alertas de Cuentas por Pagar a Proveedores ({accountsPayableAlerts.length})
              </h4>
              <span style={{ fontSize: '11.5px', color: '#92400e', fontWeight: 600 }}>
                Cuentas de inventario con plazo de pago pendiente.
              </span>
            </div>
          </div>

          <div className="inventory-alerts-grid">
            {accountsPayableAlerts.map((alertItem, alertIdx) => (
              <div key={alertItem.id || alertItem.sku || `alert-${alertIdx}`} style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '14px', border: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>{alertItem.name}</div>
                  <div style={{ fontSize: '12px', color: '#c2410c', fontWeight: '700', marginTop: '2px' }}>
                    Proveedor: {alertItem.supplier || 'Maiz Venezuela'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <span>Monto Total:</span> <DualCurrencyDisplay amount={(alertItem.cost_price || 0) * (alertItem.stock || 1)} fontSize="12px" primaryColor="var(--color-cyan)" showSwap={false} />
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '8px', background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5', display: 'inline-block', marginBottom: '8px' }}>
                    ⏱️ {alertItem.expiration_days || 10} días plazo
                  </span>
                  <button 
                    onClick={() => handleMarkAsPaid(alertItem.id)}
                    className="btn-primary"
                    style={{ display: 'block', width: '100%', fontSize: '11px', fontWeight: '800', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)' }}
                  >
                    ✓ Pagado
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🏷️ PESTAÑAS NATIVAS DE FILTRO DE INVENTARIO (TODOS VS STOCK BAJO / CRÍTICO) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveStockFilter('all')}
          style={{
            padding: '9px 18px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: activeStockFilter === 'all' ? 900 : 700,
            background: activeStockFilter === 'all' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#ffffff',
            color: activeStockFilter === 'all' ? '#ffffff' : '#64748b',
            border: activeStockFilter === 'all' ? 'none' : '1px solid #cbd5e1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeStockFilter === 'all' ? '0 4px 14px rgba(2, 132, 199, 0.3)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Package size={16} />
          <span>Todos los Productos ({inventory.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveStockFilter('low_stock')}
          style={{
            padding: '9px 18px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: activeStockFilter === 'low_stock' ? 900 : 700,
            background: activeStockFilter === 'low_stock' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : '#fff5f5',
            color: activeStockFilter === 'low_stock' ? '#ffffff' : '#dc2626',
            border: activeStockFilter === 'low_stock' ? 'none' : '1px solid rgba(239, 68, 68, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeStockFilter === 'low_stock' ? '0 4px 14px rgba(239, 68, 68, 0.35)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <AlertTriangle size={16} />
          <span>⚠️ Inventario Bajo / Stock Crítico</span>
          <span style={{
            background: activeStockFilter === 'low_stock' ? '#ffffff' : '#ef4444',
            color: activeStockFilter === 'low_stock' ? '#dc2626' : '#ffffff',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 900,
            marginLeft: '2px'
          }}>
            {lowStockProductsCount}
          </span>
        </button>
      </div>

      {/* Controles de cabecera de inventario */}
      <div className="glass-panel inventory-controls-header" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="inventory-controls-buttons" style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: '260px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', maxWidth: '300px' }}
            placeholder="Buscar por SKU o Nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} />
            Agregar al inventario
          </button>

          {/* Botones de Importación y Descarga de Plantilla Excel */}
          <button 
            type="button" 
            onClick={handleDownloadTemplate}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34, 197, 94, 0.12)', borderColor: 'rgba(34, 197, 94, 0.3)', color: '#4ade80' }}
            title="Descarga el formato Excel listo para rellenar"
          >
            <Download size={15} />
            <span>Plantilla Excel</span>
          </button>

          <button 
            type="button" 
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(6, 182, 212, 0.12)', borderColor: 'rgba(6, 182, 212, 0.3)', color: '#38bdf8' }}
            title="Sube tu Excel completado con la plantilla"
          >
            <Upload size={15} />
            <span>Subir Excel</span>
          </button>

          {/* Configuración de Stock Mínimo General y Masivo */}
          <button 
            type="button" 
            onClick={() => {
              setGlobalMinStockInput(String(defaultMinStock));
              setShowMinStockModal(true);
            }}
            className="btn-secondary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: 'rgba(245, 158, 11, 0.12)', 
              borderColor: 'rgba(245, 158, 11, 0.35)', 
              color: '#d97706', 
              fontWeight: 800 
            }}
            title="Configurar stock mínimo general para la tienda o aplicarlo masivamente a productos"
          >
            <ShieldAlert size={15} />
            <span>Stock Mínimo ({defaultMinStock} uds)</span>
          </button>

          {companySettings?.business_type === 'alimentos' && (
            <button 
              type="button" 
              onClick={async () => {
                if (window.confirm("¿Deseas cargar el catálogo base para Minimarket / Abasto (Leche, Quesos, Pan, Arroz, Aceite, Abarrotes)? Esto reemplazará los productos demo por un inventario real de minimarket.")) {
                  await resetCatalogForGiro('alimentos');
                  alert("¡Catálogo de Minimarket cargado con éxito para esta sucursal!");
                }
              }}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)', borderColor: '#a855f7', color: '#9333ea', fontWeight: 800 }}
              title="Cargar productos base de Minimarket: Lácteos, Panadería, Abarrotes y Alimentos"
            >
              <ShoppingCart size={15} />
              <span>🛒 Cargar Catálogo Base Minimarket</span>
            </button>
          )}

          {companySettings?.business_type === 'gastronomia' && (
            <button 
              type="button" 
              onClick={async () => {
                if (window.confirm("¿Deseas cargar el catálogo completo de Restaurante / Comida al Paso? Esto actualizará tu inventario con el menú gourmet.")) {
                  await resetCatalogForGiro('gastronomia');
                  alert("¡Catálogo de Comida al Paso cargado con éxito!");
                }
              }}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)', borderColor: '#f59e0b', color: '#d97706', fontWeight: 800 }}
              title="Cargar menú gourmet de hamburguesas, pepitos, tequeños y arepas"
            >
              <Utensils size={15} />
              <span>🍔 Cargar Menú Comida al Paso</span>
            </button>
          )}

          {companySettings?.business_type === 'belleza' && (
            <button 
              type="button" 
              onClick={async () => {
                if (window.confirm("¿Deseas cargar el catálogo base para Barbería / Salón de Belleza & Estética (Cortes fade, balayage, membresías prepago, tintes e insumos técnicos)? Esto actualizará tu inventario.")) {
                  await resetCatalogForGiro('belleza');
                  alert("¡Catálogo de Barbería & Salón cargado con éxito para esta sucursal!");
                }
              }}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)', borderColor: '#ec4899', color: '#db2777', fontWeight: 800 }}
              title="Cargar servicios de barbería, coloración, pases de membresía e insumos técnicos de estética"
            >
              <Scissors size={15} />
              <span>✂️ Cargar Catálogo Base Barbería / Salón</span>
            </button>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleExcelUpload} 
            accept=".xlsx, .xls" 
            style={{ display: 'none' }} 
          />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Valor Total del Inventario (Costo)</div>
          <DualCurrencyDisplay amount={totalInventoryValue} fontSize="20px" primaryColor="var(--color-cyan)" align="right" showSwap={true} />
        </div>
      </div>

      {/* PANEL ASISTENTE DE MÁRGENES */}
      <div className="glass-panel" style={{
        padding: '0',
        marginBottom: '24px',
        border: showMarginAssistant ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(139,92,246,0.2)',
        borderRadius: '16px',
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}>
        {/* Cabecera del panel */}
        <div
          onClick={() => setShowMarginAssistant(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            background: showMarginAssistant
              ? 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.08))'
              : 'rgba(139,92,246,0.04)',
            cursor: 'pointer', userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              borderRadius: '10px', padding: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Percent size={16} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>Asistente de Márgenes de Venta</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                Ajusta los precios de venta automáticamente según el % de margen requerido
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {selectedProductIds.size > 0 && (
              <span style={{
                background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                color: 'white', borderRadius: '999px', padding: '3px 10px',
                fontSize: '11px', fontWeight: 900
              }}>
                {selectedProductIds.size} seleccionado(s)
              </span>
            )}
            {showMarginAssistant ? <ChevronUp size={18} color="#8b5cf6" /> : <ChevronDown size={18} color="#8b5cf6" />}
          </div>
        </div>

        {/* Contenido expandible */}
        {showMarginAssistant && (
          <div style={{ padding: '20px', borderTop: '1px solid rgba(139,92,246,0.15)' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '20px' }}>

              {/* Tipo de cálculo */}
              <div style={{ minWidth: '240px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  Fórmula de cálculo
                </label>
                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '3px', gap: '3px' }}>
                  {[
                    { key: 'margin', label: 'Margen (sobre venta)', hint: 'P = Costo ÷ (1 − %)' },
                    { key: 'markup', label: 'Markup (sobre costo)', hint: 'P = Costo × (1 + %)' }
                  ].map(opt => (
                    <button key={opt.key} onClick={() => setMarginType(opt.key)} title={opt.hint} style={{
                      flex: 1, padding: '7px 10px', borderRadius: '8px', border: 'none',
                      background: marginType === opt.key ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent',
                      boxShadow: marginType === opt.key ? '0 2px 8px rgba(139,92,246,0.3)' : 'none',
                      color: marginType === opt.key ? '#ffffff' : '#64748b',
                      fontSize: '12px', fontWeight: marginType === opt.key ? 900 : 600, cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}>{opt.label}</button>
                  ))}
                </div>
              </div>

              {/* Porcentaje objetivo */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  {marginType === 'markup' ? 'Markup objetivo (%)' : 'Margen objetivo (%)'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    min="1" max={marginType === 'margin' ? '99' : '500'}
                    step="1"
                    value={marginTarget}
                    onChange={e => setMarginTarget(e.target.value)}
                    style={{
                      width: '90px', padding: '8px 12px', borderRadius: '10px',
                      border: '2px solid rgba(139,92,246,0.4)',
                      fontSize: '18px', fontWeight: 900, color: '#8b5cf6',
                      textAlign: 'center', outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '22px', fontWeight: 900, color: '#8b5cf6' }}>%</span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {[15, 25, 30, 40, 50, 60].map(pct => (
                      <button key={pct} onClick={() => setMarginTarget(String(pct))} style={{
                        padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.3)',
                        background: marginTarget === String(pct) ? '#8b5cf6' : 'white',
                        color: marginTarget === String(pct) ? 'white' : '#8b5cf6',
                        fontSize: '12px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s'
                      }}>{pct}%</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
                <button
                  onClick={toggleSelectAll}
                  style={{
                    padding: '8px 16px', borderRadius: '10px', cursor: 'pointer',
                    background: selectedProductIds.size === filteredProducts.length ? 'rgba(139,92,246,0.15)' : 'white',
                    border: '1px solid rgba(139,92,246,0.4)',
                    color: '#8b5cf6', fontSize: '12px', fontWeight: 800,
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Check size={13} />
                  {selectedProductIds.size === filteredProducts.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>

                <button
                  onClick={() => setMarginPreview(v => !v)}
                  style={{
                    padding: '8px 16px', borderRadius: '10px', cursor: 'pointer',
                    background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.4)',
                    color: '#3b82f6', fontSize: '12px', fontWeight: 800,
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <TrendingUp size={13} />
                  {marginPreview ? 'Ocultar Previsualización' : 'Previsualizar Cambios'}
                </button>

                <button
                  onClick={handleApplyMargin}
                  disabled={marginApplying}
                  style={{
                    padding: '8px 20px', borderRadius: '10px', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                    border: 'none', color: 'white', fontSize: '13px', fontWeight: 900,
                    display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 14px rgba(139,92,246,0.35)',
                    transition: 'all 0.2s',
                    opacity: marginApplying ? 0.7 : 1
                  }}
                >
                  <Sparkles size={14} />
                  {marginApplying ? 'Aplicando...' : `Aplicar ${marginTarget}% a (${selectedProductIds.size > 0 ? selectedProductIds.size : filteredProducts.length})`}
                </button>
              </div>
            </div>

            {/* Previsualización */}
            {marginPreview && marginPreviewData.length > 0 && (
              <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.05))', borderBottom: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 800, color: '#475569', display: 'flex', gap: '16px' }}>
                  <span style={{ flex: '2' }}>Producto</span>
                  <span style={{ flex: '1', textAlign: 'right' }}>Costo</span>
                  <span style={{ flex: '1', textAlign: 'right' }}>Precio actual</span>
                  <span style={{ flex: '1', textAlign: 'right', color: '#8b5cf6' }}>Nuevo precio ({marginTarget}%)</span>
                  <span style={{ flex: '1', textAlign: 'right' }}>Diferencia</span>
                </div>
                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                  {marginPreviewData.map(item => {
                    const diff = item.newPrice !== null ? item.newPrice - item.oldPrice : null;
                    const pctChange = item.oldPrice > 0 && diff !== null ? (diff / item.oldPrice * 100) : null;
                    return (
                      <div key={item.id} style={{
                        display: 'flex', alignItems: 'center', gap: '16px',
                        padding: '10px 16px', borderBottom: '1px solid #f1f5f9',
                        fontSize: '13px'
                      }}>
                        <span style={{ flex: '2', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </span>
                        <span style={{ flex: '1', textAlign: 'right', color: '#64748b' }}>
                          {formatCurrency(item.cost)}
                        </span>
                        <span style={{ flex: '1', textAlign: 'right', color: '#64748b' }}>
                          {formatCurrency(item.oldPrice)}
                        </span>
                        <span style={{ flex: '1', textAlign: 'right', fontWeight: 900, color: '#8b5cf6' }}>
                          {item.newPrice !== null ? formatCurrency(item.newPrice) : <span style={{color:'#ef4444', fontSize:'11px'}}>Sin costo</span>}
                        </span>
                        <span style={{ flex: '1', textAlign: 'right', fontWeight: 700,
                          color: diff === null ? '#94a3b8' : diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#64748b' }}>
                          {diff === null ? '—' : diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)}
                          {pctChange !== null && <span style={{fontSize:'10px', marginLeft:'4px'}}>({pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}%)</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabla de Productos */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center', paddingLeft: '16px' }}>
                  <input
                    type="checkbox"
                    checked={selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0}
                    onChange={toggleSelectAll}
                    style={{ width: '15px', height: '15px', accentColor: '#8b5cf6', cursor: 'pointer' }}
                  />
                </th>
                <th>Nombre del Repuesto / Producto</th>
                <th>SKU / Código</th>
                <th style={{ textAlign: 'center' }}>Stock</th>
                <th style={{ textAlign: 'right' }}>Precio Costo</th>
                <th style={{ textAlign: 'right' }}>Precio Venta</th>
                <th style={{ textAlign: 'right' }}>{marginType === 'markup' ? 'Markup (%)' : 'Margen (%)'}</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
                    {activeStockFilter === 'low_stock' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={40} style={{ color: '#10b981' }} />
                        <span style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>¡Excelente! No hay productos con stock bajo</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Todos los productos de esta sucursal se encuentran sobre el nivel mínimo configurado.</span>
                        <button 
                          type="button" 
                          onClick={() => setActiveStockFilter('all')} 
                          style={{ marginTop: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Ver Todos los Productos
                        </button>
                      </div>
                    ) : (
                      'No se encontraron productos en el inventario.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product, index) => {
                  const isService = product.sku?.startsWith('SERV-') || product.stock === 999;
                  const prodMinStock = (product.min_stock !== undefined && product.min_stock !== null && !isNaN(Number(product.min_stock)))
                    ? Number(product.min_stock)
                    : defaultMinStock;
                  const hasCustomMinStock = product.min_stock !== undefined && product.min_stock !== null && Number(product.min_stock) !== defaultMinStock;
                  const isLowStock = !isService && product.stock <= prodMinStock;
                  const isOutOfStock = !isService && product.stock <= 0;
                  const isSelected = selectedProductIds.has(product.id);
                  
                  const cost = Number(product.cost_price) || 0;
                  const sell = Number(product.sell_price) || 0;
                  const isExemptProd = isCompanyTaxFree || product.is_exempt || product.is_tax_exempt;
                  const taxRateVal = getSafeTaxRate();
                  const netSell = isExemptProd ? sell : sell / (1 + taxRateVal);

                  let marginPct = 0;
                  if (marginType === 'markup') {
                    // Markup sobre costo: ((Precio Neto - Costo) / Costo) * 100
                    if (cost > 0) marginPct = ((netSell - cost) / cost) * 100;
                  } else {
                    // Margen sobre precio de venta neto: ((Precio Neto - Costo) / Precio Neto) * 100
                    if (netSell > 0) marginPct = ((netSell - cost) / netSell) * 100;
                  }

                  return (
                    <tr key={product.id ? `inv-${product.id}-${index}` : `inv-sku-${product.sku || index}-${index}`} style={{ background: isSelected ? 'rgba(139,92,246,0.04)' : 'transparent' }}>
                      <td style={{ textAlign: 'center', paddingLeft: '16px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProduct(product.id)}
                          style={{ width: '15px', height: '15px', accentColor: '#8b5cf6', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ fontWeight: 650 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name} 
                              onError={(e) => e.target.style.display = 'none'} 
                              style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0', flexShrink: 0 }} 
                            />
                          ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Package size={18} />
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span>{product.name}</span>
                              {!isCompanyTaxFree && (product.is_exempt || product.is_tax_exempt) && (
                                <span style={{ fontSize: '10px', fontWeight: 900, background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', border: '1px solid #bae6fd', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  🟢 (E) Exento IVA
                                </span>
                              )}
                            </div>
                            {isLowStock && (
                              <span style={{
                                color: isOutOfStock ? 'var(--color-rose)' : 'var(--color-amber)',
                                fontSize: '10px',
                                fontWeight: 700,
                                marginTop: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <ShieldAlert size={10} />
                                {isOutOfStock ? 'Sin stock disponible' : `Stock crítico (Mínimo: ${prodMinStock})`}
                              </span>
                            )}
                            {(() => {
                              const variants = getProductVariants(product);
                              if (variants.length === 0) return null;
                              return (
                                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Palette size={12} style={{ color: '#16a34a' }} />
                                    <span>Colores disponibles ({variants.length}):</span>
                                  </span>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {variants.map((v, idx) => {
                                      const vStock = Number(v.stock || 0);
                                      const isOut = vStock <= 0;
                                      return (
                                        <span
                                          key={v.id || idx}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            padding: '2px 7px',
                                            borderRadius: '6px',
                                            background: isOut ? '#fef2f2' : '#f0fdf4',
                                            border: isOut ? '1px solid #fecaca' : '1px solid #bbf7d0',
                                            fontSize: '10.5px',
                                            fontWeight: 700,
                                            color: isOut ? '#b91c1c' : '#166534'
                                          }}
                                          title={`Color ${v.color}: ${vStock} unidades disponibles en inventario`}
                                        >
                                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: v.hex || '#64748b', border: '1.5px solid #ffffff', boxShadow: '0 0 0 1px #94a3b8', display: 'inline-block', flexShrink: 0 }} />
                                          <span>{v.color}:</span>
                                          <strong style={{ fontWeight: 850 }}>{isOut ? 'Agotado' : `${vStock} unids`}</strong>
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{product.sku || 'S/N'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800 }}>
                        <span className={`badge ${
                          isService ? 'badge-success' : isOutOfStock ? 'badge-danger' : isLowStock ? 'badge-warning' : 'badge-success'
                        }`} style={{ background: 'transparent', border: '1px solid currentColor' }}>
                          {isService ? 'Servicio' : product.stock}
                        </span>
                        {!isService && (
                          <div style={{ marginTop: '4px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenQuickMinStock(product);
                              }}
                              title={`Stock mínimo individual: ${prodMinStock} uds (${hasCustomMinStock ? 'Personalizado' : 'General'}). Clic para modificar.`}
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '5px',
                                background: hasCustomMinStock ? 'rgba(59, 130, 246, 0.12)' : '#f8fafc',
                                color: hasCustomMinStock ? '#2563eb' : '#64748b',
                                border: hasCustomMinStock ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                                cursor: 'pointer',
                                fontWeight: 750,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>Mín: {prodMinStock}</span>
                              <Edit3 size={8} style={{ opacity: 0.8 }} />
                            </button>
                          </div>
                        )}
                        {(() => {
                          const variants = getProductVariants(product);
                          if (variants.length === 0) return null;
                          return (
                            <div style={{ marginTop: '4px', textAlign: 'center' }}>
                              <span style={{ 
                                fontSize: '9.5px', 
                                background: '#dcfce7', 
                                color: '#15803d', 
                                border: '1px solid #86efac', 
                                padding: '2px 6px', 
                                borderRadius: '5px', 
                                fontWeight: 800,
                                display: 'inline-block',
                                whiteSpace: 'nowrap'
                              }}>
                                🎨 Suma de {variants.length} colores
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {isService ? '-' : <DualCurrencyDisplay amount={product.cost_price} fontSize="13px" primaryColor="#94a3b8" align="right" showSwap={false} />}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-cyan)' }}>
                        <DualCurrencyDisplay amount={product.sell_price} fontSize="13px" primaryColor="var(--color-cyan)" align="right" showSwap={false} />
                        {isCompanyTaxFree ? (
                          <div style={{ fontSize: '9.5px', color: '#0891b2', fontWeight: 700, marginTop: '2px' }}>
                            Precio Directo (Sin IVA)
                          </div>
                        ) : (product.is_exempt || product.is_tax_exempt) ? (
                          <div style={{ fontSize: '9.5px', color: '#059669', fontWeight: 800, marginTop: '2px' }}>
                            🟢 0% IVA (Sin recargo)
                          </div>
                        ) : (
                          <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                            Neto: {formatCurrency(product.sell_price / (1 + taxRateVal))}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', color: marginPct > 0 ? 'var(--color-emerald)' : marginPct < 0 ? 'var(--color-rose)' : 'var(--text-muted)', fontWeight: '700' }}>
                        {isService ? '100%' : `${marginPct > 0 ? '+' : ''}${marginPct.toFixed(1)}%`}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {!isService && (
                            <button
                              className="btn-secondary"
                              style={{ padding: '6px', borderRadius: '8px', color: 'var(--color-amber)', border: '1px solid rgba(245,158,11,0.2)' }}
                              onClick={() => handleOpenReplenish(product)}
                              title="Comprar / Reabastecer Stock"
                            >
                              <ArrowDownCircle size={14} />
                            </button>
                          )}
                          <button
                            className="btn-secondary"
                            style={{ padding: '6px', borderRadius: '8px', color: 'var(--color-cyan)' }}
                            onClick={() => handleOpenEdit(product)}
                            title="Editar Datos"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '6px', borderRadius: '8px', color: 'var(--color-rose)', border: '1px solid rgba(239,68,68,0.1)' }}
                            onClick={() => handleDelete(product.id, product.name)}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
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

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '720px', width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '28px', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.18)' }}>
            
            {/* Header del Modal */}
            <div className="modal-header" style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  {editingProduct ? 'Editar Producto' : 'Agregar Producto al Inventario'}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', fontWeight: '500' }}>
                  {editingProduct ? 'Modifica los detalles del producto existente.' : 'Ingresa la información general, stock, costos y datos del proveedor.'}
                </p>
              </div>
              <button 
                type="button"
                className="modal-close" 
                onClick={() => setShowProductModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* SECCIÓN 1: INFORMACIÓN BÁSICA DEL PRODUCTO */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#0f172a', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <Package size={18} style={{ color: 'var(--color-cyan)' }} />
                  <span>Información del Producto</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  {/* Nombre */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                      Nombre del producto <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: Nombre del producto"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      required
                      style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', fontWeight: '600' }}
                    />
                  </div>

                  {/* Código SKU */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                      Código / SKU
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: SKU-1001"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                      style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  {/* Categoría */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                      Categoría
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: Categoría del producto"
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
                    />
                  </div>

                  {/* Unidad de Medida */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                      Unidad de Medida
                    </label>
                    <select
                      value={productForm.unit || 'Un.'}
                      onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                      className="form-input"
                      style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', fontWeight: '600' }}
                    >
                      <option value="Un.">Unidades (Un.)</option>
                      <option value="Kg.">Kilogramos (Kg.)</option>
                      <option value="Lt.">Litros (Lt.)</option>
                      <option value="g">Gramos (g)</option>
                      <option value="m">Metros (m)</option>
                      <option value="Cajas">Cajas</option>
                      <option value="Paquetes">Paquetes</option>
                    </select>
                  </div>
                </div>

                {/* ── DESCRIPCIÓN DETALLADA (VISIBILIDAD INMEDIATA) ── */}
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={15} style={{ color: 'var(--color-cyan)' }} />
                    <span>Descripción Detallada del Producto (Vitrina Online)</span>
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Describe en detalle las características, sabor, uso, beneficios o presentación del producto..."
                    value={productForm.description || ''}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', resize: 'vertical' }}
                  />
                </div>

                {/* ── GALERÍA MULTI-FOTOS DEL PRODUCTO (PORTADA + FOTOS ADICIONALES) ── */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ImageIcon size={15} style={{ color: 'var(--color-cyan)' }} />
                        <span>Galería de Fotos del Producto</span>
                      </label>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: (productForm.images?.length > 0 || productForm.image_url) ? 'rgba(6, 182, 212, 0.1)' : '#f1f5f9',
                        color: (productForm.images?.length > 0 || productForm.image_url) ? 'var(--color-cyan)' : '#94a3b8'
                      }}>
                        {productForm.images?.length > 0 ? `${productForm.images.length} foto(s)` : (productForm.image_url ? '1 foto' : 'Sin fotos')}
                      </span>
                    </div>

                    {/* Selector de Modo */}
                    <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '2px', borderRadius: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setImageMode('upload')}
                        style={{
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          border: 'none',
                          cursor: 'pointer',
                          background: imageMode === 'upload' ? '#0f172a' : 'transparent',
                          color: imageMode === 'upload' ? '#ffffff' : '#64748b'
                        }}
                      >
                        📁 Subir Fotos
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageMode('url')}
                        style={{
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          border: 'none',
                          cursor: 'pointer',
                          background: imageMode === 'url' ? '#0f172a' : 'transparent',
                          color: imageMode === 'url' ? '#ffffff' : '#64748b'
                        }}
                      >
                        🔗 Enlace Web
                      </button>
                    </div>
                  </div>

                  {/* Tira de Fotos Cargadas (Thumbnails) */}
                  {Array.isArray(productForm.images) && productForm.images.length > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      overflowX: 'auto',
                      padding: '10px',
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      marginBottom: '12px'
                    }}>
                      {productForm.images.map((imgSrc, imgIdx) => (
                        <div
                          key={`prod-thumb-${imgIdx}`}
                          style={{
                            position: 'relative',
                            width: '68px',
                            height: '68px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            border: imgIdx === 0 ? '2px solid var(--color-cyan)' : '1px solid #cbd5e1',
                            boxShadow: imgIdx === 0 ? '0 0 0 2px rgba(6,182,212,0.25)' : 'none',
                            background: '#f8fafc'
                          }}
                        >
                          <img
                            src={imgSrc}
                            alt={`Foto ${imgIdx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />

                          {/* Badge de Portada */}
                          {imgIdx === 0 ? (
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: 'linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.85) 100%)',
                              color: '#38bdf8',
                              fontSize: '9px',
                              fontWeight: 900,
                              textAlign: 'center',
                              padding: '2px 0'
                            }}>
                              PORTADA
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(imgIdx)}
                              title="Convertir en foto principal (Portada)"
                              style={{
                                position: 'absolute',
                                bottom: '2px',
                                left: '2px',
                                background: 'rgba(15, 23, 42, 0.75)',
                                color: '#fbbf24',
                                border: 'none',
                                borderRadius: '4px',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0
                              }}
                            >
                              <Star size={11} />
                            </button>
                          )}

                          {/* Botón de Quitar esta foto */}
                          <button
                            type="button"
                            onClick={() => handleRemoveImageAtIndex(imgIdx)}
                            title="Eliminar esta foto"
                            style={{
                              position: 'absolute',
                              top: '2px',
                              right: '2px',
                              background: 'rgba(239, 68, 68, 0.9)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            <X size={11} strokeWidth={3} />
                          </button>
                        </div>
                      ))}

                      {/* Botón rápido para agregar otra foto */}
                      <button
                        type="button"
                        onClick={() => {
                          if (imageMode === 'upload') {
                            productImageInputRef.current && productImageInputRef.current.click();
                          }
                        }}
                        style={{
                          width: '68px',
                          height: '68px',
                          borderRadius: '10px',
                          border: '2px dashed #cbd5e1',
                          background: '#f8fafc',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          color: '#64748b'
                        }}
                        title="Agregar otra foto"
                      >
                        <Plus size={18} style={{ color: 'var(--color-cyan)' }} />
                        <span style={{ fontSize: '9.5px', fontWeight: 800, marginTop: '2px' }}>+ Foto</span>
                      </button>
                    </div>
                  )}

                  {/* Control de Carga según Modo */}
                  {imageMode === 'upload' ? (
                    <div>
                      <input
                        type="file"
                        ref={productImageInputRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            Array.from(e.target.files).forEach(f => handleProductImageFileSelect(f));
                          }
                        }}
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                      />

                      <div
                        onClick={() => productImageInputRef.current && productImageInputRef.current.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            Array.from(e.dataTransfer.files).forEach(f => handleProductImageFileSelect(f));
                          }
                        }}
                        style={{
                          border: '2px dashed #cbd5e1',
                          borderRadius: '12px',
                          padding: '16px',
                          textAlign: 'center',
                          background: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.25s ease'
                        }}
                      >
                        {compressingImage ? (
                          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-cyan)' }}>
                            ⏳ Comprimiendo y optimizando foto...
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <Upload size={22} style={{ color: 'var(--color-cyan)' }} />
                            <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
                              {productForm.images?.length > 0 ? 'Haz clic o arrastra para añadir MÁS fotos' : 'Haz clic o arrastra una o varias fotos aquí'}
                            </div>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              Soporta PNG, JPG, WEBP • Compresión automática para máxima velocidad en vitrina y POS
                            </span>
                          </div>
                        )}
                      </div>

                      {imageStats && (
                        <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '6px', textAlign: 'center' }}>
                          ⚡ Última foto optimizada: {formatBytes(imageStats.originalSize)} ➔ {formatBytes(imageStats.compressedSize)} ({imageStats.savingsPct}% ahorro)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://ejemplo.com/foto-producto.jpg"
                        value={urlImageInput}
                        onChange={(e) => setUrlImageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddImageUrl();
                          }
                        }}
                        style={{ flex: 1, background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        className="btn-primary"
                        style={{
                          padding: '9px 16px',
                          fontSize: '12px',
                          fontWeight: 800,
                          borderRadius: '10px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        + Añadir Foto
                      </button>
                    </div>
                  )}
                </div>

                {/* ── FICHA TÉCNICA ADICIONAL (DIMENSIONES, MATERIALES, NOTAS) ── */}
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                    {/* Dimensiones */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Ruler size={14} style={{ color: 'var(--color-cyan)' }} />
                        <span>Dimensiones / Medidas</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: 30 x 20 x 15 cm / 450g / Talla M"
                        value={productForm.dimensions || ''}
                        onChange={(e) => setProductForm({ ...productForm, dimensions: e.target.value })}
                        style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
                      />
                    </div>

                    {/* Materiales */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Layers size={14} style={{ color: 'var(--color-amber)' }} />
                        <span>Materiales / Ingredientes</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: Acero inoxidable, Cuero / Pan brioche"
                        value={productForm.materials || ''}
                        onChange={(e) => setProductForm({ ...productForm, materials: e.target.value })}
                        style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
                      />
                    </div>
                  </div>

                  {/* Comentarios del Dueño */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={14} style={{ color: 'var(--color-emerald)' }} />
                      <span>Comentarios y Notas del Vendedor / Dueño</span>
                    </label>
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="Recomendaciones de uso, detalles de calidad o sugerencias para tus clientes..."
                      value={productForm.owner_notes || ''}
                      onChange={(e) => setProductForm({ ...productForm, owner_notes: e.target.value })}
                      style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', resize: 'vertical' }}
                    />
                  </div>
                </div>

              </div>

              {/* SECCIÓN 2: INVENTARIO, COSTOS Y PRECIOS */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#0f172a', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <DollarSign size={18} style={{ color: 'var(--color-emerald)' }} />
                  <span>Stock y Precios</span>
                </div>

                {/* 🎨 SECCIÓN VARIANTES DE COLOR CON STOCK INDEPENDIENTE 🎨 */}
                <div style={{
                  background: productForm.has_variants ? '#f0fdf4' : '#ffffff',
                  border: productForm.has_variants ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: productForm.has_variants ? '#dcfce7' : '#e0f2fe', color: productForm.has_variants ? '#16a34a' : '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Palette size={18} />
                      </div>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                          🎨 Colores Disponibles y Cantidad de Inventario por Color
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          El cliente puede elegir el color en la tienda online o POS (ej: muebles, ropa, alfombras). Cada color descuenta su propia cantidad disponible en inventario.
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleVariants(!productForm.has_variants)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                        background: productForm.has_variants ? '#16a34a' : '#0284c7',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                      }}
                    >
                      {productForm.has_variants ? <Check size={14} /> : <Plus size={14} />}
                      <span>{productForm.has_variants ? 'Colores Activos' : 'Activar Colores'}</span>
                    </button>
                  </div>

                  {productForm.has_variants && (
                    <div style={{ marginTop: '14px', borderTop: '1px solid #bbf7d0', paddingTop: '14px' }}>
                      {/* Paleta rápida de tonos populares */}
                      <div style={{ marginBottom: '14px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.04em' }}>
                          + Agregar rápidamente un tono:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {PRESET_COLORS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleAddVariant(preset)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '20px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#334155',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#94a3b8';
                                e.currentTarget.style.background = '#f8fafc';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#cbd5e1';
                                e.currentTarget.style.background = '#ffffff';
                              }}
                            >
                              <span style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: preset.hex,
                                border: preset.hex === '#ffffff' ? '1px solid #cbd5e1' : '1px solid rgba(0,0,0,0.15)',
                                display: 'inline-block',
                                flexShrink: 0
                              }} />
                              <span>{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Encabezado de columnas para las variantes */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '38px 1fr 120px 36px',
                        gap: '10px',
                        padding: '0 12px',
                        marginBottom: '8px',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#166534',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em'
                      }}>
                        <span style={{ textAlign: 'center' }}>Tono</span>
                        <span>Color Disponible (Nombre)</span>
                        <span style={{ textAlign: 'center' }}>Stock / Cant.</span>
                        <span></span>
                      </div>

                      {/* Lista de colores configurados */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {productForm.variants.map((variant, index) => (
                          <div 
                            key={variant.id || index}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '38px 1fr 120px 36px',
                              gap: '10px',
                              alignItems: 'center',
                              background: '#ffffff',
                              padding: '8px 12px',
                              borderRadius: '12px',
                              border: '1px solid #cbd5e1',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                              boxSizing: 'border-box'
                            }}
                          >
                            {/* Selector visual de color */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <label
                                style={{
                                  position: 'relative',
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  backgroundColor: variant.hex || '#94a3b8',
                                  border: '2px solid #ffffff',
                                  boxShadow: '0 0 0 1.5px #cbd5e1, 0 2px 4px rgba(0,0,0,0.1)',
                                  cursor: 'pointer',
                                  overflow: 'hidden',
                                  display: 'block',
                                  flexShrink: 0,
                                  transition: 'transform 0.15s ease'
                                }}
                                title="Hacer clic para cambiar tono"
                              >
                                <input
                                  type="color"
                                  value={variant.hex || '#94a3b8'}
                                  onChange={(e) => handleUpdateVariant(index, 'hex', e.target.value)}
                                  style={{
                                    position: 'absolute',
                                    top: '-50%',
                                    left: '-50%',
                                    width: '200%',
                                    height: '200%',
                                    opacity: 0,
                                    cursor: 'pointer'
                                  }}
                                />
                              </label>
                            </div>

                            {/* Nombre del color */}
                            <div style={{ minWidth: 0, width: '100%' }}>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Nombre del Color (ej: Beige Arena)"
                                value={variant.color}
                                onChange={(e) => handleUpdateVariant(index, 'color', e.target.value)}
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  fontSize: '13px',
                                  padding: '8px 12px',
                                  background: '#f8fafc',
                                  color: '#0f172a',
                                  fontWeight: 600,
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1'
                                }}
                                required
                              />
                            </div>

                            {/* Stock para este color */}
                            <div style={{ minWidth: 0, width: '100%' }}>
                              <div style={{ position: 'relative', width: '100%' }}>
                                <input
                                  type="number"
                                  className="form-input"
                                  placeholder="0"
                                  min="0"
                                  value={variant.stock}
                                  onChange={(e) => handleUpdateVariant(index, 'stock', Math.max(0, parseInt(e.target.value) || 0))}
                                  style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    fontSize: '13px',
                                    padding: '8px 32px 8px 10px',
                                    textAlign: 'center',
                                    background: '#f8fafc',
                                    color: '#0f172a',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1'
                                  }}
                                  required
                                />
                                <span style={{
                                  position: 'absolute',
                                  right: '8px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  fontSize: '10px',
                                  color: '#64748b',
                                  fontWeight: 700,
                                  pointerEvents: 'none',
                                  userSelect: 'none'
                                }}>
                                  uds
                                </span>
                              </div>
                            </div>

                            {/* Eliminar Color */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveVariant(index)}
                                style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '8px',
                                  background: '#fee2e2',
                                  border: '1px solid #fecaca',
                                  color: '#ef4444',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#fca5a5';
                                  e.currentTarget.style.color = '#b91c1c';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#fee2e2';
                                  e.currentTarget.style.color = '#ef4444';
                                }}
                                title="Eliminar este color"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Footer con agregar y totalizador */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleAddVariant()}
                          style={{
                            background: '#ffffff',
                            border: '1.5px dashed #3b82f6',
                            color: '#2563eb',
                            borderRadius: '8px',
                            padding: '7px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#eff6ff';
                            e.currentTarget.style.borderColor = '#2563eb';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.borderColor = '#3b82f6';
                          }}
                        >
                          <Plus size={14} />
                          <span>Agregar otro color</span>
                        </button>

                        <div style={{
                          fontSize: '12px',
                          color: '#15803d',
                          fontWeight: 800,
                          background: '#dcfce7',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          border: '1px solid #86efac',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>📦 Stock Total por Colores:</span>
                          <strong style={{ fontSize: '13px', color: '#14532d' }}>{getTotalVariantsStock(productForm.variants)} unidades</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Grid para Cantidades */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                      Cantidad / Stock Total <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0"
                      value={productForm.has_variants ? getTotalVariantsStock(productForm.variants) : productForm.quantity}
                      onChange={(e) => !productForm.has_variants && handleQuantityChange(e.target.value)}
                      readOnly={productForm.has_variants}
                      required
                      style={{
                        background: productForm.has_variants ? '#f0fdf4' : '#ffffff',
                        borderColor: productForm.has_variants ? '#86efac' : '#cbd5e1',
                        color: productForm.has_variants ? '#166534' : '#0f172a',
                        fontWeight: '700'
                      }}
                    />
                    {productForm.has_variants && (
                      <span style={{ fontSize: '10px', color: '#15803d', fontWeight: 700, marginTop: '3px', display: 'block' }}>
                        ✓ Calculado automáticamente por la suma de colores ({productForm.variants.length} colores)
                      </span>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: 0 }}>
                        Stock Mínimo (Alerta)
                      </label>
                      <button
                        type="button"
                        onClick={() => setProductForm(prev => ({ ...prev, min_stock: String(defaultMinStock) }))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                        title={`Restablecer al stock mínimo general de la tienda (${defaultMinStock})`}
                      >
                        Usar general ({defaultMinStock})
                      </button>
                    </div>
                    <input
                      type="number"
                      className="form-input"
                      placeholder={String(defaultMinStock)}
                      value={productForm.min_stock}
                      onChange={(e) => setProductForm({ ...productForm, min_stock: e.target.value })}
                      style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
                    />
                    <span style={{ fontSize: '10px', color: Number(productForm.min_stock) === defaultMinStock ? '#16a34a' : '#2563eb', fontWeight: 650, marginTop: '3px', display: 'block' }}>
                      {Number(productForm.min_stock) === defaultMinStock
                        ? `✓ Usa el predeterminado general (${defaultMinStock} uds)`
                        : `⚡ Personalizado individualmente para este producto`}
                    </span>
                  </div>
                </div>

                {/* Grid para Precios y Costos (Organizado en 2 filas balanceadas de 2 columnas) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  {/* Costo unitario */}
                  <div style={{ minWidth: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', display: 'block' }}>
                      Costo Unitario <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type="number"
                        step="any"
                        className="form-input"
                        placeholder="0.00"
                        value={productForm.cost_price}
                        onChange={(e) => handleCostPriceChange(e.target.value)}
                        required
                        style={{ width: '100%', boxSizing: 'border-box', paddingRight: '45px', background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', fontWeight: '600' }}
                      />
                      <span style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>
                        $/{productForm.unit || 'Un.'}
                      </span>
                    </div>
                  </div>

                  {/* Costo total */}
                  <div style={{ minWidth: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', display: 'block' }}>
                      Costo Total (Auto-calculado)
                    </label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type="number"
                        step="any"
                        className="form-input"
                        placeholder="0.00"
                        value={productForm.cost_total}
                        onChange={(e) => handleCostTotalChange(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', paddingRight: '28px', background: '#f1f5f9', borderColor: '#cbd5e1', color: '#0f172a', fontWeight: '600' }}
                      />
                      <span style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>$</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Precio de venta */}
                  <div style={{ minWidth: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', display: 'block' }}>
                      Precio de Venta al Público
                    </label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type="number"
                        step="any"
                        className="form-input"
                        placeholder="0.00"
                        value={productForm.sell_price}
                        onChange={(e) => handleSellPriceChange(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', paddingRight: '45px', background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', fontWeight: '700' }}
                      />
                      <span style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>
                        $/{productForm.unit || 'Un.'}
                      </span>
                    </div>
                  </div>

                  {/* Margen % */}
                  <div style={{ minWidth: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Margen de Ganancia</span>
                      <span title="Porcentaje de ganancia sobre el costo unitario" style={{ cursor: 'help', color: 'var(--color-cyan)', fontWeight: '800' }}>ⓘ</span>
                    </label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type="number"
                        step="any"
                        className="form-input"
                        placeholder="0"
                        value={productForm.margin_pct}
                        onChange={(e) => handleMarginChange(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', paddingRight: '28px', background: '#ffffff', borderColor: '#cbd5e1', color: '#059669', fontWeight: '700' }}
                      />
                      <span style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>%</span>
                    </div>
                  </div>
                </div>

                {/* Configuración Fiscal: Exento de IVA / Régimen de la Empresa */}
                {isCompanyTaxFree ? (
                  <div style={{
                    marginTop: '16px',
                    background: 'rgba(6, 182, 212, 0.06)',
                    border: '1px solid rgba(6, 182, 212, 0.25)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <ShieldCheck size={20} color="var(--color-cyan, #06b6d4)" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '11.5px', color: '#0e7490', lineHeight: 1.4 }}>
                      <strong style={{ color: '#0891b2' }}>Régimen Sin IVA (0%):</strong> Tu empresa opera exenta de IVA. Los precios son netos directos y no se aplicará recargo fiscal en el POS.
                    </div>
                  </div>
                ) : (
                  <>
                    <div 
                      onClick={() => {
                        const newIsExempt = !productForm.is_exempt;
                        const cost = Number(productForm.cost_price) || 0;
                        const margin = Number(productForm.margin_pct) || 0;
                        const taxRate = getSafeTaxRate();
                        let netSell = 0;
                        if (cost > 0) {
                          if (marginType === 'markup') {
                            netSell = cost * (1 + margin / 100);
                          } else {
                            netSell = margin < 100 ? cost / (1 - margin / 100) : cost;
                          }
                        } else {
                          const currentSell = Number(productForm.sell_price) || 0;
                          netSell = productForm.is_exempt ? currentSell : currentSell / (1 + taxRate);
                        }
                        const finalSellPrice = newIsExempt ? netSell : netSell * (1 + taxRate);
                        setProductForm(prev => ({
                          ...prev,
                          is_exempt: newIsExempt,
                          sell_price: String(parseFloat(finalSellPrice.toFixed(2)))
                        }));
                      }}
                      style={{
                        marginTop: '16px',
                        background: productForm.is_exempt ? '#ecfdf5' : '#ffffff',
                        border: productForm.is_exempt ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          id="is_exempt_check"
                          checked={!!productForm.is_exempt}
                          onChange={(e) => {
                            const newIsExempt = e.target.checked;
                            const cost = Number(productForm.cost_price) || 0;
                            const margin = Number(productForm.margin_pct) || 0;
                            const taxRate = getSafeTaxRate();
                            let netSell = 0;
                            if (cost > 0) {
                              if (marginType === 'markup') {
                                netSell = cost * (1 + margin / 100);
                              } else {
                                netSell = margin < 100 ? cost / (1 - margin / 100) : cost;
                              }
                            } else {
                              const currentSell = Number(productForm.sell_price) || 0;
                              netSell = productForm.is_exempt ? currentSell : currentSell / (1 + taxRate);
                            }
                            const finalSellPrice = newIsExempt ? netSell : netSell * (1 + taxRate);
                            setProductForm(prev => ({
                              ...prev,
                              is_exempt: newIsExempt,
                              sell_price: String(parseFloat(finalSellPrice.toFixed(2)))
                            }));
                          }}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <label htmlFor="is_exempt_check" style={{ fontSize: '12.5px', fontWeight: 800, color: productForm.is_exempt ? '#047857' : '#1e293b', cursor: 'pointer', display: 'block' }}>
                            🚫 Producto Exento de IVA (Sin Impuesto por defecto)
                          </label>
                          <span style={{ fontSize: '11px', color: productForm.is_exempt ? '#059669' : '#64748b' }}>
                            Al marcar esta casilla, este producto no sumará IVA al ser facturado en el POS.
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '10.5px', fontWeight: 900, background: productForm.is_exempt ? '#10b981' : '#f1f5f9', color: productForm.is_exempt ? '#ffffff' : '#64748b', padding: '4px 10px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                        {productForm.is_exempt ? '🟢 EXENTO (0% IVA)' : '🔵 AFECTO A IVA'}
                      </span>
                    </div>

                    {/* Desglose Fiscal de Impuestos */}
                    {(() => {
                      const sPrice = Number(productForm.sell_price) || 0;
                      const currentTaxRate = getSafeTaxRate();
                      const taxPctStr = `${(currentTaxRate * 100).toFixed(0)}%`;
                      
                      if (sPrice <= 0) return null;

                      if (productForm.is_exempt) {
                        const savedTaxVal = sPrice * currentTaxRate;
                        return (
                          <div style={{
                            marginTop: '12px',
                            background: '#f0fdf4',
                            border: '1px solid #86efac',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            fontSize: '12px'
                          }}>
                            <div style={{ fontWeight: 800, color: '#15803d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>🟢 Impuesto Eximido (Descontado / Sin recargo):</span>
                              <span style={{ fontSize: '13px', fontWeight: 900 }}>-$0.00 IVA (0%)</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                              <span>Precio Final Neto: <strong>{formatCurrency(sPrice)}</strong></span>
                              <span>Ahorro por Exención ({taxPctStr}): <strong>{formatCurrency(savedTaxVal)}</strong></span>
                            </div>
                          </div>
                        );
                      } else {
                        const baseNet = sPrice / (1 + currentTaxRate);
                        const taxVal = sPrice - baseNet;
                        return (
                          <div style={{
                            marginTop: '12px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            fontSize: '12px'
                          }}>
                            <div style={{ fontWeight: 800, color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>🔵 Desglose de Impuesto ({companySettings.tax_name || 'IVA'} {taxPctStr}):</span>
                              <span style={{ fontSize: '13px', fontWeight: 900, color: '#0284c7' }}>{formatCurrency(taxVal)}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                              <span>Base Imponible Neto (Sin IVA): <strong>{formatCurrency(baseNet)}</strong></span>
                              <span>Resta/Descuento de IVA ({taxPctStr}): <strong>-{formatCurrency(taxVal)}</strong></span>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </>
                )}

              </div>

              {/* SECCIÓN 3: INFORMACIÓN DE PAGO Y PROVEEDOR */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: '#0f172a', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <CreditCard size={18} style={{ color: 'var(--color-amber)' }} />
                  <span>Condiciones de Pago & Proveedor</span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', fontWeight: '500' }}>
                  Selecciona si la mercancía se pagó de contado o si genera una cuenta por pagar a crédito.
                </p>

                <div className="form-group" style={{ marginBottom: productForm.payment_type === 'cuenta_por_pagar' ? '16px' : '0' }}>
                  <select
                    value={productForm.payment_type}
                    onChange={(e) => setProductForm({ ...productForm, payment_type: e.target.value })}
                    className="form-input"
                    style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', fontWeight: '700' }}
                  >
                    <option value="contado">Pago de Contado (Sin cuenta pendiente)</option>
                    <option value="cuenta_por_pagar">Generar Cuenta por Pagar (Crédito Proveedor)</option>
                  </select>
                </div>

                {productForm.payment_type === 'cuenta_por_pagar' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                        Nombre del Proveedor (Opcional)
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: Distribuidora Mayorista"
                        value={productForm.supplier}
                        onChange={(e) => setProductForm({ ...productForm, supplier: e.target.value })}
                        style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                        Plazo de Pago (Opcional)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="30"
                          value={productForm.expiration_days}
                          onChange={(e) => setProductForm({ ...productForm, expiration_days: e.target.value })}
                          style={{ paddingRight: '50px', background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
                        />
                        <span style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>Días</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de acción del formulario */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowProductModal(false)}
                  style={{ padding: '12px 20px', borderRadius: '12px', fontWeight: '600' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={loading} 
                  style={{ 
                    padding: '12px 24px', 
                    borderRadius: '12px', 
                    fontWeight: '700', 
                    background: 'linear-gradient(135deg, var(--color-cyan) 0%, #0891b2 100%)', 
                    boxShadow: '0 4px 14px rgba(6, 182, 212, 0.35)',
                    border: 'none',
                    color: '#ffffff'
                  }}
                >
                  {loading ? 'Guardando...' : (editingProduct ? 'Actualizar Producto' : 'Guardar Producto')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL COMPRAR / REABASTECER (Sincroniza Egreso con Nexus Gestión) */}
      {showReplenishModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel amber-glow">
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--color-amber)' }}>Reabastecer Inventario</h3>
              <button className="modal-close" onClick={() => setShowReplenishModal(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Registra una compra de stock para: <strong>{replenishTarget?.name}</strong>.<br />
              Esto creará automáticamente un registro de <strong>Egreso</strong> en <strong>Nexus Gestión</strong>.
            </p>
            
            <form onSubmit={handleReplenishSubmit}>
              <div className="form-group">
                <label className="form-label">Cantidad a Comprar *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="ej: 10"
                  value={replenishForm.quantity}
                  onChange={(e) => setReplenishForm({ ...replenishForm, quantity: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Costo Unitario de Compra ({companySettings.use_usd_pricing ? 'USD' : companySettings.currency_symbol} Netos) *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Costo"
                  value={replenishForm.unit_cost}
                  onChange={(e) => setReplenishForm({ ...replenishForm, unit_cost: e.target.value })}
                  required
                />
              </div>

              <div style={{
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px'
              }}>
                <span>Total a Financiar:</span>
                <DualCurrencyDisplay 
                  amount={(Number(replenishForm.quantity) || 0) * (Number(replenishForm.unit_cost) || 0)} 
                  fontSize="14px" 
                  primaryColor="var(--color-amber)" 
                  align="right" 
                  showSwap={false} 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowReplenishModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--color-amber), #d97706)', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)' }} disabled={loading}>
                  {loading ? 'Sincronizando...' : 'Confirmar Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURACIÓN STOCK MÍNIMO GENERAL Y MASIVO */}
      {showMinStockModal && (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.22)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#ffffff', padding: '9px', borderRadius: '12px', display: 'flex', alignItems: 'center', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>Configuración de Stock Mínimo</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Define umbrales preventivos generales o aplica en lote a tu inventario
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowMinStockModal(false)} 
                className="modal-close"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Sección 1: Valor General de la Tienda */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  Stock Mínimo General (Predeterminado)
                </label>
                <span style={{ fontSize: '11px', fontWeight: 750, color: '#ca8a04', background: '#fef9c3', padding: '2px 8px', borderRadius: '6px', border: '1px solid #fef08a' }}>
                  Actual: {defaultMinStock} uds
                </span>
              </div>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                Este valor se asignará automáticamente a cualquier producto nuevo que agregues o importes, y servirá como base de alerta si un producto no tiene configuración individual.
              </p>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '130px' }}>
                  <input
                    type="number"
                    min="0"
                    value={globalMinStockInput}
                    onChange={(e) => setGlobalMinStockInput(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', paddingRight: '42px', fontWeight: 800, fontSize: '15px', color: '#0f172a' }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>
                    uds
                  </span>
                </div>
                <button
                  type="button"
                  disabled={savingGlobalMinStock}
                  onClick={handleSaveDefaultMinStock}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '12.5px', fontWeight: 800, whiteSpace: 'nowrap' }}
                >
                  {savingGlobalMinStock ? 'Guardando...' : 'Guardar Predeterminado'}
                </button>
              </div>
            </div>

            {/* Simulación en tiempo real */}
            <div style={{
              background: simulatedLowStockCount > 0 ? '#fffbeb' : '#f0fdf4',
              border: simulatedLowStockCount > 0 ? '1px solid #fde68a' : '1px solid #bbf7d0',
              padding: '12px 14px',
              borderRadius: '12px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {simulatedLowStockCount > 0 ? (
                <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
              ) : (
                <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
              )}
              <div style={{ fontSize: '12px', color: simulatedLowStockCount > 0 ? '#92400e' : '#166534', lineHeight: 1.4 }}>
                Con un stock mínimo de <strong>{Math.max(0, Math.floor(Number(globalMinStockInput) || 0))} unidades</strong>, tendrías actualmente <strong>{simulatedLowStockCount} productos</strong> en alerta de reposición.
              </div>
            </div>

            {/* Sección 2: Aplicación en Lote / Masiva */}
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Sparkles size={16} style={{ color: '#8b5cf6' }} />
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  Aplicar en Masa a Productos Existentes
                </h4>
              </div>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                Actualiza masivamente el stock mínimo de tus productos en un solo clic para no tener que modificarlos uno por uno.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedProductIds.size > 0 && (
                  <button
                    type="button"
                    disabled={savingGlobalMinStock}
                    onClick={() => handleApplyMinStockToTargets(Array.from(selectedProductIds))}
                    className="btn-secondary"
                    style={{
                      background: 'rgba(139, 92, 246, 0.08)',
                      borderColor: '#a78bfa',
                      color: '#7c3aed',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 14px'
                    }}
                  >
                    <Check size={16} />
                    <span>Aplicar {Math.max(0, Math.floor(Number(globalMinStockInput) || 0))} uds a los {selectedProductIds.size} seleccionados</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={savingGlobalMinStock}
                  onClick={() => handleApplyMinStockToTargets(null)}
                  className="btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    fontWeight: 800,
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
                  }}
                >
                  <RefreshCw size={15} className={savingGlobalMinStock ? 'spin' : ''} />
                  <span>Aplicar {Math.max(0, Math.floor(Number(globalMinStockInput) || 0))} uds a TODO el inventario ({inventory.length} productos)</span>
                </button>
              </div>
            </div>

            {/* Recordatorio de configuración individual */}
            <div style={{ padding: '12px 14px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', fontSize: '11.5px', color: '#1e40af', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.4 }}>
              <span style={{ fontSize: '14px', flexShrink: 0 }}>💡</span>
              <div>
                <strong>¿Necesitas reglas individuales?</strong> También puedes personalizar el stock mínimo de cualquier producto de manera independiente haciendo clic en su etiqueta <code>Mín</code> en la columna de stock de la tabla o abriendo su modal de edición.
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={() => setShowMinStockModal(false)}
                className="btn-secondary"
                style={{ padding: '8px 18px', fontSize: '12.5px', fontWeight: 700 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MINI-MODAL DE EDICIÓN RÁPIDA DE STOCK MÍNIMO INDIVIDUAL */}
      {quickMinStockProduct && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '24px', background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Stock Mínimo Individual</h3>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Ajusta la alerta para este producto</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setQuickMinStockProduct(null)} 
                className="modal-close"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {quickMinStockProduct.name}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px' }}>
                <span>SKU: {quickMinStockProduct.sku || 'S/N'}</span>
                <span>•</span>
                <span>Stock Actual: <strong>{quickMinStockProduct.stock} uds</strong></span>
              </div>
            </div>

            <form onSubmit={handleSaveQuickMinStock}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Stock Mínimo de Alerta (Unidades)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    autoFocus
                    required
                    value={quickMinStockInput}
                    onChange={(e) => setQuickMinStockInput(e.target.value)}
                    className="form-input"
                    style={{ flex: 1, fontWeight: 800, fontSize: '15px', padding: '8px 12px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setQuickMinStockInput(String(defaultMinStock))}
                    className="btn-secondary"
                    style={{ fontSize: '11px', padding: '6px 10px', whiteSpace: 'nowrap', background: '#f1f5f9', borderColor: '#cbd5e1' }}
                    title={`Usar valor general predeterminado (${defaultMinStock})`}
                  >
                    General ({defaultMinStock})
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'block' }}>
                  {Number(quickMinStockInput) === defaultMinStock 
                    ? `✓ Usa el valor predeterminado general de la tienda (${defaultMinStock} uds).`
                    : `⚡ Valor personalizado exclusivamente para este producto.`}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setQuickMinStockProduct(null)}
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '12px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingQuickMinStock}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '12px', fontWeight: 800 }}
                >
                  {savingQuickMinStock ? 'Guardando...' : 'Guardar Stock Mínimo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
