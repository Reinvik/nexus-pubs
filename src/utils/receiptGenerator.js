/**
 * Generador y Descargador de Boletas y Facturas Electrónicas
 * Permite imprimir o descargar comprobantes en formato PDF/Impresión Térmica
 */

import { getWhatsAppShareUrl } from './shiftExport';

export const generateReceiptHTML = (sale, companySettings = {}, companyName = 'SoLago', branchName = '') => {
  const isFactura = sale?.document_type === 'Factura';
  const isAnulada = sale?.status === 'Anulada' || sale?.cancelled;

  const title = isFactura ? 'FACTURA ELECTRÓNICA' : (sale?.document_type === 'Boleta' ? 'BOLETA ELECTRÓNICA' : 'COMPROBANTE DE VENTA');
  const folio = sale?.id ? `N° SL-${String(sale.id).slice(-8).toUpperCase()}` : `N° ${Date.now().toString().slice(-6)}`;
  
  const compName = companyName || companySettings.company_name || 'SoLago';
  const isVE = companySettings.country === 'VE' || companySettings.currency_code === 'VES' || !companySettings.country;
  const rut = companySettings.rif || companySettings.tax_id || companySettings.rut || (isVE ? 'J-12345678-0' : '76.543.210-K');
  const address = branchName || companySettings.address || 'Sede Principal';
  const phone = companySettings.phone || '';

  const dateLocale = isVE ? 'es-VE' : 'es-CL';
  const dateStr = sale?.sold_at ? new Date(sale.sold_at).toLocaleString(dateLocale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }) : new Date().toLocaleString(dateLocale);

  const items = sale?.items || [];
  const isUSD = sale?.use_usd_pricing ?? (companySettings.use_usd_pricing !== false);
  const rate = Number(sale?.exchange_rate || companySettings.exchange_rate || 1.0);
  const symbol = (companySettings.currency_code === 'VES' || (!companySettings.currency_code && companySettings.country !== 'CL'))
    ? 'Bs.'
    : (companySettings.currency_symbol || '$');

  const formatAmount = (num) => {
    const rawVal = Number(num) || 0;
    const localVal = isUSD ? rawVal * rate : rawVal;
    if (companySettings.currency_code === 'CLP') {
      return `${symbol} ${Math.round(localVal).toLocaleString('es-CL')}`;
    }
    return `${symbol} ${localVal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatUSD = (num) => {
    const rawVal = Number(num) || 0;
    const usdVal = isUSD ? rawVal : (rate > 0 ? rawVal / rate : rawVal);
    return `$${usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  };

  const isSaleTaxFree = sale?.apply_tax === false || 
    (sale?.tax_rate !== undefined && sale?.tax_rate !== null ? Number(sale.tax_rate) === 0 : false) || 
    (companySettings?.tax_enabled === false) ||
    (Number(companySettings?.tax_rate) === 0);

  const taxRate = isSaleTaxFree 
    ? 0 
    : ((sale?.tax_rate !== undefined && sale?.tax_rate !== null) 
      ? Number(sale.tax_rate) 
      : ((companySettings?.tax_rate !== undefined && companySettings?.tax_rate !== null) ? Number(companySettings.tax_rate) : 0.16));

  let exemptTotal = 0;
  let taxableTotalWithTax = 0;

  items.forEach(it => {
    const sub = Number(it.subtotal || ((it.cantidad || 1) * (it.precio_unitario || it.sell_price || 0))) || 0;
    if (isSaleTaxFree || it.is_exempt || it.is_tax_exempt) {
      exemptTotal += sub;
    } else {
      taxableTotalWithTax += sub;
    }
  });

  const hasExemptItems = items.some(it => it.is_exempt || it.is_tax_exempt);
  if (!hasExemptItems && Number(sale?.tax_amount) === 0 && items.length > 0) {
    exemptTotal = items.reduce((sum, it) => sum + Number(it.subtotal || ((it.cantidad || 1) * (it.precio_unitario || 0))), 0);
    taxableTotalWithTax = 0;
  }

  const discount = Number(sale?.discount) || 0;
  const itemsTotalSum = exemptTotal + taxableTotalWithTax;

  const taxableBase = (taxRate > 0 && taxableTotalWithTax > 0) ? (taxableTotalWithTax / (1 + taxRate)) : taxableTotalWithTax;
  const calcTaxAmount = (!isSaleTaxFree && sale?.apply_tax !== false) ? (taxableTotalWithTax - taxableBase) : 0;
  const totalAmount = itemsTotalSum > 0 ? Math.max(0, itemsTotalSum - discount) : (sale?.total_sell || 0);
  const netTotalAmount = isSaleTaxFree ? totalAmount : (itemsTotalSum > 0 ? Math.max(0, (exemptTotal + taxableBase) - discount) : (sale?.net_total || totalAmount));

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${title} - ${folio}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Courier New', Courier, monospace, sans-serif;
        }
        body {
          width: 80mm;
          max-width: 100%;
          padding: 12px;
          background: #ffffff;
          color: #000000;
          font-size: 11px;
          line-height: 1.3;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-bold { font-weight: bold; }
        
        .header {
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px dashed #000;
        }
        .company-name {
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .doc-title {
          font-size: 12px;
          font-weight: bold;
          margin: 6px 0 2px 0;
          text-transform: uppercase;
          border: 1px solid #000;
          padding: 4px;
          display: inline-block;
          width: 100%;
        }
        .anulado-stamp {
          background: #000;
          color: #fff;
          font-weight: bold;
          font-size: 13px;
          padding: 6px;
          margin: 8px 0;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .meta-info {
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px dashed #000;
          font-size: 10.5px;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
          font-size: 10.5px;
        }
        th {
          border-bottom: 1px solid #000;
          padding-bottom: 4px;
          text-align: left;
          font-weight: bold;
        }
        td {
          padding: 4px 0;
          vertical-align: top;
        }
        .item-row td {
          border-bottom: 1px dotted #ccc;
        }
        
        .totals {
          border-top: 1px dashed #000;
          padding-top: 6px;
          margin-bottom: 12px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        .grand-total {
          font-size: 13px;
          font-weight: bold;
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 4px 0;
          margin-top: 4px;
        }

        .footer {
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px dashed #000;
          font-size: 9.5px;
        }

        @media print {
          body { width: 100%; padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      
      <!-- BOTÓN DE IMPRESIÓN / DESCARGA PDF EN PANTALLA -->
      <div class="no-print" style="margin-bottom: 14px; text-align: center; background: #f1f5f9; padding: 10px; border-radius: 8px; font-family: sans-serif;">
        <button onclick="window.print()" style="background: #06b6d4; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">
          🖨️ IMPRIMIR / GUARDAR COMO PDF
        </button>
      </div>

      <div class="header text-center">
        <div class="company-name">${compName}</div>
        <div>${companySettings.country === 'VE' ? 'R.I.F.' : 'R.U.T.'}: ${rut}</div>
        <div>${address}</div>
        ${phone ? `<div>Tel: ${phone}</div>` : ''}
        
        <div class="doc-title">${title}</div>
        <div class="text-bold">${folio}</div>
      </div>

      ${isAnulada ? `
        <div class="anulado-stamp">
          *** DOCUMENTO ANULADO ***
          ${sale?.cancellation_reason ? `<div style="font-size: 9.5px; margin-top: 4px; font-weight: normal; text-transform: none;">Motivo: ${sale.cancellation_reason}</div>` : ''}
          ${sale?.cancelled_by ? `<div style="font-size: 9px; font-weight: normal; text-transform: none;">Anulado por: ${sale.cancelled_by}</div>` : ''}
        </div>
      ` : ''}

      <div class="meta-info">
        <div class="meta-row">
          <span>FECHA EMISIÓN:</span>
          <span class="text-bold">${dateStr}</span>
        </div>
        <div class="meta-row">
          <span>FORMA DE PAGO:</span>
          <span class="text-bold">${sale?.payment_method || 'Efectivo'}</span>
        </div>
        ${sale?.split_payments && Array.isArray(sale.split_payments) && sale.split_payments.length > 0 ? `
          <div style="margin: 4px 0; padding: 4px 0; border-top: 1px dotted #000; border-bottom: 1px dotted #000; font-size: 10px;">
            <div style="font-weight: bold; margin-bottom: 2px;">-- DESGLOSE DE PAGO MULTIDIVISA --</div>
            ${sale.split_payments.map(sp => `
              <div class="meta-row" style="color: #1e293b;">
                <span>• ${sp.method || sp.label || 'Pago'}:</span>
                <span class="text-bold">${Number(sp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sp.currency || ''} ${sp.ref_number ? `(#${sp.ref_number})` : ''}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${sale?.cash_details?.change_payout_details ? `
          <div class="meta-row" style="color: #047857; font-size: 10px; margin-top: 2px;">
            <span>VUELTO ENTREGADO:</span>
            <span class="text-bold">${sale.cash_details.change_payout_details.method_label || 'Vuelto'}: $${Number(sale.cash_details.change_payout_details.amount_usd || 0).toFixed(2)} USD</span>
          </div>
        ` : ''}
        ${(sale?.reference_number || sale?.cash_details?.reference_number) ? `
          <div class="meta-row">
            <span>N° REF / TRANSACCIÓN:</span>
            <span class="text-bold">#${sale.reference_number || sale.cash_details?.reference_number}</span>
          </div>
        ` : ''}
        ${(sale?.customer_rut || sale?.customer_name || isFactura) ? `
          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dotted #000;">
            <div class="text-bold text-center" style="margin-bottom: 4px; text-transform: uppercase; font-size: 10px;">-- DATOS RECEPTOR FACTURA --</div>
            ${sale?.customer_rut ? `<div class="meta-row"><span>${companySettings.country === 'VE' ? 'R.I.F. / C.I.:' : 'R.U.T. CLIENTE:'}</span><span class="text-bold">${sale.customer_rut}</span></div>` : ''}
            ${sale?.customer_name ? `<div class="meta-row"><span>RAZÓN SOCIAL:</span><span class="text-bold">${sale.customer_name}</span></div>` : ''}
            ${sale?.customer_giro ? `<div class="meta-row"><span>GIRO COMERCIAL:</span><span>${sale.customer_giro}</span></div>` : ''}
            ${sale?.customer_address ? `<div class="meta-row"><span>DIRECCIÓN:</span><span>${sale.customer_address}</span></div>` : ''}
          </div>
        ` : `
          <div class="meta-row">
            <span>CLIENTE:</span>
            <span>Venta Mostrador</span>
          </div>
        `}
      </div>

      <table>
        <thead>
          <tr>
            <th>CANT/DETALLE</th>
            <th class="text-right">P.UNIT</th>
            <th class="text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => {
            const isExempt = !!(item.is_exempt || item.is_tax_exempt);
            const rawUnit = Number(item.precio_unitario || item.sell_price || 0);
            const rawSub = Number(item.subtotal || ((item.cantidad || 1) * rawUnit)) || 0;

            const netUnit = (!isExempt && sale?.apply_tax !== false) ? (rawUnit / (1 + taxRate)) : rawUnit;
            const netSub = (!isExempt && sale?.apply_tax !== false) ? (rawSub / (1 + taxRate)) : rawSub;

            const colorLabel = (item.selectedVariant?.color || item.color) ? ` [Color: ${item.selectedVariant?.color || item.color}]` : '';
            const baseName = item.nombre || item.name || 'Producto';
            const displayName = isExempt ? `${baseName}${colorLabel} (E)` : `${baseName}${colorLabel}`;

            return `
              <tr class="item-row">
                <td style="padding-right: 4px;">
                  <div class="text-bold">${displayName}</div>
                  <div>${item.cantidad} x ${formatAmount(netUnit)}</div>
                </td>
                <td class="text-right">${formatAmount(netUnit)}</td>
                <td class="text-right text-bold">${formatAmount(netSub)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="totals">
        ${isSaleTaxFree ? `
          <div class="total-row">
            <span>SUBTOTAL:</span>
            <span class="text-bold">${formatAmount(itemsTotalSum)}</span>
          </div>
        ` : `
          <div class="total-row">
            <span>SUBTOTAL EXENTO (E):</span>
            <span class="text-bold">${formatAmount(exemptTotal)}</span>
          </div>
          <div class="total-row">
            <span>BASE IMPONIBLE (GRAVABLE):</span>
            <span>${formatAmount(taxableBase)}</span>
          </div>
          <div class="total-row">
            <span>TOTAL IVA (${(taxRate * 100).toFixed(0)}%):</span>
            <span>${formatAmount(calcTaxAmount)}</span>
          </div>
        `}
        ${discount > 0 ? `
          <div class="total-row">
            <span>DESCUENTO APLICADO:</span>
            <span>-${formatAmount(discount)}</span>
          </div>
        ` : ''}
        <div class="total-row grand-total">
          <span>TOTAL A PAGAR:</span>
          <span>${formatAmount(totalAmount)}</span>
        </div>
        ${isUSD ? `
          <div class="total-row" style="font-size: 10.5px; margin-top: 4px; color: #475569; border-top: 1px dotted #ccc; padding-top: 4px;">
            <span>REFERENCIA DÓLARES (Tasa ${rate}):</span>
            <span>${formatUSD(totalAmount)}</span>
          </div>
        ` : ''}
      </div>

      <div class="footer text-center">
        <div>¡GRACIAS POR SU COMPRA!</div>
        <div style="margin-top: 4px; font-weight: bold;">SOLAGO - TERMINAL POS</div>
        <div style="margin-top: 2px;">Comprobante de Venta Digital</div>
      </div>

    </body>
    </html>
  `;
};

/**
 * Abre una ventana limpia de impresión/descarga para la Boleta o Factura
 */
export const printReceipt = (sale, companySettings, companyName, branchName) => {
  const htmlContent = generateReceiptHTML(sale, companySettings, companyName, branchName);
  const printWindow = window.open('', '_blank', 'width=450,height=700');
  
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    // Auto activar diálogo de impresión tras cargar
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (e) {
        console.log("Diálogo de impresión cerrado");
      }
    }, 350);
  } else {
    alert("⚠️ Por favor permite las ventanas emergentes en tu navegador para descargar/imprimir el comprobante.");
  }
};

/**
 * Descarga directamente el archivo HTML/PDF del comprobante
 */
export const downloadReceiptFile = (sale, companySettings, companyName, branchName) => {
  const htmlContent = generateReceiptHTML(sale, companySettings, companyName, branchName);
  const docType = sale?.document_type || 'Comprobante';
  const saleId = String(sale?.id || Date.now()).slice(-6).toUpperCase();
  const filename = `${docType}_PN-${saleId}.html`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Formatea una venta en un comprobante digital limpio para enviar por WhatsApp
 */
export const formatSaleWhatsAppReceipt = (sale, companySettings = {}, companyName = 'SoLago', branchName = '') => {
  const compName = companyName || companySettings.company_name || 'SoLago';
  const docType = sale?.document_type || 'Comprobante de Venta';
  const folio = sale?.id ? `N° SL-${String(sale.id).slice(-8).toUpperCase()}` : '';
  const isVE = companySettings.country === 'VE' || companySettings.currency_code === 'VES' || !companySettings.country;
  const dateLocale = isVE ? 'es-VE' : 'es-CL';
  const dateStr = sale?.sold_at ? new Date(sale.sold_at).toLocaleString(dateLocale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }) : new Date().toLocaleString(dateLocale);

  const customer = sale?.customer_name || 'Cliente Mostrador';
  const rawItems = sale?.items;
  const items = (typeof rawItems === 'string' ? JSON.parse(rawItems || '[]') : (rawItems || [])) || [];
  const rate = Number(sale?.exchange_rate || companySettings.exchange_rate || 1.0);
  const symbol = companySettings.currency_symbol || (isVE ? 'Bs.' : '$');

  let msg = `🧾 *${docType.toUpperCase()} ${folio}*\n`;
  msg += `🏢 *${compName}*${branchName ? ` - ${branchName}` : ''}\n`;
  msg += `👤 *Cliente:* ${customer}\n`;
  msg += `🕒 *Fecha:* ${dateStr}\n\n`;

  msg += `📦 *DETALLE DE LA COMPRA:*\n`;
  items.forEach((it, idx) => {
    const qty = it.cantidad || it.quantity || 1;
    const name = it.name || it.part?.name || 'Producto';
    const price = Number(it.sell_price || it.unit_price || it.price || 0);
    msg += `${idx + 1}. *${qty}x* ${name} - $${(price * qty).toFixed(2)}\n`;
  });

  const total = Number(sale?.total_sell || sale?.total_amount || sale?.total || 0);
  msg += `\n💰 *TOTAL:* $${total.toFixed(2)} USD`;
  if (rate > 1) {
    msg += ` (${symbol} ${(total * rate).toLocaleString(dateLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})\n`;
  } else {
    msg += `\n`;
  }
  msg += `💳 *Método de Pago:* ${sale?.payment_method || 'Efectivo'}\n`;
  msg += `\n✨ *¡Gracias por su compra en ${compName}!*`;

  return msg;
};

/**
 * Genera el enlace de WhatsApp listo para abrir
 */
export const getSaleWhatsAppReceiptUrl = (sale, companySettings = {}, companyName = 'SoLago', branchName = '', targetPhone = '') => {
  const phone = targetPhone || companySettings.owner_whatsapp_phone || companySettings.phone || '';
  const msg = formatSaleWhatsAppReceipt(sale, companySettings, companyName, branchName);
  return getWhatsAppShareUrl(phone, msg, companySettings.country || 'VE');
};
