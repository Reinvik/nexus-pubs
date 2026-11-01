/**
 * Administrador de Base de Datos Local IndexedDB para Modo Sin Conexión (PWA / Offline)
 * Permite guardar ventas y transacciones en el navegador cuando no hay internet
 * y sincronizarlas de manera transparente con Supabase al recuperar la conexión.
 */

const DB_NAME = 'SolagoOfflineStore';
const DB_VERSION = 1;
const SALES_STORE = 'offline_sales';
const INVENTORY_STORE = 'cached_inventory';

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está soportado en este entorno'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(SALES_STORE)) {
        const salesStore = db.createObjectStore(SALES_STORE, { keyPath: 'id' });
        salesStore.createIndex('created_at', 'created_at', { unique: false });
        salesStore.createIndex('status', 'status', { unique: false });
        salesStore.createIndex('company_id', 'company_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(INVENTORY_STORE)) {
        db.createObjectStore(INVENTORY_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
};

/**
 * Guarda una venta generada sin conexión en IndexedDB
 */
export const saveOfflineSale = async (sale) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SALES_STORE, 'readwrite');
      const store = tx.objectStore(SALES_STORE);
      const offlineSaleRecord = {
        ...sale,
        id: sale.id || offline--,
        is_offline_pending: true,
        offline_saved_at: new Date().toISOString()
      };
      const req = store.put(offlineSaleRecord);

      req.onsuccess = () => resolve(offlineSaleRecord);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Error guardando venta offline:', err);
    // Fallback a localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('solago_pending_offline_sales') || '[]');
      saved.push(sale);
      localStorage.setItem('solago_pending_offline_sales', JSON.stringify(saved));
    } catch (e) {}
    return sale;
  }
};

/**
 * Obtiene todas las ventas pendientes por sincronizar
 */
export const getPendingOfflineSales = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SALES_STORE, 'readonly');
      const store = tx.objectStore(SALES_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const idbSales = req.result || [];
        // Combinar con posibles ventas de localStorage de fallback
        try {
          const lsSales = JSON.parse(localStorage.getItem('solago_pending_offline_sales') || '[]');
          const combined = [...idbSales];
          lsSales.forEach(ls => {
            if (!combined.some(s => s.id === ls.id)) combined.push(ls);
          });
          resolve(combined);
        } catch (e) {
          resolve(idbSales);
        }
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    try {
      return JSON.parse(localStorage.getItem('solago_pending_offline_sales') || '[]');
    } catch (e) {
      return [];
    }
  }
};

/**
 * Elimina una venta ya sincronizada de IndexedDB
 */
export const removePendingOfflineSale = async (saleId) => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SALES_STORE, 'readwrite');
      const store = tx.objectStore(SALES_STORE);
      const req = store.delete(saleId);
      req.onsuccess = () => {
        // Limpiar de localStorage también si existía
        try {
          const lsSales = JSON.parse(localStorage.getItem('solago_pending_offline_sales') || '[]');
          const filtered = lsSales.filter(s => s.id !== saleId);
          localStorage.setItem('solago_pending_offline_sales', JSON.stringify(filtered));
        } catch (e) {}
        resolve(true);
      };
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
};

/**
 * Cachea el inventario completo en IndexedDB para disponibilidad instantánea offline
 */
export const cacheLocalInventory = async (inventoryList) => {
  if (!Array.isArray(inventoryList) || inventoryList.length === 0) return;
  try {
    const db = await openDB();
    const tx = db.transaction(INVENTORY_STORE, 'readwrite');
    const store = tx.objectStore(INVENTORY_STORE);
    store.clear();
    inventoryList.forEach(item => {
      if (item && item.id) store.put(item);
    });
  } catch (e) {}
};

/**
 * Recupera el inventario cacheado desde IndexedDB
 */
export const getCachedLocalInventory = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(INVENTORY_STORE, 'readonly');
      const store = tx.objectStore(INVENTORY_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
};
