import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';
const HEALTH_URLS = [];
if (API_BASE) HEALTH_URLS.push(`${API_BASE}/api/health`);
HEALTH_URLS.push('/api/health');
const ONLINE_INTERVAL = 30000;
const OFFLINE_INTERVAL = 3000;
const HEALTH_TIMEOUT = 8000;

export default function ConnectionMonitor({ children }) {
  const [online, setOnline] = useState(true);
  const { loadUser, user } = useAuth();
  const wasOfflineRef = useRef(false);
  const inFlightRef = useRef(false);

  const checkHealth = useCallback(async () => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    let result = false;
    for (const url of HEALTH_URLS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT);
        try {
          const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
          if (res.ok) { setOnline(true); inFlightRef.current = false; return true; }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch { /* try next URL */ }
    }
    inFlightRef.current = false;
    setOnline(false);
    return false;
  }, []);

  useEffect(() => {
    let isActive = true;
    let currentDelay = 800;

    const tick = async () => {
      const ok = await checkHealth();
      if (!isActive) return;

      if (ok && wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setOnline(true);
        // The backend (possibly restarted) is reachable again — revalidate the
        // session. If the token is invalid, loadUser clears it and the user is
        // redirected to Login by ProtectedRoute. If valid, the session is restored.
        loadUser();
      } else if (!ok && !wasOfflineRef.current) {
        wasOfflineRef.current = true;
        setOnline(false);
      }

      currentDelay = ok ? ONLINE_INTERVAL : OFFLINE_INTERVAL;
      if (isActive) {
        setTimeout(tick, currentDelay);
      }
    };

    const startId = setTimeout(tick, currentDelay);
    return () => {
      isActive = false;
      clearTimeout(startId);
    };
  }, [checkHealth, loadUser]);

  return (
    <>
      {children}
      {!online && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            p: 3,
            background: 'rgba(10, 15, 24, 0.96)',
          }}
        >
          <CloudOffIcon sx={{ fontSize: 64, color: '#c9a96e', opacity: 0.9 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#e8e8e8' }}>
            Server is offline. Reconnecting...
          </Typography>
          <Typography variant="body2" sx={{ color: '#9aa5b4', textAlign: 'center', maxWidth: 420 }}>
            {user
              ? 'The application is trying to reconnect to the server. Your session is safe and will be restored automatically.'
              : 'The application is trying to reconnect to the server. Please wait.'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
            <CircularProgress size={20} sx={{ color: '#c9a96e' }} />
            <Typography variant="caption" sx={{ color: '#9aa5b4' }}>
              Checking again every few seconds...
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            sx={{ mt: 2, borderColor: 'rgba(201, 169, 110, 0.4)', color: '#c9a96e' }}
            onClick={() => { checkHealth(); }}
          >
            Try now
          </Button>
        </Box>
      )}
    </>
  );
}