import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  Search, 
  ShoppingBag, 
  CheckCircle2, 
  Save, 
  Package, 
  Sparkles, 
  Tag, 
  Layers, 
  AlertCircle,
  Check
} from 'lucide-react';
import { getProductVariants, hasProductVariants } from '../utils/productSpecs';

export default function EditOrderCartModal({
  isOpen,
  onClose,
  order,
  inventory = [],
  companySettings = {},
  onSaveOrder,
  onConfirmOrder
}) {
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const exchangeRate = Number(companySettings?.exchange_rate || 0);
  const useUsd = companySettings?.use_usd_pricing !== false;

  // Inicializar estado con los datos del pedido
  useEffect(() => {
    if (order) {
      const initialItems = (order.items || []).map((it, idx) => {
        const prod = inventory.find(p => p.id === (it.id || it.part_id));
        return {
          uid: `${it.id || it.part_id || idx}_${Date.now()}_${idx}`,
          id: it.id || it.part_id || prod?.id,
          part_id: it.part_id || it.id || prod?.id,
          name: it.name || it.part?.name || prod?.name || 'Producto',
          sku: it.sku || it.part?.sku || prod?.sku || '',
          sell_price: Number(it.sell_price || it.part?.sell_price || prod?.sell_price || 0),
          cost_price: Number(it.cost_price || it.part?.cost_price || prod?.cost_price || 0),
          cantidad: Math.max(1, Number(it.cantidad || 1)),
          selectedVariant: it.selectedVariant || null,
          image_url: it.image_url || it.part?.image_url || prod?.image_url || null,
          part: prod || it.part || null
        };
      });

      setItems(initialItems);
      setNotes(order.notes || '');
      setCustomerPhone(order.customer_phone || '');
      setShippingAddress(order.shipping_address || '');
      setSearchQuery('');
    }
  }, [order, inventory]);

  // Búsqueda de productos del inventario para agregar
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    return inventory.filter(p => {
      const matchName = p.name && p.name.toLowerCase().includes(q);
      const matchSku = p.sku && p.sku.toLowerCase().includes(q);
      const matchCat = p.category && p.category.toLowerCase().includes(q);
      return matchName || matchSku || matchCat;
    }).slice(0, 8);
  }, [searchQuery, inventory]);

  // Totales
  const totalAmount = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.sell_price || 0) * Number(it.cantidad || 1)), 0);
  }, [items]);

  const totalBs = useMemo(() => {
    return totalAmount * (exchangeRate || 1);
  }, [totalAmount, exchangeRate]);

  if (!isOpen || !order) return null;

  // Modificar cantidad
  const handleUpdateQty = (index, delta) => {
    setItems(prev => {
      const copy = [...prev];
      const target = { ...copy[index] };
      const newQty = Math.max(1, target.cantidad + delta);
      target.cantidad = newQty;
      copy[index] = target;
      return copy;
    });
  };

  // Modificar precio unitario
  const handleUpdatePrice = (index, newPrice) => {
    const parsed = Math.max(0, parseFloat(newPrice) || 0);
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], sell_price: parsed };
      return copy;
    });
  };

  // Eliminar producto del carrito
  const handleRemoveItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Cambiar variante de color
  const handleSelectVariant = (index, variant) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        selectedVariant: variant
      };
      return copy;
    });
  };

  // Agregar producto desde el buscador
  const handleAddProduct = (prod) => {
    const variants = getProductVariants(prod);
    const defaultVariant = variants.length > 0 ? (variants.find(v => Number(v.stock) > 0) || variants[0]) : null;

    const newItem = {
      uid: `${prod.id}_${Date.now()}`,
      id: prod.id,
      part_id: prod.id,
      name: prod.name,
      sku: prod.sku || '',
      sell_price: Number(prod.sell_price || 0),
      cost_price: Number(prod.cost_price || 0),
      cantidad: 1,
      selectedVariant: defaultVariant,
      image_url: prod.image_url || null,
      part: prod
    };

    setItems(prev => [...prev, newItem]);
    setSearchQuery('');
  };

  // Guardar cambios en el pedido
  const handleSave = async (andConfirm = false) => {
    if (items.length === 0) {
      alert('El pedido debe tener al menos un producto.');
      return;
    }

    setIsSaving(true);
    try {
      const formattedItems = items.map(it => ({
        id: it.id,
        part_id: it.part_id || it.id,
        name: it.name,
        sku: it.sku || '',
        sell_price: Number(it.sell_price || 0),
        cost_price: Number(it.cost_price || 0),
        cantidad: Number(it.cantidad || 1),
        selectedVariant: it.selectedVariant || null,
        image_url: it.image_url || null
      }));

      const updates = {
        items: formattedItems,
        total_amount: totalAmount,
        notes: notes.trim(),
        customer_phone: customerPhone.trim(),
        shipping_address: shippingAddress.trim()
      };

      const res = await onSaveOrder(order.id, updates);
      if (res?.error) {
        alert(`Error al guardar: ${res.error}`);
        return;
      }

      onClose();

      if (andConfirm && onConfirmOrder) {
        onConfirmOrder({ ...order, ...updates });
      }
    } catch (err) {
      console.error('Error guardando pedido:', err);
      alert('Ocurrió un error al guardar los cambios del pedido.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(3, 7, 18, 0.88)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200000,
      padding: '16px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
            }}>
              <ShoppingBag size={20} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, letterSpacing: '-0.02em' }}>
                  Modificar Carrito del Pedido
                </h3>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: 800,
                  fontFamily: 'monospace'
                }}>
                  #{order.ticket_code || order.id?.slice(0, 8)}
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Cliente: <strong>{order.customer_name || 'Particular'}</strong> • Agrega, quita o ajusta variantes antes de confirmar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#cbd5e1',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Modal con Scroll */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Buscador de Productos (Estilo Sala de Ventas) */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '14px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={14} color="#0284c7" />
                Agregar Producto al Pedido
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {inventory.length} productos en catálogo
              </span>
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Escribe el nombre o SKU del producto para agregar..."
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Resultados de Búsqueda */}
            {searchResults.length > 0 && (
              <div style={{
                marginTop: '10px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                maxHeight: '200px',
                overflowY: 'auto',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)'
              }}>
                {searchResults.map(prod => {
                  const prodVars = getProductVariants(prod);
                  return (
                    <div
                      key={prod.id}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: '#f1f5f9',
                          overflow: 'hidden',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {prod.image_url ? (
                            <img src={prod.image_url} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Package size={18} color="#94a3b8" />
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {prod.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span>Stock: <strong>{prod.stock ?? 0}</strong> un.</span>
                            {prodVars.length > 0 && (
                              <span style={{ color: '#0284c7', fontWeight: 600 }}>({prodVars.length} colores)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                            ${Number(prod.sell_price || 0).toFixed(2)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddProduct(prod)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Plus size={14} />
                          <span>Agregar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lista de Productos Actuales en el Pedido */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                🛒 Productos en este Pedido ({items.length})
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Puedes cambiar cantidad, color o eliminar
              </span>
            </div>

            {items.length === 0 ? (
              <div style={{
                padding: '36px 20px',
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: '16px',
                border: '2px dashed #cbd5e1'
              }}>
                <AlertCircle size={32} color="#94a3b8" style={{ margin: '0 auto 8px auto' }} />
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#64748b' }}>
                  El pedido está vacío. Agrega productos usando el buscador arriba.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.map((item, index) => {
                  const prod = inventory.find(p => p.id === (item.id || item.part_id)) || item.part;
                  const variants = prod ? getProductVariants(prod) : [];
                  const hasVariants = variants.length > 0;
                  const itemTotal = (Number(item.sell_price || 0) * Number(item.cantidad || 1)).toFixed(2);

                  return (
                    <div
                      key={item.uid || index}
                      style={{
                        padding: '12px 16px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        {/* Info de Producto */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '10px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Package size={22} color="#94a3b8" />
                            )}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              {item.sku && <span style={{ fontFamily: 'monospace' }}>SKU: {item.sku}</span>}
                              {prod && (
                                <span style={{
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: (prod.stock || 0) > 0 ? '#f0fdf4' : '#fff1f2',
                                  color: (prod.stock || 0) > 0 ? '#166534' : '#9f1239',
                                  fontWeight: 700
                                }}>
                                  Stock disp: {prod.stock ?? 0}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Controles de Cantidad */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(index, -1)}
                            disabled={item.cantidad <= 1}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              background: item.cantidad <= 1 ? '#f8fafc' : '#ffffff',
                              color: item.cantidad <= 1 ? '#cbd5e1' : '#334155',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: item.cantidad <= 1 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <Minus size={14} />
                          </button>

                          <span style={{
                            minWidth: '28px',
                            textAlign: 'center',
                            fontSize: '14px',
                            fontWeight: 900,
                            color: '#0f172a'
                          }}>
                            {item.cantidad}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleUpdateQty(index, 1)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#334155',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* Precio Unitario y Subtotal */}
                        <div style={{ textAlign: 'right', minWidth: '90px' }}>
                          <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                            ${itemTotal}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            ${Number(item.sell_price || 0).toFixed(2)} c/u
                          </div>
                        </div>

                        {/* Botón Eliminar */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          title="Eliminar del pedido"
                          style={{
                            background: '#fee2e2',
                            border: 'none',
                            color: '#dc2626',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Selector de Variante de Color si el producto tiene variantes */}
                      {hasVariants && (
                        <div style={{
                          paddingTop: '8px',
                          borderTop: '1px dashed #f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                            🎨 Color / Variante:
                          </span>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {variants.map(v => {
                              const isSelected = item.selectedVariant?.id === v.id || item.selectedVariant?.color === v.color;
                              return (
                                <button
                                  key={v.id || v.color}
                                  type="button"
                                  onClick={() => handleSelectVariant(index, v)}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                                    background: isSelected ? 'rgba(2, 132, 199, 0.1)' : '#ffffff',
                                    fontSize: '11px',
                                    fontWeight: isSelected ? 800 : 600,
                                    color: isSelected ? '#0284c7' : '#334155',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <span style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: v.hex || '#94a3b8',
                                    display: 'inline-block',
                                    border: '1px solid rgba(0,0,0,0.1)'
                                  }} />
                                  <span>{v.color}</span>
                                  {isSelected && <Check size={12} color="#0284c7" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ajuste de Notas o Datos del Cliente */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '14px',
            background: '#f8fafc',
            padding: '14px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                Teléfono de Contacto
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="Ej. 0414-1234567"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  background: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                Dirección / Punto de Entrega
              </label>
              <input
                type="text"
                value={shippingAddress}
                onChange={e => setShippingAddress(e.target.value)}
                placeholder="Dirección del cliente..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  background: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                Notas del Pedido
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ej. Cambió por modelo articulado por WhatsApp..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  background: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer con Totales y Botones de Acción */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          background: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          {/* Resumen Total */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Actualizado:
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>
                ${totalAmount.toFixed(2)}
              </span>
              {useUsd && exchangeRate > 0 && (
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7' }}>
                  / Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '9px 16px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving || items.length === 0}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
              }}
            >
              <Save size={15} />
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>

            {order.status === 'pending' && (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving || items.length === 0}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                }}
              >
                <CheckCircle2 size={15} />
                <span>Guardar y Confirmar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
