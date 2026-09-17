import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, CircularProgress, Alert,
} from '@mui/material';
import { ArrowBack as BackIcon, Save as SaveIcon } from '@mui/icons-material';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const emptyForm = { name: '', email: '', phone: '', address: '', company: '', pan: '', aadhar: '', notes: '' };

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => { if (isEdit) fetchClient(); }, [id]);

  const fetchClient = async () => {
    try {
      const { data } = await api.get(`/clients/${id}`);
      const c = data.data || data.client || data;
      const addr = c.address || '';
      const addressStr = typeof addr === 'string' ? addr : [addr.street, addr.area, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
      setForm({
        name: c.name || '', email: c.email || '', phone: c.phone || '',
        address: addressStr, company: c.company || '', pan: c.panNumber || c.pan || '',
        aadhar: c.aadharNumber || c.aadhar || '', notes: c.notes || '',
      });
    } catch { toast.error('Failed to load client'); }
    finally { setLoading(false); }
  };

  const validate = () => {
    const errs = {};
    if (!form.name) errs.name = 'Name is required';
    
    if (!form.phone) {
      errs.phone = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(form.phone)) {
      errs.phone = 'Mobile number must contain exactly 10 digits';
    }
    
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address';
    }
    
    if (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan)) errs.pan = 'Invalid PAN format';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field) => (e) => {
    let value = e.target.value;
    
    if (field === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        company: form.company,
        panNumber: form.pan || null,
        aadharNumber: form.aadhar || null,
        notes: form.notes,
      };
      if (!isEdit) {
        payload.portalEnabled = 1;
      }
      if (isEdit) {
        await api.put(`/clients/${id}`, payload);
        toast.success('Client updated');
      } else {
        await api.post('/clients', payload);
        toast.success('Client created');
      }
      navigate('/clients');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save client');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <CircularProgress sx={{ color: 'primary.main' }} />
    </Box>
  );

  return (
    <Box className="page-container">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ color: 'text.secondary' }}>Back</Button>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>{isEdit ? 'Edit Client' : 'New Client'}</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Personal Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Full Name *" value={form.name} onChange={handleChange('name')} error={!!errors.name} helperText={errors.name} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Email (Optional)" type="email" value={form.email} onChange={handleChange('email')} error={!!errors.email} helperText={errors.email} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Mobile Number *" value={form.phone} onChange={handleChange('phone')} error={!!errors.phone} helperText={errors.phone} inputProps={{ maxLength: 10, pattern: '[0-9]*' }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Company / Organization" value={form.company} onChange={handleChange('company')} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Address" value={form.address} onChange={handleChange('address')} multiline rows={2} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Identification</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="PAN Number" value={form.pan} onChange={handleChange('pan')} error={!!errors.pan} helperText={errors.pan} placeholder="ABCDE1234F" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Aadhar Number" value={form.aadhar} onChange={handleChange('aadhar')} placeholder="XXXX XXXX XXXX" />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Additional Notes</Typography>
            <TextField fullWidth value={form.notes} onChange={handleChange('notes')} multiline rows={3} placeholder="Any additional notes about this client..." />
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={() => navigate(-1)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button type="submit" variant="contained" startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Client' : 'Create Client'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
