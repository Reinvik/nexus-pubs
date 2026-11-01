import { getWhatsAppShareUrl } from './shiftExport';

/**
 * Formatea un pedido de la vitrina virtual en un mensaje estructurado y amigable
 * para enviar directamente al WhatsApp del dueño del negocio.
 */
export const formatShowcaseWhatsAppOrder = ({
  companyName = 'SoLago',
  activeBranch = null,
  participantName = '',
  orderType = 'takeaway', // 'table' | 'takeaway' | 'delivery' | 'pickup'
  tableName = '',
  ticketCode = '',
  basket = [],
  totalAmount = 0,
  orderNotes = '',
  companySettings = {},
  customerPhone = '',
  shippingAddress = '',
  isOnlineStore = false
}) => {
  const compName = companyName || companySettings.company_name || 'SoLago';
  const branchText = activeBranch?.name ? ` (Sede: ${activeBranch.name})` : '';
  const client = (participantName && participantName.trim()) ? participantName.trim() : 'Cliente';
  const rate = Number(companySettings.exchange_rate || 1.0);
  const currencyCode = companySettings.currency_code || 'VES';
  const currencySymbol = companySettings.currency_symbol || (currencyCode === 'VES' ? 'Bs.' : '$');

  const nowStr = new Date().toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short'
  });

  const isBeauty = companySettings.business_type === 'belleza';
  let headerTitle = `🛒 *NUEVO PEDIDO DESDE VITRINA VIRTUAL*`;
  if (isBeauty) {
    headerTitle = `✂️ *NUEVO PEDIDO QR - BARBERÍA & SALÓN*`;
  } else if (isOnlineStore) {
    headerTitle = `🌐 *NUEVO PEDIDO DESDE TIENDA ONLINE*`;
  }
  let message = `${headerTitle}\n`;
  message += `🏢 *Establecimiento:* ${compName}${branchText}\n`;
  message += `👤 *Cliente:* ${client}\n`;

  if (customerPhone && customerPhone.trim()) {
    message += `📱 *Teléfono / WhatsApp:* ${customerPhone.trim()}\n`;
  }

  if (orderType === 'table' && tableName) {
    message += isBeauty ? `📍 *Ubicación / Sillón:* ${tableName}\n` : `📍 *Mesa:* ${tableName}\n`;
  } else if (orderType === 'delivery') {
    message += `🛵 *Modalidad:* Envío a Domicilio (Delivery)\n`;
    if (shippingAddress && shippingAddress.trim()) {
      message += `🏠 *Dirección de Entrega:* ${shippingAddress.trim()}\n`;
    }
  } else if (orderType === 'pickup') {
    message += isBeauty ? `🏬 *Modalidad:* Retiro en Salón / Mostrador\n` : `🏬 *Modalidad:* Retiro en Tienda / Local\n`;
  } else {
    message += isBeauty ? `🛍️ *Modalidad:* Mostrador / Para Llevar\n` : `🛍️ *Modalidad:* Para Llevar / Retiro en Barra\n`;
  }

  if (ticketCode) {
    message += `🎫 *Código de Ticket / Pedido:* *${ticketCode}*\n`;
  }
  message += `🕒 *Fecha:* ${nowStr}\n\n`;

  message += `📦 *DETALLE DE PRODUCTOS:*\n`;
  basket.forEach((item, index) => {
    const qty = item.cantidad;
    const name = item.part?.name || 'Producto';
    const variantLabel = (item.selectedVariant?.color || item.variant?.color || item.part?.selectedVariant?.color)
      ? ` [Color: ${item.selectedVariant?.color || item.variant?.color || item.part?.selectedVariant?.color}]`
      : '';
    const fullName = `${name}${variantLabel}`;
    const unit = item.part?.unit ? ` ${item.part.unit}` : '';
    const unitPriceUSD = Number(item.part?.sell_price || 0);
    const itemTotalUSD = unitPriceUSD * qty;

    const itemTotalLocal = itemTotalUSD * rate;

    const usdPriceStr = `$${itemTotalUSD.toFixed(2)}`;
    const localPriceStr = `${currencySymbol} ${itemTotalLocal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    message += `${index + 1}. *${qty}${unit}* x ${fullName} ➔ ${usdPriceStr}`;
    if (rate > 1 || currencyCode !== 'USD') {
      message += ` (${localPriceStr})`;
    }
    message += `\n`;
  });

  const totalUSD = totalAmount;
  const totalLocal = totalAmount * rate;

  message += `\n💰 *TOTAL DEL PEDIDO:*\n`;
  message += `💵 *Total USD:* $${totalUSD.toFixed(2)} USD\n`;
  if (rate > 1 || currencyCode !== 'USD') {
    message += `🇻🇪 *Total ${currencyCode}:* ${currencySymbol} ${totalLocal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    message += `📈 *Tasa de cambio:* 1 USD = ${currencySymbol} ${rate.toFixed(2)}\n`;
  }

  if (orderNotes && orderNotes.trim()) {
    message += `\n📝 *Notas del Cliente:* "${orderNotes.trim()}"\n`;
  }

  message += `\n💬 *Por favor confirmar recepción y disponibilidad para procesar la orden.* ¡Muchas gracias!`;

  return message;
};

export const getOrderWhatsAppUrl = (phone, message, defaultCountry = 'VE') => {
  return getWhatsAppShareUrl(phone, message, defaultCountry);
};
