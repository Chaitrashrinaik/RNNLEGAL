import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Card, CardContent, Alert, InputAdornment,
} from '@mui/material';
import { Phone, ArrowBack } from '@mui/icons-material';
import api from '../../api/axios';

export default function ClientPortalLogin() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!mobile.trim()) {
      setError('Please enter your mobile number');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/client-portal/login', { mobile: mobile.trim() });
      const d = data.data || data;
      localStorage.setItem('clientToken', d.token);
      localStorage.setItem('clientData', JSON.stringify(d.client));
      navigate('/client-portal/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0a0e1a', px: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420, bgcolor: '#111827', border: '1px solid rgba(201,169,110,0.15)', borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#c9a96e', mb: 0.5 }}>CaseBench</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>Client Portal</Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2, bgcolor: '#f4433620', color: '#f44336' }}>{error}</Alert>}

          <form onSubmit={handleLogin}>
            <TextField
              fullWidth label="Mobile Number" placeholder="Enter 10-digit mobile number"
              value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Phone sx={{ color: 'rgba(255,255,255,0.3)' }} /></InputAdornment>,
              }}
              sx={{ mb: 3, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' }, '&:hover fieldset': { borderColor: '#c9a96e' }, '&.Mui-focused fieldset': { borderColor: '#c9a96e' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& .MuiInputLabel-root.Mui-focused': { color: '#c9a96e' } }}
            />
            <Button fullWidth type="submit" variant="contained" disabled={loading}
              sx={{ bgcolor: '#c9a96e', color: '#0a0e1a', fontWeight: 600, py: 1.2, '&:hover': { bgcolor: '#b8944f' } }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <Box sx={{ textAlign: 'center', mt: 3, pt: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Link to="/login" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ArrowBack sx={{ fontSize: 14 }} /> Back to Firm Login
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
