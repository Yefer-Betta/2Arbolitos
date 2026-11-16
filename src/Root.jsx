import React from 'react';
import { App } from './App.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { MenuProvider } from './context/MenuContext.jsx';
import { OrdersProvider } from './context/OrdersContext.jsx';
import { FinanceProvider } from './context/FinanceContext.jsx';
import { useUser } from './context/UserContext.jsx';
import { FeedbackProvider } from './components/ui/Feedback.jsx';

/**
 * Los providers de datos consultan endpoints protegidos al montarse.
 * Se montan solo con sesión activa y con la contraseña ya cambiada.
 */
function DataProviders({ children }) {
  return (
    <SettingsProvider>
      <MenuProvider>
        <OrdersProvider>
          <FinanceProvider>
            {children}
          </FinanceProvider>
        </OrdersProvider>
      </MenuProvider>
    </SettingsProvider>
  );
}

export function Root() {
  const { isAuthenticated, currentUser } = useUser();
  const ready = isAuthenticated && !currentUser?.mustChangePassword;

  return (
    <FeedbackProvider>
      {ready ? (
        <DataProviders>
          <App />
        </DataProviders>
      ) : (
        <App />
      )}
    </FeedbackProvider>
  );
}
