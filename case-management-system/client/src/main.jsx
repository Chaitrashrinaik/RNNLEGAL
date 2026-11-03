import React from 'react';
import ReactDOM from 'react-dom/client';
import { useTheme } from '@mui/material/styles';
import { Toaster } from 'react-hot-toast';
import { ThemeModeProvider } from './context/ThemeContext';
import App from './App';
import './App.css';

function ThemedToaster() {
  const theme = useTheme();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: theme.palette.background.paper,
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 10,
          fontSize: '0.875rem',
        },
        success: {
          iconTheme: {
            primary: theme.palette.primary.main,
            secondary: theme.palette.background.paper,
          },
        },
        error: {
          iconTheme: {
            primary: theme.palette.error.main,
            secondary: theme.palette.background.paper,
          },
        },
      }}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <App />
      <ThemedToaster />
    </ThemeModeProvider>
  </React.StrictMode>
);
