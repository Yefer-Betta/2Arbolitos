import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { CurrencySettings } from './components/CurrencySettings';
import { MenuManager } from './components/MenuManager';
import { POS } from './components/POS';
import { History } from './components/History';
import { Finance } from './components/Finance';
import Escandallo from './components/Escandallo';
import { useUser } from './context/UserContext';
import { LoginScreen } from './components/LoginScreen';
import { KitchenView } from './components/KitchenView';
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
  const initialTab = currentUser.role === 'cook' ? 'kitchen' : 'pos';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (currentUser.role === 'cook') {
      setActiveTab('kitchen');
    }
  }, [currentUser.role]);

  const renderContent = () => {
    switch (activeTab) {
      case 'pos':
        return <POS />;
      case 'kitchen':
        return <KitchenView />;
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
        return <POS />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}
