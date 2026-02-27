import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { MenuProvider } from './context/MenuContext.jsx'
import { OrdersProvider } from './context/OrdersContext.jsx'
import { FinanceProvider } from './context/FinanceContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SettingsProvider>
      <MenuProvider>
        <OrdersProvider>
          <FinanceProvider>
            <App />
          </FinanceProvider>
        </OrdersProvider>
      </MenuProvider>
    </SettingsProvider>
  </React.StrictMode>,
)
