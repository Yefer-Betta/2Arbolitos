import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { CurrencySettings } from './components/CurrencySettings';
import { MenuManager } from './components/MenuManager';
import { POS } from './components/POS';
import { History } from './components/History';
import { Finance } from './components/Finance';
import Escandallo from './components/Escandallo';

function App() {
  const [activeTab, setActiveTab] = useState('pos');

  const renderContent = () => {
    switch (activeTab) {
      case 'pos': return <POS />;
      case 'menu': return <MenuManager />;
      case 'history': return <History />;
      case 'finance': return <Finance />;
      case 'escandallo': return <Escandallo />;
      case 'settings': return (
        <div className="flex justify-center p-8">
          <CurrencySettings />
        </div>
      );
      default: return <POS />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;
