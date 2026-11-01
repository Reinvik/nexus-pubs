import React, { useState, useMemo, useEffect } from 'react';
import { usePuntoNexus } from '../context/PuntoNexusContext';
import DualCurrencyDisplay from './DualCurrencyDisplay';
import { 
  Scale, 
  Target,
  DollarSign, 
  TrendingUp, 
  PieChart, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calculator, 
  Building2, 
  Calendar, 
  CreditCard, 
  X, 
  Search, 
  ChevronLeft,
  ChevronRight,
  History,
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  Share2
} from 'lucide-react';
import { formatShiftWhatsAppMessage, getWhatsAppShareUrl } from '../utils/shiftExport';

export default function FinanceModule() {
  const { 
    sales = [], 
    allSales = [],
    inventory = [], 
    companySettings = {}, 
    formatCurrency, 
    fixedCosts = {}, 
    updateFixedCosts, 
    expenses = [], 
    addExpense, 
    updateExpense, 
    deleteExpense,
    activeBranch,
    branches = [],
    shifts = []
  } = usePuntoNexus();

  // Pestaña interna principal: 'breakeven' (Punto de Equilibrio) o 'expenses' (Egresos Operativos)
  const [activeTab, setActiveTab] = useState('breakeven');

  // Modal states para desglose de Ingresos y Egresos
  const [showIngresosModal, setShowIngresosModal] = useState(false);
  const [showEgresosModal, setShowEgresosModal] = useState(false);
  const [egresosModalSubTab, setEgresosModalSubTab] = useState('ALL');

  // ---------------------------------------------------------
  // GESTIÓN DE PERÍODO MENSUAL (MES A MES)
  // ---------------------------------------------------------
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-indexed (0 = Enero, 6 = Julio)

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  // ---------------------------------------------------------
  // CÁLCULOS: PUNTO DE EQUILIBRIO DEL MES SELECCIONADO
  // ---------------------------------------------------------
  const [isEditingFixedCosts, setIsEditingFixedCosts] = useState(false);
  const [tempFixedCosts, setTempFixedCosts] = useState({ ...(fixedCosts || {}) });
  const [isEditingModalFixedCosts, setIsEditingModalFixedCosts] = useState(false);
  const [modalTempFixedCosts, setModalTempFixedCosts] = useState({ ...(fixedCosts || {}) });
  const [manualMarginPct, setManualMarginPct] = useState(null);
  const [desiredProfitGoal, setDesiredProfitGoal] = useState(0);

  useEffect(() => {
    if (!isEditingFixedCosts) {
      setTempFixedCosts({ ...(fixedCosts || {}) });
    }
    if (!isEditingModalFixedCosts) {
      setModalTempFixedCosts({ ...(fixedCosts || {}) });
    }
  }, [fixedCosts, isEditingFixedCosts, isEditingModalFixedCosts]);

  // Costos Fijos Estructurales Recurrentes (Se repiten de plantilla mes a mes)
  const structuralFixedCosts = useMemo(() => {
    const fc = fixedCosts || {};
    return (
      Number(fc.rent || 0) +
      Number(fc.salaries || 0) +
      Number(fc.software || 0) +
      Number(fc.marketing || 0) +
      Number(fc.other || 0)
    );
  }, [fixedCosts]);

  // Servicios Públicos Variables del Mes Seleccionado
  const monthServicesVariableTotal = useMemo(() => {
    const registeredServices = (expenses || []).reduce((sum, exp) => {
      const expDate = new Date(exp?.date || Date.now());
      if (expDate.getMonth() === selectedMonth && expDate.getFullYear() === selectedYear) {
        const cat = String(exp?.category || '').toLowerCase();
        const desc = String(exp?.description || '').toLowerCase();
        if (cat.includes('servicio') || desc.includes('luz') || desc.includes('agua') || desc.includes('gas') || desc.includes('internet')) {
          return sum + Number(exp?.amount || 0);
        }
      }
      return sum;
    }, 0);

    const fcServices = Number(fixedCosts?.services || 0);
    if (registeredServices === 0 && fcServices > 0) {
      return fcServices;
    }
    return registeredServices;
  }, [expenses, selectedMonth, selectedYear, fixedCosts?.services]);

  // Total Egresos Fijos Base + Servicios del Mes Seleccionado
  const totalFixedCosts = useMemo(() => {
    return structuralFixedCosts + monthServicesVariableTotal;
  }, [structuralFixedCosts, monthServicesVariableTotal]);

  // Margen Promedio de Contribución del Catálogo (%)
  const calculatedAvgMarginPct = useMemo(() => {
    if (!inventory || inventory.length === 0) return 40.0;
    const validProds = inventory.filter(p => p.sell_price > 0 && p.cost_price >= 0);
    if (validProds.length === 0) return 40.0;

    const totalMarginSum = validProds.reduce((acc, p) => {
      const margin = ((p.sell_price - p.cost_price) / p.sell_price) * 100;
      return acc + margin;
    }, 0);

    return Math.max(1, Math.round(totalMarginSum / validProds.length));
  }, [inventory]);

  const effectiveMarginPct = manualMarginPct !== null ? manualMarginPct : calculatedAvgMarginPct;

  // Punto de Equilibrio del Mes ($)
  const breakEvenAmount = useMemo(() => {
    if (effectiveMarginPct <= 0) return 0;
    return totalFixedCosts / (effectiveMarginPct / 100);
  }, [totalFixedCosts, effectiveMarginPct]);

  // Ticket Promedio de Venta del Mes Seleccionado
  const monthSales = useMemo(() => {
    if (!sales || sales.length === 0) return [];
    return sales.filter(s => {
      if (s.status === 'Anulada' || s.cancelled) return false;
      const d = new Date(s.sold_at || s.created_at || Date.now());
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [sales, selectedMonth, selectedYear]);

  const monthSalesTotal = useMemo(() => {
    return monthSales.reduce((sum, s) => sum + Number(s.total_sell || s.total || 0), 0);
  }, [monthSales]);

  const monthSalesCount = monthSales.length;

  const avgTicketAmount = useMemo(() => {
    if (monthSalesCount === 0) return 15.0;
    return Math.max(1, monthSalesTotal / monthSalesCount);
  }, [monthSalesTotal, monthSalesCount]);

  // Transacciones necesarias para el mes seleccionado
  const breakEvenUnits = useMemo(() => {
    if (avgTicketAmount <= 0) return 0;
    return Math.ceil(breakEvenAmount / avgTicketAmount);
  }, [breakEvenAmount, avgTicketAmount]);

  // Porcentaje de Cobertura de Equilibrio para el mes seleccionado
  const breakevenProgressPct = useMemo(() => {
    if (breakEvenAmount <= 0) return 0;
    return Math.min(300, Math.round((monthSalesTotal / breakEvenAmount) * 100));
  }, [monthSalesTotal, breakEvenAmount]);

  // Egresos del Mes Seleccionado
  const monthExpensesTotal = useMemo(() => {
    return expenses.reduce((sum, exp) => {
      const expDate = new Date(exp.date || Date.now());
      if (expDate.getMonth() === selectedMonth && expDate.getFullYear() === selectedYear) {
        return sum + Number(exp.amount || 0);
      }
      return sum;
    }, 0);
  }, [expenses, selectedMonth, selectedYear]);

  // Resultado Neto Estimado del Mes (Ventas - Costos Fijos - Egresos Adicionales)
  const monthNetResult = useMemo(() => {
    // Estimación de costo directo de mercancías vendidas
    const cogs = monthSales.reduce((sum, s) => sum + Number(s.total_cost || 0), 0);
    return monthSalesTotal - cogs - totalFixedCosts;
  }, [monthSalesTotal, monthSales, totalFixedCosts]);

  // Meta total simulada (Costos Fijos + Meta de Ganancia Deseada)
  const simulatedSalesNeeded = useMemo(() => {
    const targetCosts = totalFixedCosts + Number(desiredProfitGoal || 0);
    if (effectiveMarginPct <= 0) return 0;
    return targetCosts / (effectiveMarginPct / 100);
  }, [totalFixedCosts, desiredProfitGoal, effectiveMarginPct]);

  // ---------------------------------------------------------
  // CÁLCULOS: RITMO Y PUNTO DE EQUILIBRIO OPERATIVO (NEXUS RPM STYLE)
  // ---------------------------------------------------------
  const now = new Date();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const isCurrentMonthSelection = now.getMonth() === selectedMonth && now.getFullYear() === selectedYear;
  const isPastMonthSelection = selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth < now.getMonth());
  const daysElapsed = isCurrentMonthSelection ? now.getDate() : (isPastMonthSelection ? daysInMonth : 0);
  const timeProgressPct = daysInMonth > 0 ? Number(((daysElapsed / daysInMonth) * 100).toFixed(1)) : 0;

  // Costo de ventas (COGS) y egresos variables del mes
  const monthCogs = useMemo(() => {
    return monthSales.reduce((sum, s) => sum + Number(s.total_cost || 0), 0);
  }, [monthSales]);

  const monthVariableCostsTotal = useMemo(() => {
    return monthExpensesTotal + monthCogs;
  }, [monthExpensesTotal, monthCogs]);

  // Meta de Costos Netos (Punto de Equilibrio Requerido)
  const metaCostosNetos = useMemo(() => {
    if (effectiveMarginPct > 0) {
      return totalFixedCosts / (effectiveMarginPct / 100);
    }
    return totalFixedCosts + monthVariableCostsTotal;
  }, [totalFixedCosts, effectiveMarginPct, monthVariableCostsTotal]);

  // Porcentaje de Cobertura
  const breakevenCoveragePct = useMemo(() => {
    if (metaCostosNetos <= 0) return 0;
    return Math.min(300, Number(((monthSalesTotal / metaCostosNetos) * 100).toFixed(1)));
  }, [monthSalesTotal, metaCostosNetos]);

  // Ritmos diarios
  const currentPacePerDay = useMemo(() => {
    if (daysElapsed <= 0) return 0;
    return monthSalesTotal / daysElapsed;
  }, [monthSalesTotal, daysElapsed]);

  const requiredPacePerDay = useMemo(() => {
    if (daysInMonth <= 0) return 0;
    return metaCostosNetos / daysInMonth;
  }, [metaCostosNetos, daysInMonth]);

  // Proyección fin de mes
  const projectedMonthEndSales = useMemo(() => {
    if (daysElapsed <= 0) return monthSalesTotal;
    return (monthSalesTotal / daysElapsed) * daysInMonth;
  }, [monthSalesTotal, daysElapsed, daysInMonth]);

  const paceDifferencePct = Number((breakevenCoveragePct - timeProgressPct).toFixed(1));
  const isAheadOfPace = paceDifferencePct >= 0;
  const isBreakEvenReached = monthSalesTotal >= metaCostosNetos;

  // ---------------------------------------------------------
  // CÁLCULOS: 4 KPIS SUPERIORES (NEXUS RPM STYLE)
  // ---------------------------------------------------------
  const monthSalesGross = monthSalesTotal;
  const isTaxFreeCompany = companySettings?.tax_enabled === false || Number(companySettings?.tax_rate) === 0;
  const taxRateVal = isTaxFreeCompany 
    ? 0 
    : ((companySettings?.tax_rate !== undefined && companySettings?.tax_rate !== null) ? Number(companySettings.tax_rate) : 0.19);
  const taxRatePct = taxRateVal > 1 ? taxRateVal : taxRateVal * 100;
  const taxRateDecimal = taxRatePct / 100;

  const monthSalesNet = useMemo(() => {
    if (isTaxFreeCompany || taxRateDecimal === 0) return monthSalesGross;
    if (!monthSales || monthSales.length === 0) return monthSalesGross / (1 + taxRateDecimal);
    const sumNet = monthSales.reduce((acc, s) => {
      if (s.net_total !== undefined && s.net_total !== null && Number(s.net_total) > 0) return acc + Number(s.net_total);
      return acc + (Number(s.total_sell || s.total || 0) / (1 + taxRateDecimal));
    }, 0);
    return sumNet;
  }, [monthSales, monthSalesGross, taxRateDecimal, isTaxFreeCompany]);

  const monthSalesDebitoIVA = useMemo(() => {
    if (isTaxFreeCompany || taxRateDecimal === 0) return 0;
    if (!monthSales || monthSales.length === 0) return Math.max(0, monthSalesGross - monthSalesNet);
    const totalTax = monthSales.reduce((acc, s) => {
      if (s.tax_amount !== undefined && s.tax_amount !== null && Number(s.tax_amount) > 0) {
        return acc + Number(s.tax_amount);
      }
      if (s.apply_tax !== false) {
        const gross = Number(s.total_sell || s.total || 0);
        const net = s.net_total !== undefined && Number(s.net_total) > 0 ? Number(s.net_total) : (gross / (1 + taxRateDecimal));
        return acc + Math.max(0, gross - net);
      }
      return acc;
    }, 0);
    return totalTax > 0 ? totalTax : Math.max(0, monthSalesGross - monthSalesNet);
  }, [monthSales, monthSalesGross, monthSalesNet, taxRateDecimal, isTaxFreeCompany]);

  const totalEgresosDelMes = totalFixedCosts + monthVariableCostsTotal;
  const monthEgresosNet = isTaxFreeCompany ? totalEgresosDelMes : totalEgresosDelMes / (1 + taxRateDecimal);
  const monthEgresosCreditoIVA = isTaxFreeCompany ? 0 : Math.max(0, totalEgresosDelMes - monthEgresosNet);

  const resultadoNetoPeriodo = monthSalesGross - totalEgresosDelMes;
  const margenNetoPeriodoPct = monthSalesGross > 0 ? Math.round((resultadoNetoPeriodo / monthSalesGross) * 100) : 0;

  const netIvaBalance = monthSalesDebitoIVA - monthEgresosCreditoIVA;
  const ivaEstimadoAPago = Math.max(0, netIvaBalance);
  const remanenteFavorIVA = Math.max(0, -netIvaBalance);

  // Agrupación de Ventas por Día para Modal de Ingresos
  const salesByDay = useMemo(() => {
    const map = {};
    monthSales.forEach(sale => {
      const d = new Date(sale.sold_at || sale.created_at || Date.now());
      const dayNum = d.getDate();
      const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

      if (!map[dateKey]) {
        map[dateKey] = {
          dateKey,
          dayNum,
          count: 0,
          total: 0,
          cost: 0
        };
      }
      map[dateKey].count += 1;
      map[dateKey].total += Number(sale.total_sell || sale.total || sale.monto || 0);
      map[dateKey].cost += Number(sale.total_cost || sale.costo || 0);
    });

    return Object.values(map).sort((a, b) => b.dayNum - a.dayNum);
  }, [monthSales, selectedYear, selectedMonth]);

  // Desglose de Egresos para Modal de Egresos
  const expensesBreakdown = useMemo(() => {
    const fc = fixedCosts || {};
    const fijos = [
      { name: 'Arriendo / Alquiler', amount: Number(fc.rent || 0) },
      { name: 'Sueldos y Nómina Fija', amount: Number(fc.salaries || 0) },
      { name: 'Servicios Públicos', amount: Number(fc.services || 0) },
      { name: 'Software & POS', amount: Number(fc.software || 0) },
      { name: 'Publicidad Fija', amount: Number(fc.marketing || 0) },
      { name: 'Otros Costos Fijos', amount: Number(fc.other || 0) }
    ].filter(item => item.amount > 0);

    const variables = (expenses || []).filter(exp => {
      const d = new Date(exp?.date || Date.now());
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    const sueldosList = variables.filter(exp => 
      exp?.category === 'Sueldos y Salarios' || exp?.description?.toLowerCase().includes('sueldo') || exp?.description?.toLowerCase().includes('nomina')
    );

    return {
      fijos,
      variables,
      sueldosList
    };
  }, [fixedCosts, expenses, selectedMonth, selectedYear]);

  // ---------------------------------------------------------
  // COMPORTAMIENTO HISTÓRICO MENSUAL (ÚLTIMOS 6 MESES)
  // ---------------------------------------------------------
  const monthlyHistory = useMemo(() => {
    const list = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yNum = d.getFullYear();

      // Ventas del mes i (excluyendo ventas anuladas)
      const mSales = (sales || []).filter(s => {
        if (s?.status === 'Anulada' || s?.cancelled) return false;
        const sd = new Date(s?.sold_at || s?.created_at || Date.now());
        return sd.getMonth() === mIdx && sd.getFullYear() === yNum;
      });
      const mSalesTotal = mSales.reduce((sum, s) => sum + Number(s?.total_sell || 0), 0);

      // Egresos del mes i
      const mExp = (expenses || []).filter(e => {
        const ed = new Date(e?.date || Date.now());
        return ed.getMonth() === mIdx && ed.getFullYear() === yNum;
      });
      const mExpTotal = mExp.reduce((sum, e) => sum + Number(e?.amount || 0), 0);

      const mBe = breakEvenAmount;
      const mCoverage = mBe > 0 ? Math.round((mSalesTotal / mBe) * 100) : 0;
      const mCogs = mSales.reduce((sum, s) => sum + Number(s?.total_cost || 0), 0);
      const mNet = mSalesTotal - mCogs - totalFixedCosts;

      list.push({
        monthIndex: mIdx,
        year: yNum,
        label: `${monthNames[mIdx]} ${yNum}`,
        salesTotal: mSalesTotal,
        expensesTotal: mExpTotal,
        breakEven: mBe,
        coveragePct: mCoverage,
        netResult: mNet,
        isCurrentSelection: mIdx === selectedMonth && yNum === selectedYear
      });
    }
    return list;
  }, [sales, expenses, breakEvenAmount, totalFixedCosts, selectedMonth, selectedYear]);

  const handleSaveFixedCosts = (e) => {
    e.preventDefault();
    updateFixedCosts(tempFixedCosts);
    setIsEditingFixedCosts(false);
  };

  // ---------------------------------------------------------
  // ESTADOS Y CÁLCULOS: EGRESOS OPERATIVOS (OPEX)
  // ---------------------------------------------------------
  const [expenseSearch, setExpenseSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    category: 'Arriendo / Alquiler',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'Transferencia',
    status: 'Pagado',
    supplier: ''
  });

  const categoriesList = [
    'Arriendo / Alquiler',
    'Sueldos y Salarios',
    'Servicios Públicos',
    'Materia Prima / Insumos',
    'Mantenimiento y Equipos',
    'Marketing y Publicidad',
    'Impuestos y Tasas',
    'Otros Egresos'
  ];

  // Egresos Filtrados
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const q = expenseSearch.toLowerCase().trim();
      const matchesSearch = !q || exp.description?.toLowerCase().includes(q) || exp.supplier?.toLowerCase().includes(q);
      const matchesCat = categoryFilter === 'ALL' || exp.category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || exp.status === statusFilter;

      // Filtrar también por el mes/año seleccionado si aplica
      const expDate = new Date(exp.date || Date.now());
      const matchesMonth = expDate.getMonth() === selectedMonth && expDate.getFullYear() === selectedYear;

      return matchesSearch && matchesCat && matchesStatus && matchesMonth;
    });
  }, [expenses, expenseSearch, categoryFilter, statusFilter, selectedMonth, selectedYear]);

  // Egresos por Categoría del Mes Seleccionado
  const expensesByCategory = useMemo(() => {
    const map = {};
    expenses.forEach(exp => {
      const expDate = new Date(exp.date || Date.now());
      if (expDate.getMonth() === selectedMonth && expDate.getFullYear() === selectedYear) {
        const cat = exp.category || 'Otros Egresos';
        map[cat] = (map[cat] || 0) + Number(exp.amount || 0);
      }
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(map).map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      pct: Math.round((amt / total) * 100)
    })).sort((a, b) => b.amount - a.amount);
  }, [expenses, selectedMonth, selectedYear]);

  // Total Egresos Pendientes
  const pendingExpensesTotal = useMemo(() => {
    return expenses
      .filter(exp => exp.status === 'Pendiente')
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  }, [expenses]);

  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpenseForm({
      description: '',
      category: 'Arriendo / Alquiler',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      payment_method: 'Transferencia',
      status: 'Pagado',
      supplier: ''
    });
    setShowExpenseModal(true);
  };

  const handleOpenAddMonthlyService = () => {
    setEditingExpense(null);
    const mStr = String(selectedMonth + 1).padStart(2, '0');
    const defaultDate = `${selectedYear}-${mStr}-15`;
    
    setExpenseForm({
      description: `Servicios Públicos - ${monthNames[selectedMonth]} ${selectedYear}`,
      category: 'Servicios Públicos',
      amount: '',
      date: defaultDate,
      payment_method: 'Transferencia',
      status: 'Pagado',
      supplier: 'Enel / Movistar / Aguas'
    });
    setShowExpenseModal(true);
  };

  const handleOpenEditExpense = (exp) => {
    setEditingExpense(exp);
    setExpenseForm({
      description: exp.description || '',
      category: exp.category || 'Arriendo / Alquiler',
      amount: String(exp.amount || ''),
      date: exp.date || new Date().toISOString().split('T')[0],
      payment_method: exp.payment_method || 'Transferencia',
      status: exp.status || 'Pagado',
      supplier: exp.supplier || ''
    });
    setShowExpenseModal(true);
  };

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount) {
      alert("Por favor ingresa la descripción y el monto del egreso.");
      return;
    }

    const payload = {
      description: expenseForm.description,
      category: expenseForm.category,
      amount: Number(expenseForm.amount) || 0,
      date: expenseForm.date,
      payment_method: expenseForm.payment_method,
      status: expenseForm.status,
      supplier: expenseForm.supplier
    };

    if (editingExpense) {
      updateExpense(editingExpense.id, payload);
    } else {
      addExpense(payload);
    }

    setShowExpenseModal(false);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      
      {/* ── NAVEGACIÓN Y SELECTOR DE MES A MES (IDÉNTICO AL DASHBOARD) ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        
        {/* Pestañas de Sub-Navegación en la Barra de Vidrio */}
        <div className="glass-panel finances-subnav-panel" style={{ padding: '6px 8px', display: 'inline-flex', gap: '6px', borderRadius: '14px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('breakeven')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'breakeven' ? 'var(--color-cyan)' : 'transparent',
              color: activeTab === 'breakeven' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'breakeven' ? '0 4px 12px rgba(6, 182, 212, 0.25)' : 'none'
            }}
          >
            <Scale size={16} />
            <span>Punto de Equilibrio Mensual</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'expenses' ? 'var(--color-amber)' : 'transparent',
              color: activeTab === 'expenses' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'expenses' ? '0 4px 12px rgba(245, 158, 11, 0.25)' : 'none'
            }}
          >
            <PieChart size={16} />
            <span>Egresos Operativos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shifts')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'shifts' ? '#10b981' : 'transparent',
              color: activeTab === 'shifts' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: activeTab === 'shifts' ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none'
            }}
          >
            <Clock size={16} />
            <span>🔒 Auditoría de Cajas (Turnos)</span>
          </button>
        </div>

        {/* SELECTOR DE MES A MES CON BOTONES NAVEGABLES */}
        <div className="glass-panel" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '14px' }}>
          <button
            onClick={handlePrevMonth}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Mes Anterior"
          >
            <ChevronLeft size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} style={{ color: 'var(--color-cyan)' }} />
            <span style={{ fontSize: '13.5px', fontWeight: 900, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
              {monthNames[selectedMonth]} {selectedYear}
            </span>
          </div>

          <button
            onClick={handleNextMonth}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Mes Siguiente"
          >
            <ChevronRight size={20} />
          </button>

          <button
            onClick={handleCurrentMonth}
            style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.12)',
              color: 'var(--color-cyan)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              cursor: 'pointer'
            }}
          >
            Hoy
          </button>
        </div>

      </div>

      {/* ── 4 KPIS SUPERIORES DE FINANZAS (SOLO EN PESTAÑA PUNTO DE EQUILIBRIO) ── */}
      {activeTab === 'breakeven' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          
          {/* KPI 1: INGRESOS DEL MES (CLICKABLE) */}
          <div 
            onClick={() => setShowIngresosModal(true)}
            className="kpi-card glass-panel cyan-glow"
            style={{
              padding: '18px 20px',
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                INGRESOS DEL MES
              </span>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.12)', color: 'var(--color-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUpRight size={16} />
              </div>
            </div>

            <div className="kpi-card-value" style={{ marginTop: '4px', marginBottom: '8px' }}>
              <DualCurrencyDisplay amount={monthSalesGross} fontSize="24px" primaryColor="var(--color-cyan)" showSwap={true} />
            </div>

            <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Neto: {formatCurrency(monthSalesNet)}</span>
              <span style={{ color: 'var(--color-cyan)', fontWeight: 800, textDecoration: 'underline' }}>• Ver desglose</span>
            </div>
          </div>

          {/* KPI 2: EGRESOS TOTALES (CLICKABLE) */}
          <div 
            onClick={() => setShowEgresosModal(true)}
            className="kpi-card glass-panel red-glow"
            style={{
              padding: '18px 20px',
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                EGRESOS TOTALES
              </span>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowDownRight size={16} />
              </div>
            </div>

            <div className="kpi-card-value" style={{ marginTop: '4px', marginBottom: '8px' }}>
              <DualCurrencyDisplay amount={totalEgresosDelMes} fontSize="24px" primaryColor="#ef4444" showSwap={true} />
            </div>

            <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Fijos + Variables</span>
              <span style={{ color: '#ef4444', fontWeight: 800, textDecoration: 'underline' }}>• Ver ítems y sueldos</span>
            </div>
          </div>

          {/* KPI 3: RESULTADO DEL PERÍODO */}
          <div 
            className={`kpi-card glass-panel ${resultadoNetoPeriodo >= 0 ? 'emerald-glow' : 'amber-glow'}`}
            style={{
              padding: '18px 20px',
              background: resultadoNetoPeriodo >= 0 ? 'rgba(16, 185, 129, 0.03)' : 'rgba(245, 158, 11, 0.03)',
              borderRadius: '20px',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                RESULTADO DEL PERÍODO
              </span>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: resultadoNetoPeriodo >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)', color: resultadoNetoPeriodo >= 0 ? '#059669' : '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={16} />
              </div>
            </div>

            <div className="kpi-card-value" style={{ marginTop: '4px', marginBottom: '8px' }}>
              <DualCurrencyDisplay 
                amount={resultadoNetoPeriodo} 
                fontSize="24px" 
                primaryColor={resultadoNetoPeriodo >= 0 ? 'var(--color-emerald)' : '#d97706'} 
                showSwap={true} 
              />
            </div>

            <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '11px', color: resultadoNetoPeriodo >= 0 ? '#047857' : '#b45309', fontWeight: 700 }}>
              Margen neto del mes: <strong>{margenNetoPeriodoPct}%</strong>
            </div>
          </div>

          {/* KPI 4: IVA DÉBITO FISCAL & RESPONSABILIDAD FISCAL */}
          <div 
            className="kpi-card glass-panel"
            style={{
              padding: '18px 20px',
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isTaxFreeCompany ? 'RÉGIMEN FISCAL' : 'IVA DÉBITO (VENTAS)'}
              </span>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isTaxFreeCompany ? 'rgba(6, 182, 212, 0.12)' : 'rgba(245, 158, 11, 0.12)', color: isTaxFreeCompany ? 'var(--color-cyan, #06b6d4)' : '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calculator size={16} />
              </div>
            </div>

            <div className="kpi-card-value" style={{ marginTop: '2px', marginBottom: '6px' }}>
              {isTaxFreeCompany ? (
                <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-cyan, #06b6d4)', height: '36px', display: 'flex', alignItems: 'center' }}>
                  SIN IVA (0%)
                </div>
              ) : (
                <DualCurrencyDisplay amount={monthSalesDebitoIVA} fontSize="24px" primaryColor="#d97706" showSwap={false} />
              )}
            </div>

            <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '10.5px', color: '#64748b', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {isTaxFreeCompany ? (
                <div style={{ color: '#0891b2', fontWeight: 700 }}>
                  Empresa exenta de IVA. Precios directos sin débito fiscal.
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Crédito Egresos ({taxRatePct.toFixed(0)}%):</span>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>-{formatCurrency(monthEgresosCreditoIVA)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <span>Estado IVA Neto:</span>
                    <span style={{ color: netIvaBalance > 0 ? '#d97706' : '#10b981', fontWeight: 800 }}>
                      {netIvaBalance > 0 ? `Por Pagar: ${formatCurrency(netIvaBalance)}` : `A Favor: ${formatCurrency(remanenteFavorIVA)}`}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ⚖️ PESTAÑA 1: PUNTO DE EQUILIBRIO MENSUAL                                */}
      {/* ========================================================================= */}
      {activeTab === 'breakeven' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* GRID DE 2 COLUMNAS (SPLIT SCREEN 50/50 EN EJE X) */}
          <div className="finances-breakeven-grid">
            
            {/* COLUMNA IZQUIERDA (~50%): PUNTO DE EQUILIBRIO OPERATIVO */}
            <div>
              {/* TARJETA PRINCIPAL: PUNTO DE EQUILIBRIO OPERATIVO (ESTILO NEXUS RPM) */}
              <div className="glass-panel" style={{
                padding: '28px',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '24px',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                background: '#ffffff',
                boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
              }}>
                {/* Fondo decorativo con marca de agua (Icono Target) */}
                <div style={{
                  position: 'absolute',
                  top: '-15px',
                  right: '-15px',
                  opacity: 0.04,
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}>
                  <Target size={180} style={{ color: '#0f172a' }} />
                </div>

                {/* Cabecera del Módulo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'rgba(6, 182, 212, 0.12)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-cyan)'
                  }}>
                    <Target size={22} />
                  </div>
                  <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                    Punto de Equilibrio Operativo
                  </h2>
                </div>

                {/* Fila 1: Ventas Actuales (Neto) vs Meta de Costos Netos */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '24px',
                  marginBottom: '20px'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      VENTAS ACTUALES (NETO)*
                    </div>
                    <DualCurrencyDisplay amount={monthSalesTotal} fontSize="26px" primaryColor="#0f172a" showSwap={true} />
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      META DE COSTOS NETOS
                    </div>
                    <DualCurrencyDisplay amount={metaCostosNetos} fontSize="26px" primaryColor="#0f172a" showSwap={false} />
                  </div>
                </div>

                {/* Fila 2: Progreso de Cobertura Bar */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      PROGRESO DE COBERTURA
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 900, color: isBreakEvenReached ? '#059669' : '#d97706' }}>
                      {breakevenCoveragePct.toFixed(1)}%
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <div style={{
                      width: `${Math.min(100, breakevenCoveragePct)}%`,
                      height: '100%',
                      background: isBreakEvenReached ? '#10b981' : '#f59e0b',
                      borderRadius: '20px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>

                {/* Alerta Badge de Cobertura */}
                <div style={{
                  padding: '12px 18px',
                  borderRadius: '14px',
                  background: isBreakEvenReached ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  border: isBreakEvenReached ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '24px'
                }}>
                  {isBreakEvenReached ? (
                    <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: '13px', fontWeight: 800, color: isBreakEvenReached ? '#047857' : '#b45309' }}>
                    {isBreakEvenReached
                      ? '✓ Operando por sobre el Punto de Equilibrio (Rentable).'
                      : '⚠️ Operando por debajo del Punto de Equilibrio (En Déficit).'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div 
                    onClick={() => {
                      setTempFixedCosts({ ...fixedCosts });
                      setIsEditingFixedCosts(true);
                    }}
                    title="Haz clic para editar los costos fijos de plantilla"
                    style={{
                      background: '#f8fafc',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 650, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Costos Fijos <Edit3 size={12} color="var(--color-cyan)" />
                    </span>
                    <DualCurrencyDisplay amount={totalFixedCosts} fontSize="14px" primaryColor="#0f172a" showSwap={false} align="right" />
                  </div>

                  <div style={{
                    background: '#f8fafc',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 650, color: '#64748b' }}>Costos Variables*</span>
                    <DualCurrencyDisplay amount={monthVariableCostsTotal} fontSize="14px" primaryColor="#0f172a" showSwap={false} align="right" />
                  </div>
                </div>

                {/* Separador sutil */}
                <div style={{ borderTop: '1px solid #e2e8f0', marginBottom: '24px' }} />

                {/* Fila 4: ANÁLISIS DE RITMO */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
                    ANÁLISIS DE RITMO — DÍA {daysElapsed} DE {daysInMonth}
                  </div>

                  {/* Barra 1: Tiempo transcurrido */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                      <span>Tiempo transcurrido</span>
                      <span>{timeProgressPct}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <div style={{ width: `${Math.min(100, timeProgressPct)}%`, height: '100%', background: '#94a3b8', borderRadius: '10px' }} />
                    </div>
                  </div>

                  {/* Barra 2: Cobertura de costos */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: isBreakEvenReached ? '#059669' : '#d97706', fontWeight: 700, marginBottom: '4px' }}>
                      <span>Cobertura de costos</span>
                      <span>{breakevenCoveragePct.toFixed(1)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <div style={{ width: `${Math.min(100, breakevenCoveragePct)}%`, height: '100%', background: isBreakEvenReached ? '#10b981' : '#f59e0b', borderRadius: '10px' }} />
                    </div>
                  </div>

                  {/* Alerta Pill de Ritmo */}
                  <div style={{
                    padding: '12px 18px',
                    borderRadius: '14px',
                    background: isAheadOfPace ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                    border: isAheadOfPace ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '20px'
                  }}>
                    {isAheadOfPace ? (
                      <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
                    ) : (
                      <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: '13px', fontWeight: 800, color: isAheadOfPace ? '#047857' : '#b45309' }}>
                      {isAheadOfPace
                        ? `✓ Ritmo adelantado +${paceDifferencePct}% respecto al tiempo del mes.`
                        : `⚠️ Ritmo atrasado ${paceDifferencePct}% respecto al tiempo del mes.`}
                    </span>
                  </div>

                  {/* Tarjetas Inferiores: Ritmo Actual, Ritmo Requerido, Proyección */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px' }}>
                    
                    {/* Box 1: Ritmo Actual */}
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        RITMO ACTUAL
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <DualCurrencyDisplay amount={currentPacePerDay} fontSize="15px" primaryColor="#0f172a" showSwap={false} align="center" />
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>
                        por día
                      </div>
                    </div>

                    {/* Box 2: Ritmo Requerido */}
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        RITMO REQUERIDO
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <DualCurrencyDisplay amount={requiredPacePerDay} fontSize="15px" primaryColor="#0f172a" showSwap={false} align="center" />
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>
                        por día
                      </div>
                    </div>

                    {/* Box 3: Proyección (Destacada Verde) */}
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.06)',
                      padding: '14px',
                      borderRadius: '14px',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        PROYECCIÓN
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <DualCurrencyDisplay amount={projectedMonthEndSales} fontSize="15px" primaryColor="#059669" showSwap={false} align="center" />
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#047857', marginTop: '2px', fontWeight: 600 }}>
                        fin de mes
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA (~50%): COSTOS FIJOS + SIMULADOR DE METAS STACKED */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* COSTOS FIJOS MENSUALES */}
              {/* COSTOS FIJOS MENSUALES Y GASTOS VARIABLES DEL MES */}
              <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '24px', border: '1px solid rgba(226, 232, 240, 0.9)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={18} style={{ color: 'var(--color-cyan)' }} />
                      Estructura de Gastos: Fijos vs Variables
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', margin: 0 }}>
                      Costos fijos recurrentes + servicios variables de {monthNames[selectedMonth]} {selectedYear}.
                    </p>
                  </div>
                  {!isEditingFixedCosts && (
                    <button
                      onClick={() => {
                        setTempFixedCosts({ ...fixedCosts });
                        setIsEditingFixedCosts(true);
                      }}
                      style={{ background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', color: 'var(--color-cyan)', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Edit3 size={14} /> Editar Fijos
                    </button>
                  )}
                </div>

                {isEditingFixedCosts ? (
                  <form onSubmit={handleSaveFixedCosts} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-cyan)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      🔁 Plantilla de Costos Fijos Base (Se repiten cada mes)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px' }}>🏠 Arriendo / Alquiler ($)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={tempFixedCosts.rent !== undefined && tempFixedCosts.rent !== null ? tempFixedCosts.rent : ''}
                          onChange={(e) => setTempFixedCosts({ ...tempFixedCosts, rent: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                          placeholder="0"
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px' }}>👥 Sueldos / Nómina Fija ($)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={tempFixedCosts.salaries !== undefined && tempFixedCosts.salaries !== null ? tempFixedCosts.salaries : ''}
                          onChange={(e) => setTempFixedCosts({ ...tempFixedCosts, salaries: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                          placeholder="0"
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px' }}>⚡ Servicios Públicos Fijos ($)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={tempFixedCosts.services !== undefined && tempFixedCosts.services !== null ? tempFixedCosts.services : ''}
                          onChange={(e) => setTempFixedCosts({ ...tempFixedCosts, services: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                          placeholder="0"
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px' }}>💻 Software y POS ($)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={tempFixedCosts.software !== undefined && tempFixedCosts.software !== null ? tempFixedCosts.software : ''}
                          onChange={(e) => setTempFixedCosts({ ...tempFixedCosts, software: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                          placeholder="0"
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px' }}>📢 Publicidad Fija ($)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={tempFixedCosts.marketing !== undefined && tempFixedCosts.marketing !== null ? tempFixedCosts.marketing : ''}
                          onChange={(e) => setTempFixedCosts({ ...tempFixedCosts, marketing: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                          placeholder="0"
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px' }}>📦 Otros Fijos ($)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={tempFixedCosts.other !== undefined && tempFixedCosts.other !== null ? tempFixedCosts.other : ''}
                          onChange={(e) => setTempFixedCosts({ ...tempFixedCosts, other: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                          placeholder="0"
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setTempFixedCosts({ rent: 0, salaries: 0, services: 0, software: 0, marketing: 0, other: 0 })}
                        style={{ padding: '7px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', fontWeight: 700, fontSize: '11.5px' }}
                      >
                        Poner todo en $0
                      </button>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setIsEditingFixedCosts(false)}
                          style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--color-cyan)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '12px' }}
                        >
                          Guardar Plantilla Fija
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* SECCIÓN 1: GASTOS FIJOS BASE (RECURRENTES) */}
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          🔁 Gastos Fijos Recurrentes (Base Mensual)
                        </span>
                        <span style={{ fontSize: '10.5px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-cyan)', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                          Se repiten mes a mes
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#ffffff', borderRadius: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>🏠 Arriendo / Alquiler:</span>
                          <DualCurrencyDisplay amount={fixedCosts.rent || 0} fontSize="12.5px" primaryColor="var(--text-primary)" showSwap={false} align="right" />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#ffffff', borderRadius: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>👥 Sueldos y Nómina Fija:</span>
                          <DualCurrencyDisplay amount={fixedCosts.salaries || 0} fontSize="12.5px" primaryColor="var(--text-primary)" showSwap={false} align="right" />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#ffffff', borderRadius: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>💻 Software y POS:</span>
                          <DualCurrencyDisplay amount={fixedCosts.software || 0} fontSize="12.5px" primaryColor="var(--text-primary)" showSwap={false} align="right" />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#ffffff', borderRadius: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>📢 Publicidad Fija:</span>
                          <DualCurrencyDisplay amount={fixedCosts.marketing || 0} fontSize="12.5px" primaryColor="var(--text-primary)" showSwap={false} align="right" />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#ffffff', borderRadius: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>📦 Otros Fijos:</span>
                          <DualCurrencyDisplay amount={fixedCosts.other || 0} fontSize="12.5px" primaryColor="var(--text-primary)" showSwap={false} align="right" />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#e2e8f0', borderRadius: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>Subtotal Fijos Base:</span>
                          <DualCurrencyDisplay amount={structuralFixedCosts} fontSize="13px" primaryColor="#0f172a" showSwap={false} align="right" />
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN 2: GASTOS VARIABLES DEL MES (SERVICIOS Y EGRESOS DE ESTE MES) */}
                    <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '14px', borderRadius: '14px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          ⚡ Servicios Públicos y Gastos Variables ({monthNames[selectedMonth]} {selectedYear})
                        </span>
                        <span style={{ fontSize: '10.5px', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                          Se rellena mes a mes
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#ffffff', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                          <div>
                            <span style={{ fontSize: '12px', color: '#0f172a', fontWeight: 700, display: 'block' }}>⚡ Servicios Públicos del Mes:</span>
                            <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>Luz, agua, gas e internet para {monthNames[selectedMonth]} {selectedYear}</span>
                          </div>
                          <DualCurrencyDisplay amount={monthServicesVariableTotal} fontSize="14px" primaryColor="#d97706" showSwap={false} align="right" />
                        </div>

                        <button
                          type="button"
                          onClick={handleOpenAddMonthlyService}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)'
                          }}
                        >
                          <Plus size={14} />
                          <span>+ Cargar Servicios de {monthNames[selectedMonth]} {selectedYear}</span>
                        </button>
                      </div>
                    </div>

                    {/* TOTAL COSTOS FIJOS Y VARIABLES DEL MES */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '14px', border: '1px solid rgba(6, 182, 212, 0.4)', marginTop: '4px' }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--color-cyan)', display: 'block' }}>TOTAL ESTRUCTURA DEL MES:</span>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Fijos Base ({formatCurrency(structuralFixedCosts, false, true)}) + Servicios ({formatCurrency(monthServicesVariableTotal, false, true)})</span>
                      </div>
                      <DualCurrencyDisplay amount={totalFixedCosts} fontSize="17px" primaryColor="var(--text-primary)" showSwap={false} align="right" />
                    </div>

                  </div>
                )}
              </div>

              {/* SIMULADOR DE METAS */}
              <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '24px', border: '1px solid rgba(226, 232, 240, 0.9)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calculator size={18} style={{ color: '#c084fc' }} />
                    Simulador de Metas de Utilidad Neta
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', marginBottom: '16px' }}>
                    Simula la venta necesaria para cubrir fijos y obtener una ganancia neta.
                  </p>

                  {/* Slider Margen */}
                  <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-secondary)' }}>Margen de Contribución %:</label>
                      <span style={{ fontSize: '13px', fontWeight: 900, color: '#f472b6' }}>{effectiveMarginPct}%</span>
                    </div>

                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="1"
                      value={effectiveMarginPct}
                      onChange={(e) => setManualMarginPct(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#ec4899', cursor: 'pointer' }}
                    />
                    {manualMarginPct !== null && (
                      <button
                        onClick={() => setManualMarginPct(null)}
                        style={{ fontSize: '10.5px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginTop: '4px' }}
                      >
                        Usar margen automático ({calculatedAvgMarginPct}%)
                      </button>
                    )}
                  </div>

                  {/* Meta Utilidad Neta */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      🎯 Meta de Utilidad Neta Deseada ($):
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={desiredProfitGoal || ''}
                      onChange={(e) => setDesiredProfitGoal(Number(e.target.value))}
                      placeholder="Ej: 1000"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '14px', fontWeight: 800 }}
                    />
                  </div>
                </div>

                {/* Resultado Simulado */}
                <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '14px 16px', borderRadius: '14px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 900, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>VENTA REQUERIDA PARA LA META</span>
                  <div style={{ marginTop: '4px', marginBottom: '6px' }}>
                    <DualCurrencyDisplay amount={simulatedSalesNeeded} fontSize="22px" primaryColor="var(--text-primary)" showSwap={false} />
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0 }}>
                    Cubre {formatCurrency(totalFixedCosts, false, true)} de fijos + {formatCurrency(desiredProfitGoal || 0, false, true)} de ganancia.
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 💸 PESTAÑA 2: EGRESOS OPERATIVOS (OPEX)                                  */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* GRID DE KPIS DE EGRESOS */}
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 0 }}>
            
            {/* KPI 1: Total Egresos del Mes */}
            <div className="kpi-card glass-panel amber-glow">
              <div className="kpi-card-header">
                <span>Egresos ({monthNames[selectedMonth]})</span>
                <div className="kpi-card-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-amber)' }}>
                  <PieChart size={18} />
                </div>
              </div>
              <div className="kpi-card-value" style={{ marginTop: '4px' }}>
                <DualCurrencyDisplay amount={monthExpensesTotal} fontSize="24px" primaryColor="var(--color-amber)" showSwap={false} />
              </div>
              <div className="kpi-card-footer" style={{ marginTop: '8px' }}>
                Gastos del mes seleccionado.
              </div>
            </div>

            {/* KPI 2: Cuentas Pendientes por Pagar */}
            <div className="kpi-card glass-panel red-glow">
              <div className="kpi-card-header">
                <span>Cuentas por Pagar (Pendientes)</span>
                <div className="kpi-card-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  <Clock size={18} />
                </div>
              </div>
              <div className="kpi-card-value" style={{ marginTop: '4px' }}>
                <DualCurrencyDisplay amount={pendingExpensesTotal} fontSize="24px" primaryColor="#ef4444" showSwap={false} />
              </div>
              <div className="kpi-card-footer" style={{ marginTop: '8px' }}>
                Gastos sin liquidar.
              </div>
            </div>

            {/* KPI 3: Mayor Categoría */}
            <div className="kpi-card glass-panel cyan-glow">
              <div className="kpi-card-header">
                <span>Mayor Categoría Gasto</span>
                <div className="kpi-card-icon" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-cyan)' }}>
                  <Building2 size={18} />
                </div>
              </div>
              <div className="kpi-card-value" style={{ marginTop: '4px' }}>
                {expensesByCategory.length > 0 ? (
                  <DualCurrencyDisplay amount={expensesByCategory[0].amount} fontSize="22px" primaryColor="var(--color-cyan)" showSwap={false} />
                ) : 'Sin registros'}
              </div>
              <div className="kpi-card-footer" style={{ marginTop: '8px' }}>
                {expensesByCategory.length > 0 ? `Categoría principal: ${expensesByCategory[0].category}` : 'Sin egresos registrados.'}
              </div>
            </div>

            {/* KPI 4: % Egresos sobre Ventas */}
            <div className="kpi-card glass-panel">
              <div className="kpi-card-header">
                <span>% Egresos / Ventas</span>
                <div className="kpi-card-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc' }}>
                  <TrendingDown size={18} />
                </div>
              </div>
              <div className="kpi-card-value" style={{ marginTop: '4px', fontSize: '24px', fontWeight: 900, color: '#c084fc' }}>
                {monthSalesTotal > 0 ? `${Math.round((monthExpensesTotal / monthSalesTotal) * 100)}%` : '0%'}
              </div>
              <div className="kpi-card-footer" style={{ marginTop: '8px' }}>
                Sobre facturación de {monthNames[selectedMonth]}.
              </div>
            </div>

          </div>

          {/* BARRA DE BÚSQUEDA Y FILTROS DE EGRESOS */}
          <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            
            <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Buscar por descripción o proveedor..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="form-input"
                style={{ width: '100%', paddingLeft: '38px', borderRadius: '10px', fontSize: '13px' }}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-input"
              style={{ width: 'auto', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700 }}
            >
              <option value="ALL">📁 Todas las Categorías</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ width: 'auto', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700 }}
            >
              <option value="ALL">📌 Todos los Estados</option>
              <option value="Pagado">✅ Pagado</option>
              <option value="Pendiente">⏳ Pendiente</option>
            </select>

            <button
              onClick={handleOpenAddExpense}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                background: 'var(--color-amber)',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} />
              <span>REGISTRAR EGRESO</span>
            </button>

          </div>

          {/* TABLA DE EGRESOS & DESGLOSE DE CATEGORÍAS */}
          <div className="finances-expenses-grid">
            
            {/* TABLA PRINCIPAL DE EGRESOS */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} style={{ color: 'var(--color-amber)' }} />
                Historial de Egresos - {monthNames[selectedMonth]} {selectedYear} ({filteredExpenses.length})
              </h3>

              {filteredExpenses.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)', fontSize: '13px' }}>
                  No hay egresos registrados para el mes de {monthNames[selectedMonth]} {selectedYear} que coincidan con los filtros.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '10px 12px' }}>FECHA</th>
                        <th style={{ padding: '10px 12px' }}>DESCRIPCIÓN</th>
                        <th style={{ padding: '10px 12px' }}>CATEGORÍA</th>
                        <th style={{ padding: '10px 12px' }}>MÉTODO</th>
                        <th style={{ padding: '10px 12px' }}>MONTO</th>
                        <th style={{ padding: '10px 12px' }}>ESTADO</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map(exp => (
                        <tr key={exp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} className="hover:bg-slate-800/40">
                          <td style={{ padding: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{exp.date}</td>
                          <td style={{ padding: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {exp.description}
                            {exp.supplier && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Prov: {exp.supplier}</div>}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700 }}>
                              {exp.category}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{exp.payment_method}</td>
                          <td style={{ padding: '12px', fontWeight: 900, color: 'var(--color-amber)', fontSize: '14px' }}>
                            {formatCurrency(exp.amount)}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <button
                              onClick={() => updateExpense(exp.id, { status: exp.status === 'Pagado' ? 'Pendiente' : 'Pagado' })}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 900,
                                border: 'none',
                                cursor: 'pointer',
                                background: exp.status === 'Pagado' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: exp.status === 'Pagado' ? 'var(--color-emerald)' : '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {exp.status === 'Pagado' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                              <span>{exp.status}</span>
                            </button>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleOpenEditExpense(exp)}
                                style={{ background: 'rgba(6,182,212,0.12)', border: 'none', color: 'var(--color-cyan)', padding: '5px', borderRadius: '6px', cursor: 'pointer' }}
                                title="Editar"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`¿Deseas eliminar el egreso "${exp.description}"?`)) {
                                    deleteExpense(exp.id);
                                  }
                                }}
                                style={{ background: 'rgba(239,68,68,0.12)', border: 'none', color: '#ef4444', padding: '5px', borderRadius: '6px', cursor: 'pointer' }}
                                title="Eliminar"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* DESGLOSE DE CATEGORÍAS */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChart size={18} style={{ color: 'var(--color-cyan)' }} />
                Desglose Categorías ({monthNames[selectedMonth]})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {expensesByCategory.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px' }}>Sin egresos en este mes</div>
                ) : (
                  expensesByCategory.map(item => (
                    <div key={item.category} style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>{item.category}</span>
                        <span style={{ fontSize: '12.5px', fontWeight: 900, color: 'var(--color-amber)' }}>{formatCurrency(item.amount)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '5px', overflow: 'hidden' }}>
                          <div style={{ width: `${item.pct}%`, height: '100%', background: 'var(--color-amber)' }} />
                        </div>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-secondary)', minWidth: '28px' }}>{item.pct}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ── SECCIÓN 3: AUDITORÍA Y CUADRATURA DE TURNOS DE CAJA (CIERRES CIEGOS) ── */}
      {activeTab === 'shifts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={22} style={{ color: '#10b981' }} />
                  Auditoría y Arqueos de Caja (Cierres Ciegos)
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Fórmula Contable: <strong>Esperado = Fondo Inicial + Ventas - Vueltos + Aportes Manuales - Gastos/Sangrías</strong>
                </p>
              </div>

              <div style={{ fontSize: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '6px 14px', borderRadius: '10px', fontWeight: 800 }}>
                Total Turnos Registrados: {shifts.length}
              </div>
            </div>
          </div>

          {shifts.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', background: '#ffffff', borderRadius: '20px', color: '#64748b' }}>
              <Clock size={40} style={{ color: '#cbd5e1', marginBottom: '10px' }} />
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>No hay turnos de caja registrados aún</h4>
              <p style={{ fontSize: '12.5px', margin: 0 }}>
                Cuando los cajeros abran el turno e ingresen su cierre ciego en el POS, los informes de auditoría aparecerán reflejados aquí automáticamente.
              </p>
            </div>
          ) : (
            shifts.map((shift, idx) => {
              const isOpen = shift.status === 'open';
              const declared = shift.declared_closing || {};

              // Calcular ventas registradas durante el turno
              const shiftSales = (allSales || sales || []).filter(s => {
                if (s.shift_id && s.shift_id === shift.id) return true;
                if (s.branch_id !== shift.branch_id) return false;
                const soldTime = new Date(s.sold_at).getTime();
                const openTime = new Date(shift.opened_at).getTime();
                const closeTime = shift.closed_at ? new Date(shift.closed_at).getTime() : Date.now();
                return soldTime >= openTime && soldTime <= closeTime;
              });

              // Calcular matemática teórica por método de pago / bolsillo
              let salesUSD_efectivo = 0;
              let salesVES_efectivo = 0;
              let salesVES_card = 0;
              let salesVES_pago_movil = 0;
              let salesUSD_zelle = 0;
              let salesUSD_binance = 0;

              let vueltosUSD_efectivo = 0;
              let vueltosVES_efectivo = 0;
              let vueltosVES_pago_movil = 0;
              let vueltosUSD_zelle = 0;
              let vueltosUSD_binance = 0;

              shiftSales.forEach(s => {
                const method = String(s.payment_method || '');
                const totalVal = Number(s.total_sell || 0);
                const cd = s.cash_details || {};

                // 1. REGISTRO DE ENTRADAS DE DINERO (Ventas Múltiples o Únicas)
                if (cd.payment_splits && Array.isArray(cd.payment_splits) && cd.payment_splits.length > 0) {
                  cd.payment_splits.forEach(row => {
                    const rowMethod = String(row.method || '');
                    const rowUSD = Number(row.amount_usd) || 0;
                    const rowVES = Number(row.amount_local) || 0;

                    if (rowMethod === 'USD_EFECTIVO') salesUSD_efectivo += rowUSD;
                    else if (rowMethod === 'VES_EFECTIVO') salesVES_efectivo += rowVES;
                    else if (rowMethod === 'VES_PUNTO') salesVES_card += rowVES;
                    else if (rowMethod === 'VES_PAGO_MOVIL') salesVES_pago_movil += rowVES;
                    else if (rowMethod === 'ZELLE') salesUSD_zelle += rowUSD;
                    else if (rowMethod === 'BINANCE') salesUSD_binance += rowUSD;
                    else {
                      if (row.currency === 'USD') salesUSD_efectivo += rowUSD;
                      else salesVES_efectivo += rowVES;
                    }
                  });
                } else {
                  if (method.includes('Efectivo USD') || (method === 'Efectivo' && companySettings.use_usd_pricing)) {
                    salesUSD_efectivo += totalVal;
                  } else if (method.includes('Efectivo') || method.includes('Bolívares')) {
                    salesVES_efectivo += totalVal;
                  } else if (method.includes('Punto') || method.includes('Tarjeta')) {
                    salesVES_card += totalVal;
                  } else if (method.includes('Pago Móvil')) {
                    salesVES_pago_movil += totalVal;
                  } else if (method.includes('Zelle')) {
                    salesUSD_zelle += totalVal;
                  } else if (method.includes('Binance')) {
                    salesUSD_binance += totalVal;
                  }
                }

                // 2. REGISTRO DE SALIDAS DE DINERO (Vueltos Múltiples o Únicos)
                const cpd = cd.change_payout_details;
                if (cpd && cpd.payout_rows && Array.isArray(cpd.payout_rows) && cpd.payout_rows.length > 0) {
                  cpd.payout_rows.forEach(row => {
                    const rowMethod = String(row.method || '');
                    const rowUSD = Number(row.amount_usd) || 0;
                    const rowVES = Number(row.amount_local) || 0;

                    if (rowMethod === 'USD_EFECTIVO') vueltosUSD_efectivo += rowUSD;
                    else if (rowMethod === 'VES_EFECTIVO') vueltosVES_efectivo += rowVES;
                    else if (rowMethod === 'VES_PAGO_MOVIL') vueltosVES_pago_movil += rowVES;
                    else if (rowMethod === 'ZELLE') vueltosUSD_zelle += rowUSD;
                    else if (rowMethod === 'BINANCE') vueltosUSD_binance += rowUSD;
                    else {
                      if (row.currency === 'USD') vueltosUSD_efectivo += rowUSD;
                      else vueltosVES_efectivo += rowVES;
                    }
                  });
                } else if (cd.given_change_bill) {
                  const chgVal = Number(cd.given_change_bill) || 0;
                  if (cd.given_change_currency === 'USD') vueltosUSD_efectivo += chgVal;
                  else vueltosVES_efectivo += chgVal;
                }
              });

              // Movimientos manuales (caja chica / sangrías)
              let manualInUSD = 0, manualOutUSD = 0;
              let manualInVES = 0, manualOutVES = 0;

              (shift.manual_movements || []).forEach(m => {
                if (m.type === 'in') {
                  manualInUSD += Number(m.amount_usd || 0);
                  manualInVES += Number(m.amount_ves || 0);
                } else {
                  manualOutUSD += Number(m.amount_usd || 0);
                  manualOutVES += Number(m.amount_ves || 0);
                }
              });

              // Montos Esperados Matemáticos
              const expectedUSD_cash = (shift.initial_cash_usd || 0) + salesUSD_efectivo - vueltosUSD_efectivo + manualInUSD - manualOutUSD;
              const expectedVES_cash = (shift.initial_cash_ves || 0) + salesVES_efectivo - vueltosVES_efectivo + manualInVES - manualOutVES;
              const expectedVES_card = salesVES_card;
              const expectedVES_pago_movil = salesVES_pago_movil - vueltosVES_pago_movil;
              const expectedUSD_zelle = salesUSD_zelle - vueltosUSD_zelle;
              const expectedUSD_binance = salesUSD_binance - vueltosUSD_binance;

              // Diferencias Ciega Declarado vs Esperado
              const diffUSD_cash = (declared.cash_usd || 0) - expectedUSD_cash;
              const diffVES_cash = (declared.cash_ves || 0) - expectedVES_cash;
              const diffVES_card = (declared.card_pos_ves || 0) - expectedVES_card;
              const diffVES_pago_movil = (declared.pago_movil_ves || 0) - expectedVES_pago_movil;

              const isCashUSD_ok = Math.abs(diffUSD_cash) < 0.01;
              const isCashVES_ok = Math.abs(diffVES_cash) < 0.01;
              const isCard_ok = Math.abs(diffVES_card) < 0.01;
              const isPagoMovil_ok = Math.abs(diffVES_pago_movil) < 0.01;

              const isShiftPerfect = !isOpen && isCashUSD_ok && isCashVES_ok && isCard_ok && isPagoMovil_ok;

              return (
                <div key={shift.id || idx} className="glass-panel" style={{ padding: '24px', background: '#ffffff', borderRadius: '24px', border: isOpen ? '2px solid #3b82f6' : isShiftPerfect ? '2px solid #10b981' : '2px solid #ef4444' }}>
                  
                  {/* Encabezado del Turno */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                          Turno N° {String(shift.id).slice(-8).toUpperCase()}
                        </span>
                        <span style={{ fontSize: '11px', background: isOpen ? '#dbeafe' : '#f1f5f9', color: isOpen ? '#1e40af' : '#475569', padding: '3px 10px', borderRadius: '99px', fontWeight: 800 }}>
                          {isOpen ? '🔵 TURNO EN CURSO' : '🔒 TURNO CERRADO'}
                        </span>
                        <span style={{ fontSize: '11px', background: '#f8fafc', color: '#64748b', padding: '3px 10px', borderRadius: '99px', fontWeight: 700, border: '1px solid #e2e8f0' }}>
                          👤 Cajero: {shift.user_name}
                        </span>
                        <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: '99px', fontWeight: 700, border: '1px solid #bfdbfe' }}>
                          🏪 Sucursal: {shift.branch_name || branches?.find(b => b.id === shift.branch_id)?.name || 'Matriz'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                        Apertura: <strong>{new Date(shift.opened_at).toLocaleString('es-CL')}</strong> {shift.closed_at ? ` | Cierre: ${new Date(shift.closed_at).toLocaleString('es-CL')}` : ''}
                      </div>
                    </div>

                    {!isOpen && (
                      <div style={{ fontSize: '12.5px', fontWeight: 900, padding: '6px 14px', borderRadius: '10px', background: isShiftPerfect ? '#ecfdf5' : '#fef2f2', color: isShiftPerfect ? '#047857' : '#b91c1c', border: `1px solid ${isShiftPerfect ? '#6ee7b7' : '#fca5a5'}` }}>
                        {isShiftPerfect ? '🟢 CUADRE PERFECTO ($0.00 DIFERENCIA)' : '🔴 CAJA CON DESCUADRE REGISTRADO'}
                      </div>
                    )}
                  </div>

                  {/* TABLA DE COMPARACIÓN POR BOLSILLO DE DINERO */}
                  <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                          <th style={{ padding: '10px 12px' }}>Bolsillo / Método</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Fondo Inicial</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Ventas + Aportes</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', color: '#0284c7' }}>Esperado Sistema</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', color: '#d97706' }}>Declarado Físico</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Diferencia</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center' }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 💵 Efectivo USD */}
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 800, color: '#059669' }}>💵 Efectivo USD ($)</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>${(shift.initial_cash_usd || 0).toFixed(2)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>+${(salesUSD_efectivo + manualInUSD - vueltosUSD_efectivo - manualOutUSD).toFixed(2)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#0284c7' }}>${expectedUSD_cash.toFixed(2)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#d97706' }}>{isOpen ? 'Turno en curso' : `$${(declared.cash_usd || 0).toFixed(2)}`}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: isCashUSD_ok || isOpen ? '#059669' : diffUSD_cash < 0 ? '#ef4444' : '#d97706' }}>
                            {isOpen ? '—' : (diffUSD_cash > 0 ? `+$${diffUSD_cash.toFixed(2)}` : `$${diffUSD_cash.toFixed(2)}`)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '10.5px', fontWeight: 900, padding: '3px 8px', borderRadius: '6px', background: isOpen ? '#e2e8f0' : isCashUSD_ok ? '#d1fae5' : diffUSD_cash < 0 ? '#fee2e2' : '#fef3c7', color: isOpen ? '#475569' : isCashUSD_ok ? '#047857' : diffUSD_cash < 0 ? '#991b1b' : '#b45309' }}>
                              {isOpen ? 'EN CURSO' : isCashUSD_ok ? '🟢 CUADRADO' : diffUSD_cash < 0 ? '🔴 FALTANTE' : '🟡 SOBRANTE'}
                            </span>
                          </td>
                        </tr>

                        {/* 🇻🇪 Efectivo Bs */}
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0284c7' }}>🇻🇪 Efectivo Bolívares (Bs.)</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>Bs. {(shift.initial_cash_ves || 0).toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>+Bs. {(salesVES_efectivo + manualInVES - vueltosVES_efectivo - manualOutVES).toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#0284c7' }}>Bs. {expectedVES_cash.toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#d97706' }}>{isOpen ? 'Turno en curso' : `Bs. ${(declared.cash_ves || 0).toLocaleString('es-VE', {minimumFractionDigits: 2})}`}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: isCashVES_ok || isOpen ? '#059669' : diffVES_cash < 0 ? '#ef4444' : '#d97706' }}>
                            {isOpen ? '—' : (diffVES_cash > 0 ? `+Bs. ${diffVES_cash.toLocaleString('es-VE', {minimumFractionDigits: 2})}` : `Bs. ${diffVES_cash.toLocaleString('es-VE', {minimumFractionDigits: 2})}`)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '10.5px', fontWeight: 900, padding: '3px 8px', borderRadius: '6px', background: isOpen ? '#e2e8f0' : isCashVES_ok ? '#d1fae5' : diffVES_cash < 0 ? '#fee2e2' : '#fef3c7', color: isOpen ? '#475569' : isCashVES_ok ? '#047857' : diffVES_cash < 0 ? '#991b1b' : '#b45309' }}>
                              {isOpen ? 'EN CURSO' : isCashVES_ok ? '🟢 CUADRADO' : diffVES_cash < 0 ? '🔴 FALTANTE' : '🟡 SOBRANTE'}
                            </span>
                          </td>
                        </tr>

                        {/* 💳 Punto de Venta */}
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 800, color: '#8b5cf6' }}>💳 Punto de Venta (Bs.)</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>—</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>+Bs. {salesVES_card.toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#0284c7' }}>Bs. {expectedVES_card.toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#d97706' }}>{isOpen ? 'Turno en curso' : `Bs. ${(declared.card_pos_ves || 0).toLocaleString('es-VE', {minimumFractionDigits: 2})}`}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: isCard_ok || isOpen ? '#059669' : diffVES_card < 0 ? '#ef4444' : '#d97706' }}>
                            {isOpen ? '—' : (diffVES_card > 0 ? `+Bs. ${diffVES_card.toLocaleString('es-VE', {minimumFractionDigits: 2})}` : `Bs. ${diffVES_card.toLocaleString('es-VE', {minimumFractionDigits: 2})}`)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '10.5px', fontWeight: 900, padding: '3px 8px', borderRadius: '6px', background: isOpen ? '#e2e8f0' : isCard_ok ? '#d1fae5' : diffVES_card < 0 ? '#fee2e2' : '#fef3c7', color: isOpen ? '#475569' : isCard_ok ? '#047857' : diffVES_card < 0 ? '#991b1b' : '#b45309' }}>
                              {isOpen ? 'EN CURSO' : isCard_ok ? '🟢 CUADRADO' : diffVES_card < 0 ? '🔴 FALTANTE' : '🟡 SOBRANTE'}
                            </span>
                          </td>
                        </tr>

                        {/* 📲 Pago Móvil */}
                        <tr>
                          <td style={{ padding: '10px 12px', fontWeight: 800, color: '#06b6d4' }}>📲 Pago Móvil (Bs.)</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>—</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>+Bs. {salesVES_pago_movil.toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#0284c7' }}>Bs. {expectedVES_pago_movil.toLocaleString('es-VE', {minimumFractionDigits: 2})}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#d97706' }}>{isOpen ? 'Turno en curso' : `Bs. ${(declared.pago_movil_ves || 0).toLocaleString('es-VE', {minimumFractionDigits: 2})}`}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: isPagoMovil_ok || isOpen ? '#059669' : diffVES_pago_movil < 0 ? '#ef4444' : '#d97706' }}>
                            {isOpen ? '—' : (diffVES_pago_movil > 0 ? `+Bs. ${diffVES_pago_movil.toLocaleString('es-VE', {minimumFractionDigits: 2})}` : `Bs. ${diffVES_pago_movil.toLocaleString('es-VE', {minimumFractionDigits: 2})}`)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{ fontSize: '10.5px', fontWeight: 900, padding: '3px 8px', borderRadius: '6px', background: isOpen ? '#e2e8f0' : isPagoMovil_ok ? '#d1fae5' : diffVES_pago_movil < 0 ? '#fee2e2' : '#fef3c7', color: isOpen ? '#475569' : isPagoMovil_ok ? '#047857' : diffVES_pago_movil < 0 ? '#991b1b' : '#b45309' }}>
                              {isOpen ? 'EN CURSO' : isPagoMovil_ok ? '🟢 CUADRADO' : diffVES_pago_movil < 0 ? '🔴 FALTANTE' : '🟡 SOBRANTE'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Notas y Observaciones del Cajero */}
                  {declared.notes && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', color: '#475569' }}>
                      <strong>📝 Observaciones del Cajero:</strong> "{declared.notes}"
                    </div>
                  )}

                  {/* Botón para Compartir Resumen por WhatsApp */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const msg = formatShiftWhatsAppMessage({
                          shift,
                          shiftSales,
                          companySettings,
                          companyName: companySettings?.company_name || 'SoLago',
                          activeBranch: { name: shift.branch_name }
                        });
                        const phone = companySettings?.owner_whatsapp_phone || '';
                        const url = getWhatsAppShareUrl(phone, msg);
                        window.open(url, '_blank');
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 3px 10px rgba(37, 211, 102, 0.25)'
                      }}
                    >
                      <Share2 size={14} />
                      <span>Enviar Resumen a WhatsApp</span>
                    </button>
                  </div>

                </div>
              );
            })
          )}

        </div>
      )}

      {/* ── MODAL DE REGISTRO DE EGRESOS ── */}
      {showExpenseModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '24px', background: '#ffffff', borderRadius: '20px' }}>
            
            <div className="modal-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} style={{ color: 'var(--color-amber)' }} />
                <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>
                  {editingExpense ? 'Editar Egreso Operativo' : 'Registrar Nuevo Egreso'}
                </h3>
              </div>
              <button className="modal-close" onClick={() => setShowExpenseModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Descripción del Gasto *</label>
                <input
                  type="text"
                  placeholder="Ej: Pago de Luz y Agua de la Sucursal"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  required
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Categoría *</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', fontWeight: 700 }}
                  >
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Monto ($) *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required
                    className="form-input"
                    style={{ width: '100%', fontWeight: 900, color: 'var(--color-amber)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Fecha *</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    required
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Método de Pago</label>
                  <select
                    value={expenseForm.payment_method}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                    className="form-input"
                    style={{ width: '100%' }}
                  >
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Efectivo">Efectivo / Caja Chica</option>
                    <option value="Tarjeta">Tarjeta Débito / Crédito</option>
                    <option value="Cuenta por Pagar">Cuenta por Pagar</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Estado de Pago</label>
                  <select
                    value={expenseForm.status}
                    onChange={(e) => setExpenseForm({ ...expenseForm, status: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', fontWeight: 700 }}
                  >
                    <option value="Pagado">✅ Pagado</option>
                    <option value="Pendiente">⏳ Pendiente por Pagar</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Proveedor (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: Enel / Inmobiliaria"
                    value={expenseForm.supplier}
                    onChange={(e) => setExpenseForm({ ...expenseForm, supplier: e.target.value })}
                    className="form-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowExpenseModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ background: 'var(--color-amber)', borderColor: 'var(--color-amber)', color: '#ffffff' }}
                >
                  {editingExpense ? 'Actualizar Egreso' : 'Guardar Egreso'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ── MODAL DESGLOSE DE INGRESOS POR DÍA ── */}
      {showIngresosModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '680px', width: '90%', padding: '24px', background: '#ffffff', borderRadius: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.12)', color: 'var(--color-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Desglose de Ventas por Día</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Ventas diarias acumuladas en {monthNames[selectedMonth]} {selectedYear}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowIngresosModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            {salesByDay.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                No hay ventas registradas para este mes.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ padding: '10px' }}>FECHA / DÍA</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>ÓRDENES</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>COSTO ESTIMADO</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>TOTAL VENTA (BRUTO)</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>NETO ESTIMADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByDay.map(row => (
                      <tr key={row.dateKey} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', fontWeight: 800, color: '#0f172a' }}>
                          Día {row.dayNum} ({row.dateKey})
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700, color: 'var(--color-cyan)' }}>
                          {row.count} vtas
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#64748b' }}>
                          {formatCurrency(row.cost)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 900, color: '#059669' }}>
                          {formatCurrency(row.total)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {formatCurrency(row.total / (1 + (taxRatePct / 100)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL DESGLOSE DE EGRESOS POR ÍTEM, FIJO, VARIABLE Y SUELDOS ── */}
      {showEgresosModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '780px', width: '92%', padding: '24px', background: '#ffffff', borderRadius: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Desglose de Egresos Operativos</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Egresos fijos, variables, compras e ítems de sueldo en {monthNames[selectedMonth]}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowEgresosModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            {/* Sub-Pestañas del Modal de Egresos */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setEgresosModalSubTab('ALL')}
                style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', border: 'none', background: egresosModalSubTab === 'ALL' ? '#0f172a' : '#f1f5f9', color: egresosModalSubTab === 'ALL' ? '#ffffff' : '#64748b' }}
              >
                Todos los Ítems ({expensesBreakdown.variables.length})
              </button>
              <button
                type="button"
                onClick={() => setEgresosModalSubTab('FIJOS')}
                style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', border: 'none', background: egresosModalSubTab === 'FIJOS' ? '#0f172a' : '#f1f5f9', color: egresosModalSubTab === 'FIJOS' ? '#ffffff' : '#64748b' }}
              >
                Costos Fijos ({expensesBreakdown.fijos.length})
              </button>
              <button
                type="button"
                onClick={() => setEgresosModalSubTab('VARIABLES')}
                style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', border: 'none', background: egresosModalSubTab === 'VARIABLES' ? '#0f172a' : '#f1f5f9', color: egresosModalSubTab === 'VARIABLES' ? '#ffffff' : '#64748b' }}
              >
                Gastos Variables & Compras
              </button>
              <button
                type="button"
                onClick={() => setEgresosModalSubTab('SUELDOS')}
                style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', border: 'none', background: egresosModalSubTab === 'SUELDOS' ? '#0f172a' : '#f1f5f9', color: egresosModalSubTab === 'SUELDOS' ? '#ffffff' : '#64748b' }}
              >
                Sueldos & Nómina ({expensesBreakdown.sueldosList.length})
              </button>
            </div>

            {/* Contenido según Pestaña */}
            {egresosModalSubTab === 'FIJOS' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Costos Fijos Mensuales</h4>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>Plantilla base recurrente de la empresa</span>
                  </div>

                  {!isEditingModalFixedCosts ? (
                    <button
                      type="button"
                      onClick={() => {
                        setModalTempFixedCosts({ ...fixedCosts });
                        setIsEditingModalFixedCosts(true);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(6, 182, 212, 0.12)',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        color: 'var(--color-cyan)',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Edit3 size={14} /> Editar Costos Fijos
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setModalTempFixedCosts({ rent: 0, salaries: 0, services: 0, software: 0, marketing: 0, other: 0 })}
                        style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', cursor: 'pointer', fontSize: '11.5px', fontWeight: 700 }}
                      >
                        Poner en $0
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingModalFixedCosts(false)}
                        style={{ padding: '6px 10px', borderRadius: '8px', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '11.5px', fontWeight: 700 }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateFixedCosts(modalTempFixedCosts);
                          setIsEditingModalFixedCosts(false);
                        }}
                        style={{ padding: '6px 14px', borderRadius: '8px', background: 'var(--color-cyan)', color: '#ffffff', border: 'none', cursor: 'pointer', fontSize: '11.5px', fontWeight: 800 }}
                      >
                        Guardar
                      </button>
                    </div>
                  )}
                </div>

                {isEditingModalFixedCosts ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>🏠 Arriendo / Alquiler ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={modalTempFixedCosts.rent !== undefined && modalTempFixedCosts.rent !== null ? modalTempFixedCosts.rent : ''}
                        onChange={(e) => setModalTempFixedCosts({ ...modalTempFixedCosts, rent: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                        placeholder="0"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', background: '#ffffff' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>👥 Sueldos y Nómina ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={modalTempFixedCosts.salaries !== undefined && modalTempFixedCosts.salaries !== null ? modalTempFixedCosts.salaries : ''}
                        onChange={(e) => setModalTempFixedCosts({ ...modalTempFixedCosts, salaries: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                        placeholder="0"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', background: '#ffffff' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>⚡ Servicios Públicos Fijos ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={modalTempFixedCosts.services !== undefined && modalTempFixedCosts.services !== null ? modalTempFixedCosts.services : ''}
                        onChange={(e) => setModalTempFixedCosts({ ...modalTempFixedCosts, services: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                        placeholder="0"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', background: '#ffffff' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>💻 Software y POS ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={modalTempFixedCosts.software !== undefined && modalTempFixedCosts.software !== null ? modalTempFixedCosts.software : ''}
                        onChange={(e) => setModalTempFixedCosts({ ...modalTempFixedCosts, software: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                        placeholder="0"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', background: '#ffffff' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>📢 Publicidad Fija ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={modalTempFixedCosts.marketing !== undefined && modalTempFixedCosts.marketing !== null ? modalTempFixedCosts.marketing : ''}
                        onChange={(e) => setModalTempFixedCosts({ ...modalTempFixedCosts, marketing: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                        placeholder="0"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', background: '#ffffff' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>📦 Otros Fijos ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={modalTempFixedCosts.other !== undefined && modalTempFixedCosts.other !== null ? modalTempFixedCosts.other : ''}
                        onChange={(e) => setModalTempFixedCosts({ ...modalTempFixedCosts, other: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                        placeholder="0"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', background: '#ffffff' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                          <th style={{ padding: '8px' }}>CONCEPTO / COSTO FIJO</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>MONTO MENSUAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expensesBreakdown.fijos.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px', fontWeight: 700 }}>{item.name}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 900, color: item.amount > 0 ? '#ef4444' : '#64748b' }}>
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {expensesBreakdown.fijos.every(item => Number(item.amount) === 0) && (
                      <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.08)', color: 'var(--color-cyan)', fontSize: '12px', fontWeight: 650, textAlign: 'center' }}>
                        ✓ Todos los costos fijos inician en $0.00 (sin costos asumidos). Haz clic en "Editar Costos Fijos" para configurar los de tu negocio.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {(egresosModalSubTab === 'ALL' || egresosModalSubTab === 'VARIABLES' || egresosModalSubTab === 'SUELDOS') && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ padding: '8px' }}>FECHA</th>
                      <th style={{ padding: '8px' }}>DESCRIPCIÓN / ÍTEM</th>
                      <th style={{ padding: '8px' }}>CATEGORÍA</th>
                      <th style={{ padding: '8px' }}>PROVEEDOR</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>MONTO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(egresosModalSubTab === 'SUELDOS' ? expensesBreakdown.sueldosList : expensesBreakdown.variables).map(exp => (
                      <tr key={exp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px', fontWeight: 650, color: '#64748b' }}>{exp.date}</td>
                        <td style={{ padding: '8px', fontWeight: 800, color: '#0f172a' }}>{exp.description}</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontWeight: 700 }}>{exp.category}</span>
                        </td>
                        <td style={{ padding: '8px', color: '#64748b' }}>{exp.supplier || 'N/A'}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 900, color: '#ef4444' }}>{formatCurrency(exp.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
