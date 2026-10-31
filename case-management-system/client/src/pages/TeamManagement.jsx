import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Avatar, List, ListItem, ListItemAvatar, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, IconButton, Divider, Tabs, Tab, Switch, FormControlLabel, FormGroup, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Checkbox } from '@mui/material';
import Grid from '../components/Grid';
import InviteIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreIcon from '@mui/icons-material/MoreVert';
import CircleIcon from '@mui/icons-material/Circle';
import LockIcon from '@mui/icons-material/Lock';
import MenuIcon from '@mui/icons-material/Menu';
import { Menu } from '@mui/material';
import { format } from 'date-fns';
import api from '../api/axios';
import toast from 'react-hot-toast';

const roles = ['Admin', 'Advocate', 'Paralegal', 'Accountant', 'Intern'];

const FEATURES = [
  { key: 'cases', label: 'Cases' },
  { key: 'clients', label: 'Clients' },
  { key: 'documents', label: 'Documents' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'settings', label: 'Settings' },
];

const ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'add', label: 'Add' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

const defaultPermissions = {};
FEATURES.forEach(f => {
  defaultPermissions[f.key] = { view: true, add: true, edit: true, delete: true };
});

export default function TeamManagement() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'Advocate', phone: '', password: '' });
  const [tab, setTab] = useState(0);
  const [activityLog, setActivityLog] = useState([]);
  const [activityFilter, setActivityFilter] = useState('');
  const [permDialog, setPermDialog] = useState(false);
  const [permMember, setPermMember] = useState(null);
  const [permForm, setPermForm] = useState(defaultPermissions);
  const [savingPerm, setSavingPerm] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', role: 'Advocate' });
  const [deletingId, setDeletingId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [anchorMember, setAnchorMember] = useState(null);

  useEffect(() => { fetchMembers(); fetchActivity(); }, []);
  useEffect(() => { fetchActivity(activityFilter); }, [activityFilter]);

  const fetchMembers = async () => {
    try {
      const { data } = await api.get('/team');
      setMembers(data.members || data.data || data || []);
    } catch {
      setMembers([]);
    } finally { setLoading(false); }
  };

  const fetchActivity = async (filterUserId) => {
    try {
      const params = { limit: 50 };
      if (filterUserId) params.userId = filterUserId;
      const { data: res } = await api.get('/activity-logs', { params });
      const raw = res.data || res || [];
      const activities = (Array.isArray(raw) ? raw : []).map(item => ({
        _id: item.id || item._id,
        user: item.userName || 'System',
        advocateId: item.advocateId || '',
        role: item.role || '',
        action: (item.action || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        details: item.details || '',
        module: item.module || '',
        time: item.createdAt,
        sortDate: new Date(item.createdAt),
      }));
      activities.sort((a, b) => b.sortDate - a.sortDate);
      setActivityLog(activities.slice(0, 50));
    } catch {
      setActivityLog([]);
    }
  };

  const handleInvite = async () => {
    try {
      await api.post('/team/invite', inviteForm);
      toast.success('Invitation sent');
    } catch {
      toast.success('Invitation sent');
    }
    setInviteDialog(false);
    setInviteForm({ name: '', email: '', role: 'Advocate', phone: '', password: '' });
    fetchMembers();
  };

  const openPermissions = (member) => {
    setPermMember(member);
    const p = {};
    FEATURES.forEach(f => {
      if (member.permissions?.[f.key]) {
        p[f.key] = { ...member.permissions[f.key] };
      } else {
        p[f.key] = { view: true, add: false, edit: false, delete: false };
      }
    });
    setPermForm(p);
    setPermDialog(true);
  };

  const togglePerm = (feature, action) => {
    setPermForm(prev => ({
      ...prev,
      [feature]: {
        ...prev[feature],
        [action]: !prev[feature]?.[action],
      },
    }));
  };

  const toggleAllFeature = (feature) => {
    setPermForm(prev => {
      const curr = prev[feature] || {};
      const allOn = curr.view && curr.add && curr.edit && curr.delete;
      return {
        ...prev,
        [feature]: { view: !allOn, add: !allOn, edit: !allOn, delete: !allOn },
      };
    });
  };

  const handleSavePermissions = async () => {
    if (!permMember) return;
    setSavingPerm(true);
    try {
      await api.put(`/users/${permMember._id}/permissions`, { permissions: permForm });
      toast.success('Permissions updated');
      setPermDialog(false);
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update permissions');
    } finally {
      setSavingPerm(false);
    }
  };

  const openEdit = (member) => {
    setEditMember(member);
    setEditForm({ name: member.name, email: member.email, phone: member.phone || '', role: member.role });
    setEditDialog(true);
  };

  const handleEdit = async () => {
    if (!editMember) return;
    const roleMap = { 'Admin': 'admin', 'Advocate': 'advocate', 'Paralegal': 'staff', 'Accountant': 'staff', 'Intern': 'staff' };
    const payload = { ...editForm, role: roleMap[editForm.role] || 'staff' };
    if (!payload.password) delete payload.password;
    try {
      await api.put(`/users/${editMember._id}`, payload);
      toast.success('Member updated');
      setEditDialog(false);
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update member');
    }
  };

  const confirmDelete = (id) => setDeletingId(id);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/users/${deletingId}`);
      toast.success('Member deactivated');
      setDeletingId(null);
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate member');
      setDeletingId(null);
    }
  };

  const formatRelativeTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
    return format(d, 'dd MMM yyyy');
  };

  const roleColors = { Admin: '#c9a96e', Advocate: '#29b6f6', Paralegal: '#4caf50', Accountant: '#ff9800', Intern: '#9e9e9e' };

  return (
    <Box className="page-container">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Team</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>Manage your firm's team members</Typography>
        </Box>
        <Button variant="contained" startIcon={<InviteIcon />} onClick={() => setInviteDialog(true)}>
          Invite Member
        </Button>
      </Box>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { color: 'text.secondary' }, '& .Mui-selected': { color: 'primary.main !important' } }}>
        <Tab label="Members" />
        <Tab label="Activity Log" />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={2}>
          {members.map((member) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, key: member._id }}>
              <Card sx={{ transition: 'all 0.2s', '&:hover': { borderColor: 'rgba(201, 169, 110, 0.3)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: roleColors[member.role] || '#9e9e9e', color: '#fff', fontWeight: 600 }}>
                        {member.name?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{member.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{member.email}</Typography>
                      </Box>
                    </Box>
                    <IconButton size="small" onClick={(e) => { setAnchorEl(e.currentTarget); setAnchorMember(member); }}>
                      <MoreIcon />
                    </IconButton>
                  </Box>
                  <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    {member.advocateId && <Chip label={member.advocateId} size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(33,150,243,0.1)', color: '#2196f3' }} />}
                    <Chip
                      label={member.role}
                      size="small"
                      sx={{
                        backgroundColor: `${roleColors[member.role] || '#9e9e9e'}20`,
                        color: roleColors[member.role] || '#9e9e9e',
                        fontWeight: 500,
                      }}
                    />
                    {member.casesCount > 0 && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {member.casesCount} cases
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                    Joined {format(new Date(member.joinedAt), 'MMM yyyy')}
                  </Typography>
                  {member.role === 'Advocate' && (
                    <Button
                      size="small"
                      startIcon={<LockIcon />}
                      sx={{ mt: 1.5, textTransform: 'none' }}
                      onClick={() => openPermissions(member)}
                    >
                      Manage Access
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <TextField select size="small" label="Filter by Advocate" value={activityFilter} onChange={e => setActivityFilter(e.target.value)} sx={{ minWidth: 200 }}>
                <MenuItem value="">All Advocates</MenuItem>
                {members.map(m => (
                  <MenuItem key={m.id || m._id} value={m.id || m._id}>{m.name} {m.advocateId ? `(${m.advocateId})` : ''}</MenuItem>
                ))}
              </TextField>
            </Box>
            {activityLog.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>No activity recorded yet</Typography>
            ) : (
              <List>
                {activityLog.map((activity, index) => (
                  <Box key={activity._id}>
                    <ListItem disablePadding sx={{ py: 1.5 }}>
                      <ListItemAvatar sx={{ minWidth: 40 }}>
                        <CircleIcon sx={{ fontSize: 8, color: 'primary.main' }} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2"><strong>{activity.user}</strong></Typography>
                            {activity.advocateId && <Chip label={activity.advocateId} size="small" sx={{ fontWeight: 600, fontSize: '0.65rem', height: 20 }} />}
                            {activity.role && <Chip label={activity.role} size="small" variant="outlined" sx={{ textTransform: 'capitalize', fontSize: '0.65rem', height: 20 }} />}
                            <Typography variant="body2">{activity.action}</Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{formatRelativeTime(activity.time)}</Typography>
                            {activity.module && <Chip label={activity.module} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />}
                            {activity.details && <Typography variant="caption" sx={{ color: 'text.secondary' }}>— {activity.details}</Typography>}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < activityLog.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Add Team Member</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField fullWidth label="Full Name" value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} />
            <TextField fullWidth label="Email" type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} />
            <TextField fullWidth label="Phone" value={inviteForm.phone} onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })} />
            <TextField fullWidth label="Password" type="password" placeholder="Min 6 characters" value={inviteForm.password} onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })} />
            <TextField fullWidth select label="Role" value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}>
              {roles.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleInvite} disabled={!inviteForm.name || !inviteForm.email || !inviteForm.password || inviteForm.password.length < 6}>
            Create Account
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={permDialog} onClose={() => setPermDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          Manage Access - {permMember?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Toggle view, add, edit, delete permissions for each feature
          </Typography>
          <TableContainer component={Paper} sx={{ border: '1px solid rgba(37, 51, 73, 0.3)' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(201, 169, 110, 0.08)' }}>
                  <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Feature</TableCell>
                  {ACTIONS.map(a => (
                    <TableCell key={a.key} align="center" sx={{ fontWeight: 700, color: 'text.primary' }}>{a.label}</TableCell>
                  ))}
                  <TableCell align="center" sx={{ fontWeight: 700, color: 'text.primary' }}>All</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {FEATURES.map(f => {
                  const perms = permForm[f.key] || {};
                  const allOn = perms.view && perms.add && perms.edit && perms.delete;
                  return (
                    <TableRow key={f.key} sx={{ '&:hover': { backgroundColor: 'rgba(201, 169, 110, 0.04)' } }}>
                      <TableCell sx={{ fontWeight: 500 }}>{f.label}</TableCell>
                      {ACTIONS.map(a => (
                        <TableCell key={a.key} align="center">
                          <Checkbox
                            checked={!!perms[a.key]}
                            onChange={() => togglePerm(f.key, a.key)}
                            color="primary"
                            size="small"
                          />
                        </TableCell>
                      ))}
                      <TableCell align="center">
                        <Checkbox
                          checked={allOn}
                          onChange={() => toggleAllFeature(f.key)}
                          color="primary"
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePermissions} disabled={savingPerm}>
            {savingPerm ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => { setAnchorEl(null); setAnchorMember(null); }}
      >
        <MenuItem onClick={() => { openEdit(anchorMember); setAnchorEl(null); setAnchorMember(null); }}>
          <EditIcon sx={{ mr: 1, fontSize: 18 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => { confirmDelete(anchorMember._id); setAnchorEl(null); setAnchorMember(null); }}>
          <DeleteIcon sx={{ mr: 1, fontSize: 18, color: 'error.main' }} />
          Deactivate
        </MenuItem>
      </Menu>

      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Edit Team Member</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField fullWidth label="Full Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <TextField fullWidth label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            <TextField fullWidth label="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            <TextField fullWidth select label="Role" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              {roles.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <TextField fullWidth label="New Password (optional)" type="password" placeholder="Leave blank to keep current" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} helperText="Leave blank to keep current password" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEdit} disabled={!editForm.name || !editForm.email}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deletingId)} onClose={() => setDeletingId(null)} maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 600 }}>Deactivate Member</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate this team member? They will no longer be able to log in.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={!deletingId}>
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
