export const COUNTRY_CONFIGS = {
  CL: {
    code: 'CL',
    name: 'Chile',
    flag: '🇨🇱',
    currencyCode: 'CLP',
    currencySymbol: '$',
    taxName: 'IVA',
    defaultTaxRate: 0.19,
    useUsdPricingDefault: false,
    taxIdLabel: 'R.U.T. Empresa / Cliente',
    taxIdShortLabel: 'R.U.T.',
    taxIdPlaceholder: 'Ej: 76.123.456-7',
    customerNameLabel: 'Razón Social / Nombre',
    docTypes: [
      { key: 'Boleta', label: '🧾 Boleta Electrónica', shortLabel: 'Boleta', isDefault: true, requiresTaxId: false },
      { key: 'Factura', label: '📄 Factura Electrónica', shortLabel: 'Factura', isDefault: false, requiresTaxId: true },
      { key: 'Guia', label: '📦 Guía de Despacho', shortLabel: 'Guía', isDefault: false, requiresTaxId: false }
    ],
    defaultDocType: 'Boleta'
  },
  VE: {
    code: 'VE',
    name: 'Venezuela',
    flag: '🇻🇪',
    currencyCode: 'VES',
    currencySymbol: 'Bs.',
    taxName: 'IVA',
    defaultTaxRate: 0.16,
    useUsdPricingDefault: true,
    taxIdLabel: 'R.I.F. / C.I. Cliente',
    taxIdShortLabel: 'R.I.F. / C.I.',
    taxIdPlaceholder: 'Ej: J-12345678-9 o V-12345678',
    customerNameLabel: 'Razón Social / Nombre Completo',
    docTypes: [
      { key: 'Factura', label: '📄 Factura Fiscal (SENIAT)', shortLabel: 'Factura', isDefault: true, requiresTaxId: true },
      { key: 'Nota de Entrega', label: '📋 Ticket / Nota de Entrega', shortLabel: 'Nota Entrega', isDefault: false, requiresTaxId: false },
      { key: 'Nota de Débito', label: '📝 Nota de Débito', shortLabel: 'N. Débito', isDefault: false, requiresTaxId: true }
    ],
    defaultDocType: 'Factura'
  }
};

export const getCountryConfig = (countryCode = 'CL') => {
  const code = (countryCode || 'CL').toUpperCase();
  return COUNTRY_CONFIGS[code] || COUNTRY_CONFIGS.CL;
};
