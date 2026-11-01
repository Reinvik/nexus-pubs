import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { 
  Printer, X, CheckSquare, Square, Layers, Sparkles, 
  Settings2, Download, Eye, Smartphone, Check, Beer, 
  HelpCircle, Info, RefreshCw
} from 'lucide-react';

export default function QRPrintStudio({ 
  isOpen, 
  onClose, 
  tables = [], 
  initialSelectedTableId = null 
}) {
  // Formatos: 'a6' (10x15cm Acrílico), 'pvc' (8.5x5.5cm Tarjeta Barra), 'sticker' (8x8cm Posavasos)
  const [cardFormat, setCardFormat] = useState('a6');
  // Estilo visual: 'ink-saver' (blanco/ahorro tinta), 'dark' (pub dark premium), 'accent' (azul/cian moderno)
  const [themeStyle, setThemeStyle] = useState('ink-saver');
  // Opciones
  const [showInstructions, setShowInstructions] = useState(true);
  const [showWifiNote, setShowWifiNote] = useState(true);
  const [wifiName, setWifiName] = useState('NexusPub-Clientes');
  const [urlMode, setUrlMode] = useState('prod'); // 'prod' (pubs.nexusnetwork.cl) o 'current'

  // Selección de mesas (IDs)
  const [selectedIds, setSelectedIds] = useState(new Set());
  // Cache de códigos QR generados { [url]: dataUrl }
  const [qrCache, setQrCache] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Inicializar selección de mesas cuando se abre
  useEffect(() => {
    if (!isOpen) return;
    if (initialSelectedTableId) {
      setSelectedIds(new Set([initialSelectedTableId]));
    } else {
      // Por defecto seleccionar todas las mesas activas
      setSelectedIds(new Set(tables.map(t => t.id)));
    }
  }, [isOpen, initialSelectedTableId, tables]);

  // Base URL según modo
  const baseUrl = useMemo(() => {
    if (urlMode === 'prod') return 'https://pubs.nexusnetwork.cl';
    if (typeof window !== 'undefined') return window.location.origin;
    return 'https://pubs.nexusnetwork.cl';
  }, [urlMode]);

  // Lista de mesas ordenadas y filtradas
  const targetTables = useMemo(() => {
    return tables.filter(t => selectedIds.has(t.id));
  }, [tables, selectedIds]);

  // Generar QRs para todas las mesas seleccionadas en lote
  useEffect(() => {
    if (!isOpen || targetTables.length === 0) return;

    let isCancelled = false;
    const generateAll = async () => {
      setIsGenerating(true);
      const newCache = { ...qrCache };
      let changed = false;

      for (const t of targetTables) {
        const code = encodeURIComponent(t.qr_code || t.id);
        const fullUrl = `${baseUrl}/?qr=${code}`;
        if (!newCache[fullUrl]) {
          try {
            const dataUrl = await QRCode.toDataURL(fullUrl, {
              width: 500,
              margin: 1,
              color: {
                dark: themeStyle === 'dark' ? '#0f172a' : '#0a0f1d',
                light: '#ffffff'
              },
              errorCorrectionLevel: 'H'
            });
            newCache[fullUrl] = dataUrl;
            changed = true;
          } catch (err) {
            console.error('Error generando QR para mesa', t.name, err);
          }
        }
      }

      if (!isCancelled && changed) {
        setQrCache(newCache);
      }
      if (!isCancelled) {
        setIsGenerating(false);
      }
    };

    generateAll();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, targetTables, baseUrl, themeStyle]);

  if (!isOpen) return null;

  // Acciones de selección
  const toggleSelectAll = () => {
    if (selectedIds.size === tables.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tables.map(t => t.id)));
    }
  };

  const selectFilter = (type) => {
    if (type === 'salon') {
      const salon = tables.filter(t => !t.isTakeout && !t.isTemporary && !(t.name || '').toLowerCase().includes('barra'));
      setSelectedIds(new Set(salon.map(t => t.id)));
    } else if (type === 'bar') {
      const bars = tables.filter(t => (t.name || '').toLowerCase().includes('barra'));
      setSelectedIds(new Set(bars.map(t => t.id)));
    } else if (type === 'temp') {
      const temps = tables.filter(t => t.isTemporary);
      setSelectedIds(new Set(temps.map(t => t.id)));
    }
  };

  const toggleTable = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="qr-print-studio-modal" style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200020,
      background: '#0f172a',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', 'system-ui', -apple-system, sans-serif"
    }}>
      {/* ── CSS DE IMPRESIÓN EMBEBIDO ── */}
      <style>{`
        @media screen {
          .printable-sheet {
            display: grid;
            gap: 20px;
            justify-content: center;
          }
          .format-a6 .print-card {
            width: 100mm;
            min-height: 145mm;
          }
          .format-pvc .print-card {
            width: 85.6mm;
            height: 54mm;
          }
          .format-sticker .print-card {
            width: 80mm;
            height: 80mm;
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 6mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 11pt !important;
          }
          /* Ocultar toda la app de fondo y la barra lateral de Antigravity/Vite */
          body * {
            visibility: hidden !important;
          }
          /* Mostrar únicamente el contenedor imprimible */
          .qr-print-studio-modal,
          .qr-print-studio-modal .printable-sheet-wrapper,
          .qr-print-studio-modal .printable-sheet-wrapper * {
            visibility: visible !important;
          }
          .qr-print-studio-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-sheet-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .printable-sheet {
            display: grid !important;
            background: #ffffff !important;
            margin: 0 auto !important;
          }
          /* Grillas según formato en hoja A4 */
          .format-a6 .printable-sheet {
            grid-template-columns: repeat(2, 98mm) !important;
            gap: 6mm !important;
          }
          .format-a6 .print-card {
            width: 98mm !important;
            height: 140mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1px dashed #64748b !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
          .format-pvc .printable-sheet {
            grid-template-columns: repeat(2, 85.6mm) !important;
            gap: 6mm 10mm !important;
          }
          .format-pvc .print-card {
            width: 85.6mm !important;
            height: 54mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1px dashed #64748b !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
          .format-sticker .printable-sheet {
            grid-template-columns: repeat(2, 80mm) !important;
            gap: 8mm !important;
          }
          .format-sticker .print-card {
            width: 80mm !important;
            height: 80mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1px dashed #64748b !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* ── HEADER SUPERIOR (NO-PRINT) ── */}
      <header className="no-print" style={{
        padding: '14px 24px',
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(2, 132, 199, 0.35)'
          }}>
            <Printer size={20} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 900, letterSpacing: '-0.3px', color: '#ffffff' }}>
              Centro de Impresión de Tarjetas QR <span style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 700 }}>• Nexus Pub</span>
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              Genera acrílicos, tarjetas de barra y posavasos listos para imprimir o guardar en PDF de 300 DPI.
            </p>
          </div>
        </div>

        {/* Acciones del Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(2, 132, 199, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#38bdf8'
          }}>
            {targetTables.length} {targetTables.length === 1 ? 'tarjeta seleccionada' : 'tarjetas seleccionadas'}
          </div>

          <button
            type="button"
            onClick={handlePrint}
            disabled={targetTables.length === 0}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              background: targetTables.length === 0 ? '#475569' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
              cursor: targetTables.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: targetTables.length === 0 ? 'none' : '0 4px 14px rgba(2, 132, 199, 0.4)'
            }}
          >
            <Printer size={16} />
            <span>Imprimir / Guardar como PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              background: 'transparent',
              border: '1px solid #475569',
              color: '#cbd5e1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 700
            }}
          >
            <X size={16} />
            <span>Cerrar</span>
          </button>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL: PANEL LATERAL DE CONTROLES + VISTA PREVIA ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* PANEL LATERAL DE CONFIGURACIÓN (NO-PRINT) */}
        <aside className="no-print" style={{
          width: '340px',
          background: '#131e31',
          borderRight: '1px solid #1e293b',
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>

          {/* 1. Selector de Formato Físico */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Layers size={13} color="#38bdf8" /> 1. Formato Físico
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'a6', name: 'Acrílico Stand Mesa (A6)', size: '10 × 15 cm', desc: 'Ideal para servilleteros y centros de mesa. Incluye instrucciones.' },
                { id: 'pvc', name: 'Tarjeta Barra PVC', size: '8.5 × 5.5 cm', desc: 'Tamaño tarjeta de crédito para clientes en barra o mostrador.' },
                { id: 'sticker', name: 'Posavasos / Sticker', size: '8 × 8 cm', desc: 'Cuadrado para pegar en la madera o posavasos de cerveza.' }
              ].map(fmt => (
                <div
                  key={fmt.id}
                  onClick={() => setCardFormat(fmt.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: cardFormat === fmt.id ? '2px solid #38bdf8' : '1px solid #334155',
                    background: cardFormat === fmt.id ? 'rgba(56, 189, 248, 0.12)' : '#1e293b',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: cardFormat === fmt.id ? '#ffffff' : '#e2e8f0' }}>
                      {fmt.name}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                      {fmt.size}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8', lineHeight: 1.3 }}>
                    {fmt.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Estilo Visual de Impresión */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Sparkles size={13} color="#f59e0b" /> 2. Estilo de Color
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setThemeStyle('ink-saver')}
                style={{
                  padding: '9px',
                  borderRadius: '8px',
                  border: themeStyle === 'ink-saver' ? '2px solid #38bdf8' : '1px solid #334155',
                  background: themeStyle === 'ink-saver' ? '#ffffff' : '#1e293b',
                  color: themeStyle === 'ink-saver' ? '#0f172a' : '#cbd5e1',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                ⚪ Ahorro Tinta (Blanco)
              </button>
              <button
                type="button"
                onClick={() => setThemeStyle('dark')}
                style={{
                  padding: '9px',
                  borderRadius: '8px',
                  border: themeStyle === 'dark' ? '2px solid #38bdf8' : '1px solid #334155',
                  background: themeStyle === 'dark' ? '#0a0f1d' : '#1e293b',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                ⚫ Pub Dark Premium
              </button>
            </div>
          </div>

          {/* 3. Selección de Mesas */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckSquare size={13} color="#10b981" /> 3. Mesas a Imprimir
              </label>
              <button
                type="button"
                onClick={toggleSelectAll}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {selectedIds.size === tables.length ? 'Deseleccionar todas' : 'Todas'}
              </button>
            </div>

            {/* Filtros rápidos */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => selectFilter('salon')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Salón
              </button>
              <button
                type="button"
                onClick={() => selectFilter('bar')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Barras
              </button>
              <button
                type="button"
                onClick={() => selectFilter('temp')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Tarjetas QR
              </button>
            </div>

            {/* Lista con checkboxes */}
            <div style={{
              flex: 1,
              maxHeight: '220px',
              overflowY: 'auto',
              background: '#0a0f1d',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '6px'
            }}>
              {tables.map(table => {
                const isSelected = selectedIds.has(table.id);
                return (
                  <div
                    key={table.id}
                    onClick={() => toggleTable(table.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.03)'
                    }}
                  >
                    <div style={{ color: isSelected ? '#38bdf8' : '#64748b' }}>
                      {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>
                    <div style={{ flex: 1, fontSize: '12px', fontWeight: 700, color: isSelected ? '#ffffff' : '#cbd5e1' }}>
                      {table.name}
                    </div>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>
                      {table.qr_code || `#${table.number}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Opciones adicionales */}
          <div style={{ background: '#1e293b', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Settings2 size={13} color="#a855f7" /> Opciones del Diseño
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#cbd5e1', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showInstructions}
                onChange={e => setShowInstructions(e.target.checked)}
              />
              <span>Mostrar 3 pasos para el comensal</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#cbd5e1', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showWifiNote}
                onChange={e => setShowWifiNote(e.target.checked)}
              />
              <span>Incluir nota de WiFi en la tarjeta</span>
            </label>

            {showWifiNote && (
              <input
                type="text"
                value={wifiName}
                onChange={e => setWifiName(e.target.value)}
                placeholder="Nombre de red WiFi"
                style={{
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '11px',
                  borderRadius: '6px',
                  padding: '5px 8px'
                }}
              />
            )}

            <div style={{ marginTop: '4px', fontSize: '10.5px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={12} color="#38bdf8" />
              <span>URL destino: <strong>{baseUrl}</strong></span>
            </div>
          </div>

        </aside>

        {/* ÁREA DE VISTA PREVIA Y HOJA IMPRIMIBLE */}
        <main className="printable-sheet-wrapper" style={{
          flex: 1,
          overflowY: 'auto',
          background: '#090d16',
          padding: '30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>

          {/* Banner de ayuda rápida en pantalla (NO-PRINT) */}
          <div className="no-print" style={{
            maxWidth: '850px',
            width: '100%',
            marginBottom: '20px',
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(3, 105, 161, 0.1) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '12px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Eye size={18} color="#38bdf8" />
              <span style={{ fontSize: '12px', color: '#e0f2fe' }}>
                <strong>Vista Previa de Impresión:</strong> Así saldrán las tarjetas en tu hoja A4 o Carta. Corta por las líneas punteadas.
              </span>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: '#38bdf8',
                color: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontWeight: 800,
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Printer size={13} /> Imprimir Ahora
            </button>
          </div>

          {/* Sheet de Tarjetas */}
          <div className={`printable-sheet format-${cardFormat}`}>
            {targetTables.length === 0 ? (
              <div style={{
                padding: '60px 40px',
                background: '#1e293b',
                borderRadius: '16px',
                textAlign: 'center',
                color: '#94a3b8'
              }}>
                <Beer size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
                <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>
                  No hay mesas seleccionadas para imprimir.
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '12px' }}>
                  Marca las mesas que deseas en la columna izquierda.
                </p>
              </div>
            ) : (
              targetTables.map(table => {
                const code = encodeURIComponent(table.qr_code || table.id);
                const fullUrl = `${baseUrl}/?qr=${code}`;
                const qrImage = qrCache[fullUrl];

                if (cardFormat === 'a6') {
                  return (
                    <PrintCardA6 
                      key={table.id}
                      table={table}
                      qrImage={qrImage}
                      fullUrl={fullUrl}
                      themeStyle={themeStyle}
                      showInstructions={showInstructions}
                      showWifiNote={showWifiNote}
                      wifiName={wifiName}
                    />
                  );
                } else if (cardFormat === 'pvc') {
                  return (
                    <PrintCardPVC
                      key={table.id}
                      table={table}
                      qrImage={qrImage}
                      fullUrl={fullUrl}
                      themeStyle={themeStyle}
                      showWifiNote={showWifiNote}
                      wifiName={wifiName}
                    />
                  );
                } else {
                  return (
                    <PrintCardSticker
                      key={table.id}
                      table={table}
                      qrImage={qrImage}
                      fullUrl={fullUrl}
                      themeStyle={themeStyle}
                    />
                  );
                }
              })
            )}
          </div>

        </main>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: FORMATO A6 (10 × 15 CM) - ACRÍLICO STAND DE MESA
// ─────────────────────────────────────────────────────────────────────────────
function PrintCardA6({ table, qrImage, fullUrl, themeStyle, showInstructions, showWifiNote, wifiName }) {
  const isDark = themeStyle === 'dark';
  const bg = isDark ? '#0f172a' : '#ffffff';
  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#475569';
  const border = isDark ? '1px dashed #334155' : '1px dashed #94a3b8';

  return (
    <div className="print-card print-card-a6" style={{
      background: bg,
      color: textPrimary,
      border: border,
      borderRadius: '16px',
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      boxSizing: 'border-box',
      textAlign: 'center',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
    }}>
      {/* Header Marca & Mesa */}
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '16px' }}>🍺</span>
          <span style={{
            fontSize: '13px',
            fontWeight: 900,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: isDark ? '#38bdf8' : '#0284c7'
          }}>
            NEXUS PUB
          </span>
        </div>

        <h2 style={{
          margin: '2px 0 0',
          fontSize: '24px',
          fontWeight: 900,
          letterSpacing: '-0.5px',
          color: textPrimary
        }}>
          {table.name}
        </h2>
        
        <p style={{
          margin: '2px 0 0',
          fontSize: '11px',
          fontWeight: 600,
          color: textSecondary
        }}>
          {table.isTemporary ? 'Tarjeta Personal de Barra' : 'Pide directo desde tu mesa sin esperar'}
        </p>
      </div>

      {/* Código QR Central de Alta Resolución */}
      <div style={{
        margin: '12px auto',
        padding: '10px',
        background: '#ffffff',
        borderRadius: '14px',
        border: '2px solid #0f172a',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 6px 14px rgba(0,0,0,0.08)'
      }}>
        {qrImage ? (
          <img 
            src={qrImage} 
            alt={`QR ${table.name}`}
            style={{ width: '160px', height: '160px', display: 'block' }}
          />
        ) : (
          <div style={{ width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            Generando QR...
          </div>
        )}
      </div>

      {/* 3 Pasos de Instrucción para el Cliente */}
      {showInstructions && (
        <div style={{
          background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '8px 10px',
          textAlign: 'left',
          fontSize: '10px',
          lineHeight: 1.4,
          color: textSecondary
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <span style={{
              width: '14px', height: '14px', borderRadius: '50%', background: '#0284c7', color: '#fff',
              fontSize: '8.5px', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}>1</span>
            <span style={{ fontWeight: 700, color: textPrimary }}>Escanea con la cámara de tu celular</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <span style={{
              width: '14px', height: '14px', borderRadius: '50%', background: '#0284c7', color: '#fff',
              fontSize: '8.5px', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}>2</span>
            <span style={{ fontWeight: 700, color: textPrimary }}>Elige cervezas, tragos y comida al instante</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '14px', height: '14px', borderRadius: '50%', background: '#0284c7', color: '#fff',
              fontSize: '8.5px', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}>3</span>
            <span style={{ fontWeight: 700, color: textPrimary }}>Paga tu parte o la mesa completa sin filas</span>
          </div>
        </div>
      )}

      {/* Footer WiFi & URL */}
      <div style={{ marginTop: '8px', fontSize: '9.5px', color: textSecondary }}>
        {showWifiNote && (
          <div style={{ fontWeight: 700, color: textPrimary, marginBottom: '2px' }}>
            📶 WiFi Clientes: <span style={{ color: '#0284c7' }}>{wifiName}</span>
          </div>
        )}
        <div style={{ letterSpacing: '0.2px' }}>
          pubs.nexusnetwork.cl • Código: <strong>{table.qr_code || `#${table.number}`}</strong>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: FORMATO PVC BARRA (8.5 × 5.5 CM) - TAMAÑO TARJETA DE CRÉDITO
// ─────────────────────────────────────────────────────────────────────────────
function PrintCardPVC({ table, qrImage, fullUrl, themeStyle, showWifiNote, wifiName }) {
  const isDark = themeStyle === 'dark';
  const bg = isDark ? '#0f172a' : '#ffffff';
  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#475569';
  const border = isDark ? '1px dashed #334155' : '1px dashed #94a3b8';

  return (
    <div className="print-card print-card-pvc" style={{
      background: bg,
      color: textPrimary,
      border: border,
      borderRadius: '10px',
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      boxSizing: 'border-box',
      boxShadow: '0 2px 10px rgba(0,0,0,0.12)'
    }}>
      {/* Columna Izquierda: Información */}
      <div style={{ flex: 1, paddingRight: '8px', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px' }}>🍺</span>
          <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.8px', color: '#0284c7', textTransform: 'uppercase' }}>
            NEXUS PUB
          </span>
        </div>

        <h3 style={{ margin: '3px 0 0', fontSize: '15px', fontWeight: 900, letterSpacing: '-0.3px', color: textPrimary }}>
          {table.name}
        </h3>

        <p style={{ margin: '2px 0 0', fontSize: '8.5px', fontWeight: 600, color: textSecondary, lineHeight: 1.2 }}>
          {table.isTemporary ? 'Tarjeta Comanda Personal' : 'Escanea para pedir a la barra'}
        </p>

        <div style={{ marginTop: '8px', fontSize: '7.5px', color: textSecondary }}>
          {showWifiNote && (
            <div style={{ fontWeight: 700, color: textPrimary }}>
              📶 WiFi: {wifiName}
            </div>
          )}
          <div>Cod: {table.qr_code || `#${table.number}`}</div>
        </div>
      </div>

      {/* Columna Derecha: Código QR */}
      <div style={{
        padding: '5px',
        background: '#ffffff',
        borderRadius: '8px',
        border: '1.5px solid #0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {qrImage ? (
          <img 
            src={qrImage} 
            alt={`QR ${table.name}`}
            style={{ width: '80px', height: '80px', display: 'block' }}
          />
        ) : (
          <div style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>
            QR...
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: FORMATO POSAVASOS / STICKER (8 × 8 CM) - CUADRADO
// ─────────────────────────────────────────────────────────────────────────────
function PrintCardSticker({ table, qrImage, fullUrl, themeStyle }) {
  const isDark = themeStyle === 'dark';
  const bg = isDark ? '#0f172a' : '#ffffff';
  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#475569';
  const border = isDark ? '1px dashed #334155' : '1px dashed #94a3b8';

  return (
    <div className="print-card print-card-sticker" style={{
      background: bg,
      color: textPrimary,
      border: border,
      borderRadius: '14px',
      padding: '10px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      boxSizing: 'border-box',
      textAlign: 'center',
      boxShadow: '0 2px 10px rgba(0,0,0,0.12)'
    }}>
      <div>
        <div style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.6px', color: '#0284c7', textTransform: 'uppercase' }}>
          🍺 NEXUS PUB
        </div>
        <div style={{ fontSize: '13px', fontWeight: 900, color: textPrimary, marginTop: '1px' }}>
          {table.name}
        </div>
      </div>

      <div style={{
        padding: '5px',
        background: '#ffffff',
        borderRadius: '8px',
        border: '1.5px solid #0f172a',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {qrImage ? (
          <img 
            src={qrImage} 
            alt={`QR ${table.name}`}
            style={{ width: '105px', height: '105px', display: 'block' }}
          />
        ) : (
          <div style={{ width: '105px', height: '105px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>
            QR...
          </div>
        )}
      </div>

      <div style={{ fontSize: '7.5px', color: textSecondary, fontWeight: 700 }}>
        ESCANEA PARA PEDIR Y PAGAR
      </div>
    </div>
  );
}
