import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, Avatar, Divider, Alert, CircularProgress } from '@mui/material';
import Grid from '../../components/Grid';
import Person from '@mui/icons-material/Person';
import Save from '@mui/icons-material/Save';
import Lock from '@mui/icons-material/Lock';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function ClientPortalProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: '', address: '', emergencyContact: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/client-portal/profile');
      const p = data.data || data;
      setProfile(p);
      const addr = typeof p.address === 'object' ? JSON.stringify(p.address || {}) : (p.address || '');
      setForm({ email: p.email || '', address: addr, emergencyContact: p.emergencyContact || '' });
    } catch {} finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = { email: form.email };
      if (form.address) {
        try { updates.address = JSON.parse(form.address); } catch { updates.address = form.address; }
      }
      if (form.emergencyContact) updates.emergencyContact = form.emergencyContact;
      const { data } = await api.put('/client-portal/profile', updates);
      setProfile(data.data);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) return;
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setPwSaving(true);
    try {
      await api.put('/client-portal/profile/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setPwSaving(false); }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!profile) return <Typography color="error">Failed to load profile</Typography>;

  const inputSx = {
    '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' }, '&:hover fieldset': { borderColor: '#c9a96e' }, '&.Mui-focused fieldset': { borderColor: '#c9a96e' } },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& .MuiInputLabel-root.Mui-focused': { color: '#c9a96e' },
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ color: '#fff', mb: 3 }}>My Profile</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, textAlign: 'center', py: 4 }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: '#c9a96e', color: '#0a0e1a', fontWeight: 700, fontSize: '1.5rem', mx: 'auto', mb: 2 }}>
              {(profile.name || 'C').charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="h6" fontWeight={600} sx={{ color: '#fff' }}>{profile.name}</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1 }}>{profile.email}</Typography>
            <Typography variant="body2" sx={{ color: '#c9a96e' }}>{profile.phone}</Typography>
            {profile.company && <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>{profile.company}</Typography>}
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#c9a96e', mb: 2 }}>Personal Information</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Name" value={profile.name || ''} disabled InputProps={{ readOnly: true }} sx={{ ...inputSx, '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'rgba(255,255,255,0.7)' } }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Phone" value={profile.phone || ''} disabled InputProps={{ readOnly: true }} sx={{ ...inputSx, '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'rgba(255,255,255,0.7)' } }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} sx={inputSx} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Address" multiline rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} sx={inputSx} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Emergency Contact" value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} sx={inputSx} />
                </Grid>
              </Grid>
              <Button onClick={handleSave} disabled={saving} startIcon={<Save />} sx={{ mt: 2, bgcolor: '#c9a96e', color: '#0a0e1a', fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: '#b8944f' } }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#c9a96e', mb: 2 }}>Change Password</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth type="password" label="Current Password" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} sx={inputSx} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="password" label="New Password" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} sx={inputSx} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="password" label="Confirm Password" value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} sx={inputSx} />
                </Grid>
              </Grid>
              <Button onClick={handlePasswordChange} disabled={pwSaving} startIcon={<Lock />} sx={{ mt: 2, bgcolor: '#c9a96e', color: '#0a0e1a', fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: '#b8944f' } }}>
                {pwSaving ? 'Updating...' : 'Update Password'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
