import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Typography,
  Divider,
  TextField,
  InputAdornment,
  useMediaQuery,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Gavel as CasesIcon,
  People as ClientsIcon,
  Description as DocumentsIcon,
  Receipt as InvoicesIcon,
  CalendarMonth as CalendarIcon,
  Group as TeamIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Scale as ScaleIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Assignment as AssignmentIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const avatarSrc = (avatar, updatedAt) => {
  if (!avatar) return '';
  return avatar.startsWith('http') ? `${avatar}?v=${updatedAt || ''}` : `${API_BASE}${avatar}?v=${updatedAt || ''}`;
};

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

const allNavItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/', roles: ['admin', 'advocate'], feature: 'dashboard' },
  { text: 'Cases', icon: <CasesIcon />, path: '/cases', roles: ['admin', 'advocate'], feature: 'cases' },
  { text: 'Clients', icon: <ClientsIcon />, path: '/clients', roles: ['admin', 'advocate'], feature: 'clients' },
  { text: 'Documents', icon: <DocumentsIcon />, path: '/documents', roles: ['admin', 'advocate'], feature: 'documents' },
  { text: 'Invoices', icon: <InvoicesIcon />, path: '/invoices', roles: ['admin', 'advocate'], feature: 'invoices' },
  { text: 'Calendar', icon: <CalendarIcon />, path: '/calendar', roles: ['admin', 'advocate'], feature: 'calendar' },
  { text: 'Hearings', icon: <CasesIcon />, path: '/hearings', roles: ['admin', 'advocate'], feature: 'cases' },
  { text: 'Tasks', icon: <AssignmentIcon />, path: '/tasks', roles: ['admin', 'advocate'], feature: 'cases' },
  { text: 'Search', icon: <SearchIcon />, path: '/search', roles: ['admin', 'advocate'], feature: 'dashboard' },
  { text: 'Team', icon: <TeamIcon />, path: '/team', roles: ['admin'], feature: 'team' },
  { text: 'Activity Log', icon: <HistoryIcon />, path: '/activity-log', roles: ['admin'], feature: 'team' },
  { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications', roles: ['admin', 'advocate'], feature: 'notifications' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings', roles: ['admin', 'advocate'], feature: 'settings' },
];

const roleLabels = { admin: 'Admin', advocate: 'Junior Advocate' };

export default function Layout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data } = await api.get('/notifications/unread-count');
        setUnreadCount(data.data?.count || data.count || 0);
      } catch { setUnreadCount(0); }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  const drawerWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const handleNavClick = (path) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    navigate('/login');
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'sidebar.bg',
        borderRight: '1px solid rgba(37, 51, 73, 0.5)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          px: collapsed ? 2 : 3,
          py: 2,
          minHeight: 64,
        }}
      >
        <Avatar
          src={avatarSrc(user?.avatar, user?.updatedAt)}
          sx={{
            width: 32,
            height: 32,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {!user?.avatar && (user?.name?.charAt(0) || <ScaleIcon sx={{ fontSize: 20 }} />)}
        </Avatar>
        {!collapsed && (
          <Box sx={{ ml: 1.5, overflow: 'hidden' }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: '#e8e8e8',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              CaseBench
            </Typography>
            <Typography variant="caption" sx={{ color: 'sidebar.text', whiteSpace: 'nowrap' }}>
              Legal Management
            </Typography>
          </Box>
        )}
        {!isMobile && (
          <IconButton
            onClick={handleDrawerToggle}
            sx={{
              ml: 'auto',
              color: 'sidebar.text',
              '&:hover': { color: 'primary.main' },
            }}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(37, 51, 73, 0.5)' }} />

      <List sx={{ flex: 1, px: 1.5, py: 1 }}>
        {allNavItems
          .filter((item) => {
            if (item.roles && !item.roles.includes(user?.role)) return false;
            if (item.feature && !hasPermission(item.feature, 'view')) return false;
            return true;
          })
          .map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip title={collapsed ? item.text : ''} placement="right">
                <ListItemButton
                  onClick={() => handleNavClick(item.path)}
                  sx={{
                    borderRadius: 2,
                    minHeight: 44,
                    px: collapsed ? 2 : 2.5,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    backgroundColor: isActive ? 'sidebar.active' : 'transparent',
                    color: isActive ? 'sidebar.activeText' : 'sidebar.text',
                    '&:hover': {
                      backgroundColor: isActive ? 'sidebar.active' : 'sidebar.hover',
                      color: isActive ? 'sidebar.activeText' : '#e8e8e8',
                    },
                    '& .MuiListItemIcon-root': {
                      color: isActive ? 'sidebar.activeText' : 'sidebar.text',
                      minWidth: collapsed ? 0 : 40,
                      justifyContent: 'center',
                    },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 600 : 400,
                      }}
                    />
                  )}
                  {isActive && !collapsed && (
                    <Box
                      sx={{
                        width: 3,
                        height: 20,
                        borderRadius: 2,
                        backgroundColor: 'primary.main',
                        ml: 'auto',
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(37, 51, 73, 0.5)' }} />
      <Box sx={{ p: 2, textAlign: collapsed ? 'center' : 'left' }}>
        {!collapsed ? (
          <Typography variant="caption" sx={{ color: 'sidebar.text', display: 'block' }}>
            v1.0.0
          </Typography>
        ) : (
          <Typography variant="caption" sx={{ color: 'sidebar.text' }}>
            v1.0
          </Typography>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: 'background.default' }}>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              border: 'none',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              border: 'none',
              transition: 'width 0.2s ease',
              overflowX: 'hidden',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AppBar
          position="static"
          elevation={0}
          sx={{
            backgroundColor: 'background.paper',
            borderBottom: '1px solid rgba(37, 51, 73, 0.5)',
            width: '100%',
          }}
        >
          <Toolbar sx={{ minHeight: '64px !important', px: { xs: 2, md: 3 } }}>
            <IconButton
              color="inherit"
              onClick={handleDrawerToggle}
              sx={{
                mr: 2,
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              <MenuIcon />
            </IconButton>

            <TextField
              size="small"
              placeholder="Search cases, clients, documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                maxWidth: 400,
                flex: 1,
                display: { xs: 'none', sm: 'flex' },
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(15, 21, 32, 0.5)',
                  borderRadius: 2,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ flex: 1 }} />

            <Tooltip title="Notifications">
              <IconButton
                onClick={() => navigate('/notifications')}
                sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
              >
                <Badge badgeContent={unreadCount} color="error" max={9}>
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Box sx={{ ml: 1 }}>
              <Box
                onClick={handleUserMenuOpen}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  '&:hover': { backgroundColor: 'rgba(201, 169, 110, 0.08)' },
                }}
              >
                <Avatar
                  src={avatarSrc(user?.avatar, user?.updatedAt)}
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  {user?.avatar ? '' : (user?.name?.charAt(0) || 'U')}
                </Avatar>
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', lineHeight: 1.2 }}>
                    {user?.name || 'User'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {roleLabels[user?.role] || user?.role || 'Admin'}
                  </Typography>
                </Box>
                <ArrowDownIcon sx={{ color: 'text.secondary', fontSize: 18, display: { xs: 'none', md: 'block' } }} />
              </Box>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleUserMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 180,
                    borderRadius: 2,
                    border: '1px solid rgba(37, 51, 73, 0.5)',
                  },
                }}
              >
                <MenuItem
                  onClick={() => {
                    handleUserMenuClose();
                    navigate('/settings');
                  }}
                >
                  <PersonIcon sx={{ mr: 1.5, fontSize: 20 }} />
                  Profile
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: 'background.default',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
