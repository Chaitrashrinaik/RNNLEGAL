import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, InputAdornment, IconButton, CircularProgress } from '@mui/material';
import Grid from '../components/Grid';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ScaleIcon from '@mui/icons-material/Scale';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '', company: '', panNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { confirmPassword, ...submitData } = formData;
      await register({ ...submitData, role: 'client' });
      toast.success('Account created successfully!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0f18 0%, #111927 50%, #1a2332 100%)', p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 520 }}>
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
            Register as a Client
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
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#e8e8e8', mb: 0.5 }}>
              Create Client Account
            </Typography>
            <Typography variant="body2" sx={{ color: '#9aa5b4', mb: 3 }}>
              Register to track your cases, documents & invoices
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth label="Full Name *" value={formData.name} onChange={handleChange('name')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Email Address *" type="email" value={formData.email} onChange={handleChange('email')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Phone Number" value={formData.phone} onChange={handleChange('phone')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth label="Password *" type={showPassword ? 'text' : 'password'}
                    value={formData.password} onChange={handleChange('password')}
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
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Confirm Password *" type={showPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange('confirmPassword')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Company (optional)" value={formData.company} onChange={handleChange('company')} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="PAN Number (optional)" value={formData.panNumber} onChange={handleChange('panNumber')} />
                </Grid>
              </Grid>

              <Button
                fullWidth type="submit" variant="contained" size="large" disabled={loading}
                sx={{
                  mt: 3, py: 1.5, backgroundColor: '#c9a96e', color: '#1a2332', fontWeight: 600,
                  fontSize: '0.95rem', '&:hover': { backgroundColor: '#b08d4a' },
                  '&.Mui-disabled': { backgroundColor: 'rgba(201, 169, 110, 0.3)' },
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: '#1a2332' }} /> : 'Create Account'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" sx={{ color: '#9aa5b4' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#c9a96e', textDecoration: 'none', fontWeight: 500 }}>
              Sign In
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
