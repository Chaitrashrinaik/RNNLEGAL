import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, List, ListItem, ListItemIcon,
  ListItemText, Avatar, CircularProgress, Chip, IconButton, LinearProgress, Grid,
} from '@mui/material';
import {
  Gavel as CasesIcon, Schedule as HearingIcon, Receipt as InvoiceIcon,
  Description as DocIcon, Refresh, People, CheckCircle,
  Warning, AccessTime, AttachMoney, CalendarToday, TrendingUp, TrendingDown,
  ArrowForward, Assignment as TaskIcon,
} from '@mui/icons-material';
import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Tooltip as ChartTooltip, Legend, ArcElement, Filler,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StatusChip from '../components/StatusChip';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ChartTooltip, Legend, ArcElement, Filler);

const STATUS_COLORS = {
  active: '#4caf50', 'in-progress': '#2196f3', pending: '#ff9800', draft: '#9e9e9e',
  closed: '#607d8b', disposed: '#795548', won: '#2e7d32', lost: '#c62828',
};
const TYPE_COLORS = { civil: '#2196f3', criminal: '#f44336', family: '#9c27b0', corporate: '#ff9800', labor: '#4caf50', tax: '#795548', other: '#607d8b' };

const cardBase = {
  borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'none',
  transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden', height: '100%',
  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', borderColor: 'rgba(201,169,110,0.3)' },
};

const StatCard = ({ icon, label, value, color, onClick }) => (
  <Card onClick={onClick} sx={{ ...cardBase, background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`, borderColor: 'transparent', cursor: onClick ? 'pointer' : 'default' }}>
    <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', display: 'block', mb: 0.5 }}>{label}</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#fff' }}>{value}</Typography>
      </Box>
      <Avatar sx={{ bgcolor: `${color}25`, color, width: 44, height: 44 }}>{icon}</Avatar>
    </CardContent>
  </Card>
);

const SectionHeader = ({ title, action, actionLabel }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
    <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'text.primary', fontSize: '0.875rem' }}>{title}</Typography>
    {action && <Button size="small" onClick={action} endIcon={<ArrowForward sx={{ fontSize: '13px !important' }} />} sx={{ textTransform: 'none', fontSize: '0.7rem', fontWeight: 600, color: '#c9a96e', '&:hover': { bgcolor: '#c9a96e15' } }}>{actionLabel}</Button>}
  </Box>
);

const QuickAction = ({ icon, label, color, onClick }) => (
  <Box onClick={onClick} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', p: 1.5, borderRadius: 2, transition: 'all 0.2s', '&:hover': { bgcolor: `${color}15` } }}>
    <Avatar sx={{ bgcolor: `${color}18`, color, width: 38, height: 38 }}>{icon}</Avatar>
    <Typography variant="body2" fontWeight={500} sx={{ color: 'text.primary', fontSize: '0.8125rem' }}>{label}</Typography>
  </Box>
);

const isTodayCheck = (d) => { const t = new Date(); return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear(); };

const HearingItem = ({ h, onClick }) => {
  const date = h.nextHearingDate ? parseISO(h.nextHearingDate) : null;
  const today = date ? isTodayCheck(date) : false;
  const hrs = date ? differenceInHours(date, new Date()) : null;
  const urgent = hrs !== null && hrs < 24;
  const col = date ? (today ? '#f44336' : urgent ? '#ff9800' : '#2196f3') : '#607d8b';
  return (
    <ListItem sx={{ px: 0, py: 1, cursor: 'pointer', borderRadius: 1.5, mb: 0.5, transition: 'all 0.15s', '&:hover': { bgcolor: 'action.hover', pl: 0.5 } }} onClick={onClick}>
      <ListItemIcon sx={{ minWidth: 38 }}>
        <Avatar sx={{ bgcolor: `${col}18`, color: col, width: 32, height: 32 }}><CasesIcon sx={{ fontSize: 16 }} /></Avatar>
      </ListItemIcon>
      <ListItemText
        primary={<Typography variant="body2" fontWeight={500} noWrap sx={{ fontSize: '0.8125rem' }}>{h.caseTitle || h.caseNumber}</Typography>}
        secondary={<Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mt: 0.25 }}>{date ? <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{format(date, 'MMM dd, hh:mm a')}</Typography> : <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>No date</Typography>}{today && <Chip size="small" label="TODAY" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: '#f4433620', color: '#f44336', '& .MuiChip-label': { px: 0.5 } }} />}</Box>}
      />
    </ListItem>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isClient = user?.role === 'client';
  const isSenior = user?.role === 'admin';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [hearings, setHearings] = useState([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (isClient) {
        const { data } = await api.get('/client/dashboard');
        const d = data.data || data;
        setStats({
          totalCases: d.totalCases || 0, activeCases: d.activeCases || 0,
          upcomingHearings: d.upcomingHearings || 0, pendingInvoices: d.pendingInvoices || 0,
          wonCases: d.wonCases || 0, lostCases: d.lostCases || 0,
          todayHearings: d.todayHearings || 0, monthlyRevenue: d.monthlyRevenue || 0,
          casesByStatus: d.casesByStatus || [], casesByType: d.casesByType || [],
          recentCases: d.recentCases || [], upcomingHearingCases: d.upcomingHearingList || [],
        });
        setHearings(d.upcomingHearingList || []);
      } else {
        const { data: res } = await api.get('/dashboard/stats');
        const d = res.data || res;
        setStats(d);
        setHearings(d.upcomingHearingCases || []);
      }
      setError(null);
    } catch (err) { console.error(err); setError('Failed to load dashboard'); } finally { setLoading(false); }

    if (isSenior) {
      try {
        const { data } = await api.get('/invoices/monthly-earnings');
        setMonthlyEarnings(data.data);
      } catch {}
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ textAlign: 'center', py: 8 }}><Typography color="error" gutterBottom>{error}</Typography><Button onClick={fetchDashboardData} startIcon={<Refresh />}>Retry</Button></Box>;
  if (!stats) return null;

  const fmtCurrency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);
  const totalCases = stats.totalCases || 0;
  const wonRate = totalCases > 0 ? Math.round(((stats.wonCases || 0) / totalCases) * 100) : 0;
  const closedCases = (stats.closedCases || 0) + (stats.wonCases || 0) + (stats.lostCases || 0);
  const caseProgress = totalCases > 0 ? Math.round((closedCases / totalCases) * 100) : 0;

  const doughnutData = {
    labels: (stats.casesByStatus || []).map(s => (s._id || '').replace(/-/g, ' ').toUpperCase()),
    datasets: [{ data: (stats.casesByStatus || []).map(s => s.count), backgroundColor: (stats.casesByStatus || []).map(s => STATUS_COLORS[s._id] || '#9e9e9e'), borderWidth: 3, borderColor: '#0f1520', cutout: '72%', hoverOffset: 6 }],
  };
  const doughnutOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, padding: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 10 }, color: '#9aa5b4' } } } };

  const barData = {
    labels: (stats.casesByType || []).map(t => (t._id || 'other').charAt(0).toUpperCase() + (t._id || 'other').slice(1)),
    datasets: [{ data: (stats.casesByType || []).map(t => t.count), backgroundColor: (stats.casesByType || []).map(t => TYPE_COLORS[t._id] || '#9e9e9e'), borderRadius: 6, barThickness: 28 }],
  };
  const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 }, color: '#6b7280' }, grid: { color: 'rgba(255,255,255,0.04)' } }, x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9aa5b4' } } } };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 }, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: 'text.primary', letterSpacing: '-0.5px' }}>{isClient ? 'My Dashboard' : 'Dashboard'}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>Welcome back, {user?.name}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!isClient && <Button variant="contained" startIcon={<CasesIcon />} onClick={() => navigate('/cases/new')} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 2.5, bgcolor: '#c9a96e', '&:hover': { bgcolor: '#b8944f' } }}>New Case</Button>}
          <IconButton onClick={fetchDashboardData} size="small" sx={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, width: 38, height: 38 }}><Refresh fontSize="small" /></IconButton>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}><StatCard icon={<CasesIcon />} label="Total Cases" value={stats.totalCases || 0} color="#c9a96e" onClick={() => navigate('/cases')} /></Grid>
        <Grid item xs={6} md={3}><StatCard icon={<CheckCircle />} label="Active Cases" value={stats.activeCases || 0} color="#4caf50" onClick={() => navigate('/cases?status=active')} /></Grid>
        <Grid item xs={6} md={3}><StatCard icon={<HearingIcon />} label="Upcoming Hearings" value={stats.upcomingHearings || 0} color="#ff9800" onClick={() => navigate('/hearings')} /></Grid>
        <Grid item xs={6} md={3}><StatCard icon={<People />} label="Total Clients" value={stats.totalClients || 0} color="#9c27b0" onClick={() => navigate('/clients')} /></Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={4}><Card onClick={() => navigate('/cases?status=won')} sx={{ ...cardBase, background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}><CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}><Avatar sx={{ bgcolor: '#4caf5018', color: '#4caf50', width: 36, height: 36, mx: 'auto', mb: 1 }}><CheckCircle sx={{ fontSize: 18 }} /></Avatar><Typography variant="h6" fontWeight={700} sx={{ color: '#4caf50' }}>{stats.wonCases || 0}</Typography><Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>Won</Typography></CardContent></Card></Grid>
        <Grid item xs={4}><Card onClick={() => navigate('/cases?status=lost')} sx={{ ...cardBase, background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}><CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}><Avatar sx={{ bgcolor: '#f4433618', color: '#f44336', width: 36, height: 36, mx: 'auto', mb: 1 }}><Warning sx={{ fontSize: 18 }} /></Avatar><Typography variant="h6" fontWeight={700} sx={{ color: '#f44336' }}>{stats.lostCases || 0}</Typography><Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>Lost</Typography></CardContent></Card></Grid>
        <Grid item xs={4}><Card onClick={() => navigate('/hearings?filter=today')} sx={{ ...cardBase, background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}><CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}><Avatar sx={{ bgcolor: '#9c27b018', color: '#9c27b0', width: 36, height: 36, mx: 'auto', mb: 1 }}><AccessTime sx={{ fontSize: 18 }} /></Avatar><Typography variant="h6" fontWeight={700} sx={{ color: '#9c27b0' }}>{stats.todayHearings || 0}</Typography><Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>Today</Typography></CardContent></Card></Grid>
        <Grid item xs={4}><Card onClick={() => navigate('/invoices')} sx={{ ...cardBase, background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}><CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}><Avatar sx={{ bgcolor: '#f4433618', color: '#f44336', width: 36, height: 36, mx: 'auto', mb: 1 }}><Warning sx={{ fontSize: 18 }} /></Avatar><Typography variant="h6" fontWeight={700} sx={{ color: '#f44336', fontSize: '0.85rem' }}>{fmtCurrency(stats.paymentsPending)}</Typography><Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>Payments Pending</Typography></CardContent></Card></Grid>
        <Grid item xs={4}><Card onClick={() => navigate('/tasks')} sx={{ ...cardBase, background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}><CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}><Avatar sx={{ bgcolor: '#ff6d0018', color: '#ff6d00', width: 36, height: 36, mx: 'auto', mb: 1 }}><TaskIcon sx={{ fontSize: 18 }} /></Avatar><Typography variant="h6" fontWeight={700} sx={{ color: '#ff6d00' }}>{stats.overdueTasks || 0}</Typography><Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>Overdue Tasks</Typography></CardContent></Card></Grid>
      </Grid>

      {isSenior && monthlyEarnings && (
        <Card onClick={() => navigate('/invoices')} sx={{ ...cardBase, background: 'rgba(201,169,110,0.05)', border: '1px solid rgba(201,169,110,0.15)', mb: 2, cursor: 'pointer' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#c9a96e', mb: 2 }}>Monthly Earnings</Typography>
            <Grid container spacing={2}>
              <Grid item xs={3}><Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Total Earned</Typography><Typography variant="h5" fontWeight={700} sx={{ color: '#4caf50' }}>{fmtCurrency(monthlyEarnings.totalEarnings)}</Typography></Grid>
              <Grid item xs={3}><Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Paid Invoices</Typography><Typography variant="h5" fontWeight={700} sx={{ color: '#2196f3' }}>{monthlyEarnings.paidCount}</Typography></Grid>
              <Grid item xs={3}><Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Pending Amount</Typography><Typography variant="h5" fontWeight={700} sx={{ color: '#ff9800' }}>{fmtCurrency(monthlyEarnings.pendingAmount)}</Typography></Grid>
              <Grid item xs={3}><Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Pending Invoices</Typography><Typography variant="h5" fontWeight={700} sx={{ color: '#f44336' }}>{monthlyEarnings.pendingCount}</Typography></Grid>
            </Grid>
            {monthlyEarnings.byCase?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Earnings by Case</Typography>
                {monthlyEarnings.byCase.map((c, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>{c.caseNumber} - {c.caseTitle}</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#4caf50' }}>{fmtCurrency(c.earnings)}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Card onClick={() => navigate('/cases')} sx={{ ...cardBase, background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
              <SectionHeader title="Win Rate" />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
                  <CircularProgress variant="determinate" value={100} size={100} thickness={5} sx={{ color: 'rgba(255,255,255,0.06)', position: 'absolute' }} />
                  <CircularProgress variant="determinate" value={wonRate} size={100} thickness={5} sx={{ color: '#c9a96e', position: 'absolute', '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }} />
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#c9a96e', lineHeight: 1 }}>{wonRate}%</Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}><Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>Won</Typography><Typography variant="caption" fontWeight={600} sx={{ color: '#4caf50', fontSize: '0.65rem' }}>{stats.wonCases || 0}</Typography></Box>
                    <LinearProgress variant="determinate" value={totalCases > 0 ? ((stats.wonCases || 0) / totalCases) * 100 : 0} sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: '#4caf50', borderRadius: 2 } }} />
                  </Box>
                  <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}><Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>Lost</Typography><Typography variant="caption" fontWeight={600} sx={{ color: '#f44336', fontSize: '0.65rem' }}>{stats.lostCases || 0}</Typography></Box>
                    <LinearProgress variant="determinate" value={totalCases > 0 ? ((stats.lostCases || 0) / totalCases) * 100 : 0} sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: '#f44336', borderRadius: 2 } }} />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}><Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>Closed</Typography><Typography variant="caption" fontWeight={600} sx={{ color: '#2196f3', fontSize: '0.65rem' }}>{closedCases}</Typography></Box>
                    <LinearProgress variant="determinate" value={caseProgress} sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: '#2196f3', borderRadius: 2 } }} />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card onClick={() => navigate('/cases')} sx={{ ...cardBase, background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:lastChild': { pb: { xs: 2, md: 2.5 } } }}>
              <SectionHeader title="Cases by Status" />
              <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(stats.casesByStatus || []).length > 0 ? <Doughnut data={doughnutData} options={doughnutOpts} /> : <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>No data</Typography>}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card onClick={() => navigate('/cases')} sx={{ ...cardBase, background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
              <SectionHeader title="Cases by Type" />
              <Box sx={{ height: 200 }}>
                {(stats.casesByType || []).length > 0 ? <Bar data={barData} options={barOpts} /> : <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', pt: 6 }}>No data</Typography>}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Card sx={{ ...cardBase, background: 'rgba(255,255,255,0.03)' }}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
              <SectionHeader title="Quick Actions" />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <QuickAction icon={<CasesIcon />} label="New Case" color="#c9a96e" onClick={() => navigate('/cases/new')} />
                <QuickAction icon={<People />} label="Clients" color="#9c27b0" onClick={() => navigate('/clients')} />
                <QuickAction icon={<DocIcon />} label="Documents" color="#ff9800" onClick={() => navigate('/documents')} />
                <QuickAction icon={<CalendarToday />} label="Calendar" color="#4caf50" onClick={() => navigate('/calendar')} />
                <QuickAction icon={<InvoiceIcon />} label="Invoices" color="#00897b" onClick={() => navigate('/invoices')} />
                {!isClient && <QuickAction icon={<People />} label="Team" color="#2196f3" onClick={() => navigate('/team')} />}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card sx={{ ...cardBase, background: 'rgba(255,255,255,0.03)' }}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
              <SectionHeader title="Upcoming Hearings" action={() => navigate('/hearings')} actionLabel="View All" />
              {hearings.length > 0 ? (
                <List dense disablePadding>
                  {hearings.slice(0, 5).map((h, i) => <HearingItem key={h.id || h._id || i} h={h} onClick={() => navigate(`/cases/${h.caseId || h.id}`)} />)}
                </List>
              ) : <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center', fontSize: '0.8rem' }}>No upcoming hearings</Typography>}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ ...cardBase, background: 'rgba(255,255,255,0.03)' }}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
              <SectionHeader title="Recent Cases" action={() => navigate('/cases')} actionLabel="View All" />
              {(stats.recentCases || []).length > 0 ? (
                <List dense disablePadding>
                  {stats.recentCases.slice(0, 5).map((c, i) => (
                    <ListItem key={c.id || c._id || i} sx={{ px: 0, py: 0.75, cursor: 'pointer', borderRadius: 1.5, mb: 0.5, transition: 'all 0.15s', '&:hover': { bgcolor: 'action.hover', pl: 0.5 } }} onClick={() => navigate(`/cases/${c.id || c._id}`)}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Avatar sx={{ bgcolor: (STATUS_COLORS[c.status] || '#9e9e9e') + '18', color: STATUS_COLORS[c.status] || '#9e9e9e', width: 30, height: 30, fontWeight: 700, fontSize: '0.65rem' }}>{(c.caseNumber || '').slice(-2)}</Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1, fontSize: '0.8125rem' }}>{c.caseTitle}</Typography><StatusChip status={c.status} /></Box>}
                        secondary={<Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{c.caseNumber}{c.client?.name ? ` - ${c.client.name}` : ''}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center', fontSize: '0.8rem' }}>No recent cases</Typography>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
