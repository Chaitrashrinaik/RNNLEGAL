import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, List, ListItem, ListItemAvatar, ListItemText, Avatar, Chip, CircularProgress, Button, TextField, MenuItem } from '@mui/material';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { format, parseISO } from 'date-fns';
import api from '../../api/axios';

const STATUS_COLORS = { scheduled: '#2196f3', completed: '#4caf50', cancelled: '#f44336', adjourned: '#ff9800' };

export default function ClientPortalHearings() {
  const navigate = useNavigate();
  const [hearings, setHearings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchHearings(); }, [statusFilter]);

  const fetchHearings = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/client-portal/hearings', { params });
      setHearings(data.data || []);
    } catch { setHearings([]); } finally { setLoading(false); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#fff' }}>Hearings</Typography>
        <TextField select size="small" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="scheduled">Scheduled</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="adjourned">Adjourned</MenuItem>
        </TextField>
      </Box>

      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box> : hearings.length === 0 ? (
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}><CalendarMonth sx={{ fontSize: 48, color: 'rgba(255,255,255,0.15)', mb: 1 }} /><Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>No hearings found</Typography></CardContent>
        </Card>
      ) : (
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <List dense disablePadding>
            {hearings.map((h, i) => (
              <ListItem key={h.id || i} onClick={() => navigate(`/client-portal/cases/${h.caseId}`)}
                sx={{ px: 2.5, py: 2, cursor: 'pointer', borderBottom: i < hearings.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                <ListItemAvatar sx={{ minWidth: 48 }}>
                  <Avatar sx={{ bgcolor: (STATUS_COLORS[h.status] || '#9e9e9e') + '18', color: STATUS_COLORS[h.status] || '#9e9e9e', width: 40, height: 40 }}><CalendarMonth sx={{ fontSize: 18 }} /></Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight={500} sx={{ color: '#fff', fontSize: '0.875rem' }}>{h.caseTitle || h.caseNumber}</Typography>
                    <Chip size="small" label={h.status} sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: (STATUS_COLORS[h.status] || '#9e9e9e') + '20', color: STATUS_COLORS[h.status] || '#9e9e9e' }} />
                  </Box>}
                  secondary={<Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="caption" sx={{ color: '#ff9800', fontSize: '0.7rem', fontWeight: 500 }}>{h.hearingDate ? format(parseISO(h.hearingDate), 'MMM dd, yyyy hh:mm a') : 'Date TBD'}</Typography>
                    {h.caseCourtName && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{h.caseCourtName}</Typography>}
                    {h.judgeName && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Judge: {h.judgeName}</Typography>}
                    {h.courtHall && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Hall: {h.courtHall}</Typography>}
                    {h.outcome && <Typography variant="caption" sx={{ color: '#4caf50', fontSize: '0.7rem' }}>Outcome: {h.outcome}</Typography>}
                  </Box>} />
              </ListItem>
            ))}
          </List>
        </Card>
      )}
    </Box>
  );
}
