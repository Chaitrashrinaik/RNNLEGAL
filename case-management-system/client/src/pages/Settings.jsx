import { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, Divider, Switch, FormControlLabel, Avatar, Tabs, Tab, CircularProgress } from '@mui/material';
import Grid from '../components/Grid';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import FirmIcon from '@mui/icons-material/Business';
import NotifIcon from '@mui/icons-material/Notifications';
import CameraIcon from '@mui/icons-material/CameraAlt';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const API_BASE = import.meta.env.VITE_API_URL || '';
import toast from 'react-hot-toast';

const avatarSrc = (avatar, version) => {
  if (!avatar) return '';
  return avatar.startsWith('http') ? `${avatar}?v=${version || ''}` : `${API_BASE}${avatar}?v=${version || ''}`;
};

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ py: 2 }}>{children}</Box> : null;
}

export default function Settings() {
  const { user, updateProfile, setUser } = useAuth();
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [avatarVersion, setAvatarVersion] = useState(Date.now());

  useEffect(() => {
    if (user?.avatar && user.avatar !== avatarUrl) {
      setAvatarUrl(user.avatar);
      setAvatarVersion(Date.now());
    }
  }, [user?.avatar]);

  const [profile, setProfile] = useState({
    name: user?.name || 'Adv. Priya Sharma',
    email: user?.email || 'sharma@lawfirm.com',
    phone: user?.phone || '+91 98765 11111',
  });

  const [firm, setFirm] = useState({
    firmName: user?.firmName || 'Sharma & Associates',
    address: '123 Legal Avenue, Fort, Mumbai 400001',
    gst: '27AABCU9603R1ZM',
    phone: '+91 22 2345 6789',
    email: 'info@sharmaassociates.com',
    website: 'www.sharmaassociates.com',
  });

  const [notifications, setNotifications] = useState({
    emailHearing: true,
    emailInvoice: true,
    emailDocument: true,
    pushHearing: true,
    pushInvoice: false,
    pushDocument: true,
    dailyDigest: true,
    weeklyReport: true,
  });

  const [password, setPassword] = useState({ current: '', newPass: '', confirm: '' });

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(profile);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
    setSaving(false);
  };

  const handleSaveFirm = async () => {
    setSaving(true);
    try {
      await api.put('/settings/firm', firm);
      toast.success('Firm settings updated');
    } catch {
      toast.error('Failed to update firm settings');
    }
    setSaving(false);
  };

  const handleSavePassword = async () => {
    if (password.newPass !== password.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword: password.current, newPassword: password.newPass });
      toast.success('Password changed');
      setPassword({ current: '', newPass: '', confirm: '' });
    } catch {
      toast.error('Failed to change password');
    }
    setSaving(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      toast.error('No file selected');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG, or WebP images are allowed');
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data: res } = await api.post('/auth/upload-avatar', formData, {
        headers: { 'Content-Type': undefined },
      });
      if (!res.success) {
        toast.error(res.message || 'Failed to upload avatar');
        return;
      }
      const avatarUrl = res.data?.avatar || res.avatar;
      const updatedUser = res.data?.user || res.user;
      if (avatarUrl) {
        setAvatarUrl(avatarUrl);
        setAvatarVersion(Date.now());
        setUser({ ...user, ...updatedUser, avatar: avatarUrl, updatedAt: new Date().toISOString() });
      }
      toast.success('Profile photo updated');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to upload avatar';
      console.error('Avatar upload error:', err);
      toast.error(msg);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Box className="page-container">
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Settings</Typography>

      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        sx={{
          mb: 3,
          borderBottom: '1px solid rgba(37, 51, 73, 0.5)',
          '& .MuiTab-root': { color: 'text.secondary' },
          '& .Mui-selected': { color: 'primary.main !important' },
        }}
      >
        <Tab icon={<PersonIcon />} iconPosition="start" label="Profile" />
        <Tab icon={<FirmIcon />} iconPosition="start" label="Firm" />
        <Tab icon={<NotifIcon />} iconPosition="start" label="Notifications" />
        <Tab label="Security" />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <Card>
          <CardContent>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={avatarSrc(avatarUrl, avatarVersion)}
                  sx={{
                    width: 80, height: 80,
                    bgcolor: 'primary.main', color: 'primary.contrastText',
                    fontSize: '1.5rem', fontWeight: 600,
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.85 },
                  }}
                  onClick={handleAvatarClick}
                >
                  {!avatarUrl && profile.name?.charAt(0)}
                </Avatar>
                <Box
                  onClick={handleAvatarClick}
                  sx={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 28, height: 28, borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', border: '2px solid #1a2332',
                    '&:hover': { backgroundColor: 'primary.dark' },
                  }}
                >
                  {uploadingAvatar ? (
                    <CircularProgress size={14} sx={{ color: '#fff' }} />
                  ) : (
                    <CameraIcon sx={{ fontSize: 14, color: '#fff' }} />
                  )}
                </Box>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{profile.name}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{profile.email}</Typography>
                <Button size="small" sx={{ mt: 0.5, color: 'primary.main' }} onClick={handleAvatarClick} disabled={uploadingAvatar}>
                  {uploadingAvatar ? 'Uploading...' : 'Change Avatar'}
                </Button>
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Full Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </Grid>
            </Grid>
            <Box sx={{ mt: 3 }}>
              <Button variant="contained" startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />} onClick={handleSaveProfile} disabled={saving}>
                Save Changes
              </Button>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Firm Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Firm Name" value={firm.firmName} onChange={(e) => setFirm({ ...firm, firmName: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="GST Number" value={firm.gst} onChange={(e) => setFirm({ ...firm, gst: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Address" value={firm.address} onChange={(e) => setFirm({ ...firm, address: e.target.value })} multiline rows={2} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Phone" value={firm.phone} onChange={(e) => setFirm({ ...firm, phone: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Email" value={firm.email} onChange={(e) => setFirm({ ...firm, email: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Website" value={firm.website} onChange={(e) => setFirm({ ...firm, website: e.target.value })} />
              </Grid>
            </Grid>
            <Box sx={{ mt: 3 }}>
              <Button variant="contained" startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />} onClick={handleSaveFirm} disabled={saving}>
                Save Firm Details
              </Button>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Email Notifications</Typography>
            {[
              { key: 'emailHearing', label: 'Hearing reminders' },
              { key: 'emailInvoice', label: 'Invoice updates' },
              { key: 'emailDocument', label: 'Document uploads' },
              { key: 'dailyDigest', label: 'Daily digest' },
              { key: 'weeklyReport', label: 'Weekly summary report' },
            ].map((item) => (
              <FormControlLabel
                key={item.key}
                control={
                  <Switch
                    checked={notifications[item.key]}
                    onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                  />
                }
                label={item.label}
                sx={{ display: 'block', mb: 1 }}
              />
            ))}
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Push Notifications</Typography>
            {[
              { key: 'pushHearing', label: 'Hearing alerts' },
              { key: 'pushInvoice', label: 'Invoice alerts' },
              { key: 'pushDocument', label: 'Document alerts' },
            ].map((item) => (
              <FormControlLabel
                key={item.key}
                control={
                  <Switch
                    checked={notifications[item.key]}
                    onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                  />
                }
                label={item.label}
                sx={{ display: 'block', mb: 1 }}
              />
            ))}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tab} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Change Password</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="password" label="Current Password" value={password.current} onChange={(e) => setPassword({ ...password, current: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="password" label="New Password" value={password.newPass} onChange={(e) => setPassword({ ...password, newPass: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth type="password" label="Confirm New Password" value={password.confirm} onChange={(e) => setPassword({ ...password, confirm: e.target.value })} />
              </Grid>
            </Grid>
            <Box sx={{ mt: 3 }}>
              <Button variant="contained" onClick={handleSavePassword} disabled={saving || !password.current || !password.newPass}>
                Update Password
              </Button>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
}
