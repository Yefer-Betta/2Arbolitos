import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { CurrencySettings } from './components/CurrencySettings';
import { MenuManager } from './components/MenuManager';
import { PedidosRouter } from './components/PedidosRouter';
import { History } from './components/History';
import { Finance } from './components/Finance';
import Escandallo from './components/Escandallo';
import { useUser } from './context/UserContext';
import { LoginScreen } from './components/LoginScreen';
import { UserManager } from './context/UserManager';

export function App() {
  const { isAuthenticated } = useUser();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <MainApp />;
}

function MainApp() {
  const { currentUser } = useUser();
  const defaultTab = currentUser.role === 'COOK' ? 'pos' : 'pos';
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
      case 'users':
        return <UserManager />;
      case 'settings':
        return (
          <div className="flex justify-center p-8">
            <CurrencySettings />
          </div>
        );
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
