import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#c9a96e',
      light: '#d4bc8e',
      dark: '#b08d4a',
      contrastText: '#1a2332',
    },
    secondary: {
      main: '#1a2332',
      light: '#2a3a52',
      dark: '#0f1520',
    },
    background: {
      default: '#0f1520',
      paper: '#1a2332',
    },
    text: {
      primary: '#e8e8e8',
      secondary: '#9aa5b4',
    },
    success: {
      main: '#4caf50',
      light: '#66bb6a',
      dark: '#388e3c',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    info: {
      main: '#29b6f6',
      light: '#4fc3f7',
      dark: '#0288d1',
    },
    sidebar: {
      bg: '#111927',
      hover: '#1a2742',
      active: '#1e2d4a',
      text: '#8b9cb6',
      activeText: '#c9a96e',
    },
    card: {
      bg: '#1a2332',
      border: '#253349',
    },
    gold: {
      main: '#c9a96e',
      light: '#d4bc8e',
      dark: '#b08d4a',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.125rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      color: '#9aa5b4',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 20px',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 2px 8px rgba(201, 169, 110, 0.3)',
          },
        },
        outlined: {
          borderColor: 'rgba(201, 169, 110, 0.3)',
          '&:hover': {
            borderColor: '#c9a96e',
            backgroundColor: 'rgba(201, 169, 110, 0.08)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(37, 51, 73, 0.5)',
          backgroundColor: '#1a2332',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderColor: 'rgba(138, 155, 180, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(201, 169, 110, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#c9a96e',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          fontSize: '0.75rem',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(37, 51, 73, 0.5)',
          padding: '12px 16px',
        },
        head: {
          fontWeight: 600,
          fontSize: '0.8125rem',
          color: '#9aa5b4',
          backgroundColor: 'rgba(17, 25, 39, 0.5)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          backgroundColor: '#1a2332',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(37, 51, 73, 0.5)',
          borderRadius: 12,
          backgroundColor: '#1a2332',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: 'rgba(17, 25, 39, 0.5)',
            borderBottom: '1px solid rgba(37, 51, 73, 0.5)',
          },
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid rgba(37, 51, 73, 0.3)',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: 'rgba(201, 169, 110, 0.04)',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(138, 155, 180, 0.2)',
          },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(138, 155, 180, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(201, 169, 110, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#c9a96e',
            },
          },
        },
      },
    },
  },
});

export default theme;
