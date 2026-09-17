import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';
import theme from './theme/theme';
import App from './App';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1a2332',
            color: '#e8e8e8',
            border: '1px solid rgba(37, 51, 73, 0.5)',
            borderRadius: 10,
            fontSize: '0.875rem',
          },
          success: {
            iconTheme: {
              primary: '#c9a96e',
              secondary: '#1a2332',
            },
          },
          error: {
            iconTheme: {
              primary: '#f44336',
              secondary: '#1a2332',
            },
          },
        }}
      />
    </ThemeProvider>
  </React.StrictMode>
);
