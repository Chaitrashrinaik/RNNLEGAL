import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField, MenuItem, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Avatar, CircularProgress, Alert, Tooltip, Stack, Tabs, Tab, Divider, Badge, List, ListItem, ListItemAvatar, ListItemText, Paper, LinearProgress } from '@mui/material';
import Grid from '../../components/Grid';
import Add from '@mui/icons-material/Add';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Search from '@mui/icons-material/Search';
import Assignment from '@mui/icons-material/Assignment';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import AccessTime from '@mui/icons-material/AccessTime';
import Warning from '@mui/icons-material/Warning';
import Refresh from '@mui/icons-material/Refresh';
import Close from '@mui/icons-material/Close';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Schedule from '@mui/icons-material/Schedule';
import Category from '@mui/icons-material/Category';
import ListAlt from '@mui/icons-material/ListAlt';
import Comment from '@mui/icons-material/Comment';
import History from '@mui/icons-material/History';
import AttachFile from '@mui/icons-material/AttachFile';
import Person from '@mui/icons-material/Person';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Flag from '@mui/icons-material/Flag';
import { format, parseISO, isPast, isToday, isFuture, startOfDay } from 'date-fns';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const PRIORITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'low', label: 'Low', color: '#4caf50', icon: '🟢' },
  { value: 'medium', label: 'Medium', color: '#ff9800', icon: '🟡' },
  { value: 'high', label: 'High', color: '#f44336', icon: '🟠' },
  { value: 'urgent', label: 'Urgent', color: '#b71c1c', icon: '🔴' },
];
const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'not started', label: 'Not Started' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];
const PRIORITY_COLORS = { low: '#4caf50', medium: '#ff9800', high: '#f44336', urgent: '#b71c1c' };
const STATUS_COLORS = { 'not started': '#9e9e9e', pending: '#9e9e9e', 'in-progress': '#2196f3', completed: '#4caf50', overdue: '#f44336', cancelled: '#9e9e9e' };
const STATUS_ICONS = { 'not started': <AccessTime sx={{ fontSize: 14 }} />, pending: <AccessTime sx={{ fontSize: 14 }} />, 'in-progress': <PlayArrow sx={{ fontSize: 14 }} />, completed: <CheckCircle sx={{ fontSize: 14 }} />, overdue: <Warning sx={{ fontSize: 14 }} />, cancelled: <Cancel sx={{ fontSize: 14 }} /> };

const CreateTaskDialog = ({ open, onClose, onSave, cases, team, taskCategories, defaultCaseId }) => {
  const [form, setForm] = useState({ title: '', description: '', caseId: '', assignedTo: '', priority: 'medium', dueDate: null, startDate: null, taskCategory: '', taskType: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setForm({ title: '', description: '', caseId: defaultCaseId || '', assignedTo: '', priority: 'medium', dueDate: null, startDate: null, taskCategory: '', taskType: '' });
  }, [open, defaultCaseId]);
  const handleSubmit = async () => {
    if (!form.title) return toast.error('Title is required');
    setSaving(true);
    try {
      await api.post('/tasks', {
        ...form,
        dueDate: form.dueDate?.toISOString(),
        startDate: form.startDate?.toISOString(),
        taskType: form.taskType || form.title,
      });
      toast.success('Task created');
      onSave();
    } catch { toast.error('Failed to create task'); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>Create Task<IconButton onClick={onClose} size="small"><Close /></IconButton></DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField fullWidth label="Task Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} size="small" required />
          <TextField fullWidth label="Description / Instructions" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} size="small" multiline rows={2} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Case" value={form.caseId} onChange={e => setForm({ ...form, caseId: e.target.value })} size="small">
                <MenuItem value="">None</MenuItem>
                {(cases || []).map(c => <MenuItem key={c.id || c._id} value={c.id || c._id}>{c.caseNumber} - {c.caseTitle}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Assign To" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} size="small">
                <MenuItem value="">Unassigned</MenuItem>
                {(team || []).map(m => <MenuItem key={m.id || m._id} value={m.id || m._id}>{m.name}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Priority" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} size="small">
                {PRIORITY_OPTIONS.filter(o => o.value).map(o => <MenuItem key={o.value} value={o.value}>{o.icon} {o.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Category" value={form.taskCategory} onChange={e => setForm({ ...form, taskCategory: e.target.value, taskType: '' })} size="small">
                <MenuItem value="">None</MenuItem>
                {Object.keys(taskCategories || {}).map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
          {form.taskCategory && taskCategories[form.taskCategory] && (
            <TextField select fullWidth label="Subcategory" value={form.taskType} onChange={e => setForm({ ...form, taskType: e.target.value })} size="small">
              <MenuItem value="">None</MenuItem>
              {taskCategories[form.taskCategory].map(sub => <MenuItem key={sub} value={sub}>{sub}</MenuItem>)}
            </TextField>
          )}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <DatePicker label="Start Date" value={form.startDate} onChange={(date) => setForm({ ...form, startDate: date })} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
            <DatePicker label="Due Date" value={form.dueDate} onChange={(date) => setForm({ ...form, dueDate: date })} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving || !form.title}>{saving ? <CircularProgress size={20} /> : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
};

const TaskDetailDialog = ({ open, onClose, task, onStatusChange, onComment }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [completionNote, setCompletionNote] = useState('');
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (open && task) {
      setLoading(true);
      api.get(`/tasks/${task.id || task._id}`).then(({ data }) => {
        setDetail(data.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [open, task]);

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/tasks/${task.id || task._id}/status`, { status: newStatus });
      toast.success(`Task marked as ${newStatus}`);
      onStatusChange();
      onClose();
    } catch { toast.error('Failed'); }
  };

  const handleComplete = async () => {
    try {
      await api.patch(`/tasks/${task.id || task._id}/status`, { status: 'completed' });
      toast.success('Task completed');
      setCompletionNote('');
      onStatusChange();
      onClose();
    } catch { toast.error('Failed'); }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    try {
      await api.post(`/tasks/${task.id || task._id}/comment`, { comment });
      setComment('');
      onComment();
      // Refresh detail
      const { data } = await api.get(`/tasks/${task.id || task._id}`);
      setDetail(data.data);
    } catch { toast.error('Failed'); }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>{detail?.title || task.title}</Typography>
          <Typography variant="caption" color="text.secondary">{detail?.caseNumber || ''} {detail?.taskCategory ? `• ${detail.taskCategory}` : ''}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} /> : detail && (
          <Box>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6} sm={3}>
                <Chip icon={STATUS_ICONS[detail.status]} label={detail.status} size="small" sx={{ bgcolor: (STATUS_COLORS[detail.status] || '#9e9e9e') + '20', color: STATUS_COLORS[detail.status] || '#9e9e9e', fontWeight: 600 }} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Chip label={detail.priority} size="small" sx={{ bgcolor: (PRIORITY_COLORS[detail.priority] || '#9e9e9e') + '20', color: PRIORITY_COLORS[detail.priority] || '#9e9e9e', fontWeight: 600, textTransform: 'capitalize' }} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Assigned To</Typography>
                <Typography variant="body2" fontWeight={500}>{detail.assigneeName || 'Unassigned'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Due Date</Typography>
                <Typography variant="body2" fontWeight={500} color={detail.dueDate && isPast(parseISO(detail.dueDate)) && !['completed', 'cancelled'].includes(detail.status) ? 'error.main' : 'text.primary'}>
                  {detail.dueDate ? format(parseISO(detail.dueDate), 'dd MMM yyyy') : '-'}
                </Typography>
              </Grid>
            </Grid>

            {detail.description && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Typography variant="body2">{detail.description}</Typography>
              </Box>
            )}

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab label={`History (${detail.history?.length || 0})`} icon={<History sx={{ fontSize: 16 }} />} iconPosition="start" />
              <Tab label={`Comments (${detail.comments?.length || 0})`} icon={<Comment sx={{ fontSize: 16 }} />} iconPosition="start" />
            </Tabs>

            {tab === 0 && (
              <List dense>
                {(detail.history || []).map((h) => (
                  <ListItem key={h.id} alignItems="flex-start" disablePadding sx={{ py: 1 }}>
                    <ListItemAvatar sx={{ minWidth: 36 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.light', fontSize: '0.7rem' }}>{h.changedByName?.charAt(0) || '?'}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={500}>{h.action?.replace(/_/g, ' ')}</Typography>}
                      secondary={<>
                        <Typography variant="caption" color="text.secondary">{h.changedByName} • {h.createdAt ? format(parseISO(h.createdAt), 'dd MMM hh:mm a') : ''}</Typography>
                        {h.previousValue && h.newValue && <Typography variant="caption" display="block">{h.previousValue} → {h.newValue}</Typography>}
                        {h.details && <Typography variant="caption" display="block" color="text.secondary">{h.details}</Typography>}
                      </>}
                    />
                  </ListItem>
                ))}
                {(!detail.history || detail.history.length === 0) && <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No history yet.</Typography>}
              </List>
            )}

            {tab === 1 && (
              <Box>
                <List dense>
                  {(detail.comments || []).map((c) => (
                    <ListItem key={c.id} alignItems="flex-start" disablePadding sx={{ py: 1 }}>
                      <ListItemAvatar sx={{ minWidth: 36 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: 'secondary.light', fontSize: '0.7rem' }}>{c.userName?.charAt(0) || '?'}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography variant="body2">{c.comment}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary">{c.userName} • {c.createdAt ? format(parseISO(c.createdAt), 'dd MMM hh:mm a') : ''}</Typography>}
                      />
                    </ListItem>
                  ))}
                  {(!detail.comments || detail.comments.length === 0) && <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>No comments yet.</Typography>}
                </List>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <TextField fullWidth size="small" placeholder="Add a comment..." value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddComment()} />
                  <Button variant="contained" size="small" onClick={handleAddComment} disabled={!comment.trim()}>Send</Button>
                </Box>
              </Box>
            )}

            {detail.status !== 'completed' && detail.status !== 'cancelled' && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(33,150,243,0.05)', borderRadius: 1, border: '1px solid rgba(33,150,243,0.2)' }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Update Status</Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  {detail.status === 'not started' || detail.status === 'pending' ? (
                    <Button variant="outlined" size="small" startIcon={<PlayArrow />} onClick={() => handleStatusChange('in-progress')} sx={{ borderColor: '#2196f3', color: '#2196f3' }}>Start Task</Button>
                  ) : null}
                  {detail.status !== 'in-progress' && detail.status !== 'completed' && (
                    <Button variant="outlined" size="small" startIcon={<PlayArrow />} onClick={() => handleStatusChange('in-progress')} sx={{ borderColor: '#ff9800', color: '#ff9800' }}>Mark In Progress</Button>
                  )}
                  <Button variant="contained" size="small" color="success" startIcon={<CheckCircle />} onClick={handleComplete}>Mark Completed</Button>
                </Stack>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

const TemplateApplyDialog = ({ open, onClose, templates, cases, team, onApply }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [caseId, setCaseId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [baseDate, setBaseDate] = useState(null);
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    if (!selectedTemplate || !caseId) return toast.error('Select template and case');
    setApplying(true);
    try {
      const { data } = await api.post(`/tasks/templates/${selectedTemplate}/apply`, {
        caseId, assignedTo, baseDate: baseDate?.toISOString(),
      });
      toast.success(`${data.data.count} tasks created from template`);
      onApply();
      onClose();
    } catch { toast.error('Failed'); } finally { setApplying(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={600}>Apply Task Template</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField select fullWidth label="Template" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} size="small">
            <MenuItem value="">Select Template</MenuItem>
            {(templates || []).map(t => <MenuItem key={t.id} value={t.id}>{t.name} ({t.items?.length || 0} tasks)</MenuItem>)}
          </TextField>
          <TextField select fullWidth label="Case" value={caseId} onChange={e => setCaseId(e.target.value)} size="small">
            <MenuItem value="">Select Case</MenuItem>
            {(cases || []).map(c => <MenuItem key={c.id || c._id} value={c.id || c._id}>{c.caseNumber} - {c.caseTitle}</MenuItem>)}
          </TextField>
          <TextField select fullWidth label="Assign To" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} size="small">
            <MenuItem value="">Unassigned</MenuItem>
            {(team || []).map(m => <MenuItem key={m.id || m._id} value={m.id || m._id}>{m.name}</MenuItem>)}
          </TextField>
          <DatePicker label="Base Date" value={baseDate} onChange={setBaseDate} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleApply} disabled={applying || !selectedTemplate || !caseId}>{applying ? <CircularProgress size={20} /> : 'Apply Template'}</Button>
      </DialogActions>
    </Dialog>
  );
};

const ReassignDialog = ({ open, onClose, task, team, onReassign }) => {
  const [assignedTo, setAssignedTo] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (task) setAssignedTo(task.assignedTo || ''); }, [task]);
  const handleReassign = async () => {
    if (!assignedTo) return toast.error('Select an employee');
    setSaving(true);
    try {
      await api.patch(`/tasks/${task.id || task._id}/reassign`, { assignedTo });
      toast.success('Task reassigned');
      onReassign();
      onClose();
    } catch { toast.error('Failed to reassign'); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>Reassign Task<IconButton onClick={onClose} size="small"><Close /></IconButton></DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">Current task: <strong>{task?.title}</strong></Typography>
          <TextField select fullWidth label="Assign To" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} size="small">
            {(team || []).map(m => <MenuItem key={m.id || m._id} value={m.id || m._id}>{m.name}</MenuItem>)}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleReassign} disabled={saving || !assignedTo}>{saving ? <CircularProgress size={20} /> : 'Reassign'}</Button>
      </DialogActions>
    </Dialog>
  );
};

function JuniorTaskView({ team, cases, taskCategories }) {
  const [grouped, setGrouped] = useState({ today: [], upcoming: [], overdue: [], inProgress: [], completed: [], notStarted: [] });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailTask, setDetailTask] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filterTab, setFilterTab] = useState(0);

  const fetchMyTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [groupRes, statsRes] = await Promise.all([api.get('/tasks/my'), api.get('/tasks/stats')]);
      setGrouped(groupRes.data.data || {});
      setStats(statsRes.data.data || null);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMyTasks(); }, [fetchMyTasks]);

  const allTasks = [...(grouped.overdue || []), ...(grouped.today || []), ...(grouped.inProgress || []), ...(grouped.upcoming || []), ...(grouped.notStarted || []), ...(grouped.completed || [])];
  const tabSections = [
    { label: 'Today', tasks: grouped.today || [], color: '#2196f3' },
    { label: 'In Progress', tasks: grouped.inProgress || [], color: '#ff9800' },
    { label: 'Upcoming', tasks: grouped.upcoming || [], color: '#4caf50' },
    { label: 'Overdue', tasks: grouped.overdue || [], color: '#f44336' },
    { label: 'Completed', tasks: grouped.completed || [], color: '#9e9e9e' },
    { label: 'Not Started', tasks: grouped.notStarted || [], color: '#9e9e9e' },
  ];

  const currentTasks = tabSections[filterTab]?.tasks || [];

  return (
    <Box>
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={4} sm={2}><Card sx={{ textAlign: 'center', py: 1.5, bgcolor: 'rgba(33,150,243,0.08)' }}><Typography variant="h5" fontWeight={700} color="info.main">{stats.today}</Typography><Typography variant="caption" color="text.secondary">Today</Typography></Card></Grid>
          <Grid item xs={4} sm={2}><Card sx={{ textAlign: 'center', py: 1.5, bgcolor: 'rgba(255,152,0,0.08)' }}><Typography variant="h5" fontWeight={700} color="warning.main">{stats.inProgress}</Typography><Typography variant="caption" color="text.secondary">In Progress</Typography></Card></Grid>
          <Grid item xs={4} sm={2}><Card sx={{ textAlign: 'center', py: 1.5, bgcolor: 'rgba(76,175,80,0.08)' }}><Typography variant="h5" fontWeight={700} color="success.main">{stats.upcoming}</Typography><Typography variant="caption" color="text.secondary">Upcoming</Typography></Card></Grid>
          <Grid item xs={4} sm={2}><Card sx={{ textAlign: 'center', py: 1.5, bgcolor: 'rgba(244,67,54,0.08)' }}><Typography variant="h5" fontWeight={700} color="error.main">{stats.overdue}</Typography><Typography variant="caption" color="text.secondary">Overdue</Typography></Card></Grid>
          <Grid item xs={4} sm={2}><Card sx={{ textAlign: 'center', py: 1.5, bgcolor: 'rgba(158,158,158,0.08)' }}><Typography variant="h5" fontWeight={700} color="text.secondary">{stats.completed}</Typography><Typography variant="caption" color="text.secondary">Completed</Typography></Card></Grid>
          <Grid item xs={4} sm={2}><Card sx={{ textAlign: 'center', py: 1.5 }}><Typography variant="h5" fontWeight={700}>{stats.total}</Typography><Typography variant="caption" color="text.secondary">Total</Typography></Card></Grid>
        </Grid>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={filterTab} onChange={(_, v) => setFilterTab(v)} variant="scrollable" scrollButtons="auto">
          {tabSections.map((s, i) => (
            <Tab key={i} label={<Badge badgeContent={s.tasks.length} color={s.tasks.length > 0 ? (s.label === 'Overdue' ? 'error' : 'primary') : 'default'} maxCount={99}><Typography variant="body2" sx={{ mr: 2 }}>{s.label}</Typography></Badge>} />
          ))}
        </Tabs>
      </Box>

      {loading ? <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} /> : currentTasks.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">No tasks in this category.</Typography></Paper>
      ) : (
        <Stack spacing={1.5}>
          {currentTasks.map((t) => {
            const isOverdue = t.dueDate && isPast(parseISO(t.dueDate)) && !['completed', 'cancelled'].includes(t.status);
            return (
              <Card key={t.id || t._id} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(var(--app-accent-rgb),0.05)' }, borderLeft: `4px solid ${PRIORITY_COLORS[t.priority] || '#ccc'}` }}
                onClick={() => { setDetailTask(t); setDetailOpen(true); }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                      <Chip icon={STATUS_ICONS[t.status]} label={t.status} size="small" sx={{ bgcolor: (STATUS_COLORS[t.status] || '#9e9e9e') + '20', color: STATUS_COLORS[t.status] || '#9e9e9e', fontWeight: 600, minWidth: 110 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{t.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.caseNumber || ''} {t.taskCategory ? `• ${t.taskCategory}` : ''}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {t.relatedHearingDate && (
                        <Chip icon={<CalendarMonth sx={{ fontSize: 14 }} />} label={format(parseISO(t.relatedHearingDate), 'dd MMM')} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      )}
                      <Typography variant="caption" color={isOverdue ? 'error.main' : 'text.secondary'}>
                        {t.dueDate ? format(parseISO(t.dueDate), 'dd MMM') : ''}
                      </Typography>
                      <Chip label={t.priority} size="small" sx={{ bgcolor: (PRIORITY_COLORS[t.priority] || '#ccc') + '20', color: PRIORITY_COLORS[t.priority] || '#999', fontWeight: 600, textTransform: 'capitalize' }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      <TaskDetailDialog open={detailOpen} onClose={() => setDetailOpen(false)} task={detailTask} onStatusChange={fetchMyTasks} onComment={() => {}} />
    </Box>
  );
}

function AdminTaskView({ cases, team, taskCategories, templates }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [reassignTask, setReassignTask] = useState(null);
  const [reassignOpen, setReassignOpen] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (categoryFilter) params.category = categoryFilter;
      const { data: res } = await api.get('/tasks', { params });
      let items = res.data || [];
      if (search) { const q = search.toLowerCase(); items = items.filter(t => (t.title || '').toLowerCase().includes(q) || (t.caseNumber || '').toLowerCase().includes(q) || (t.assigneeName || '').toLowerCase().includes(q)); }
      setTasks(items);
      setTotal(res.pagination?.total || items.length);
    } catch {} finally { setLoading(false); }
  }, [page, rowsPerPage, statusFilter, priorityFilter, categoryFilter, search]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try { await api.delete(`/tasks/${id}`); toast.success('Deleted'); fetchTasks(); } catch { toast.error('Failed'); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>Create Task</Button>
        <Button variant="outlined" startIcon={<ListAlt />} onClick={() => setTemplateOpen(true)}>Apply Template</Button>
      </Box>

      <Card sx={{ mb: 2 }}><CardContent>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }} /></Grid>
          <Grid item xs={6} sm={2}><TextField select fullWidth size="small" label="Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>{STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}</TextField></Grid>
          <Grid item xs={6} sm={2}><TextField select fullWidth size="small" label="Priority" value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(0); }}>{PRIORITY_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}</TextField></Grid>
          <Grid item xs={6} sm={2}><TextField select fullWidth size="small" label="Category" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}><MenuItem value="">All</MenuItem>{Object.keys(taskCategories || {}).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField></Grid>
          <Grid item xs={6} sm={3}><Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={fetchTasks}>Refresh</Button></Grid>
        </Grid>
      </CardContent></Card>

      <Card>
        <TableContainer><Table size="small">
          <TableHead><TableRow>
            <TableCell>Task</TableCell><TableCell>Case</TableCell><TableCell>Assigned To</TableCell><TableCell>Priority</TableCell><TableCell>Due Date</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} align="center"><CircularProgress sx={{ my: 3 }} /></TableCell></TableRow>
            : tasks.length === 0 ? <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>No tasks found.</Typography></TableCell></TableRow>
            : tasks.map(t => {
              const isOverdue = t.dueDate && isPast(parseISO(t.dueDate)) && !['completed', 'cancelled'].includes(t.status);
              return (
                <TableRow key={t.id || t._id} hover sx={{ cursor: 'pointer' }} onClick={() => { setDetailTask(t); setDetailOpen(true); }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: (PRIORITY_COLORS[t.priority] || '#ccc') + '20', color: PRIORITY_COLORS[t.priority] || '#999', width: 32, height: 32 }}><Assignment sx={{ fontSize: 16 }} /></Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{t.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.taskCategory || t.taskType || ''}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2">{t.caseNumber || '-'}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{t.assigneeName || 'Unassigned'}</Typography></TableCell>
                  <TableCell><Chip label={t.priority} size="small" sx={{ bgcolor: (PRIORITY_COLORS[t.priority] || '#ccc') + '20', color: PRIORITY_COLORS[t.priority] || '#999', fontWeight: 600, textTransform: 'capitalize' }} /></TableCell>
                  <TableCell><Typography variant="body2" color={isOverdue ? 'error.main' : 'text.primary'}>{t.dueDate ? format(parseISO(t.dueDate), 'dd MMM yyyy') : '-'}</Typography></TableCell>
                  <TableCell><Chip icon={STATUS_ICONS[t.status]} label={t.status} size="small" sx={{ bgcolor: (STATUS_COLORS[t.status] || '#9e9e9e') + '20', color: STATUS_COLORS[t.status] || '#9e9e9e', fontWeight: 600 }} /></TableCell>
                  <TableCell align="right" onClick={e => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Reassign"><IconButton size="small" onClick={() => { setReassignTask(t); setReassignOpen(true); }}><Person /></IconButton></Tooltip>
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditTask(t); setCreateOpen(true); }}><Edit /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(t.id || t._id)}><Delete /></IconButton></Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table></TableContainer>
      </Card>

      <CreateTaskDialog open={createOpen} onClose={() => { setCreateOpen(false); setEditTask(null); }} onSave={() => { setCreateOpen(false); setEditTask(null); fetchTasks(); }} cases={cases} team={team} taskCategories={taskCategories} />
      <TemplateApplyDialog open={templateOpen} onClose={() => setTemplateOpen(false)} templates={templates} cases={cases} team={team} onApply={fetchTasks} />
      <TaskDetailDialog open={detailOpen} onClose={() => setDetailOpen(false)} task={detailTask} onStatusChange={fetchTasks} onComment={() => {}} />
      <ReassignDialog open={reassignOpen} onClose={() => { setReassignOpen(false); setReassignTask(null); }} task={reassignTask} team={team} onReassign={fetchTasks} />
    </Box>
  );
}

export default function TasksList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const [cases, setCases] = useState([]);
  const [team, setTeam] = useState([]);
  const [taskCategories, setTaskCategories] = useState({});
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [casesRes, teamRes, catRes, tplRes] = await Promise.allSettled([
          api.get('/cases', { params: { limit: 100 } }),
          api.get('/team'),
          api.get('/tasks/categories'),
          api.get('/tasks/templates'),
        ]);
        if (casesRes.status === 'fulfilled') setCases((casesRes.value.data.data || casesRes.value.data.cases || []).map(c => ({ ...c, _id: c.id || c._id })));
        if (teamRes.status === 'fulfilled') setTeam(teamRes.value.data.data || []);
        if (catRes.status === 'fulfilled') setTaskCategories(catRes.value.data.data || {});
        if (tplRes.status === 'fulfilled') setTemplates(tplRes.value.data.data || []);
      } catch (err) { console.error('Failed to fetch task metadata:', err); }
    };
    fetchMeta();
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={700}>{isAdmin ? 'Task Management' : 'My Tasks'}</Typography>
          <Typography variant="body2" color="text.secondary">{isAdmin ? 'Create, assign, and monitor tasks across all cases' : 'View and complete your assigned tasks'}</Typography>
        </Box>

        {isAdmin ? (
          <AdminTaskView cases={cases} team={team} taskCategories={taskCategories} templates={templates} />
        ) : (
          <JuniorTaskView team={team} cases={cases} taskCategories={taskCategories} />
        )}
      </Box>
    </LocalizationProvider>
  );
}
