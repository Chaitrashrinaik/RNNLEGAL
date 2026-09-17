import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, TextField, Button, Card, CardContent, Alert, Stepper, Step, StepLabel } from '@mui/material';
import { Phone, Lock, ArrowBack, Sms, CheckCircle } from '@mui/icons-material';
import api from '../../api/axios';

const steps = ['Verify Mobile', 'Enter OTP', 'Set New Password'];

export default function ClientPortalForgotPassword() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!mobile.trim()) { setError('Please enter your mobile number'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/client-portal/forgot-password', { mobile: mobile.trim() });
      setSuccess('OTP sent to your registered mobile number');
      if (data.otp) setDevOtp(data.otp);
      setActiveStep(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim() || otp.length !== 6) { setError('Please enter a valid 6-digit OTP'); return; }
    setLoading(true);
    try {
      await api.post('/client-portal/verify-otp', { mobile: mobile.trim(), otp: otp.trim() });
      setActiveStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.post('/client-portal/reset-password', { mobile: mobile.trim(), otp: otp.trim(), newPassword });
      setSuccess('Password reset successful! Redirecting to login...');
      setTimeout(() => navigate('/client-portal'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0a0e1a', px: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 440, bgcolor: '#111827', border: '1px solid rgba(201,169,110,0.15)', borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#c9a96e', mb: 0.5 }}>CaseBench</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>Reset Your Password</Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 3, '& .MuiStepLabel-label': { color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }, '& .MuiStepLabel-label.Mui-active': { color: '#c9a96e' }, '& .MuiStepLabel-label.Mui-completed': { color: '#4caf50' }, '& .MuiStepIcon-root': { color: 'rgba(255,255,255,0.15)' }, '& .MuiStepIcon-root.Mui-active': { color: '#c9a96e' }, '& .MuiStepIcon-root.Mui-completed': { color: '#4caf50' } }}>
            {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 2, bgcolor: '#f4433620', color: '#f44336' }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2, bgcolor: '#4caf5020', color: '#4caf50' }}>{success}</Alert>}
          {devOtp && activeStep === 1 && <Alert severity="info" sx={{ mb: 2, bgcolor: '#2196f320', color: '#2196f3' }}>Dev OTP: {devOtp}</Alert>}

          {activeStep === 0 && (
            <form onSubmit={handleSendOtp}>
              <TextField fullWidth label="Registered Mobile Number" placeholder="Enter 10-digit mobile number"
                value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                InputProps={{ startAdornment: <Phone sx={{ mr: 1, color: 'rgba(255,255,255,0.3)' }} /> }}
                sx={{ mb: 3, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' }, '&:hover fieldset': { borderColor: '#c9a96e' }, '&.Mui-focused fieldset': { borderColor: '#c9a96e' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& .MuiInputLabel-root.Mui-focused': { color: '#c9a96e' } }}
              />
              <Button fullWidth type="submit" variant="contained" disabled={loading}
                sx={{ bgcolor: '#c9a96e', color: '#0a0e1a', fontWeight: 600, py: 1.2, '&:hover': { bgcolor: '#b8944f' } }}>
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
            </form>
          )}

          {activeStep === 1 && (
            <form onSubmit={handleVerifyOtp}>
              <TextField fullWidth label="Enter OTP" placeholder="6-digit OTP"
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                InputProps={{ startAdornment: <Sms sx={{ mr: 1, color: 'rgba(255,255,255,0.3)' }} /> }}
                sx={{ mb: 3, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' }, '&:hover fieldset': { borderColor: '#c9a96e' }, '&.Mui-focused fieldset': { borderColor: '#c9a96e' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& .MuiInputLabel-root.Mui-focused': { color: '#c9a96e' } }}
              />
              <Button fullWidth type="submit" variant="contained" disabled={loading}
                sx={{ bgcolor: '#c9a96e', color: '#0a0e1a', fontWeight: 600, py: 1.2, '&:hover': { bgcolor: '#b8944f' } }}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
            </form>
          )}

          {activeStep === 2 && (
            <form onSubmit={handleResetPassword}>
              <TextField fullWidth label="New Password" type="password" placeholder="Min 6 characters"
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                InputProps={{ startAdornment: <Lock sx={{ mr: 1, color: 'rgba(255,255,255,0.3)' }} /> }}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' }, '&:hover fieldset': { borderColor: '#c9a96e' }, '&.Mui-focused fieldset': { borderColor: '#c9a96e' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& .MuiInputLabel-root.Mui-focused': { color: '#c9a96e' } }}
              />
              <TextField fullWidth label="Confirm Password" type="password" placeholder="Re-enter password"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                InputProps={{ startAdornment: <Lock sx={{ mr: 1, color: 'rgba(255,255,255,0.3)' }} /> }}
                sx={{ mb: 3, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' }, '&:hover fieldset': { borderColor: '#c9a96e' }, '&.Mui-focused fieldset': { borderColor: '#c9a96e' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& .MuiInputLabel-root.Mui-focused': { color: '#c9a96e' } }}
              />
              <Button fullWidth type="submit" variant="contained" disabled={loading}
                sx={{ bgcolor: '#c9a96e', color: '#0a0e1a', fontWeight: 600, py: 1.2, '&:hover': { bgcolor: '#b8944f' } }}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Link to="/client-portal" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ArrowBack sx={{ fontSize: 14 }} /> Back to Login
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
