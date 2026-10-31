import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, CircularProgress, Stepper, Step, StepLabel,
} from '@mui/material';
import ScaleIcon from '@mui/icons-material/Scale';
import Email from '@mui/icons-material/Email';
import Lock from '@mui/icons-material/Lock';
import Sms from '@mui/icons-material/Sms';
import api from '../api/axios';
import toast from 'react-hot-toast';

const steps = ['Enter Email', 'Verify OTP', 'Set New Password'];

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [email, setEmail] = useState('');
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
    if (!email.trim()) { setError('Please enter your email address'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      setSuccess('OTP sent to your email');
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
      await api.post('/auth/verify-otp', { email: email.trim(), otp: otp.trim() });
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
      await api.post('/auth/reset-password', { email: email.trim(), otp: otp.trim(), password: newPassword });
      toast.success('Password reset successful!');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a0f18 0%, #111927 50%, #1a2332 100%)', p: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ width: 64, height: 64, borderRadius: 2, backgroundColor: 'rgba(201, 169, 110, 0.1)', border: '1px solid rgba(201, 169, 110, 0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <ScaleIcon sx={{ color: 'primary.main', fontSize: 36 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#e8e8e8', mb: 0.5 }}>CaseBench</Typography>
          <Typography variant="body2" sx={{ color: '#9aa5b4' }}>Legal Case Management System</Typography>
        </Box>

        <Card sx={{ backgroundColor: '#1a2332', border: '1px solid rgba(37, 51, 73, 0.5)', borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#e8e8e8', mb: 0.5 }}>Forgot Password</Typography>
            <Typography variant="body2" sx={{ color: '#9aa5b4', mb: 3 }}>Reset your password using OTP</Typography>

            <Stepper activeStep={activeStep} sx={{ mb: 3, '& .MuiStepLabel-label': { color: '#9aa5b4', fontSize: '0.75rem' }, '& .MuiStepLabel-label.Mui-active': { color: '#c9a96e' }, '& .MuiStepLabel-label.Mui-completed': { color: '#4caf50' }, '& .MuiStepIcon-root': { color: 'rgba(255,255,255,0.15)' }, '& .MuiStepIcon-root.Mui-active': { color: '#c9a96e' }, '& .MuiStepIcon-root.Mui-completed': { color: '#4caf50' } }}>
              {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
            </Stepper>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}
            {devOtp && activeStep === 1 && <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>Dev OTP: {devOtp}</Alert>}

            {activeStep === 0 && (
              <form onSubmit={handleSendOtp}>
                <TextField fullWidth label="Email Address" type="email" placeholder="Enter your registered email"
                  value={email} onChange={e => setEmail(e.target.value)} sx={{ mb: 3 }} autoComplete="email" />
                <Button fullWidth type="submit" variant="contained" size="large" disabled={loading}
                  sx={{ py: 1.5, backgroundColor: '#c9a96e', color: '#1a2332', fontWeight: 600, '&:hover': { backgroundColor: '#b08d4a' }, '&.Mui-disabled': { backgroundColor: 'rgba(201, 169, 110, 0.3)' } }}>
                  {loading ? <CircularProgress size={24} sx={{ color: '#1a2332' }} /> : 'Send OTP'}
                </Button>
              </form>
            )}

            {activeStep === 1 && (
              <form onSubmit={handleVerifyOtp}>
                <TextField fullWidth label="Enter OTP" placeholder="6-digit OTP"
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} sx={{ mb: 3 }} />
                <Button fullWidth type="submit" variant="contained" size="large" disabled={loading}
                  sx={{ py: 1.5, backgroundColor: '#c9a96e', color: '#1a2332', fontWeight: 600, '&:hover': { backgroundColor: '#b08d4a' } }}>
                  {loading ? <CircularProgress size={24} sx={{ color: '#1a2332' }} /> : 'Verify OTP'}
                </Button>
              </form>
            )}

            {activeStep === 2 && (
              <form onSubmit={handleResetPassword}>
                <TextField fullWidth label="New Password" type="password" placeholder="Min 6 characters"
                  value={newPassword} onChange={e => setNewPassword(e.target.value)} sx={{ mb: 2 }} />
                <TextField fullWidth label="Confirm Password" type="password" placeholder="Re-enter password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} sx={{ mb: 3 }} />
                <Button fullWidth type="submit" variant="contained" size="large" disabled={loading}
                  sx={{ py: 1.5, backgroundColor: '#c9a96e', color: '#1a2332', fontWeight: 600, '&:hover': { backgroundColor: '#b08d4a' }, '&.Mui-disabled': { backgroundColor: 'rgba(201, 169, 110, 0.3)' } }}>
                  {loading ? <CircularProgress size={24} sx={{ color: '#1a2332' }} /> : 'Reset Password'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" sx={{ color: '#9aa5b4' }}>
            Remember your password?{' '}
            <Link to="/login" style={{ color: '#c9a96e', textDecoration: 'none', fontWeight: 500 }}>Sign In</Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
