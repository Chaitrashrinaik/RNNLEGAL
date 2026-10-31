import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, TextField, Button, MenuItem, IconButton, CircularProgress, Alert, Divider } from '@mui/material';
import Grid from '../../components/Grid';
import BackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const emptyItem = { description: '', quantity: 1, rate: 0 };
const emptyForm = { clientId: '', caseId: '', items: [{ ...emptyItem }], dueDate: null, notes: '', taxRate: 18 };

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(emptyForm);
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClients();
    fetchCases();
    if (isEdit) fetchInvoice();
  }, [id]);

  const fetchClients = async () => {
    try {
      const { data } = await api.get('/clients', { params: { limit: 200 } });
      setClients(data.clients || data.data || data || []);
    } catch {
      setClients([]);
    }
  };

  const fetchCases = async () => {
    try {
      const { data } = await api.get('/cases', { params: { limit: 100 } });
      setCases(data.data || data.cases || data || []);
    } catch {
      setCases([]);
    }
  };

  const fetchInvoice = async () => {
    try {
      const { data } = await api.get(`/invoices/${id}`);
      const inv = data.data || data.invoice || data;
      setForm({
        clientId: inv.client?._id || inv.clientId || '',
        caseId: inv.case?._id || inv.caseId || '',
        items: inv.items?.length ? inv.items : [{ ...emptyItem }],
        dueDate: inv.dueDate ? new Date(inv.dueDate) : null,
        notes: inv.notes || '',
        taxRate: inv.taxRate || 18,
      });
    } catch { toast.error('Failed to load invoice'); }
    finally { setLoading(false); }
  };

  const subtotal = form.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const tax = subtotal * (form.taxRate / 100);
  const total = subtotal + tax;

  const handleItemChange = (index, field, value) => {
    const items = [...form.items];
    items[index] = { ...items[index], [field]: value };
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeItem = (index) => {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clientId) { setError('Please select a client'); return; }
    if (!form.items.length || !form.items[0].description) { setError('Please add at least one line item'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        client: form.clientId,
        case: form.caseId || undefined,
        items: form.items.map((item) => ({
          description: item.description,
          amount: item.rate,
          quantity: item.quantity,
        })),
        dueDate: form.dueDate?.toISOString(),
        taxRate: (form.taxRate || 18) / 100,
        notes: form.notes,
      };
      if (isEdit) {
        await api.put(`/invoices/${id}`, payload);
        toast.success('Invoice updated');
      } else {
        await api.post('/invoices', payload);
        toast.success('Invoice created');
      }
      navigate('/invoices');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save invoice');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <CircularProgress sx={{ color: 'primary.main' }} />
    </Box>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box className="page-container">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ color: 'text.secondary' }}>Back</Button>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{isEdit ? 'Edit Invoice' : 'Create Invoice'}</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Invoice Details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth select label="Client *" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                    {clients.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth select label="Case" value={form.caseId} onChange={(e) => setForm({ ...form, caseId: e.target.value })}>
                    <MenuItem value="">None</MenuItem>
                    {cases.map((c) => <MenuItem key={c._id} value={c._id}>{c.caseNumber} - {c.caseTitle}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Due Date"
                    value={form.dueDate}
                    onChange={(date) => setForm({ ...form, dueDate: date })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth type="number" label="Tax Rate (%)" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Line Items</Typography>
                <Button startIcon={<AddIcon />} onClick={addItem} size="small">Add Item</Button>
              </Box>

              {form.items.map((item, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 2, alignItems: 'center' }}>
                  <Grid item xs={12} sm={5}>
                    <TextField fullWidth size="small" label="Description" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} placeholder="e.g. Court appearance fee" />
                  </Grid>
                  <Grid item xs={4} sm={2}>
                    <TextField fullWidth size="small" type="number" label="Qty" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} inputProps={{ min: 1 }} />
                  </Grid>
                  <Grid item xs={4} sm={2}>
                    <TextField fullWidth size="small" type="number" label="Rate (₹)" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))} inputProps={{ min: 0 }} />
                  </Grid>
                  <Grid item xs={3} sm={2}>
                    <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right' }}>₹{(item.quantity * item.rate).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={1}>
                    <IconButton onClick={() => removeItem(index)} disabled={form.items.length <= 1} size="small" sx={{ color: 'error.main' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}

              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Subtotal:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 100, textAlign: 'right' }}>₹{subtotal.toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>GST ({form.taxRate}%):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 100, textAlign: 'right' }}>₹{tax.toLocaleString()}</Typography>
                </Box>
                <Divider sx={{ width: 180 }} />
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Total:</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', minWidth: 100, textAlign: 'right' }}>₹{total.toLocaleString()}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Notes</Typography>
              <TextField fullWidth multiline rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Payment terms, additional notes..." />
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => navigate(-1)} sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button type="submit" variant="contained" startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />} disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </Box>
        </form>
      </Box>
    </LocalizationProvider>
  );
}
