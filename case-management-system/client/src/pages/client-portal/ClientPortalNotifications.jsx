import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, List, ListItem, ListItemAvatar, ListItemText, Avatar, Button, Tabs, Tab, Divider, CircularProgress } from '@mui/material';
import NotifIcon from '@mui/icons-material/Notifications';
import Gavel from '@mui/icons-material/Gavel';
import Receipt from '@mui/icons-material/Receipt';
import Description from '@mui/icons-material/Description';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Event from '@mui/icons-material/Event';
import DoneAll from '@mui/icons-material/DoneAll';
import { formatDistanceToNow, parseISO } from 'date-fns';
import api from '../../api/axios';

const TYPE_ICONS = { hearing: <Gavel />, invoice: <Receipt />, document: <Description />, case: <CheckCircle />, appointment: <Event />, system: <NotifIcon /> };
const TYPE_COLORS = { hearing: '#2196f3', invoice: '#ff9800', document: '#9c27b0', case: '#4caf50', appointment: '#c9a96e', system: '#607d8b' };

export default function ClientPortalNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/client-portal/notifications', { params: { limit: 50 } });
      setNotifications(data.data || []);
    } catch { setNotifications([]); } finally { setLoading(false); }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markRead = async (id) => {
    try { await api.put(`/client-portal/notifications/${id}/read`); } catch {}
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: 1 } : n));
  };

  const markAllRead = async () => {
    try { await api.put('/client-portal/notifications/read-all'); } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, isRead: 1 })));
  };

  const filtered = tab === 0 ? notifications : notifications.filter(n => !n.isRead);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#fff' }}>Notifications</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}</Typography>
        </Box>
        {unreadCount > 0 && <Button startIcon={<DoneAll />} onClick={markAllRead} sx={{ color: '#c9a96e', textTransform: 'none', fontSize: '0.8rem' }}>Mark All Read</Button>}
      </Box>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', textTransform: 'none' }, '& .Mui-selected': { color: '#c9a96e !important' } }}>
        <Tab label={`All (${notifications.length})`} /><Tab label={`Unread (${unreadCount})`} />
      </Tabs>

      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box> : filtered.length === 0 ? (
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}><NotifIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.15)', mb: 1 }} /><Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>No notifications</Typography></CardContent>
        </Card>
      ) : (
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <List dense disablePadding>
            {filtered.map((n, i) => (
              <Box key={n.id || i}>
                <ListItem onClick={() => !n.isRead && markRead(n.id)}
                  sx={{ px: 2.5, py: 2, cursor: 'pointer', bgcolor: n.isRead ? 'transparent' : 'rgba(201,169,110,0.03)', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                  <ListItemAvatar sx={{ minWidth: 48 }}>
                    <Avatar sx={{ bgcolor: (TYPE_COLORS[n.type] || '#607d8b') + '18', color: TYPE_COLORS[n.type] || '#607d8b', width: 40, height: 40 }}>
                      {TYPE_ICONS[n.type] || <NotifIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={n.isRead ? 400 : 600} sx={{ color: '#fff', fontSize: '0.875rem' }}>{n.title}</Typography>
                      {!n.isRead && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#c9a96e', flexShrink: 0 }} />}
                    </Box>}
                    secondary={<Box><Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mt: 0.25, fontSize: '0.75rem' }}>{n.message}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>{n.createdAt ? formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true }) : ''}</Typography></Box>} />
                </ListItem>
                {i < filtered.length - 1 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', ml: 3 }} />}
              </Box>
            ))}
          </List>
        </Card>
      )}
    </Box>
  );
}
