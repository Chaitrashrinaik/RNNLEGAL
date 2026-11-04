import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  InputAdornment, IconButton, CircularProgress, Tabs, Tab,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ScaleIcon from '@mui/icons-material/Scale';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const loginTabs = [
  { label: 'Admin', role: 'admin' },
  { label: 'Junior Advocate', role: 'advocate' },
];

export default function Login() {
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const selectedRole = loginTabs[tab].role;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      try {
        await login(email, password, selectedRole);
      } catch (err) {
        // If the account exists but was opened on the wrong tab, retry without
        // forcing the role so any valid account can sign in from either tab.
        const message = err.response?.data?.message || '';
        if (err.response?.status === 401 && /correct login tab/i.test(message)) {
          await login(email, password);
        } else {
          throw err;
        }
      }
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to the server. Check your connection and try again.');
      } else {
        setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) => (theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #0a0f18 0%, #111927 50%, #1a2332 100%)'
          : 'linear-gradient(135deg, #eef4fb 0%, #ffffff 60%, #dbe9fb 100%)'),
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 64, height: 64, borderRadius: 2,
              backgroundColor: 'rgba(var(--app-accent-rgb), 0.1)',
              border: '1px solid rgba(var(--app-accent-rgb), 0.2)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2,
            }}
          >
            <ScaleIcon sx={{ color: 'primary.main', fontSize: 36 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            CaseBench
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Legal Case Management System
          </Typography>
        </Box>

        <Card
          sx={{
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Tabs
              value={tab}
              onChange={(e, v) => { setTab(v); setError(''); }}
              variant="fullWidth"
              sx={{
                mb: 3,
                '& .MuiTab-root': { color: 'text.secondary', fontWeight: 500, fontSize: '0.8rem', textTransform: 'none', minHeight: 44 },
                '& .Mui-selected': { color: 'primary.main !important' },
                '& .MuiTabs-indicator': { backgroundColor: 'primary.main' },
              }}
            >
              {loginTabs.map((t) => (
                <Tab key={t.role} label={t.label} />
              ))}
            </Tabs>

            <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
              Sign In
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              {loginTabs[tab].label} login
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth label="Email Address" type="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 2 }} autoComplete="email"
              />
              <TextField
                fullWidth label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 3 }} autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" sx={{ color: 'text.secondary' }}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ textAlign: 'right', mb: 2 }}>
                <Link to="/forgot-password" style={{ color: 'var(--app-accent)', textDecoration: 'none', fontSize: '0.85rem' }}>
                  Forgot password?
                </Link>
              </Box>
              <Button
                fullWidth type="submit" variant="contained" size="large" disabled={loading}
                sx={{
                  py: 1.5, backgroundColor: 'primary.main', color: 'primary.contrastText', fontWeight: 600,
                  fontSize: '0.95rem', '&:hover': { backgroundColor: 'primary.dark' },
                  '&.Mui-disabled': { backgroundColor: 'rgba(var(--app-accent-rgb), 0.3)' },
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: 'primary.contrastText' }} /> : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" sx={{ color: 'var(--app-text-muted)' }}>
            Contact your admin to create an account
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
