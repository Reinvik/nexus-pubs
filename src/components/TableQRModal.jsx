import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { 
  QrCode, X, Copy, Check, ExternalLink, Download, 
  Printer, Smartphone, Globe, Utensils, Wine
} from 'lucide-react';

export default function TableQRModal({ 
  isOpen, 
  onClose, 
  table, 
  onOpenPrintStudio = null,
  onOpenGuestSimulator = null 
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [urlMode, setUrlMode] = useState('prod'); // 'prod' (pubs.nexusnetwork.cl) o 'current'

  const qrCodeIdentifier = table ? (table.qr_code || table.id) : '';

  // Calcular la URL de destino
  const targetUrl = React.useMemo(() => {
    if (!table) return '';
    const code = encodeURIComponent(qrCodeIdentifier);
    if (urlMode === 'prod') {
      return `https://pubs.nexusnetwork.cl/?qr=${code}`;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pubs.nexusnetwork.cl';
    return `${origin}/?qr=${code}`;
  }, [table, qrCodeIdentifier, urlMode]);

  // Generar el código QR de alta resolución con qrcode
  useEffect(() => {
    if (!targetUrl) return;
    QRCode.toDataURL(targetUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a', // Slate 900 de alto contraste
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H' // Nivel alto para lectura confiable incluso con poca luz en pubs
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generando QR:', err));
  }, [targetUrl]);

  if (!isOpen || !table) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    const safeName = (table.name || 'mesa').toLowerCase().replace(/[^a-z0-9]/g, '-');
    a.download = `nexus-pub-qr-${safeName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenPrint = () => {
    if (onOpenPrintStudio) {
      onOpenPrintStudio(table.id);
      onClose();
    } else {
      window.print();
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200010,
      background: 'rgba(3, 7, 18, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: "'Inter', 'system-ui', sans-serif"
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'modalScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>

        {/* Header Modal */}
        <div style={{
          padding: '18px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(245,158,11,0.15))',
              border: '1px solid #06b6d4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <QrCode size={20} color="#0284c7" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                {table.name}
              </h3>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
                Código QR: <strong style={{ color: '#0284c7' }}>{qrCodeIdentifier}</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '6px',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Modal con el QR en Grande */}
        <div style={{ padding: '24px', textAlign: 'center', background: '#ffffff' }}>

          {/* Tarjeta de visualización del QR estilo Pub */}
          <div style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            border: '2px solid #e2e8f0',
            borderRadius: '20px',
            padding: '20px',
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
            maxWidth: '320px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {/* Logo de Nexus Pub arriba del QR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <img src="/pub-logo.svg" alt="Nexus Pub" style={{ width: '22px', height: '22px' }} />
              <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>
                <span style={{ color: '#06b6d4' }}>Nexus</span> <span style={{ color: '#f59e0b' }}>Pub</span>
              </span>
            </div>

            {/* Imagen del QR o placeholder de carga */}
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR ${table.name}`}
                style={{
                  width: '210px',
                  height: '210px',
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9'
                }}
              />
            ) : (
              <div style={{ width: '210px', height: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                Generando QR...
              </div>
            )}

            <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#0f172a', marginTop: '12px' }}>
              {table.name}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '3px' }}>
              Escanea con tu cámara para pedir y pagar
            </div>
          </div>

          {/* Selector de Destino de URL */}
          <div style={{
            marginTop: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            background: '#f1f5f9',
            borderRadius: '10px',
            padding: '3px',
            gap: '3px',
            border: '1px solid #e2e8f0',
            fontSize: '11px'
          }}>
            <button
              type="button"
              onClick={() => setUrlMode('prod')}
              style={{
                background: urlMode === 'prod' ? '#ffffff' : 'transparent',
                border: urlMode === 'prod' ? '1px solid #cbd5e1' : '1px solid transparent',
                color: urlMode === 'prod' ? '#0284c7' : '#64748b',
                borderRadius: '8px',
                padding: '4px 10px',
                fontWeight: urlMode === 'prod' ? 800 : 600,
                cursor: 'pointer'
              }}
              title="URL pública para que clientes escaneen desde cualquier celular"
            >
              🌐 Producción (pubs.nexusnetwork.cl)
            </button>
            <button
              type="button"
              onClick={() => setUrlMode('current')}
              style={{
                background: urlMode === 'current' ? '#ffffff' : 'transparent',
                border: urlMode === 'current' ? '1px solid #cbd5e1' : '1px solid transparent',
                color: urlMode === 'current' ? '#0284c7' : '#64748b',
                borderRadius: '8px',
                padding: '4px 10px',
                fontWeight: urlMode === 'current' ? 800 : 600,
                cursor: 'pointer'
              }}
              title="URL del host actual"
            >
              🖥️ Este equipo
            </button>
          </div>

          {/* Input de Enlace con botón Copiar */}
          <div style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '6px 8px 6px 12px',
            gap: '8px'
          }}>
            <span style={{
              flex: 1,
              fontSize: '11.5px',
              color: '#334155',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: 'left'
            }}>
              {targetUrl}
            </span>

            <button
              type="button"
              onClick={handleCopy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: copied ? '#dcfce7' : '#ffffff',
                border: `1px solid ${copied ? '#86efac' : '#cbd5e1'}`,
                color: copied ? '#15803d' : '#0f172a',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
            </button>
          </div>

        </div>

        {/* Footer con Acciones de Descarga e Impresión */}
        <div style={{
          padding: '16px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px'
        }}>
          {/* 1. Probar en nueva pestaña */}
          <button
            type="button"
            onClick={() => {
              if (onOpenGuestSimulator) {
                onOpenGuestSimulator(qrCodeIdentifier);
                onClose();
              } else {
                window.open(targetUrl, '_blank');
              }
            }}
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            title="Abrir la comanda como si fueras el cliente"
          >
            <Smartphone size={14} color="#0284c7" />
            <span>Probar Celular</span>
          </button>

          {/* 2. Descargar imagen PNG */}
          <button
            type="button"
            onClick={handleDownload}
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            title="Descargar imagen PNG para stickers o diseño"
          >
            <Download size={14} color="#d97706" />
            <span>Descargar PNG</span>
          </button>

          {/* 3. Imprimir Tarjeta */}
          <button
            type="button"
            onClick={handleOpenPrint}
            style={{
              padding: '9px 12px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
            }}
            title="Imprimir tarjeta individual lista para mesa o barra"
          >
            <Printer size={14} />
            <span>Imprimir Tarjeta</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
