import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useOrders } from '../context/OrdersContext';
import { useSettings } from '../context/SettingsContext';
import { Calculator, FileText, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { normalizeOrderType } from '../lib/sales';
import { SummaryView } from './finance/SummaryView';
import { SalesView } from './finance/SalesView';
import { ClosuresView } from './finance/ClosuresView';
import { CloseDayModal } from './finance/CloseDayModal';
import { ReprintTicketModal } from './finance/ReprintTicketModal';
import { ClosureDetailModal } from './finance/ClosureDetailModal';
import { PageHeader } from './ui/PageHeader';
import { SubNav } from './ui/SubNav';

const VIEWS = [
    { id: 'summary', label: 'Resumen', icon: TrendingUp },
    { id: 'sales', label: 'Consultar ventas', shortLabel: 'Ventas', icon: Search },
    { id: 'closures', label: 'Cierres anteriores', shortLabel: 'Cierres', icon: FileText },
];

/** Fecha local en formato YYYY-MM-DD (evita el desfase de toISOString). */
function toDateInputValue(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

export function Finance() {
    const { expenses, addExpense, deleteExpense, lastClosureDate, closeDay, closures } = useFinance();
    const { orders } = useOrders();
    const { exchangeRate, exchangeRateBs, business } = useSettings();
    
    // View state: 'summary' | 'sales' | 'closures'
    const [activeView, setActiveView] = useState('summary');
    const [isAdding, setIsAdding] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);

    // Sales filters
    const [salesDateFilter, setSalesDateFilter] = useState(() => toDateInputValue(new Date()));
    const [salesTypeFilter, setSalesTypeFilter] = useState('all');
    const [salesSearchId, setSalesSearchId] = useState('');

    // Reprint modal
    const [reprintOrder, setReprintOrder] = useState(null);

    // Close detail modal
    const [selectedClosure, setSelectedClosure] = useState(null);

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: '',
    });

    // Close day state
    const [countedCash, setCountedCash] = useState('');
    const [countedUsd, setCountedUsd] = useState('');
    const [countedBs, setCountedBs] = useState('');
    const [countedNequi, setCountedNequi] = useState('');
    const [countedDebit, setCountedDebit] = useState('');
    const [observations, setObservations] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        addExpense({
            ...formData,
            amount: parseFloat(formData.amount),
        });
        setFormData({ description: '', amount: '', category: '' });
        setIsAdding(false);
    };

    const resetCloseForm = () => {
        setCountedCash('');
        setCountedUsd('');
        setCountedBs('');
        setCountedNequi('');
        setCountedDebit('');
        setObservations('');
    };

    const handleConfirmClose = () => {
        closeDay({
            orderCount: currentOrders.length,
            totalSalesCOP,
            totalSalesUSD,
            totalExpenses,
            salesByMethod,
            countedCash: parseFloat(countedCash) || 0,
            countedUsd: parseFloat(countedUsd) || 0,
            countedBs: parseFloat(countedBs) || 0,
            countedNequi: parseFloat(countedNequi) || 0,
            countedDebit: parseFloat(countedDebit) || 0,
            totalDifference,
            observations,
        });
        setShowCloseModal(false);
        resetCloseForm();
    };

    const handlePrint = (order) => {
        setReprintOrder(order);
    };

    // Filter by Current Shift
    const currentExpenses = expenses.filter(e => {
        if (!e?.date) return false;
        const d = new Date(e.date);
        return !isNaN(d.getTime()) && d > new Date(lastClosureDate);
    });
    const currentOrders = orders.filter(o => {
        if (!o?.date && !o?.createdAt) return false;
        const d = new Date(o.date || o.createdAt);
        return !isNaN(d.getTime()) && d > new Date(lastClosureDate);
    });

    // Calculations
    const totalSalesCOP = currentOrders.reduce((sum, o) => sum + o.totalCop, 0);
    const totalSalesUSD = currentOrders.reduce((sum, o) => sum + o.totalUsd, 0);
    const totalExpenses = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netBalance = totalSalesCOP - totalExpenses;

    const salesByMethod = currentOrders.reduce((acc, order) => {
        const payments = order.payments?.length > 0 ? order.payments : (order.payment ? [order.payment] : []);
        for (const p of payments) {
            const method = (p.method || 'cash_cop').toLowerCase();
            const amount = p.amount || 0;
            if (method === 'cash_cop') acc.cash_cop += amount;
            else if (method === 'cash_usd') acc.cash_usd += amount;
            else if (method === 'cash_bs') acc.cash_bs += amount;
            else if (method === 'nequi') acc.nequi += amount;
            else acc.debit += amount;
        }
        return acc;
    }, { cash_cop: 0, cash_usd: 0, cash_bs: 0, nequi: 0, debit: 0 });

    const filteredSales = orders.filter(order => {
        if (!order?.date && !order?.createdAt) return false;
        const orderDate = new Date(order.date || order.createdAt);
        if (isNaN(orderDate.getTime())) return false;
        if (toDateInputValue(orderDate) !== salesDateFilter) return false;
        if (salesTypeFilter !== 'all' && normalizeOrderType(order.orderType) !== salesTypeFilter) return false;
        if (salesSearchId && !order.id?.toLowerCase().includes(salesSearchId.toLowerCase())) return false;
        return true;
    }).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    const filteredSalesTotal = filteredSales.reduce((sum, o) => sum + (o.totalCop || 0), 0);

    const countedCopVal = parseFloat(countedCash) || 0;
    const countedUsdVal = parseFloat(countedUsd) || 0;
    const countedBsVal = parseFloat(countedBs) || 0;
    const countedNequiVal = parseFloat(countedNequi) || 0;
    const countedDebitVal = parseFloat(countedDebit) || 0;

    const differences = {
        cash_cop: countedCopVal - salesByMethod.cash_cop,
        cash_usd: countedUsdVal - salesByMethod.cash_usd,
        cash_bs: countedBsVal - salesByMethod.cash_bs,
        nequi: countedNequiVal - salesByMethod.nequi,
        debit: countedDebitVal - salesByMethod.debit,
    };

    const hasDifference = Object.values(differences).some(d => d !== 0);
    const rate = exchangeRate > 0 ? exchangeRate : 1;
    const rateBs = exchangeRateBs > 0 ? exchangeRateBs : 40;
    const totalDifference = differences.cash_cop + (differences.cash_usd * rate) + (differences.cash_bs * rateBs) + differences.nequi + differences.debit;

    return (
        <div className="space-y-4">
            <PageHeader
                title="Contabilidad"
                subtitle="Ventas, gastos y cierre de caja del turno."
                actions={
                    <>
                        <button
                            onClick={() => {
                                setActiveView('summary');
                                setIsAdding(!isAdding);
                            }}
                            className="btn-secondary h-9 px-3 text-[13px]"
                        >
                            <TrendingDown className="h-4 w-4" aria-hidden="true" />
                            {isAdding ? 'Descartar gasto' : 'Registrar gasto'}
                        </button>
                        <button
                            onClick={() => setShowCloseModal(true)}
                            className="btn-primary h-9 px-3.5 text-[13px]"
                        >
                            <Calculator className="h-4 w-4" aria-hidden="true" />
                            Cierre de caja
                        </button>
                    </>
                }
            />

            <SubNav items={VIEWS} value={activeView} onChange={setActiveView} />

            {activeView === 'summary' && (
                <SummaryView
                    isAdding={isAdding}
                    setIsAdding={setIsAdding}
                    formData={formData}
                    setFormData={setFormData}
                    handleSubmit={handleSubmit}
                    currentOrders={currentOrders}
                    totalSalesCOP={totalSalesCOP}
                    totalSalesUSD={totalSalesUSD}
                    totalExpenses={totalExpenses}
                    netBalance={netBalance}
                    lastClosureDate={lastClosureDate}
                    salesByMethod={salesByMethod}
                    currentExpenses={currentExpenses}
                    deleteExpense={deleteExpense}
                />
            )}

            {activeView === 'sales' && (
                <SalesView
                    salesDateFilter={salesDateFilter}
                    setSalesDateFilter={setSalesDateFilter}
                    salesTypeFilter={salesTypeFilter}
                    setSalesTypeFilter={setSalesTypeFilter}
                    salesSearchId={salesSearchId}
                    setSalesSearchId={setSalesSearchId}
                    filteredSales={filteredSales}
                    filteredSalesTotal={filteredSalesTotal}
                    handlePrint={handlePrint}
                />
            )}

            {activeView === 'closures' && (
                <ClosuresView
                    closures={closures}
                    setSelectedClosure={setSelectedClosure}
                />
            )}

            {showCloseModal && (
                <CloseDayModal
                    setShowCloseModal={setShowCloseModal}
                    resetCloseForm={resetCloseForm}
                    lastClosureDate={lastClosureDate}
                    currentOrders={currentOrders}
                    currentExpenses={currentExpenses}
                    salesByMethod={salesByMethod}
                    countedCash={countedCash}
                    setCountedCash={setCountedCash}
                    countedUsd={countedUsd}
                    setCountedUsd={setCountedUsd}
                    countedBs={countedBs}
                    setCountedBs={setCountedBs}
                    countedNequi={countedNequi}
                    setCountedNequi={setCountedNequi}
                    countedDebit={countedDebit}
                    setCountedDebit={setCountedDebit}
                    differences={differences}
                    hasDifference={hasDifference}
                    totalDifference={totalDifference}
                    observations={observations}
                    setObservations={setObservations}
                    handleConfirmClose={handleConfirmClose}
                />
            )}

            {reprintOrder && (
                <ReprintTicketModal
                    reprintOrder={reprintOrder}
                    setReprintOrder={setReprintOrder}
                    business={business}
                />
            )}

            {selectedClosure && (
                <ClosureDetailModal
                    selectedClosure={selectedClosure}
                    setSelectedClosure={setSelectedClosure}
                    business={business}
                />
            )}

        </div>
    );
}
