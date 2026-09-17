import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  InputAdornment, IconButton, CircularProgress, Tabs, Tab,
} from '@mui/material';
import { Visibility, VisibilityOff, Scale as ScaleIcon } from '@mui/icons-material';
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
      await login(email, password, selectedRole);
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
        background: 'linear-gradient(135deg, #0a0f18 0%, #111927 50%, #1a2332 100%)',
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 64, height: 64, borderRadius: 2,
              backgroundColor: 'rgba(201, 169, 110, 0.1)',
              border: '1px solid rgba(201, 169, 110, 0.2)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2,
            }}
          >
            <ScaleIcon sx={{ color: 'primary.main', fontSize: 36 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#e8e8e8', mb: 0.5 }}>
            CaseBench
          </Typography>
          <Typography variant="body2" sx={{ color: '#9aa5b4' }}>
            Legal Case Management System
          </Typography>
        </Box>

        <Card
          sx={{
            backgroundColor: '#1a2332',
            border: '1px solid rgba(37, 51, 73, 0.5)',
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
                '& .MuiTab-root': { color: '#9aa5b4', fontWeight: 500, fontSize: '0.8rem', textTransform: 'none', minHeight: 44 },
                '& .Mui-selected': { color: '#c9a96e !important' },
                '& .MuiTabs-indicator': { backgroundColor: '#c9a96e' },
              }}
            >
              {loginTabs.map((t) => (
                <Tab key={t.role} label={t.label} />
              ))}
            </Tabs>

            <Typography variant="h5" sx={{ fontWeight: 600, color: '#e8e8e8', mb: 0.5 }}>
              Sign In
            </Typography>
            <Typography variant="body2" sx={{ color: '#9aa5b4', mb: 3 }}>
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
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" sx={{ color: '#9aa5b4' }}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ textAlign: 'right', mb: 2 }}>
                <Link to="/forgot-password" style={{ color: '#c9a96e', textDecoration: 'none', fontSize: '0.85rem' }}>
                  Forgot password?
                </Link>
              </Box>
              <Button
                fullWidth type="submit" variant="contained" size="large" disabled={loading}
                sx={{
                  py: 1.5, backgroundColor: '#c9a96e', color: '#1a2332', fontWeight: 600,
                  fontSize: '0.95rem', '&:hover': { backgroundColor: '#b08d4a' },
                  '&.Mui-disabled': { backgroundColor: 'rgba(201, 169, 110, 0.3)' },
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: '#1a2332' }} /> : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" sx={{ color: '#9aa5b4' }}>
            Contact your admin to create an account
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
