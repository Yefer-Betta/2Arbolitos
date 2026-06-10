import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { CurrencySettings } from './components/CurrencySettings';
import { InventoryManager } from './components/InventoryManager';
import { MenuManager } from './components/MenuManager';
import { PedidosRouter } from './components/PedidosRouter';
import { History } from './components/History';
import { Finance } from './components/Finance';
import Escandallo from './components/Escandallo';
import { useUser } from './context/UserContext';
import { LoginScreen } from './components/LoginScreen';
import { UserManager } from './context/UserManager';
import { AdminPanel } from './components/AdminPanel';
import { AuditViewer } from './components/AuditViewer';
import { KitchenView } from './components/KitchenView';
import { CustomerManager } from './components/CustomerManager';
import { ModifierManager } from './components/ModifierManager';
import { SupplierManager } from './components/SupplierManager';


export function App() {
  const { isAuthenticated } = useUser();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <MainApp />;
}

function MainApp() {
  const defaultTab = 'pos';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'pos':
        return <PedidosRouter />;
      case 'menu':
        return <MenuManager />;
      case 'history':
        return <History />;
      case 'finance':
        return <Finance />;
      case 'escandallo':
        return <Escandallo />;
      case 'inventory':
        return <InventoryManager />;
      case 'customers':
        return <CustomerManager />;
      case 'modifiers':
        return <ModifierManager />;
      case 'suppliers':
        return <SupplierManager />;
      case 'admin':
        return <AdminPanel />;
      case 'audit':
        return <AuditViewer />;
      case 'kitchen':
        return <KitchenView />;
      case 'settings':
        return <CurrencySettings />;
      default:
        return <PedidosRouter />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}
