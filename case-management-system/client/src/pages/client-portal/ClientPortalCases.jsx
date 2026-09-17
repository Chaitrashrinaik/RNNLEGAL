import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Chip, Avatar, List, ListItem, ListItemAvatar,
  ListItemText, InputAdornment, CircularProgress, MenuItem, Button,
} from '@mui/material';
import { Search, Gavel, CalendarMonth, FilterList } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import api from '../../api/axios';

const STATUS_COLORS = { active: '#4caf50', 'in-progress': '#2196f3', pending: '#ff9800', closed: '#607d8b', disposed: '#795548', won: '#2e7d32', lost: '#c62828' };
const PRIORITY_COLORS = { low: '#607d8b', medium: '#ff9800', high: '#f44336', urgent: '#d50000' };

export default function ClientPortalCases() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchCases(); }, [statusFilter]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/client-portal/cases', { params });
      setCases(data.data || data || []);
    } catch { setCases([]); } finally { setLoading(false); }
  };

  const filtered = cases.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.caseNumber || '').toLowerCase().includes(q) || (c.caseTitle || '').toLowerCase().includes(q);
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#fff' }}>My Cases</Typography>
        <Chip label={`${cases.length} cases`} sx={{ bgcolor: '#c9a96e20', color: '#c9a96e', fontWeight: 600 }} />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField fullWidth size="small" placeholder="Search cases..." value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} /></InputAdornment> }}
          sx={{ '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: '#c9a96e' } } }} />
        <TextField select size="small" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}>
          <MenuItem value="">All Status</MenuItem>
          {Object.keys(STATUS_COLORS).map(s => <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>)}
        </TextField>
      </Box>

      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box> : filtered.length === 0 ? (
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Gavel sx={{ fontSize: 48, color: 'rgba(255,255,255,0.15)', mb: 1 }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>No cases found</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((c, i) => (
            <Grid size={{ xs: 12, md: 6, key: c.id || i }}>
              <Card onClick={() => navigate(`/client-portal/cases/${c.id}`)}
                sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: '#c9a96e40', transform: 'translateY(-1px)' } }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ color: '#fff', fontSize: '0.875rem' }}>{c.caseTitle}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{c.caseNumber}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Chip size="small" label={c.status} sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: (STATUS_COLORS[c.status] || '#9e9e9e') + '20', color: STATUS_COLORS[c.status] || '#9e9e9e' }} />
                      <Chip size="small" label={c.priority} sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: (PRIORITY_COLORS[c.priority] || '#9e9e9e') + '20', color: PRIORITY_COLORS[c.priority] || '#9e9e9e' }} />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Type: {c.caseType}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Court: {c.courtName || c.court}</Typography>
                    {c.judgeName && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Judge: {c.judgeName}</Typography>}
                  </Box>
                  {(c.assignedAdvocates || []).length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Advocate:</Typography>
                      {c.assignedAdvocates.slice(0, 2).map((a, j) => (
                        <Chip key={j} size="small" label={a.name} sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#c9a96e15', color: '#c9a96e' }} />
                      ))}
                    </Box>
                  )}
                  {c.nextHearingDate && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarMonth sx={{ fontSize: 14, color: '#ff9800' }} />
                      <Typography variant="caption" sx={{ color: '#ff9800', fontSize: '0.7rem', fontWeight: 500 }}>
                        Next: {format(parseISO(c.nextHearingDate), 'MMM dd, yyyy hh:mm a')}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
