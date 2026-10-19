import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App.jsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { MenuProvider } from './context/MenuContext.jsx'
import { OrdersProvider } from './context/OrdersContext.jsx'
import { FinanceProvider } from './context/FinanceContext.jsx'
import { UserProvider } from './context/UserContext.jsx'
import { FeedbackProvider } from './components/ui/Feedback.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <UserProvider>
        <SettingsProvider>
          <MenuProvider>
            <OrdersProvider>
              <FinanceProvider>
                <FeedbackProvider>
                  <App />
                </FeedbackProvider>
              </FinanceProvider>
            </OrdersProvider>
          </MenuProvider>
        </SettingsProvider>
      </UserProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
