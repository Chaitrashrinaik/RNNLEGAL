import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, List, ListItem, ListItemAvatar, ListItemText, Avatar,
  Button, IconButton, Tabs, Tab, Checkbox, Badge, Divider,
} from '@mui/material';
import NotifIcon from '@mui/icons-material/Notifications';
import Gavel from '@mui/icons-material/Gavel';
import Receipt from '@mui/icons-material/Receipt';
import PersonAdd from '@mui/icons-material/PersonAdd';
import Description from '@mui/icons-material/Description';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Schedule from '@mui/icons-material/Schedule';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { formatDistanceToNow } from 'date-fns';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';

const typeIcons = {
  hearing: { icon: <Gavel />, color: '#29b6f6', bg: 'rgba(41, 182, 246, 0.1)' },
  invoice: { icon: <Receipt />, color: '#ff9800', bg: 'rgba(255, 152, 0, 0.1)' },
  client: { icon: <PersonAdd />, color: '#4caf50', bg: 'rgba(76, 175, 80, 0.1)' },
  document: { icon: <Description />, color: '#c9a96e', bg: 'rgba(201, 169, 110, 0.1)' },
  case: { icon: <CheckCircle />, color: '#9c27b0', bg: 'rgba(156, 39, 176, 0.1)' },
  default: { icon: <NotifIcon />, color: '#9e9e9e', bg: 'rgba(158, 158, 158, 0.1)' },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || data.data || data || []);
    } catch {
      setNotifications([]);
    } finally { setLoading(false); }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markRead = async (id) => {
    try { await api.put(`/notifications/${id}/read`); } catch {}
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    try { await api.put('/notifications/read-all'); } catch {}
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const filteredNotifications = tab === 0 ? notifications : notifications.filter((n) => !n.read);

  return (
    <Box className="page-container">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Notifications</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </Typography>
        </Box>
        {unreadCount > 0 && (
          <Button startIcon={<DoneAllIcon />} onClick={markAllRead} sx={{ color: 'primary.main' }}>
            Mark All Read
          </Button>
        )}
      </Box>

      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        sx={{ mb: 2, '& .MuiTab-root': { color: 'text.secondary' }, '& .Mui-selected': { color: 'primary.main !important' } }}
      >
        <Tab label={`All (${notifications.length})`} />
        <Tab label={`Unread (${unreadCount})`} />
      </Tabs>

      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<NotifIcon sx={{ fontSize: 40 }} />}
          title="No notifications"
          description={tab === 0 ? "You're all caught up!" : "No unread notifications."}
        />
      ) : (
        <Card>
          <List disablePadding>
            {filteredNotifications.map((notif, index) => {
              const typeConfig = typeIcons[notif.type] || typeIcons.default;
              return (
                <Box key={notif._id}>
                  <ListItem
                    disablePadding
                    sx={{
                      py: 2,
                      px: 3,
                      backgroundColor: notif.isRead ? 'transparent' : 'rgba(201, 169, 110, 0.03)',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(201, 169, 110, 0.05)' },
                    }}
                    onClick={() => !notif.isRead && markRead(notif._id)}
                  >
                    <ListItemAvatar sx={{ minWidth: 48 }}>
                      <Avatar sx={{ width: 40, height: 40, bgcolor: typeConfig.bg, color: typeConfig.color }}>
                        {typeConfig.icon}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: notif.isRead ? 400 : 600, color: 'text.primary' }}>
                            {notif.title}
                          </Typography>
                          {!notif.isRead && (
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'primary.main', flexShrink: 0 }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                            {notif.message}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7 }}>
                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < filteredNotifications.length - 1 && (
                    <Divider sx={{ borderColor: 'rgba(37, 51, 73, 0.3)', ml: 3 }} />
                  )}
                </Box>
              );
            })}
          </List>
        </Card>
      )}
    </Box>
  );
}
