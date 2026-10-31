import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Box, Typography, List, ListItem, ListItemIcon, ListItemText, Avatar, IconButton, Badge, Divider, Chip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Gavel from '@mui/icons-material/Gavel';
import Description from '@mui/icons-material/Description';
import Receipt from '@mui/icons-material/Receipt';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Notifications from '@mui/icons-material/Notifications';
import Chat from '@mui/icons-material/Chat';
import Event from '@mui/icons-material/Event';
import Person from '@mui/icons-material/Person';
import Logout from '@mui/icons-material/Logout';
import Menu from '@mui/icons-material/Menu';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import api from '../../api/axios';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Dashboard', path: '/client-portal/dashboard', icon: <DashboardIcon /> },
  { label: 'My Cases', path: '/client-portal/cases', icon: <Gavel /> },
  { label: 'Hearings', path: '/client-portal/hearings', icon: <CalendarMonth /> },
  { label: 'Documents', path: '/client-portal/documents', icon: <Description /> },
  { label: 'Payments', path: '/client-portal/invoices', icon: <Receipt /> },
  { label: 'Notifications', path: '/client-portal/notifications', icon: <Notifications /> },
  { label: 'Messages', path: '/client-portal/messages', icon: <Chat /> },
  { label: 'Appointments', path: '/client-portal/appointments', icon: <Event /> },
  { label: 'Profile', path: '/client-portal/profile', icon: <Person /> },
];

export default function ClientPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [client, setClient] = useState(null);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadMsg, setUnreadMsg] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    const data = localStorage.getItem('clientData');
    if (!token) { navigate('/client-portal'); return; }
    if (data) {
      try { setClient(JSON.parse(data)); } catch {}
    }
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const [notifRes, msgRes] = await Promise.all([
        api.get('/client-portal/notifications/unread-count'),
        api.get('/client-portal/messages/conversations'),
      ]);
      setUnreadNotif(notifRes.data?.data?.count || 0);
      const convs = msgRes.data?.data || [];
      setUnreadMsg(convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0));
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientData');
    navigate('/client-portal');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0a0e1a' }}>
      {/* Sidebar */}
      <Box sx={{
        width: collapsed ? 72 : DRAWER_WIDTH, flexShrink: 0,
        bgcolor: '#111827', borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', transition: 'width 0.2s',
        position: 'fixed', height: '100vh', zIndex: 100,
      }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {!collapsed && <Typography variant="h6" fontWeight={700} sx={{ color: '#c9a96e' }}>CaseBench</Typography>}
          <IconButton onClick={() => setCollapsed(!collapsed)} size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            {collapsed ? <Menu /> : <ChevronLeft />}
          </IconButton>
        </Box>

        {!collapsed && (
          <Box sx={{ px: 2, mb: 2 }}>
            <Chip label="Client Portal" size="small" sx={{ bgcolor: '#c9a96e20', color: '#c9a96e', fontWeight: 600, fontSize: '0.7rem' }} />
          </Box>
        )}

        <List sx={{ flex: 1, px: 1 }}>
          {navItems.map(item => {
            const active = isActive(item.path);
            const badge = item.label === 'Notifications' ? unreadNotif : item.label === 'Messages' ? unreadMsg : 0;
            return (
              <ListItem key={item.path} onClick={() => navigate(item.path)}
                sx={{ borderRadius: 2, mb: 0.5, cursor: 'pointer', px: collapsed ? 1.5 : 2,
                  bgcolor: active ? '#c9a96e15' : 'transparent',
                  borderLeft: active ? '3px solid #c9a96e' : '3px solid transparent',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                }}>
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center', color: active ? '#c9a96e' : 'rgba(255,255,255,0.5)' }}>
                  <Badge badgeContent={badge} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}>
                    {item.icon}
                  </Badge>
                </ListItemIcon>
                {!collapsed && <ListItemText primary={item.label} sx={{ '& .MuiTypography-root': { fontWeight: active ? 600 : 400, color: active ? '#c9a96e' : 'rgba(255,255,255,0.7)', fontSize: '0.875rem' } }} />}
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mx: 1 }} />

        <List sx={{ px: 1, pb: 1 }}>
          <ListItem onClick={handleLogout} sx={{ borderRadius: 2, cursor: 'pointer', px: 2, '&:hover': { bgcolor: 'rgba(244,67,54,0.1)' } }}>
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center', color: '#f44336' }}><Logout /></ListItemIcon>
            {!collapsed && <ListItemText primary="Logout" sx={{ '& .MuiTypography-root': { color: '#f44336', fontSize: '0.875rem' } }} />}
          </ListItem>
        </List>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, ml: collapsed ? '72px' : `${DRAWER_WIDTH}px`, transition: 'margin 0.2s' }}>
        {/* Top Bar */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', bgcolor: '#11182780', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>Welcome,</Typography>
            <Typography variant="body2" fontWeight={600} sx={{ color: '#fff' }}>{client?.name || 'Client'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton onClick={() => navigate('/client-portal/notifications')} size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              <Badge badgeContent={unreadNotif} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem' } }}><Notifications sx={{ fontSize: 20 }} /></Badge>
            </IconButton>
            <Avatar sx={{ width: 34, height: 34, bgcolor: '#c9a96e', color: '#0a0e1a', fontWeight: 700, fontSize: '0.85rem' }}>
              {(client?.name || 'C').charAt(0).toUpperCase()}
            </Avatar>
          </Box>
        </Box>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
