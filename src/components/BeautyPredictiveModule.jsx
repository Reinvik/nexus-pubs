import React, { useState, useEffect, useMemo } from 'react';
import { usePuntoNexus } from '../context/PuntoNexusContext';
import { 
  Scissors, Crown, Users, Calendar, Clock, MessageSquare, AlertTriangle, 
  CheckCircle2, Plus, Search, Filter, RefreshCw, ShieldAlert, Award, TrendingUp, 
  DollarSign, Package, ChevronRight, Zap, Check, X, Phone, UserCheck, Flame, HeartHandshake, Eye, Sparkles, QrCode
} from 'lucide-react';
import DualCurrencyDisplay from './DualCurrencyDisplay';
import { playSound } from '../utils/soundEffects';
import { cleanWhatsAppNumber } from '../utils/shiftExport';

// Presets demo para barberías y salones de alta rotación (Chile y Venezuela)
const DEFAULT_BEAUTY_CLIENTS = [
  {
    id: 'cli-1',
    name: 'Camila Soto',
    phone: '+56987654321',
    service: 'Balayage Rubio Cenizo & Matiz',
    stylist: 'Valentina Colorista',
    lastVisit: '2026-08-25', // Hace 33 días
    cycleDays: 35, // Cada 35 días
    notes: 'Cabello decolorado nivel 9, matiz cenizo, café con leche de avena',
    totalVisits: 8,
    activePass: {
      planName: 'Bono Glamour Balayage & Mantenimiento',
      totalSessions: 3,
      remainingSessions: 2,
      expiresAt: '2026-11-20'
    }
  },
  {
    id: 'cli-2',
    name: 'Mateo González',
    phone: '+56991234567',
    service: 'Corte Fade Degradé & Barba',
    stylist: 'Carlos Master Barber',
    lastVisit: '2026-09-13', // Hace 14 días
    cycleDays: 15, // Cada 15 días
    notes: 'Degradé al cero en los costados, perfilado de barba con navaja',
    totalVisits: 14,
    activePass: {
      planName: 'Pase Mensual Barbería: 4 Cortes',
      totalSessions: 4,
      remainingSessions: 1,
      expiresAt: '2026-10-05'
    }
  },
  {
    id: 'cli-3',
    name: 'Sofía Valenzuela',
    phone: '+584121234567',
    service: 'Uñas Acrílicas Esculpidas & Esmaltado',
    stylist: 'Andrea Nail Artist',
    lastVisit: '2026-08-10', // Hace 48 días (En riesgo de fuga)
    cycleDays: 21, // Cada 21 días
    notes: 'Diseños almendrados, prefiere tonos nude y glitter',
    totalVisits: 5,
    activePass: null
  },
  {
    id: 'cli-4',
    name: 'Ignacio Rojas',
    phone: '+56976543210',
    service: 'Corte Clásico Ejecutivo & Peinado',
    stylist: 'Carlos Master Barber',
    lastVisit: '2026-09-24', // Hace 3 días (Al día)
    cycleDays: 25,
    notes: 'Peinado con cera mate, cliente prefiere café expreso',
    totalVisits: 11,
    activePass: null
  },
  {
    id: 'cli-5',
    name: 'Valeria Mendoza',
    phone: '+584241234567',
    service: 'Alisado Keratina Brasileña',
    stylist: 'Valentina Colorista',
    lastVisit: '2026-07-20', // Muy atrasada (Riesgo alto)
    cycleDays: 60,
    notes: 'Cabello con frizz moderado, necesita secador caliente para activación',
    totalVisits: 4,
    activePass: null
  }
];

const DEFAULT_MEMBERSHIP_PLANS = [
  {
    id: 'plan-1',
    name: 'Pase 4 Cortes al Mes (Barbería VIP)',
    category: 'Barbería',
    service: 'Corte Fade / Clásico',
    sessions: 4,
    regularPrice: 60,
    prepaidPrice: 45,
    validityDays: 30,
    description: 'Pase mensual de 4 sesiones con tarifa preferencial prepago. Flujo de caja garantizado por adelantado.',
    popular: true
  },
  {
    id: 'plan-2',
    name: 'Bono Barba & Pelo Premium (3 Sesiones)',
    category: 'Barbería',
    service: 'Corte + Barba + Toalla Caliente',
    sessions: 3,
    regularPrice: 48,
    prepaidPrice: 38,
    validityDays: 45,
    description: 'Pack completo para el cuidado masculino recurrente con toalla caliente y perfilado de barba.',
    popular: false
  },
  {
    id: 'plan-3',
    name: 'Bono Glamour: 3 Sesiones Balayage / Mantenimiento',
    category: 'Salón de Belleza',
    service: 'Coloración / Balayage / Matiz',
    sessions: 3,
    regularPrice: 120,
    prepaidPrice: 95,
    validityDays: 90,
    description: 'Mantenimiento de color, nutrición profunda y matiz para rubios y morenas iluminadas.',
    popular: true
  },
  {
    id: 'plan-4',
    name: 'Pack 4 Manicuras Rusas & Esmaltado Permanente',
    category: 'Nails & Estética',
    service: 'Manicura Rusa',
    sessions: 4,
    regularPrice: 56,
    prepaidPrice: 42,
    validityDays: 60,
    description: 'Uñas impecables durante todo el mes con retiro cuidadoso y esmaltado de alta durabilidad.',
    popular: false
  }
];

const DEFAULT_TECHNICAL_RECIPES = [
  {
    id: 'rec-1',
    service: 'Balayage / Decoloración Completa',
    category: 'Coloración',
    supplies: [
      { name: 'Polvo Decolorante Blond Studio', standardAmount: 60, unit: 'g' },
      { name: 'Oxidante en Crema 20 Vol', standardAmount: 120, unit: 'ml' },
      { name: 'Matizador Rubio Cenizo', standardAmount: 30, unit: 'g' }
    ],
    notes: 'Mezcla 1:2 para decoloración libre con papel aluminio térmico.'
  },
  {
    id: 'rec-2',
    service: 'Coloración Raíz / Cubrimiento de Canas',
    category: 'Coloración',
    supplies: [
      { name: 'Tubo Tinte Profesional', standardAmount: 45, unit: 'g' },
      { name: 'Oxidante en Crema 20 Vol', standardAmount: 45, unit: 'ml' }
    ],
    notes: 'Proporción 1:1 exacta para garantizar cobertura del 100% de canas.'
  },
  {
    id: 'rec-3',
    service: 'Alisado Keratina Termoactiva',
    category: 'Tratamientos',
    supplies: [
      { name: 'Crema Alisadora Keratina Pro', standardAmount: 75, unit: 'ml' }
    ],
    notes: 'Aplicar a 1 cm de la raíz, peinar fino y secar con brushing antes de planchar.'
  },
  {
    id: 'rec-4',
    service: 'Ritual Barba & Afeitado Clásico',
    category: 'Barbería',
    supplies: [
      { name: 'Aceite Pre-Afeitado Hidratante', standardAmount: 5, unit: 'ml' },
      { name: 'Espuma / Crema de Afeitar', standardAmount: 15, unit: 'g' },
      { name: 'Bálsamo Post-Afeitado Aftershave', standardAmount: 8, unit: 'ml' }
    ],
    notes: 'Toalla caliente a 45°C durante 3 minutos antes de iniciar con navaja descartable.'
  }
];

const DEFAULT_STYLISTS = [
  {
    id: 'sty-1',
    name: 'Carlos Mendoza',
    nickname: 'Carlos Master Barber',
    specialty: 'Cortes Fade, Diseños & Barba',
    commissionPct: 50,
    monthlyServices: 84,
    retainedClientsCount: 46,
    efficiencyScore: 98
  },
  {
    id: 'sty-2',
    name: 'Valentina Morales',
    nickname: 'Valentina Colorista',
    specialty: 'Balayage, Rubios & Alisados',
    commissionPct: 45,
    monthlyServices: 52,
    retainedClientsCount: 38,
    efficiencyScore: 94
  },
  {
    id: 'sty-3',
    name: 'Andrea Pinto',
    nickname: 'Andrea Nail Artist',
    specialty: 'Uñas Acrílicas & Rusa',
    commissionPct: 50,
    monthlyServices: 68,
    retainedClientsCount: 31,
    efficiencyScore: 96
  }
];

export default function BeautyPredictiveModule({ setActiveTab: setAppTab } = {}) {
  const { 
    companySettings, 
    companyName, 
    activeBranch, 
    companyId, 
    inventory = [], 
    updateProduct, 
    formatCurrency 
  } = usePuntoNexus();

  const [activeTab, setActiveTab] = useState('predictive'); // 'predictive' | 'memberships' | 'supplies' | 'stylists'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'golden' | 'risk' | 'recent' | 'passes'

  // Moneda y normalización de precios (Chile CLP vs Venezuela / USD)
  const isChileanPesos = (companySettings?.country === 'CL' || companySettings?.currency_code === 'CLP') && !companySettings?.use_usd_pricing;
  
  const normalizePrice = (val) => {
    const n = Number(val) || 0;
    if (isChileanPesos) {
      return n < 500 ? n * 1000 : n;
    } else {
      // USD base (Venezuela o tiendas con multidivisa activa)
      return n >= 500 ? Math.round(n / 1000) : n;
    }
  };

  // Persistencia de Clientes y Ciclos
  const clientsStorageKey = `punto_nexus_beauty_clients_${companyId || 'default'}`;
  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem(clientsStorageKey);
    return saved ? JSON.parse(saved) : DEFAULT_BEAUTY_CLIENTS;
  });

  // Persistencia de Planes de Membresía
  const plansStorageKey = `punto_nexus_beauty_plans_${companyId || 'default'}`;
  const [plans, setPlans] = useState(() => {
    const saved = localStorage.getItem(plansStorageKey);
    const initial = saved ? JSON.parse(saved) : DEFAULT_MEMBERSHIP_PLANS;
    // Normalizar precios guardados para evitar importes descalibrados
    return initial.map(p => ({
      ...p,
      regularPrice: normalizePrice(p.regularPrice),
      prepaidPrice: normalizePrice(p.prepaidPrice)
    }));
  });

  // Persistencia de Recetas Técnicas
  const recipesStorageKey = `punto_nexus_beauty_recipes_${companyId || 'default'}`;
  const [recipes, setRecipes] = useState(() => {
    const saved = localStorage.getItem(recipesStorageKey);
    return saved ? JSON.parse(saved) : DEFAULT_TECHNICAL_RECIPES;
  });

  // Persistencia de Estilistas
  const stylistsStorageKey = `punto_nexus_beauty_stylists_${companyId || 'default'}`;
  const [stylists, setStylists] = useState(() => {
    const saved = localStorage.getItem(stylistsStorageKey);
    return saved ? JSON.parse(saved) : DEFAULT_STYLISTS;
  });

  // Historial de Consumos de Insumos por Profesional
  const suppliesLogKey = `punto_nexus_beauty_supplies_log_${companyId || 'default'}`;
  const [suppliesLog, setSuppliesLog] = useState(() => {
    const saved = localStorage.getItem(suppliesLogKey);
    return saved ? JSON.parse(saved) : [];
  });

  // Guardar en LocalStorage cada vez que cambien
  useEffect(() => {
    localStorage.setItem(clientsStorageKey, JSON.stringify(clients));
  }, [clients, clientsStorageKey]);

  useEffect(() => {
    localStorage.setItem(plansStorageKey, JSON.stringify(plans));
  }, [plans, plansStorageKey]);

  useEffect(() => {
    localStorage.setItem(recipesStorageKey, JSON.stringify(recipes));
  }, [recipes, recipesStorageKey]);

  useEffect(() => {
    localStorage.setItem(stylistsStorageKey, JSON.stringify(stylists));
  }, [stylists, stylistsStorageKey]);

  useEffect(() => {
    localStorage.setItem(suppliesLogKey, JSON.stringify(suppliesLog));
  }, [suppliesLog, suppliesLogKey]);

  // Estados de Modales
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showSellPassModal, setShowSellPassModal] = useState(null); // client object
  const [showRedeemPassModal, setShowRedeemPassModal] = useState(null); // client object
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [showRecordSupplyModal, setShowRecordSupplyModal] = useState(false);
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [showAddStylistModal, setShowAddStylistModal] = useState(false);

  // Formulario Nuevo Cliente
  const [clientForm, setClientForm] = useState({
    name: '',
    phone: '',
    service: 'Corte Fade Degradé & Barba',
    stylist: stylists[0]?.name || 'Carlos Master Barber',
    cycleDays: 15,
    lastVisit: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Formulario Nuevo Plan
  const [newPlanForm, setNewPlanForm] = useState({
    name: '',
    category: 'Barbería',
    service: 'Corte Fade / Degradé',
    sessions: 4,
    regularPrice: isChileanPesos ? 60000 : 60,
    prepaidPrice: isChileanPesos ? 45000 : 45,
    validityDays: 30,
    description: 'Pase prepago de sesiones con descuento por adelantado.',
    popular: false
  });

  const [selectedPlanForClient, setSelectedPlanForClient] = useState('');
  const [redeemStylist, setRedeemStylist] = useState(stylists[0]?.name || '');

  // Formulario Consumo de Insumo por Profesional
  const [supplyForm, setSupplyForm] = useState({
    stylist: stylists[0]?.name || '',
    serviceRecipeId: recipes[0]?.id || '',
    clientName: '',
    actualAmountUsed: ''
  });

  // Helper para calcular días transcurridos y estado del semáforo predictivo
  const getClientCycleStatus = (client) => {
    if (!client.lastVisit) return { daysAgo: 999, status: 'risk', statusLabel: 'Sin registro', badgeColor: '#ef4444' };
    const lastDate = new Date(client.lastVisit);
    const today = new Date();
    const diffTime = Math.abs(today - lastDate);
    const daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const cycle = Number(client.cycleDays || 30);

    // Ventana Dorada: cuando faltan 4 días para el ciclo o pasaron hasta 5 días después
    const goldenStart = cycle - 4;
    const goldenEnd = cycle + 5;

    if (daysAgo >= goldenStart && daysAgo <= goldenEnd) {
      return {
        daysAgo,
        cycle,
        status: 'golden',
        statusLabel: '🟢 Ventana Dorada (Listo para Recompra)',
        badgeColor: '#10b981',
        urgency: 'high'
      };
    } else if (daysAgo > goldenEnd) {
      return {
        daysAgo,
        cycle,
        status: 'risk',
        statusLabel: `🔴 Riesgo de Fuga (${daysAgo - cycle}d de atraso)`,
        badgeColor: '#ef4444',
        urgency: 'critical'
      };
    } else if (daysAgo >= cycle - 7 && daysAgo < goldenStart) {
      return {
        daysAgo,
        cycle,
        status: 'imminent',
        statusLabel: '🟡 Próximo a vencer ciclo',
        badgeColor: '#f59e0b',
        urgency: 'medium'
      };
    } else {
      return {
        daysAgo,
        cycle,
        status: 'recent',
        statusLabel: '⚪ Al Día / Visita Reciente',
        badgeColor: '#64748b',
        urgency: 'low'
      };
    }
  };

  // Generador de Mensaje Hiperpersonalizado para WhatsApp
  const handleSendWhatsAppReminder = (client) => {
    playSound('click');
    const cycleInfo = getClientCycleStatus(client);
    const compName = companyName || 'nuestro salón';
    const cleanPhone = cleanWhatsAppNumber(client.phone, companySettings?.country || 'VE');

    let customGreeting = `¡Hola ${client.name}! ✂️`;
    let body = '';

    if (cycleInfo.status === 'golden') {
      const weeksAgo = Math.max(1, Math.round(cycleInfo.daysAgo / 7));
      body = `Han pasado unas ${weeksAgo} semanas desde tu último servicio de *${client.service}* en ${compName}.\n\nTe escribimos para comentarte que *${client.stylist || 'tu estilista habitual'}* tiene un espacio preferencial guardado para ti esta semana.\n\n¿Te gustaría que te reservemos tu cupo preferencial?`;
    } else if (cycleInfo.status === 'risk') {
      body = `¡Te extrañamos en ${compName}! Notamos que hace tiempo no nos visitas para tu *${client.service}* con *${client.stylist}*.\n\nQueremos regalarte una atención especial o bebida de cortesía en tu próxima cita si reservas esta semana. ¿Qué día te acomoda mejor?`;
    } else {
      body = `Esperamos que estés disfrutando tu último servicio de *${client.service}*. Recuerda que si necesitas mantenimiento o retocar con *${client.stylist}*, estamos a tu total disposición en ${compName}. ¡Que tengas un excelente día!`;
    }

    if (client.activePass && client.activePass.remainingSessions > 0) {
      body += `\n\n🎟️ *Recordatorio VIP:* Tienes *${client.activePass.remainingSessions} sesiones activas* disponibles en tu ${client.activePass.planName}. ¡Aprovéchalas cuando gustes!`;
    }

    const fullMessage = `${customGreeting}\n\n${body}`;
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(fullMessage)}`;
    window.open(url, '_blank');
  };

  // Registrar visita hoy (reinicia el ciclo)
  const handleMarkVisitToday = (clientId) => {
    playSound('cash');
    const todayStr = new Date().toISOString().split('T')[0];
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          lastVisit: todayStr,
          totalVisits: (c.totalVisits || 0) + 1
        };
      }
      return c;
    }));
    alert('✅ Visita registrada con éxito. El ciclo predictivo se ha reiniciado para la próxima fecha dorada.');
  };

  // Canjear 1 sesión del pase prepago
  const handleRedeemPassSession = (e) => {
    e.preventDefault();
    if (!showRedeemPassModal) return;
    playSound('payment');
    const client = showRedeemPassModal;
    const remaining = (client.activePass?.remainingSessions || 1) - 1;
    const todayStr = new Date().toISOString().split('T')[0];

    setClients(prev => prev.map(c => {
      if (c.id === client.id) {
        return {
          ...c,
          lastVisit: todayStr,
          totalVisits: (c.totalVisits || 0) + 1,
          activePass: remaining > 0 ? {
            ...c.activePass,
            remainingSessions: remaining
          } : null
        };
      }
      return c;
    }));

    // Mensaje automático de confirmación de sesión al cliente
    const cleanPhone = cleanWhatsAppNumber(client.phone, companySettings?.country || 'VE');
    const comp = companyName || 'SoLago';
    const confirmMsg = `¡Hola ${client.name}! ✂️ Se ha canjeado exitosamente 1 sesión de tu *${client.activePass?.planName}* en ${comp} con ${redeemStylist}.\n\n📊 *Saldo restante:* Te quedan ${remaining} ${remaining === 1 ? 'sesión disponible' : 'sesiones disponibles'}.\n¡Muchas gracias por tu visita y preferencia!`;
    const shareUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(confirmMsg)}`;

    setShowRedeemPassModal(null);
    if (window.confirm(`✅ Sesión canjeada con éxito. Saldo restante: ${remaining} sesiones.\n\n¿Deseas enviar el comprobante de saldo restante por WhatsApp al cliente?`)) {
      window.open(shareUrl, '_blank');
    }
  };

  // Vender un nuevo plan de membresía prepago al cliente
  const handleSellPassToClient = (e) => {
    e.preventDefault();
    if (!showSellPassModal || !selectedPlanForClient) return;
    const plan = plans.find(p => p.id === selectedPlanForClient);
    if (!plan) return;

    playSound('payment');
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + (Number(plan.validityDays) || 30));
    const expireStr = expireDate.toISOString().split('T')[0];

    setClients(prev => prev.map(c => {
      if (c.id === showSellPassModal.id) {
        return {
          ...c,
          activePass: {
            planId: plan.id,
            planName: plan.name,
            totalSessions: plan.sessions,
            remainingSessions: plan.sessions,
            purchasedAt: new Date().toISOString().split('T')[0],
            expiresAt: expireStr
          }
        };
      }
      return c;
    }));

    const cleanPhone = cleanWhatsAppNumber(showSellPassModal.phone, companySettings?.country || 'VE');
    const comp = companyName || 'SoLago';
    const welcomeMsg = `¡Felicidades ${showSellPassModal.name}! 🌟 Has adquirido tu membresía *${plan.name}* en ${comp}.\n\n🎟️ Tienes *${plan.sessions} sesiones disponibles* con validez hasta el ${expireStr}.\n¡Muchas gracias por asegurar tu cuidado recurrente con nosotros!`;
    const shareUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(welcomeMsg)}`;

    setShowSellPassModal(null);
    if (window.confirm(`✅ Membresía "${plan.name}" vendida y activada con éxito para ${showSellPassModal.name}.\n\n¿Deseas enviar el recibo de membresía por WhatsApp?`)) {
      window.open(shareUrl, '_blank');
    }
  };

  // Registro de consumo real de insumos comparado contra receta
  const handleRecordSupplyUsage = (e) => {
    e.preventDefault();
    const recipe = recipes.find(r => r.id === supplyForm.serviceRecipeId);
    if (!recipe) return;

    const usedVal = Number(supplyForm.actualAmountUsed) || 0;
    const standardMainSupply = recipe.supplies[0];
    const stdVal = Number(standardMainSupply?.standardAmount) || 0;

    let deviationPct = 0;
    if (stdVal > 0) {
      deviationPct = Math.round(((usedVal - stdVal) / stdVal) * 100);
    }

    const logEntry = {
      id: 'sup-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      stylist: supplyForm.stylist,
      service: recipe.service,
      clientName: supplyForm.clientName || 'Cliente Salón',
      supplyName: standardMainSupply?.name,
      standardAmount: stdVal,
      actualAmount: usedVal,
      unit: standardMainSupply?.unit || 'g',
      deviationPct: deviationPct
    };

    setSuppliesLog(prev => [logEntry, ...prev]);
    setShowRecordSupplyModal(false);
    setSupplyForm({
      stylist: stylists[0]?.name || '',
      serviceRecipeId: recipes[0]?.id || '',
      clientName: '',
      actualAmountUsed: ''
    });

    if (deviationPct > 20) {
      playSound('error');
      alert(`⚠️ Consumo registrado. Advertencia: Se detectó un sobregasto de +${deviationPct}% respecto a la receta estándar (${usedVal} vs ${stdVal}${standardMainSupply?.unit}).`);
    } else {
      playSound('scan');
      alert(`✅ Consumo registrado correctamente (${usedVal} ${standardMainSupply?.unit}). Rendimiento óptimo.`);
    }
  };

  // Métricas predictivas para la cabecera
  const predictiveMetrics = useMemo(() => {
    let goldenCount = 0;
    let riskCount = 0;
    let totalWithPass = 0;
    let estimatedRevenueToRecover = 0;

    clients.forEach(c => {
      const cycleInfo = getClientCycleStatus(c);
      if (cycleInfo.status === 'golden') goldenCount++;
      if (cycleInfo.status === 'risk') {
        riskCount++;
        estimatedRevenueToRecover += (isChileanPesos ? 25000 : 25);
      }
      if (c.activePass && c.activePass.remainingSessions > 0) totalWithPass++;
    });

    return {
      goldenCount,
      riskCount,
      totalWithPass,
      estimatedRevenueToRecover,
      totalClients: clients.length
    };
  }, [clients, isChileanPesos]);

  // Clientes filtrados
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const cycleInfo = getClientCycleStatus(c);
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.service?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.stylist?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.phone?.includes(searchTerm);
      if (!matchesSearch) return false;

      if (filterStatus === 'golden') return cycleInfo.status === 'golden';
      if (filterStatus === 'risk') return cycleInfo.status === 'risk';
      if (filterStatus === 'recent') return cycleInfo.status === 'recent';
      if (filterStatus === 'passes') return c.activePass && c.activePass.remainingSessions > 0;
      return true;
    });
  }, [clients, searchTerm, filterStatus]);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* ─── HERO BANNER EXECUTIVE (ESTILO BARBERÍA & SALÓN VIP) ─── */}
      <div style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, #090d16 0%, #0f172a 55%, #1e1b4b 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 16px 36px -10px rgba(0, 0, 0, 0.45)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow sutil de fondo */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '320px',
          height: '320px',
          background: 'radial-gradient(circle, rgba(244, 63, 94, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', zIndex: 1 }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(244, 63, 94, 0.4)',
            flexShrink: 0
          }}>
            <Scissors size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                Barbería, Salones & Estética Predictiva
              </h2>
              <span style={{
                fontSize: '10.5px',
                fontWeight: 900,
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '3px 10px',
                borderRadius: '99px',
                letterSpacing: '0.05em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Sparkles size={11} /> SISTEMA PREDICTIVO VIP
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', margin: 0, maxWidth: '640px', lineHeight: '1.4' }}>
              Retención inteligente por WhatsApp, membresías prepago de alta recurrencia y control de insumos por estilista.
            </p>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', zIndex: 1 }}>
          <button
            type="button"
            onClick={() => setShowAddClientModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '12.5px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(244, 63, 94, 0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            <Plus size={16} />
            <span>Nuevo Cliente / Ciclo</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRecordSupplyModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              color: '#f8fafc',
              fontWeight: 800,
              fontSize: '12.5px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Package size={15} style={{ color: '#fb7185' }} />
            <span>Medir Insumos</span>
          </button>

          {setAppTab && (
            <>
              <button
                type="button"
                onClick={() => setAppTab('showcase')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  background: 'rgba(6, 182, 212, 0.12)',
                  border: '1px solid rgba(6, 182, 212, 0.28)',
                  color: '#38bdf8',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Abrir Carta Digital y Códigos QR para Sillones"
              >
                <QrCode size={15} style={{ color: '#06b6d4' }} />
                <span>Carta QR Salón</span>
              </button>

              <button
                type="button"
                onClick={() => setAppTab('pos')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.28)',
                  color: '#34d399',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Ir al Terminal de Punto de Venta"
              >
                <DollarSign size={15} style={{ color: '#10b981' }} />
                <span>Terminal POS</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── PESTAÑAS DEL MÓDULO (ESTILO REFINADO) ─── */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        padding: '6px',
        background: '#ffffff',
        borderRadius: '18px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 14px rgba(15,23,42,0.03)'
      }}>
        {[
          { id: 'predictive', label: '🔮 IA de Recompra Predictiva', badge: `${predictiveMetrics.goldenCount} en ventana` },
          { id: 'memberships', label: '💳 Membresías & Pases Prepago', badge: `${predictiveMetrics.totalWithPass} activos` },
          { id: 'supplies', label: '🧪 Control de Insumos & Recetas', badge: `${recipes.length} recetas` },
          { id: 'stylists', label: '💈 Profesionales & Estilistas', badge: `${stylists.length}` }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                border: 'none',
                background: isActive ? '#0f172a' : 'transparent',
                color: isActive ? '#ffffff' : '#64748b',
                fontWeight: isActive ? 800 : 600,
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 4px 14px rgba(15,23,42,0.18)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '99px',
                  background: isActive ? 'rgba(244, 63, 94, 0.25)' : '#f1f5f9',
                  color: isActive ? '#fda4af' : '#64748b',
                  border: isActive ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid transparent'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 🔮 SUB-TAB 1: IA DE RECOMPRA PREDICTIVA                               */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'predictive' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Tarjetas de Métricas Predictivas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '20px', background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', borderTop: '4px solid #10b981', boxShadow: '0 4px 16px rgba(15,23,42,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>VENTANA DORADA</span>
                <span style={{ padding: '3px 8px', borderRadius: '99px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontSize: '11px', fontWeight: 800 }}>Contacto Hoy</span>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', margin: '8px 0 4px 0' }}>
                {predictiveMetrics.goldenCount}
              </div>
              <p style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, margin: 0 }}>
                Clientes que deben recibir mensaje hoy antes de acudir a otro lugar
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '20px', background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', borderTop: '4px solid #ef4444', boxShadow: '0 4px 16px rgba(15,23,42,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>EN RIESGO DE FUGA</span>
                <span style={{ padding: '3px 8px', borderRadius: '99px', background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', fontSize: '11px', fontWeight: 800 }}>Atraso Crítico</span>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#dc2626', margin: '8px 0 4px 0' }}>
                {predictiveMetrics.riskCount}
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Clientes inactivos que requieren incentivo especial de retorno
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '20px', background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', borderTop: '4px solid #f59e0b', boxShadow: '0 4px 16px rgba(15,23,42,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CON MEMBRESÍA ACTIVA</span>
                <Crown size={17} style={{ color: '#f59e0b' }} />
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#d97706', margin: '8px 0 4px 0' }}>
                {predictiveMetrics.totalWithPass}
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Clientes con saldo prepagado garantizado
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '20px', background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', borderTop: '4px solid #0f172a', boxShadow: '0 4px 16px rgba(15,23,42,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL MONITOREADOS</span>
                <Users size={17} style={{ color: '#0f172a' }} />
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', margin: '8px 0 4px 0' }}>
                {predictiveMetrics.totalClients}
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Clientes con ciclo predictivo registrado
              </p>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '10px 16px', flex: '1 1 300px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <Search size={16} style={{ color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Buscar por cliente, servicio, estilista o WhatsApp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'golden', label: '🟢 Ventana Dorada' },
                { id: 'risk', label: '🔴 En Riesgo' },
                { id: 'recent', label: '⚪ Al Día' },
                { id: 'passes', label: '🎟️ Con Pases' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterStatus(f.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '99px',
                    border: filterStatus === f.id ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                    background: filterStatus === f.id ? '#0f172a' : '#ffffff',
                    color: filterStatus === f.id ? '#ffffff' : '#475569',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Clientes & Semáforo */}
          <div className="glass-panel" style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 18px rgba(15,23,42,0.03)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 18px' }}>Cliente / WhatsApp</th>
                    <th style={{ padding: '14px 18px' }}>Servicio & Profesional</th>
                    <th style={{ padding: '14px 18px' }}>Última Visita</th>
                    <th style={{ padding: '14px 18px' }}>Ciclo & Semáforo Predictivo</th>
                    <th style={{ padding: '14px 18px' }}>Membresía / Pase</th>
                    <th style={{ padding: '14px 18px', textAlign: 'right' }}>Acción Recomendada</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                        No se encontraron clientes con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map(client => {
                      const cycle = getClientCycleStatus(client);
                      return (
                        <tr key={client.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{client.name}</div>
                            <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Phone size={11} />
                              <span>{client.phone}</span>
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 700, color: '#334155' }}>{client.service}</div>
                            <div style={{ fontSize: '11.5px', color: '#be123c', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Scissors size={12} /> {client.stylist}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              {client.lastVisit ? new Date(client.lastVisit).toLocaleDateString('es-VE') : 'N/A'}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                              Hace {cycle.daysAgo} días
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              borderRadius: '99px',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              background: `${cycle.badgeColor}15`,
                              color: cycle.badgeColor,
                              border: `1px solid ${cycle.badgeColor}35`
                            }}>
                              {cycle.statusLabel}
                            </span>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                              Ciclo normal: cada {client.cycleDays} días
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px' }}>
                            {client.activePass ? (
                              <div style={{ background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '6px 10px', borderRadius: '10px' }}>
                                <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#be123c' }}>
                                  {client.activePass.planName}
                                </div>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                                  {client.activePass.remainingSessions} de {client.activePass.totalSessions} sesiones disponibles
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowSellPassModal(client);
                                  setSelectedPlanForClient(plans[0]?.id || '');
                                }}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px dashed #cbd5e1',
                                  color: '#64748b',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                + Ofrecer Pase
                              </button>
                            )}
                          </td>

                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              {client.activePass && client.activePass.remainingSessions > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowRedeemPassModal(client);
                                    setRedeemStylist(client.stylist || stylists[0]?.name);
                                  }}
                                  style={{
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '7px 12px',
                                    borderRadius: '8px',
                                    fontSize: '11.5px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="Canjear y descontar 1 sesión del bono prepago"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Canjear Sesión</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppReminder(client)}
                                style={{
                                  background: '#10b981',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '7px 12px',
                                  borderRadius: '8px',
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 2px 6px rgba(16,185,129,0.3)'
                                }}
                                title="Enviar mensaje personalizado por WhatsApp"
                              >
                                <MessageSquare size={13} />
                                <span>WhatsApp</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleMarkVisitToday(client.id)}
                                style={{
                                  background: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  color: '#334155',
                                  padding: '7px 10px',
                                  borderRadius: '8px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                                title="Registrar que el cliente vino hoy y reiniciar ciclo"
                              >
                                Vino Hoy
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
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 💳 SUB-TAB 2: PLANES DE MEMBRESÍA PREPAGO                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'memberships' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                Catálogo de Planes de Membresía Prepago
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px', margin: 0 }}>
                Asegura el flujo de caja cobrando 3, 4 o más sesiones por adelantado con tarifa preferencial para el cliente.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddPlanModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: '12px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)'
              }}
            >
              <Plus size={16} />
              <span>Crear Nuevo Plan</span>
            </button>
          </div>

          {/* Grid de Planes (Diseño Luxury Barber & Salon) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {plans.map(plan => {
              const normRegular = normalizePrice(plan.regularPrice);
              const normPrepaid = normalizePrice(plan.prepaidPrice);
              const savings = normRegular - normPrepaid;
              const savingsPct = normRegular > 0 ? Math.round((savings / normRegular) * 100) : 0;
              const isBarber = plan.category.toLowerCase().includes('barber');

              return (
                <div 
                  key={plan.id}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    borderRadius: '20px',
                    background: '#ffffff',
                    border: plan.popular ? '1.5px solid rgba(244, 63, 94, 0.45)' : '1px solid #e2e8f0',
                    boxShadow: plan.popular ? '0 12px 30px -4px rgba(244, 63, 94, 0.12)' : '0 4px 16px rgba(15,23,42,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Línea superior dorada para los más populares */}
                  {plan.popular && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #f59e0b, #f43f5e, #8b5cf6)'
                    }} />
                  )}

                  <div>
                    {/* Header del Plan */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: isBarber ? 'rgba(245, 158, 11, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                        color: isBarber ? '#d97706' : '#be123c',
                        border: `1px solid ${isBarber ? 'rgba(245, 158, 11, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`
                      }}>
                        {isBarber ? '💈 ' : '✂️ '}{plan.category}
                      </span>

                      {plan.popular && (
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '99px',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #f43f5e 100%)',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 8px rgba(244, 63, 94, 0.3)'
                        }}>
                          <Crown size={12} /> MÁS ELEGIDO
                        </span>
                      )}
                    </div>

                    <h4 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: '4px 0 8px 0', letterSpacing: '-0.01em' }}>
                      {plan.name}
                    </h4>
                    <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.45', margin: '0 0 16px 0' }}>
                      {plan.description}
                    </p>

                    {/* Caja de Precio & Ahorro */}
                    <div style={{
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11.5px', color: '#94a3b8', textDecoration: 'line-through' }}>
                          Regular: {formatCurrency(normRegular)}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: '#059669',
                          background: 'rgba(16, 185, 129, 0.12)',
                          padding: '2px 8px',
                          borderRadius: '99px',
                          border: '1px solid rgba(16, 185, 129, 0.25)'
                        }}>
                          Ahorra {savingsPct}%
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <DualCurrencyDisplay amount={normPrepaid} fontSize="24px" primaryColor="#0f172a" />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#475569', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                        <Clock size={13} style={{ color: '#ec4899' }} />
                        <span>Incluye <strong>{plan.sessions} sesiones</strong> • Válido por {plan.validityDays} días</span>
                      </div>
                    </div>

                    {/* Beneficios Incluidos */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155' }}>
                        <Check size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                        <span>{plan.sessions} sesiones garantizadas con tu profesional</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155' }}>
                        <Check size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                        <span>Saldo debitable y comprobante por WhatsApp</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155' }}>
                        <Check size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                        <span>Cupo preferencial en agenda</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlanForClient(plan.id);
                      setShowSellPassModal(clients[0] || null);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      background: plan.popular ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' : '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Award size={15} style={{ color: '#fbbf24' }} />
                    <span>Asignar / Vender Pase</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 🧪 SUB-TAB 3: CONTROL DE INSUMOS & RECETAS TÉCNICAS                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'supplies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Recetas Técnicas & Rendimiento de Insumos
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px', margin: 0 }}>
                Establece el estándar oficial de gramaje/ml por servicio para evitar mermas de producto y sobrecostos.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowRecordSupplyModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                }}
              >
                <Plus size={16} />
                <span>Registrar Consumo en Báscula</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddRecipeModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={16} />
                <span>Nueva Receta Técnica</span>
              </button>
            </div>
          </div>

          {/* Recetas Técnicas Estándar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
            {recipes.map(recipe => (
              <div key={recipe.id} className="glass-panel" style={{ padding: '20px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(15,23,42,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, background: 'rgba(15,23,42,0.06)', color: '#0f172a', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                    {recipe.category}
                  </span>
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: '4px 0 10px 0' }}>
                  {recipe.service}
                </h4>
                
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Insumos Teóricos Estándar:
                  </div>
                  {recipe.supplies.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', padding: '4px 0', borderBottom: idx < recipe.supplies.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
                      <span style={{ color: '#334155', fontWeight: 600 }}>{s.name}</span>
                      <strong style={{ color: '#0f172a' }}>{s.standardAmount} {s.unit}</strong>
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: '11.5px', color: '#64748b', fontStyle: 'italic', margin: 0 }}>
                  💡 {recipe.notes}
                </p>
              </div>
            ))}
          </div>

          {/* Historial de Pesajes & Sobrecostos */}
          <div className="glass-panel" style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 4px 18px rgba(15,23,42,0.03)' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: '0 0 14px 0' }}>
              Historial de Mediciones en Báscula & Desviaciones
            </h4>

            {suppliesLog.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px' }}>
                Aún no hay mediciones registradas hoy. Los estilistas pueden registrar su pesaje al terminar cada atención.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 14px' }}>Fecha</th>
                      <th style={{ padding: '10px 14px' }}>Estilista / Barbero</th>
                      <th style={{ padding: '10px 14px' }}>Servicio & Cliente</th>
                      <th style={{ padding: '10px 14px' }}>Insumo</th>
                      <th style={{ padding: '10px 14px' }}>Estándar</th>
                      <th style={{ padding: '10px 14px' }}>Consumo Real</th>
                      <th style={{ padding: '10px 14px' }}>Rendimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliesLog.map(item => {
                      const isHighWaste = item.deviationPct > 15;
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>{item.date}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{item.stylist}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ color: '#334155', fontWeight: 600 }}>{item.service}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.clientName}</div>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#475569' }}>{item.supplyName}</td>
                          <td style={{ padding: '10px 14px' }}>{item.standardAmount} {item.unit}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 800 }}>{item.actualAmount} {item.unit}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '99px',
                              fontSize: '11px',
                              fontWeight: 800,
                              background: isHighWaste ? '#fee2e2' : '#dcfce7',
                              color: isHighWaste ? '#dc2626' : '#15803d'
                            }}>
                              {item.deviationPct > 0 ? `+${item.deviationPct}%` : `${item.deviationPct}%`}
                              {isHighWaste ? ' (Sobrecosto)' : ' (Óptimo)'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 💈 SUB-TAB 4: EQUIPO DE PROFESIONALES / ESTILISTAS                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'stylists' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Equipo de Estilistas & Barberos
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px', margin: 0 }}>
                Comisiones por servicio, retención de clientes leales y rendimiento por profesional.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddStylistModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: '12px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)'
              }}
            >
              <Plus size={16} />
              <span>Nuevo Profesional</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {stylists.map(sty => (
              <div key={sty.id} className="glass-panel" style={{ padding: '24px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(15,23,42,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '18px',
                    boxShadow: '0 4px 12px rgba(15,23,42,0.15)'
                  }}>
                    {sty.name.charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{sty.name}</h4>
                    <span style={{ fontSize: '12px', color: '#be123c', fontWeight: 700 }}>{sty.specialty}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '14px', borderRadius: '14px' }}>
                  <div>
                    <span style={{ fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Comisión</span>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{sty.commissionPct}%</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Clientes Leales</span>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#10b981' }}>{sty.retainedClientsCount}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Servicios / Mes</span>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{sty.monthlyServices}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Eficiencia</span>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#f59e0b' }}>{sty.efficiencyScore}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 🛑 MODAL: REGISTRAR NUEVO CLIENTE / CICLO                              */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showAddClientModal && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '480px', padding: '24px', background: '#ffffff', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Registrar Cliente & Ciclo Predictivo
              </h3>
              <button onClick={() => setShowAddClientModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!clientForm.name.trim() || !clientForm.phone.trim()) {
                alert("Nombre y teléfono son obligatorios.");
                return;
              }
              const newC = {
                id: 'cli-' + Date.now(),
                name: clientForm.name.trim(),
                phone: clientForm.phone.trim(),
                service: clientForm.service,
                stylist: clientForm.stylist,
                cycleDays: Number(clientForm.cycleDays || 30),
                lastVisit: clientForm.lastVisit || new Date().toISOString().split('T')[0],
                notes: clientForm.notes,
                totalVisits: 1,
                activePass: null
              };
              setClients(prev => [newC, ...prev]);
              setShowAddClientModal(false);
              setClientForm({
                name: '',
                phone: '',
                service: 'Corte Fade Degradé & Barba',
                stylist: stylists[0]?.name || 'Carlos Master Barber',
                cycleDays: 15,
                lastVisit: new Date().toISOString().split('T')[0],
                notes: ''
              });
              playSound('scan');
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Nombre del Cliente *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Ej: Camila Soto o Carlos Silva"
                    value={clientForm.name}
                    onChange={(e) => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Teléfono / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Ej: +56987654321 o 04121234567"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Servicio Habitual</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: Balayage, Corte, Barba"
                      value={clientForm.service}
                      onChange={(e) => setClientForm(prev => ({ ...prev, service: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Estilista / Barbero</label>
                    <select
                      className="form-input"
                      value={clientForm.stylist}
                      onChange={(e) => setClientForm(prev => ({ ...prev, stylist: e.target.value }))}
                    >
                      {stylists.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Ciclo de Servicio (Días)</label>
                    <input
                      type="number"
                      min="5"
                      max="180"
                      className="form-input"
                      value={clientForm.cycleDays}
                      onChange={(e) => setClientForm(prev => ({ ...prev, cycleDays: e.target.value }))}
                    />
                    <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>Ej: Fade = 15d, Tinte = 35d</span>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Fecha Última Visita</label>
                    <input
                      type="date"
                      className="form-input"
                      value={clientForm.lastVisit}
                      onChange={(e) => setClientForm(prev => ({ ...prev, lastVisit: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Notas Técnicas / Preferencias</label>
                  <textarea
                    rows={2}
                    className="form-input"
                    placeholder="Tono de tinte, peinado preferido, café con o sin azúcar..."
                    value={clientForm.notes}
                    onChange={(e) => setClientForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowAddClientModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" style={{ background: '#0f172a' }}>
                    Guardar Ficha Predictiva
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🛑 MODAL: VENDER / ASIGNAR PASE DE MEMBRESÍA PREPAGO */}
      {showSellPassModal && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '460px', padding: '24px', background: '#ffffff', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crown size={20} style={{ color: '#f59e0b' }} />
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Vender Pase de Membresía
                </h3>
              </div>
              <button onClick={() => setShowSellPassModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSellPassToClient}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Cliente Beneficiario</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{showSellPassModal.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{showSellPassModal.phone}</div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Seleccionar Plan de Membresía *</label>
                  <select
                    className="form-input"
                    value={selectedPlanForClient}
                    onChange={(e) => setSelectedPlanForClient(e.target.value)}
                    required
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sessions} sesiones) - {formatCurrency(normalizePrice(p.prepaidPrice))}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowSellPassModal(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" style={{ background: '#0f172a' }}>
                    Confirmar Venta y Activar Pase
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🛑 MODAL: CANJEAR / DEBITAR 1 SESIÓN */}
      {showRedeemPassModal && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '440px', padding: '24px', background: '#ffffff', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Canjear 1 Sesión
                </h3>
              </div>
              <button onClick={() => setShowRedeemPassModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRedeemPassSession}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Cliente</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{showRedeemPassModal.name}</div>
                  <div style={{ fontSize: '12.5px', color: '#be123c', fontWeight: 700, marginTop: '4px' }}>
                    Plan: {showRedeemPassModal.activePass?.planName}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#059669', marginTop: '6px' }}>
                    Saldo actual: {showRedeemPassModal.activePass?.remainingSessions} sesiones restantes
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Profesional que realiza el servicio</label>
                  <select
                    className="form-input"
                    value={redeemStylist}
                    onChange={(e) => setRedeemStylist(e.target.value)}
                  >
                    {stylists.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowRedeemPassModal(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" style={{ background: '#10b981' }}>
                    Debitar 1 Sesión & Notificar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🛑 MODAL: CREAR PLAN DE MEMBRESÍA */}
      {showAddPlanModal && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '480px', padding: '24px', background: '#ffffff', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Crear Nuevo Plan de Membresía Prepago
              </h3>
              <button onClick={() => setShowAddPlanModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!newPlanForm.name.trim()) return;
              const p = {
                id: 'plan-' + Date.now(),
                name: newPlanForm.name.trim(),
                category: newPlanForm.category,
                service: newPlanForm.service,
                sessions: Number(newPlanForm.sessions || 4),
                regularPrice: Number(newPlanForm.regularPrice || 0),
                prepaidPrice: Number(newPlanForm.prepaidPrice || 0),
                validityDays: Number(newPlanForm.validityDays || 30),
                description: newPlanForm.description,
                popular: newPlanForm.popular
              };
              setPlans(prev => [p, ...prev]);
              setShowAddPlanModal(false);
              playSound('scan');
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Nombre del Plan / Bono *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Ej: Pase 4 Cortes al Mes, Bono 3 Balayage..."
                    value={newPlanForm.name}
                    onChange={(e) => setNewPlanForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Categoría</label>
                    <select
                      className="form-input"
                      value={newPlanForm.category}
                      onChange={(e) => setNewPlanForm(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="Barbería">Barbería</option>
                      <option value="Salón de Belleza">Salón de Belleza</option>
                      <option value="Coloración">Coloración</option>
                      <option value="Nails & Estética">Nails & Estética</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Sesiones Incluidas</label>
                    <input
                      type="number"
                      min="2"
                      max="50"
                      className="form-input"
                      value={newPlanForm.sessions}
                      onChange={(e) => setNewPlanForm(prev => ({ ...prev, sessions: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Precio Regular Suelto</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newPlanForm.regularPrice}
                      onChange={(e) => setNewPlanForm(prev => ({ ...prev, regularPrice: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Precio Prepago Especial *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newPlanForm.prepaidPrice}
                      onChange={(e) => setNewPlanForm(prev => ({ ...prev, prepaidPrice: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Días de Validez</label>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    className="form-input"
                    value={newPlanForm.validityDays}
                    onChange={(e) => setNewPlanForm(prev => ({ ...prev, validityDays: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Descripción Comercial</label>
                  <textarea
                    rows={2}
                    className="form-input"
                    value={newPlanForm.description}
                    onChange={(e) => setNewPlanForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="chk-pop"
                    checked={newPlanForm.popular}
                    onChange={(e) => setNewPlanForm(prev => ({ ...prev, popular: e.target.checked }))}
                  />
                  <label htmlFor="chk-pop" style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}>
                    Destacar como "MÁS ELEGIDO ⭐"
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowAddPlanModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" style={{ background: '#0f172a' }}>
                    Guardar Plan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🛑 MODAL: REGISTRAR CONSUMO EN BÁSCULA */}
      {showRecordSupplyModal && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '460px', padding: '24px', background: '#ffffff', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} style={{ color: '#be123c' }} />
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Medición de Insumos en Báscula
                </h3>
              </div>
              <button onClick={() => setShowRecordSupplyModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordSupplyUsage}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Estilista / Colorista *</label>
                  <select
                    className="form-input"
                    value={supplyForm.stylist}
                    onChange={(e) => setSupplyForm(prev => ({ ...prev, stylist: e.target.value }))}
                  >
                    {stylists.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Servicio / Receta Técnica *</label>
                  <select
                    className="form-input"
                    value={supplyForm.serviceRecipeId}
                    onChange={(e) => setSupplyForm(prev => ({ ...prev, serviceRecipeId: e.target.value }))}
                  >
                    {recipes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.service} ({r.supplies[0]?.name} - Estándar: {r.supplies[0]?.standardAmount}{r.supplies[0]?.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Nombre del Cliente Atendido</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: Camila Soto"
                    value={supplyForm.clientName}
                    onChange={(e) => setSupplyForm(prev => ({ ...prev, clientName: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Cantidad Real Pesada en Báscula *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    className="form-input"
                    placeholder="Ej: 65 (gramos o ml)"
                    value={supplyForm.actualAmountUsed}
                    onChange={(e) => setSupplyForm(prev => ({ ...prev, actualAmountUsed: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowRecordSupplyModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" style={{ background: '#be123c' }}>
                    Registrar Consumo
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🛑 MODAL: NUEVA RECETA TÉCNICA */}
      {showAddRecipeModal && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '460px', padding: '24px', background: '#ffffff', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Nueva Receta Técnica Estándar
              </h3>
              <button onClick={() => setShowAddRecipeModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              const newR = {
                id: 'rec-' + Date.now(),
                service: fd.get('srv_name'),
                category: fd.get('srv_cat'),
                supplies: [
                  { 
                    name: fd.get('sup_name'), 
                    standardAmount: Number(fd.get('sup_amount') || 50), 
                    unit: fd.get('sup_unit') || 'g' 
                  }
                ],
                notes: fd.get('srv_notes') || ''
              };
              setRecipes(prev => [newR, ...prev]);
              setShowAddRecipeModal(false);
              playSound('scan');
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Servicio *</label>
                  <input name="srv_name" required placeholder="Ej: Mechas Babylights" className="form-input" />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Categoría</label>
                  <select name="srv_cat" className="form-input">
                    <option value="Coloración">Coloración</option>
                    <option value="Tratamientos">Tratamientos</option>
                    <option value="Barbería">Barbería</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Insumo Principal</label>
                    <input name="sup_name" required placeholder="Ej: Polvo Decolorante" className="form-input" />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Cantidad</label>
                    <input name="sup_amount" type="number" required defaultValue="50" className="form-input" />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Unidad</label>
                    <select name="sup_unit" className="form-input">
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="oz">oz</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Instrucciones Técnicas</label>
                  <textarea name="srv_notes" rows={2} className="form-input" placeholder="Proporción de mezcla, tiempo de exposición..." />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowAddRecipeModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" style={{ background: '#0f172a' }}>
                    Guardar Receta
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🛑 MODAL: REGISTRAR PROFESIONAL / ESTILISTA */}
      {showAddStylistModal && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '440px', padding: '24px', background: '#ffffff', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Registrar Profesional / Estilista
              </h3>
              <button onClick={() => setShowAddStylistModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              const newSt = {
                id: 'sty-' + Date.now(),
                name: fd.get('st_name'),
                nickname: fd.get('st_nick') || fd.get('st_name'),
                specialty: fd.get('st_spec'),
                commissionPct: Number(fd.get('st_comm') || 50),
                monthlyServices: 0,
                retainedClientsCount: 0,
                efficiencyScore: 100
              };
              setStylists(prev => [...prev, newSt]);
              setShowAddStylistModal(false);
              playSound('scan');
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Nombre Completo *</label>
                  <input name="st_name" required placeholder="Ej: Carlos Silva" className="form-input" />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>Especialidad *</label>
                  <input name="st_spec" required placeholder="Ej: Master Fade, Colorista Balayage, Nails" className="form-input" />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>% Comisión por Servicio</label>
                  <input name="st_comm" type="number" defaultValue="50" min="0" max="100" className="form-input" />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowAddStylistModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" style={{ background: '#0f172a' }}>
                    Guardar Profesional
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
