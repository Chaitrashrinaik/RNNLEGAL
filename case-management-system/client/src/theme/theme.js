import { createTheme } from '@mui/material/styles';

const GOLD = {
  main: '#c9a96e',
  light: '#d4bc8e',
  dark: '#b08d4a',
};

const sharedTypography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: { fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.025em' },
  h2: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em' },
  h3: { fontSize: '1.25rem', fontWeight: 600 },
  h4: { fontSize: '1.125rem', fontWeight: 600 },
  h5: { fontSize: '1rem', fontWeight: 600 },
  h6: { fontSize: '0.875rem', fontWeight: 600 },
  body1: { fontSize: '0.875rem', lineHeight: 1.6 },
  body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
  button: { textTransform: 'none', fontWeight: 500 },
};

export function createAppTheme(mode = 'dark') {
  const isLight = mode === 'light';

  const palette = {
    mode,
    primary: isLight
      ? { main: '#8a6d2f', light: '#a8853f', dark: '#6b5322', contrastText: '#ffffff' }
      : { main: GOLD.main, light: GOLD.light, dark: GOLD.dark, contrastText: '#1a2332' },
    secondary: isLight
      ? { main: '#5c6b7f', light: '#7b8b9e', dark: '#3f4d5e' }
      : { main: '#1a2332', light: '#2a3a52', dark: '#0f1520' },
    background: isLight
      ? { default: '#f4f6f9', paper: '#ffffff' }
      : { default: '#0f1520', paper: '#1a2332' },
    text: isLight
      ? { primary: '#1a2332', secondary: '#5c6b7f' }
      : { primary: '#e8e8e8', secondary: '#9aa5b4' },
    divider: isLight ? 'rgba(26, 35, 50, 0.12)' : 'rgba(37, 51, 73, 0.5)',
    success: { main: '#4caf50', light: '#66bb6a', dark: '#388e3c' },
    warning: { main: '#ff9800', light: '#ffb74d', dark: '#f57c00' },
    error: { main: '#f44336', light: '#e57373', dark: '#d32f2f' },
    info: { main: '#29b6f6', light: '#4fc3f7', dark: '#0288d1' },
    sidebar: isLight
      ? { bg: '#ffffff', hover: 'rgba(138, 109, 47, 0.08)', active: 'rgba(138, 109, 47, 0.14)', text: '#5c6b7f', activeText: '#8a6d2f' }
      : { bg: '#111927', hover: '#1a2742', active: '#1e2d4a', text: '#8b9cb6', activeText: '#c9a96e' },
    card: isLight
      ? { bg: '#ffffff', border: 'rgba(26, 35, 50, 0.12)' }
      : { bg: '#1a2332', border: '#253349' },
    gold: GOLD,
  };

  const inputBorder = isLight ? 'rgba(26, 35, 50, 0.23)' : 'rgba(138, 155, 180, 0.2)';
  const goldHoverBorder = isLight ? 'rgba(138, 109, 47, 0.6)' : 'rgba(201, 169, 110, 0.5)';

  return createTheme({
    palette,
    typography: {
      ...sharedTypography,
      caption: { fontSize: '0.75rem', color: palette.text.secondary },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 20px',
            fontWeight: 500,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          contained: {
            '&:hover': { boxShadow: `0 2px 8px ${isLight ? 'rgba(138, 109, 47, 0.3)' : 'rgba(201, 169, 110, 0.3)'}` },
          },
          outlined: {
            borderColor: isLight ? 'rgba(138, 109, 47, 0.35)' : 'rgba(201, 169, 110, 0.3)',
            '&:hover': {
              borderColor: palette.primary.main,
              backgroundColor: isLight ? 'rgba(138, 109, 47, 0.08)' : 'rgba(201, 169, 110, 0.08)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${palette.card.border}`,
            backgroundColor: palette.card.bg,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              '& fieldset': { borderColor: inputBorder },
              '&:hover fieldset': { borderColor: goldHoverBorder },
              '&.Mui-focused fieldset': { borderColor: palette.primary.main },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 6, fontWeight: 500, fontSize: '0.75rem' },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: palette.divider, padding: '12px 16px' },
          head: {
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: palette.text.secondary,
            backgroundColor: isLight ? 'rgba(26, 35, 50, 0.04)' : 'rgba(17, 25, 39, 0.5)',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 12, backgroundColor: palette.background.paper },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 500 },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: `1px solid ${palette.divider}`,
            borderRadius: 12,
            backgroundColor: palette.background.paper,
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: isLight ? 'rgba(26, 35, 50, 0.04)' : 'rgba(17, 25, 39, 0.5)',
              borderBottom: `1px solid ${palette.divider}`,
            },
            '& .MuiDataGrid-cell': {
              borderBottom: `1px solid ${isLight ? 'rgba(26, 35, 50, 0.08)' : 'rgba(37, 51, 73, 0.3)'}`,
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: isLight ? 'rgba(138, 109, 47, 0.06)' : 'rgba(201, 169, 110, 0.04)',
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-notchedOutline': { borderColor: inputBorder },
          },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: inputBorder },
              '&:hover fieldset': { borderColor: goldHoverBorder },
              '&.Mui-focused fieldset': { borderColor: palette.primary.main },
            },
          },
        },
      },
    },
  });
}

export const THEME_STORAGE_KEY = 'casebench-theme';

export function getStoredThemeMode() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage may be unavailable (private mode) — fall back to dark.
  }
  return 'dark';
}

const theme = createAppTheme('dark');

export default theme;
