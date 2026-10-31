import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, List, ListItem, ListItemText, Avatar, Chip, CircularProgress, TextField, MenuItem, Button } from '@mui/material';
import Receipt from '@mui/icons-material/Receipt';
import Download from '@mui/icons-material/Download';
import { format, parseISO } from 'date-fns';
import api from '../../api/axios';

const STATUS_COLORS = { draft: '#607d8b', sent: '#2196f3', paid: '#4caf50', overdue: '#f44336', cancelled: '#9e9e9e' };

export default function ClientPortalInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchInvoices(); }, [statusFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/client-portal/invoices', { params });
      setInvoices(data.data || []);
    } catch { setInvoices([]); } finally { setLoading(false); }
  };

  const fmtCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#fff' }}>Payments & Invoices</Typography>
        <TextField select size="small" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="sent">Sent</MenuItem>
          <MenuItem value="paid">Paid</MenuItem>
          <MenuItem value="overdue">Overdue</MenuItem>
          <MenuItem value="draft">Draft</MenuItem>
        </TextField>
      </Box>

      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box> : invoices.length === 0 ? (
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}><Receipt sx={{ fontSize: 48, color: 'rgba(255,255,255,0.15)', mb: 1 }} /><Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>No invoices found</Typography></CardContent>
        </Card>
      ) : (
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <List dense disablePadding>
            {invoices.map((inv, i) => (
              <ListItem key={inv.id || i}
                sx={{ px: 2.5, py: 2, borderBottom: i < invoices.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                <Avatar sx={{ bgcolor: (STATUS_COLORS[inv.status] || '#9e9e9e') + '18', color: STATUS_COLORS[inv.status] || '#9e9e9e', width: 42, height: 42, mr: 2 }}><Receipt sx={{ fontSize: 18 }} /></Avatar>
                <ListItemText
                  primary={<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#fff', fontSize: '0.875rem' }}>{inv.invoiceNumber}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip size="small" label={inv.status} sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: (STATUS_COLORS[inv.status] || '#9e9e9e') + '20', color: STATUS_COLORS[inv.status] || '#9e9e9e' }} />
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#c9a96e' }}>{fmtCurrency(inv.total)}</Typography>
                    </Box>
                  </Box>}
                  secondary={<Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    {inv.items && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{Array.isArray(inv.items) ? inv.items.length : 0} items</Typography>}
                    {inv.dueDate && <Typography variant="caption" sx={{ color: inv.status === 'overdue' ? '#f44336' : 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Due: {format(parseISO(inv.dueDate), 'MMM dd, yyyy')}</Typography>}
                    {inv.paidDate && <Typography variant="caption" sx={{ color: '#4caf50', fontSize: '0.7rem' }}>Paid: {format(parseISO(inv.paidDate), 'MMM dd, yyyy')}</Typography>}
                    {inv.status === 'paid' && <Typography variant="caption" sx={{ color: '#4caf50', fontSize: '0.7rem' }}>Paid: {fmtCurrency(inv.paidAmount)}</Typography>}
                  </Box>} />
              </ListItem>
            ))}
          </List>
        </Card>
      )}
    </Box>
  );
}
