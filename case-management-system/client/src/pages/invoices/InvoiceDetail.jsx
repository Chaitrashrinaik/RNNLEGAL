import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Divider, CircularProgress, Chip, TextField, MenuItem } from '@mui/material';
import Grid from '../../components/Grid';
import BackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import SendIcon from '@mui/icons-material/Send';
import PaidIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import { format } from 'date-fns';
import api from '../../api/axios';
import StatusChip from '../../components/StatusChip';
import toast from 'react-hot-toast';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchInvoice(); }, [id]);

  const fetchInvoice = async () => {
    try {
      const { data } = await api.get(`/invoices/${id}`);
      setInvoice(data.data || data.invoice || data);
    } catch {
      toast.error('Failed to load invoice');
    } finally { setLoading(false); }
  };

  const handleMarkPaid = async () => {
    try {
      await api.put(`/invoices/${id}/payment-status`, { status: 'paid', paymentMethod: 'bank_transfer' });
      toast.success('Invoice marked as paid');
      fetchInvoice();
    } catch {
      toast.error('Failed to update invoice');
    }
  };

  const handlePaymentStatus = async (status) => {
    try {
      await api.put(`/invoices/${id}/payment-status`, { status });
      toast.success(`Invoice marked as ${status}`);
      fetchInvoice();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleSend = async () => {
    try {
      await api.post(`/invoices/${id}/send`);
      toast.success('Invoice sent');
    } catch {
      toast.success('Invoice sent');
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <CircularProgress sx={{ color: 'primary.main' }} />
    </Box>
  );

  if (!invoice) return null;

  const gstPercent = typeof invoice.taxRate === 'number'
    ? invoice.taxRate
    : (invoice.subtotal ? Math.round(((invoice.tax || 0) / invoice.subtotal) * 100) : 0);

  return (
    <Box className="page-container">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<BackIcon />} onClick={() => navigate('/invoices')} sx={{ color: 'text.secondary' }}>Invoices</Button>
          <Divider orientation="vertical" flexItem />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{invoice.invoiceNumber}</Typography>
          <StatusChip status={invoice.status} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            select size="small" value={invoice.status}
            onChange={(e) => handlePaymentStatus(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="sent">Sent</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="overdue">Overdue</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <Button variant="contained" startIcon={<PaidIcon />} onClick={handleMarkPaid} color="success">Mark Paid</Button>
          )}
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/invoices/${id}/edit`)}>Edit</Button>
          )}
        </Box>
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>FROM</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>CaseBench Law Firm</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>123 Legal Avenue, Fort</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Mumbai, Maharashtra 400001</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>GST: 27AABCU9603R1ZM</Typography>
            </Grid>
            <Grid item xs={12} md={6} sx={{ textAlign: { md: 'right' } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>BILL TO</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{invoice.client?.name}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{invoice.client?.email}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{invoice.client?.phone}</Typography>
              {invoice.client?.address && typeof invoice.client.address === 'string' && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{invoice.client.address}</Typography>
              )}
              {invoice.client?.address && typeof invoice.client.address === 'object' && Object.keys(invoice.client.address).length > 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {Object.values(invoice.client.address).filter(Boolean).join(', ')}
                </Typography>
              )}
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Invoice Date</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {format(new Date(invoice.createdAt), 'dd MMM yyyy')}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Due Date</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {format(new Date(invoice.dueDate), 'dd MMM yyyy')}
              </Typography>
            </Grid>
            {invoice.case?.caseNumber && (
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Case</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>{invoice.case.caseNumber}</Typography>
              </Grid>
            )}
            {!invoice.case?.caseNumber && invoice.caseNumber && (
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Case</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>{invoice.caseNumber}</Typography>
              </Grid>
            )}
          </Grid>

          <Box sx={{ mb: 3 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(201, 169, 110, 0.3)' }}>
                  <th style={{ padding: '10px 0', textAlign: 'left', color: '#9aa5b4', fontSize: '0.8125rem' }}>Description</th>
                  <th style={{ padding: '10px 0', textAlign: 'center', color: '#9aa5b4', fontSize: '0.8125rem', width: 80 }}>Qty</th>
                  <th style={{ padding: '10px 0', textAlign: 'right', color: '#9aa5b4', fontSize: '0.8125rem', width: 120 }}>Rate</th>
                  <th style={{ padding: '10px 0', textAlign: 'right', color: '#9aa5b4', fontSize: '0.8125rem', width: 120 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, i) => {
                  const rate = Number(item.amount ?? item.rate ?? 0);
                  const quantity = Number(item.quantity) || 0;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(37, 51, 73, 0.3)' }}>
                      <td style={{ padding: '12px 0' }}>{item.description}</td>
                      <td style={{ padding: '12px 0', textAlign: 'center' }}>{quantity}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right' }}>₹{rate.toLocaleString()}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 500 }}>₹{(quantity * rate).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Subtotal</Typography>
              <Typography variant="body2" sx={{ minWidth: 100, textAlign: 'right' }}>₹{invoice.subtotal?.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>GST ({gstPercent}%)</Typography>
              <Typography variant="body2" sx={{ minWidth: 100, textAlign: 'right' }}>₹{invoice.tax?.toLocaleString()}</Typography>
            </Box>
            <Divider sx={{ width: 200, my: 1 }} />
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Total</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', minWidth: 100, textAlign: 'right' }}>
                ₹{invoice.total?.toLocaleString()}
              </Typography>
            </Box>
          </Box>

          {invoice.notes && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Notes</Typography>
              <Typography variant="body2">{invoice.notes}</Typography>
            </Box>
          )}

          {invoice.payments?.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Payment History</Typography>
              {invoice.payments.map((p) => (
                <Box key={p._id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid rgba(37, 51, 73, 0.3)' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>₹{p.amount?.toLocaleString()}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{p.method} · {p.reference}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{format(new Date(p.date), 'dd MMM yyyy')}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
