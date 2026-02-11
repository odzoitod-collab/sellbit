import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { UserProvider } from './context/UserContext';
import { ToastProvider } from './context/ToastContext';
import { KeyboardProvider } from './context/KeyboardContext';
import { PinProvider } from './context/PinContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <UserProvider>
      <ToastProvider>
        <PinProvider>
          <KeyboardProvider>
            <App />
          </KeyboardProvider>
        </PinProvider>
      </ToastProvider>
    </UserProvider>
  </React.StrictMode>
);