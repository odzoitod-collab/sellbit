import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initDevtoolsProtection } from './utils/devtoolsProtection';
import { UserProvider } from './context/UserContext';
import { WebAuthProvider, useWebAuth } from './context/WebAuthContext';
import { ToastProvider } from './context/ToastContext';
import { KeyboardProvider } from './context/KeyboardContext';
import { PinProvider } from './context/PinContext';
import { LanguageProvider } from './context/LanguageContext';

function AppWithUser() {
  const { webUserId } = useWebAuth();
  return (
    <UserProvider webUserId={webUserId}>
      <ToastProvider>
          <PinProvider>
            <KeyboardProvider>
              <App />
            </KeyboardProvider>
          </PinProvider>
        </ToastProvider>
    </UserProvider>
  );
}

initDevtoolsProtection();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <WebAuthProvider>
        <AppWithUser />
      </WebAuthProvider>
    </LanguageProvider>
  </React.StrictMode>
);