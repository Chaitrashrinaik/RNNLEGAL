import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, TextField, MenuItem, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, TablePagination, Avatar, CircularProgress, Alert, Snackbar, Tooltip, InputAdornment, Stack } from '@mui/material';
import Grid from '../../components/Grid';
import Add from '@mui/icons-material/Add';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Search from '@mui/icons-material/Search';
import Gavel from '@mui/icons-material/Gavel';
import AccessTime from '@mui/icons-material/AccessTime';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import Warning from '@mui/icons-material/Warning';
import Refresh from '@mui/icons-material/Refresh';
import Close from '@mui/icons-material/Close';
import { format, parseISO } from 'date-fns';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'adjourned', label: 'Adjourned' },
];
const STATUS_COLORS = { scheduled: '#2196f3', completed: '#4caf50', cancelled: '#9e9e9e', adjourned: '#ff9800' };

const getCourtDetails = (caseItem) => ({
  courtName: caseItem?.courtName || caseItem?.court || '',
  courtLocation: caseItem?.courtLocation || caseItem?.location || '',
  courtNumber: caseItem?.courtNumber || '',
  judgeName: caseItem?.judgeName || '',
});

const CourtDetailItem = ({ label, value }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{value || 'Not available'}</Typography>
  </Box>
);

const HearingFormDialog = ({ open, onClose, onSave, hearing, cases }) => {
  const [form, setForm] = useState({ caseId: '', hearingDate: '', court: '', courtName: '', courtHall: '', judgeName: '', notes: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (hearing) setForm({ caseId: hearing.caseId || '', hearingDate: hearing.hearingDate ? hearing.hearingDate.slice(0, 16) : '', court: hearing.court || '', courtName: hearing.courtName || '', courtHall: hearing.courtHall || '', judgeName: hearing.judgeName || '', notes: hearing.notes || '' });
    else setForm({ caseId: '', hearingDate: '', court: '', courtName: '', courtHall: '', judgeName: '', notes: '' });
  }, [hearing, open]);

  const selectedCase = (cases || []).find((c) => (c.id || c._id) === form.caseId);
  const selectedCourtDetails = getCourtDetails(selectedCase);

  const handleCaseChange = (caseId) => {
    const caseItem = (cases || []).find((c) => (c.id || c._id) === caseId);
    const details = getCourtDetails(caseItem);
    setForm((prev) => ({
      ...prev,
      caseId,
      court: details.courtName || prev.court,
      courtName: details.courtName || prev.courtName,
      courtHall: details.courtNumber || prev.courtHall,
      judgeName: details.judgeName || prev.judgeName,
    }));
  };

  const handleSubmit = async () => {
    if (!form.caseId || !form.hearingDate) return;
    setSaving(true);
    try {
      if (hearing) await api.put(`/hearings/${hearing.id || hearing._id}`, form);
      else await api.post('/hearings', form);
      onSave();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>{hearing ? 'Edit Hearing' : 'Schedule Hearing'}<IconButton onClick={onClose} size="small"><Close /></IconButton></DialogTitle>
      <DialogContent dividers sx={{ pt: 3 }}>
        <Grid container spacing={2}>
          <Grid size={12}><TextField select fullWidth label="Case" value={form.caseId} onChange={e => handleCaseChange(e.target.value)} size="small" required>
            {(cases || []).map(c => <MenuItem key={c.id || c._id} value={c.id || c._id}>{c.caseNumber} - {c.caseTitle}</MenuItem>)}
          </TextField></Grid>
          {form.caseId && (
            <Grid size={12}>
              <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', backgroundColor: 'action.hover' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Court Details from Case
                </Typography>
                <Grid container spacing={1.5} sx={{ mt: 0.25 }}>
                  <Grid item xs={12} sm={6}><CourtDetailItem label="Court Name" value={selectedCourtDetails.courtName} /></Grid>
                  <Grid item xs={12} sm={6}><CourtDetailItem label="Court Location" value={selectedCourtDetails.courtLocation} /></Grid>
                  <Grid item xs={12} sm={6}><CourtDetailItem label="Court Number" value={selectedCourtDetails.courtNumber} /></Grid>
                  <Grid item xs={12} sm={6}><CourtDetailItem label="Judge Name" value={selectedCourtDetails.judgeName} /></Grid>
                </Grid>
              </Box>
            </Grid>
          )}
          <Grid item xs={12} sm={6}><TextField fullWidth label="Hearing Date" type="datetime-local" value={form.hearingDate} onChange={e => setForm({ ...form, hearingDate: e.target.value })} size="small" required InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Court" value={form.court} onChange={e => setForm({ ...form, court: e.target.value })} size="small" /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Court Name" value={form.courtName} onChange={e => setForm({ ...form, courtName: e.target.value })} size="small" /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Court Hall" value={form.courtHall} onChange={e => setForm({ ...form, courtHall: e.target.value })} size="small" /></Grid>
          <Grid size={12}><TextField fullWidth label="Judge" value={form.judgeName} onChange={e => setForm({ ...form, judgeName: e.target.value })} size="small" /></Grid>
          <Grid size={12}><TextField fullWidth label="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} size="small" multiline rows={2} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" onClick={handleSubmit} disabled={saving || !form.caseId || !form.hearingDate}>{saving ? <CircularProgress size={20} /> : hearing ? 'Update' : 'Schedule'}</Button></DialogActions>
    </Dialog>
  );
};

const OutcomeDialog = ({ open, onClose, onSave, hearing }) => {
  const [form, setForm] = useState({ outcome: '', judgeRemarks: '', nextHearingDate: '', notes: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setForm({ outcome: '', judgeRemarks: '', nextHearingDate: '', notes: '' }); }, [open]);
  const handleSubmit = async () => {
    if (!form.outcome) return;
    setSaving(true);
    try { await api.post(`/hearings/${hearing.id || hearing._id}/outcome`, form); onSave(); } catch (err) { console.error(err); } finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Record Hearing Outcome</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField fullWidth label="Outcome" value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })} size="small" placeholder="e.g., Won, Lost, Adjourned" required />
          <TextField fullWidth label="Judge Remarks" value={form.judgeRemarks} onChange={e => setForm({ ...form, judgeRemarks: e.target.value })} size="small" multiline rows={2} />
          <TextField fullWidth label="Next Hearing Date" type="datetime-local" value={form.nextHearingDate} onChange={e => setForm({ ...form, nextHearingDate: e.target.value })} size="small" InputLabelProps={{ shrink: true }} />
          <TextField fullWidth label="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} size="small" multiline rows={2} />
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" onClick={handleSubmit} disabled={saving || !form.outcome}>{saving ? <CircularProgress size={20} /> : 'Save Outcome'}</Button></DialogActions>
    </Dialog>
  );
};

export default function HearingsList() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [hearings, setHearings] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [editingHearing, setEditingHearing] = useState(null);
  const [selectedHearing, setSelectedHearing] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchHearings = async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (statusFilter) params.status = statusFilter;
      const { data: res } = await api.get('/hearings', { params });
      const d = res.data || res;
      let filtered = Array.isArray(d) ? d : [];
      if (search) { const q = search.toLowerCase(); filtered = filtered.filter(h => (h.caseTitle || '').toLowerCase().includes(q) || (h.caseNumber || '').toLowerCase().includes(q) || (h.judgeName || '').toLowerCase().includes(q)); }
      setHearings(filtered);
      setTotal(res.pagination?.total || filtered.length);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };
  const fetchCases = async () => { try { const { data: res } = await api.get('/cases', { params: { limit: 100 } }); setCases((res.data || res.cases || []).map(c => ({ ...c, _id: c.id || c._id }))); } catch (err) { console.error(err); } };

  useEffect(() => { fetchHearings(); }, [page, rowsPerPage, statusFilter]);
  useEffect(() => { fetchCases(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this hearing?')) return;
    try { await api.delete(`/hearings/${id}`); setSnackbar({ open: true, message: 'Hearing deleted', severity: 'success' }); fetchHearings(); } catch { setSnackbar({ open: true, message: 'Failed to delete', severity: 'error' }); }
  };

  const getStatusIcon = (s) => {
    switch (s) { case 'completed': return <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />; case 'cancelled': return <Cancel sx={{ fontSize: 16, color: '#9e9e9e' }} />; case 'adjourned': return <Warning sx={{ fontSize: 16, color: '#ff9800' }} />; default: return <AccessTime sx={{ fontSize: 16, color: '#2196f3' }} />; }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box><Typography variant="h4" fontWeight={700}>Hearing Management</Typography><Typography variant="body2" color="text.secondary">Schedule and manage court hearings</Typography></Box>
        {hasPermission('cases', 'add') && <Button variant="contained" startIcon={<Add />} onClick={() => { setEditingHearing(null); setDialogOpen(true); }}>Schedule Hearing</Button>}
      </Box>
      <Card sx={{ mb: 3 }}><CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}><TextField fullWidth size="small" placeholder="Search hearings..." value={search} onChange={e => setSearch(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField select fullWidth size="small" label="Status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>{STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={6} md={2}><Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={fetchHearings}>Refresh</Button></Grid>
        </Grid>
      </CardContent></Card>
      <Card>
        <TableContainer><Table>
          <TableHead><TableRow><TableCell>Case</TableCell><TableCell>Date & Time</TableCell><TableCell>Court</TableCell><TableCell>Judge</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} align="center"><CircularProgress sx={{ my: 4 }} /></TableCell></TableRow>
            : hearings.length === 0 ? <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary" sx={{ py: 4 }}>No hearings found</Typography></TableCell></TableRow>
            : hearings.map(h => (
              <TableRow key={h.id || h._id} hover sx={{ cursor: 'pointer' }} onClick={() => { if (h.caseId) navigate(`/cases/${h.caseId}`); else toast.error('This hearing has no linked case'); }}>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Avatar sx={{ bgcolor: '#1976d220', color: '#1976d2', width: 36, height: 36 }}><Gavel sx={{ fontSize: 18 }} /></Avatar><Box><Typography variant="body2" fontWeight={600}>{h.caseTitle || 'Untitled'}</Typography><Typography variant="caption" color="text.secondary">{h.caseNumber}</Typography></Box></Box></TableCell>
                <TableCell><Typography variant="body2">{h.hearingDate ? format(parseISO(h.hearingDate), 'MMM dd, yyyy') : '-'}</Typography><Typography variant="caption" color="text.secondary">{h.hearingDate ? format(parseISO(h.hearingDate), 'hh:mm a') : ''}</Typography></TableCell>
                <TableCell><Typography variant="body2">{h.courtName || h.court || '-'}</Typography>{h.courtHall && <Typography variant="caption" color="text.secondary">Hall: {h.courtHall}</Typography>}</TableCell>
                <TableCell><Typography variant="body2">{h.judgeName || '-'}</Typography></TableCell>
                <TableCell><Chip icon={getStatusIcon(h.status)} label={h.status} size="small" sx={{ bgcolor: (STATUS_COLORS[h.status] || '#9e9e9e') + '20', color: STATUS_COLORS[h.status] || '#9e9e9e', fontWeight: 600, textTransform: 'capitalize' }} /></TableCell>
                <TableCell align="right" onClick={e => e.stopPropagation()}>
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    {h.status === 'scheduled' && hasPermission('cases', 'edit') && <Tooltip title="Record Outcome"><IconButton size="small" color="success" onClick={() => { setSelectedHearing(h); setOutcomeDialogOpen(true); }}><CheckCircle /></IconButton></Tooltip>}
                    {hasPermission('cases', 'edit') && <Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditingHearing(h); setDialogOpen(true); }}><Edit /></IconButton></Tooltip>}
                    {hasPermission('cases', 'delete') && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(h.id || h._id)}><Delete /></IconButton></Tooltip>}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
        <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }} rowsPerPageOptions={[5, 10, 25, 50]} />
      </Card>
      <HearingFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSave={() => { setDialogOpen(false); fetchHearings(); }} hearing={editingHearing} cases={cases} />
      <OutcomeDialog open={outcomeDialogOpen} onClose={() => setOutcomeDialogOpen(false)} onSave={() => { setOutcomeDialogOpen(false); fetchHearings(); }} hearing={selectedHearing} />
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}><Alert severity={snackbar.severity}>{snackbar.message}</Alert></Snackbar>
    </Box>
  );
}
