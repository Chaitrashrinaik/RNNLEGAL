import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Avatar, List, ListItem, ListItemAvatar, ListItemText,
  Button, CircularProgress, Chip, IconButton, Divider,
} from '@mui/material';
import {
  Gavel, CalendarMonth, Receipt, Description, Chat, Event, Person,
  AttachMoney, CheckCircle, Warning, TrendingUp, ArrowForward, Refresh, Schedule, Notifications,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import api from '../../api/axios';

const STATUS_COLORS = { active: '#4caf50', 'in-progress': '#2196f3', pending: '#ff9800', closed: '#607d8b', disposed: '#795548', won: '#2e7d32', lost: '#c62828' };

const StatCard = ({ icon, label, value, color, onClick }) => (
  <Card onClick={onClick} sx={{ cursor: onClick ? 'pointer' : 'default', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', borderColor: `${color}40`, boxShadow: `0 4px 20px ${color}15` } }}>
    <CardContent sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', display: 'block', mb: 0.5 }}>{label}</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#fff' }}>{value}</Typography>
      </Box>
      <Avatar sx={{ bgcolor: `${color}18`, color, width: 44, height: 44 }}>{icon}</Avatar>
    </CardContent>
  </Card>
);

const SectionHeader = ({ title, action, actionLabel }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
    <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'text.primary', fontSize: '0.875rem' }}>{title}</Typography>
    {action && <Button size="small" onClick={action} endIcon={<ArrowForward sx={{ fontSize: '13px !important' }} />} sx={{ textTransform: 'none', fontSize: '0.7rem', fontWeight: 600, color: '#c9a96e' }}>{actionLabel}</Button>}
  </Box>
);

export default function ClientPortalDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/client-portal/dashboard');
      setData(res.data || res);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ textAlign: 'center', py: 8 }}><Typography color="error" gutterBottom>{error}</Typography><Button onClick={fetchData} startIcon={<Refresh />}>Retry</Button></Box>;
  if (!data) return null;

  const s = data.summary || {};
  const fmtCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#fff' }}>My Dashboard</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>Overview of your cases and activities</Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}><StatCard icon={<Gavel />} label="Active Cases" value={s.activeCases || 0} color="#4caf50" onClick={() => navigate('/client-portal/cases')} /></Grid>
        <Grid item xs={6} md={3}><StatCard icon={<Schedule />} label="Upcoming Hearings" value={s.upcomingHearings || 0} color="#ff9800" onClick={() => navigate('/client-portal/hearings')} /></Grid>
        <Grid item xs={6} md={3}><StatCard icon={<AttachMoney />} label="Pending Amount" value={fmtCurrency(s.pendingAmount)} color="#f44336" onClick={() => navigate('/client-portal/invoices')} /></Grid>
        <Grid item xs={6} md={3}><StatCard icon={<Description />} label="Documents" value={s.totalDocs || 0} color="#9c27b0" onClick={() => navigate('/client-portal/documents')} /></Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={4} sm={2.4}>
          <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
              <Avatar sx={{ bgcolor: '#4caf5018', color: '#4caf50', width: 36, height: 36, mx: 'auto', mb: 1 }}><CheckCircle sx={{ fontSize: 18 }} /></Avatar>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#4caf50' }}>{s.activeCases || 0}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>Active</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4} sm={2.4}>
          <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
              <Avatar sx={{ bgcolor: '#ff980018', color: '#ff9800', width: 36, height: 36, mx: 'auto', mb: 1 }}><CalendarMonth sx={{ fontSize: 18 }} /></Avatar>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#ff9800' }}>{s.todayHearings || 0}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>Today</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4} sm={2.4}>
          <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
              <Avatar sx={{ bgcolor: '#00897b18', color: '#00897b', width: 36, height: 36, mx: 'auto', mb: 1 }}><AttachMoney sx={{ fontSize: 18 }} /></Avatar>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#00897b', fontSize: '0.9rem' }}>{fmtCurrency(s.paidAmount)}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>Paid</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4} sm={2.4}>
          <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
              <Avatar sx={{ bgcolor: '#2196f318', color: '#2196f3', width: 36, height: 36, mx: 'auto', mb: 1 }}><Notifications sx={{ fontSize: 18 }} /></Avatar>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#2196f3' }}>{s.unreadNotifications || 0}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>Alerts</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4} sm={2.4}>
          <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
              <Avatar sx={{ bgcolor: '#9c27b018', color: '#9c27b0', width: 36, height: 36, mx: 'auto', mb: 1 }}><Chat sx={{ fontSize: 18 }} /></Avatar>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#9c27b0' }}>{s.unreadMessages || 0}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>Messages</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, mb: 2 }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <SectionHeader title="My Cases" action={() => navigate('/client-portal/cases')} actionLabel="View All" />
              {(data.recentCases || []).length > 0 ? (
                <List dense disablePadding>
                  {data.recentCases.map((c, i) => (
                    <ListItem key={c.id || i} onClick={() => navigate(`/client-portal/cases/${c.id}`)}
                      sx={{ px: 1.5, py: 1, borderRadius: 2, mb: 0.5, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                      <ListItemAvatar sx={{ minWidth: 42 }}>
                        <Avatar sx={{ bgcolor: (STATUS_COLORS[c.status] || '#9e9e9e') + '18', color: STATUS_COLORS[c.status] || '#9e9e9e', width: 34, height: 34, fontWeight: 700, fontSize: '0.65rem' }}>
                          {(c.caseNumber || '').slice(-2)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1, color: '#fff', fontSize: '0.8125rem' }}>{c.caseTitle}</Typography>
                          <Chip size="small" label={c.status} sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: (STATUS_COLORS[c.status] || '#9e9e9e') + '20', color: STATUS_COLORS[c.status] || '#9e9e9e' }} />
                        </Box>}
                        secondary={<Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{c.caseNumber}{c.nextHearingDate ? ` · Next: ${format(parseISO(c.nextHearingDate), 'MMM dd, yyyy')}` : ''}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 3, fontSize: '0.8rem' }}>No cases found</Typography>}
            </CardContent>
          </Card>

          <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <SectionHeader title="Recent Documents" action={() => navigate('/client-portal/documents')} actionLabel="View All" />
              {(data.recentDocuments || []).length > 0 ? (
                <List dense disablePadding>
                  {data.recentDocuments.map((d, i) => (
                    <ListItem key={d.id || i} sx={{ px: 1.5, py: 1, borderRadius: 2, mb: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                      <ListItemAvatar sx={{ minWidth: 42 }}>
                        <Avatar sx={{ bgcolor: '#ff980018', color: '#ff9800', width: 34, height: 34 }}><Description sx={{ fontSize: 16 }} /></Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography variant="body2" fontWeight={500} noWrap sx={{ color: '#fff', fontSize: '0.8125rem' }}>{d.title || d.originalName}</Typography>}
                        secondary={<Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{d.category} · {d.createdAt ? format(parseISO(d.createdAt), 'MMM dd, yyyy') : ''}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 3, fontSize: '0.8rem' }}>No documents</Typography>}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, mb: 2 }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <SectionHeader title="Upcoming Hearings" action={() => navigate('/client-portal/hearings')} actionLabel="View All" />
              {(data.upcomingHearingCases || []).length > 0 ? (
                <List dense disablePadding>
                  {data.upcomingHearingCases.map((h, i) => (
                    <ListItem key={h.id || i} onClick={() => navigate(`/client-portal/cases/${h.id}`)}
                      sx={{ px: 1.5, py: 1, borderRadius: 2, mb: 0.5, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                      <ListItemAvatar sx={{ minWidth: 42 }}>
                        <Avatar sx={{ bgcolor: '#ff980018', color: '#ff9800', width: 34, height: 34 }}><CalendarMonth sx={{ fontSize: 16 }} /></Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography variant="body2" fontWeight={500} noWrap sx={{ color: '#fff', fontSize: '0.8125rem' }}>{h.caseTitle}</Typography>}
                        secondary={<Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{h.nextHearingDate ? format(parseISO(h.nextHearingDate), 'MMM dd, yyyy hh:mm a') : 'TBD'}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 3, fontSize: '0.8rem' }}>No upcoming hearings</Typography>}
            </CardContent>
          </Card>

          <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <SectionHeader title="Payments" action={() => navigate('/client-portal/invoices')} actionLabel="View All" />
              {(data.recentInvoices || []).length > 0 ? (
                <List dense disablePadding>
                  {data.recentInvoices.slice(0, 4).map((inv, i) => (
                    <ListItem key={inv.id || i} onClick={() => navigate(`/client-portal/invoices`)}
                      sx={{ px: 1.5, py: 1, borderRadius: 2, mb: 0.5, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                      <ListItemText
                        primary={<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight={500} sx={{ color: '#fff', fontSize: '0.8125rem' }}>{inv.invoiceNumber}</Typography>
                          <Chip size="small" label={inv.status}
                            sx={{ height: 18, fontSize: '0.55rem', fontWeight: 600,
                              bgcolor: inv.status === 'paid' ? '#4caf5020' : inv.status === 'overdue' ? '#f4433620' : '#ff980020',
                              color: inv.status === 'paid' ? '#4caf50' : inv.status === 'overdue' ? '#f44336' : '#ff9800' }} />
                        </Box>}
                        secondary={<Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>₹{(inv.total || 0).toLocaleString('en-IN')}{inv.dueDate ? ` · Due: ${format(parseISO(inv.dueDate), 'MMM dd')}` : ''}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 3, fontSize: '0.8rem' }}>No invoices</Typography>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
