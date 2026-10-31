import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, List, ListItem, ListItemAvatar, ListItemText, Avatar,
  Button, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Chip, CircularProgress,
} from '@mui/material';
import Event from '@mui/icons-material/Event';
import Add from '@mui/icons-material/Add';
import VideoCall from '@mui/icons-material/VideoCall';
import Phone from '@mui/icons-material/Phone';
import MeetingRoom from '@mui/icons-material/MeetingRoom';
import Cancel from '@mui/icons-material/Cancel';
import { format, parseISO } from 'date-fns';
import api from '../../api/axios';

const STATUS_COLORS = { pending: '#ff9800', approved: '#4caf50', rejected: '#f44336', completed: '#2196f3', cancelled: '#9e9e9e' };
const MEETING_ICONS = { 'office-visit': <MeetingRoom />, 'video-call': <VideoCall />, 'phone-call': <Phone /> };

export default function ClientPortalAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ advocateId: '', meetingType: 'office-visit', requestedDate: '', requestedTime: '', reason: '' });
  const [advocates, setAdvocates] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchAppointments(); fetchAdvocates(); }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/client-portal/appointments', { params: { limit: 50 } });
      setAppointments(data.data || []);
    } catch { setAppointments([]); } finally { setLoading(false); }
  };

  const fetchAdvocates = async () => {
    try {
      const { data } = await api.get('/team');
      setAdvocates(data.members || data.data || data || []);
    } catch { setAdvocates([]); }
  };

  const handleSubmit = async () => {
    if (!form.advocateId || !form.requestedDate) return;
    setSubmitting(true);
    try {
      await api.post('/client-portal/appointments', form);
      setDialog(false);
      setForm({ advocateId: '', meetingType: 'office-visit', requestedDate: '', requestedTime: '', reason: '' });
      fetchAppointments();
    } catch {} finally { setSubmitting(false); }
  };

  const handleCancel = async (id) => {
    try {
      await api.put(`/client-portal/appointments/${id}/cancel`);
      fetchAppointments();
    } catch {}
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#fff' }}>Appointments</Typography>
        <Button startIcon={<Add />} onClick={() => setDialog(true)} sx={{ bgcolor: '#c9a96e', color: '#0a0e1a', fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: '#b8944f' } }}>Request Meeting</Button>
      </Box>

      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box> : appointments.length === 0 ? (
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}><Event sx={{ fontSize: 48, color: 'rgba(255,255,255,0.15)', mb: 1 }} /><Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>No appointments yet</Typography></CardContent>
        </Card>
      ) : (
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <List dense disablePadding>
            {appointments.map((a, i) => (
              <ListItem key={a.id || i} sx={{ px: 2.5, py: 2, borderBottom: i < appointments.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <ListItemAvatar sx={{ minWidth: 48 }}>
                  <Avatar sx={{ bgcolor: (STATUS_COLORS[a.status] || '#9e9e9e') + '18', color: STATUS_COLORS[a.status] || '#9e9e9e', width: 40, height: 40 }}>
                    {MEETING_ICONS[a.meetingType] || <Event />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight={500} sx={{ color: '#fff', fontSize: '0.875rem' }}>{a.advocateName || 'Advocate'}</Typography>
                    <Chip size="small" label={a.status} sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: (STATUS_COLORS[a.status] || '#9e9e9e') + '20', color: STATUS_COLORS[a.status] || '#9e9e9e' }} />
                  </Box>}
                  secondary={<Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#c9a96e', fontSize: '0.7rem' }}>{a.requestedDate ? format(parseISO(a.requestedDate), 'MMM dd, yyyy') : ''}{a.requestedTime ? ` at ${a.requestedTime}` : ''}</Typography>
                    <Chip size="small" label={a.meetingType.replace('-', ' ')} sx={{ height: 18, fontSize: '0.55rem', bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }} />
                    {a.reason && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{a.reason}</Typography>}
                    {a.status === 'pending' && <Button size="small" onClick={() => handleCancel(a.id)} startIcon={<Cancel sx={{ fontSize: '12px !important' }} />} sx={{ textTransform: 'none', fontSize: '0.7rem', color: '#f44336', ml: 'auto' }}>Cancel</Button>}
                  </Box>} />
              </ListItem>
            ))}
          </List>
        </Card>
      )}

      <Dialog open={dialog} onClose={() => setDialog(false)} PaperProps={{ sx: { bgcolor: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, minWidth: 400 } }}>
        <DialogTitle sx={{ color: '#fff', fontWeight: 600 }}>Request Appointment</DialogTitle>
        <DialogContent>
          <TextField select fullWidth label="Advocate" value={form.advocateId} onChange={e => setForm({ ...form, advocateId: e.target.value })}
            sx={{ mt: 1, mb: 2, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }}>
            {advocates.map(a => <MenuItem key={a.id || a._id} value={a.id || a._id}>{a.name}</MenuItem>)}
          </TextField>
          <TextField select fullWidth label="Meeting Type" value={form.meetingType} onChange={e => setForm({ ...form, meetingType: e.target.value })}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }}>
            <MenuItem value="office-visit">Office Visit</MenuItem>
            <MenuItem value="video-call">Video Call</MenuItem>
            <MenuItem value="phone-call">Phone Call</MenuItem>
          </TextField>
          <TextField fullWidth type="date" label="Preferred Date" value={form.requestedDate} onChange={e => setForm({ ...form, requestedDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }} />
          <TextField fullWidth type="time" label="Preferred Time" value={form.requestedTime} onChange={e => setForm({ ...form, requestedTime: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }} />
          <TextField fullWidth multiline rows={3} label="Reason" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(false)} sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !form.advocateId || !form.requestedDate}
            sx={{ bgcolor: '#c9a96e', color: '#0a0e1a', fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: '#b8944f' } }}>
            {submitting ? 'Sending...' : 'Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
