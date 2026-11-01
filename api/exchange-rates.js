let cachedData = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 3 * 60 * 60 * 1000; // 3 horas de caché

export default async function handler(req, res) {
  // Configurar cabeceras CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  // Edge CDN Cache: servir desde caché Edge durante 3 horas para reducir llamados a MontosVE
  res.setHeader('Cache-Control', 'public, s-maxage=10800, stale-while-revalidate=3600');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const forceRefresh = req.query?.force === 'true';
  const now = Date.now();

  // Si tenemos datos en caché de menos de 3 horas y no es refresh forzado, responder desde memoria
  if (!forceRefresh && cachedData && (now - lastFetchTime < CACHE_DURATION_MS)) {
    return res.status(200).json({
      ...cachedData,
      fromCache: true,
      cachedAt: new Date(lastFetchTime).toISOString()
    });
  }

  const rawKey = process.env.MONTOSVE_API_KEY || '39|tasasve_JBuRtRGnbDtIyp1Oz7GReNdmL44N08rhEp3uPpHIe0121cca';
  // Sanitizar API Key removiendo caracteres invisibles UTF-8 BOM (\uFEFF) o fuera de rango ASCII printable
  const apiKey = rawKey.replace(/[^\x20-\x7E]/g, '').trim();

  try {
    let bcvRate = 0;
    let euroRate = 0;
    let paraleloRate = 0;
    let sourcesCount = 0;

    const response = await fetch('https://api.montosve.com/v1/fx/rates', {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json'
      }
    }).catch(() => null);

    if (response && response.ok) {
      const payload = await response.json().catch(() => null);
      const ratesList = payload?.data || [];
      sourcesCount = payload?.meta?.sources_count || ratesList.length;

      ratesList.forEach(item => {
        const rateVal = Number(item.rate || 0);
        if (item.market === 'bcv' && item.currency_pair === 'USD/VES' && rateVal > 0) {
          bcvRate = rateVal;
        } else if (item.market === 'bcv' && item.currency_pair === 'EUR/VES' && rateVal > 0) {
          euroRate = rateVal;
        } else if ((item.market === 'binance_p2p' || item.market === 'bybit_p2p') && rateVal > 0 && paraleloRate === 0) {
          paraleloRate = rateVal;
        }
      });
    }

    // Fallback secundario: DolarApi si no se obtuvo tasa desde MontosVE
    if (!bcvRate || !paraleloRate) {
      try {
        const [dolarRes, parRes] = await Promise.all([
          fetch('https://ve.dolarapi.com/v1/dolares/oficial').catch(() => null),
          fetch('https://ve.dolarapi.com/v1/dolares/paralelo').catch(() => null)
        ]);

        if (dolarRes && dolarRes.ok) {
          const dData = await dolarRes.json().catch(() => null);
          if (!bcvRate && dData?.promedio) bcvRate = Number(dData.promedio);
        }

        if (parRes && parRes.ok) {
          const pData = await parRes.json().catch(() => null);
          if (!paraleloRate && pData?.promedio) paraleloRate = Number(pData.promedio);
        }
      } catch (fallbackErr) {
        console.warn('DolarApi fallback warning:', fallbackErr);
      }
    }

    if (!bcvRate && !paraleloRate) {
      if (cachedData) {
        return res.status(200).json({ ...cachedData, fromCache: true, staleFallback: true });
      }
      throw new Error('No se pudo obtener ninguna tasa válida ni de MontosVE ni de DolarApi.');
    }

    const currentDate = new Date();
    const vetHour = (currentDate.getUTCHours() - 4 + 24) % 24;
    const slot = vetHour >= 12 ? 'afternoon' : 'morning';

    cachedData = {
      success: true,
      bcv: bcvRate,
      euro: euroRate,
      paralelo: paraleloRate,
      updatedAt: currentDate.toISOString(),
      slot,
      sourcesCount: sourcesCount || 2
    };
    lastFetchTime = now;

    res.status(200).json(cachedData);
  } catch (err) {
    if (cachedData) {
      return res.status(200).json({ ...cachedData, fromCache: true, errorFallback: true });
    }
    console.error('Error fetching exchange rates:', err);
    res.status(500).json({
      success: false,
      error: 'No se pudieron obtener las tasas de cambio de Venezuela.',
      message: err.message
    });
  }
}

