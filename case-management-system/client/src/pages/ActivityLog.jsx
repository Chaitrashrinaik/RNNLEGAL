import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField, MenuItem, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, CircularProgress, Tooltip, Stack, Divider, Pagination } from '@mui/material';
import Grid from '../components/Grid';
import Refresh from '@mui/icons-material/Refresh';
import Close from '@mui/icons-material/Close';
import Search from '@mui/icons-material/Search';
import History from '@mui/icons-material/History';
import FilterList from '@mui/icons-material/FilterList';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import { format } from 'date-fns';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const MODULE_COLORS = {
  Cases: '#2196f3', Hearings: '#ff9800', Tasks: '#4caf50', Invoices: '#9c27b0',
  Payments: '#f44336', Documents: '#00bcd4', Clients: '#e91e63', Assignments: '#ff5722',
  Users: '#607d8b', Auth: '#795548',
};

const ACTION_LABELS = {
  case_created: 'Created Case', case_updated: 'Updated Case', case_deleted: 'Deleted Case',
  case_outcome_updated: 'Updated Case Outcome', case_note_added: 'Added Case Note',
  hearing_added_to_case: 'Added Hearing', case_hearing_updated: 'Updated Hearing History',
  court_order_added: 'Added Court Order', document_uploaded_to_case: 'Uploaded Document to Case',
  hearing_created: 'Scheduled Hearing', hearing_updated: 'Updated Hearing',
  hearing_deleted: 'Deleted Hearing', hearing_outcome_recorded: 'Recorded Hearing Outcome',
  task_created: 'Created Task', task_updated: 'Updated Task', task_deleted: 'Deleted Task',
  task_comment_added: 'Commented on Task',
  invoice_created: 'Created Invoice', invoice_updated: 'Updated Invoice',
  invoice_deleted: 'Deleted Invoice', invoice_sent: 'Sent Invoice',
  payment_recorded: 'Recorded Payment', payment_status_changed: 'Changed Payment Status',
  payment_created: 'Created Payment', payment_updated: 'Updated Payment',
  payment_deleted: 'Deleted Payment',
  document_uploaded: 'Uploaded Document', document_updated: 'Updated Document',
  document_deleted: 'Deleted Document', document_renamed: 'Renamed Document',
  document_version_uploaded: 'Uploaded New Version',
  client_created: 'Created Client', client_updated: 'Updated Client',
  client_deleted: 'Deleted Client', client_portal_access_granted: 'Enabled Portal Access',
  advocate_assigned: 'Assigned Advocate', advocate_unassigned: 'Unassigned Advocate',
  case_update_added: 'Added Case Update', case_update_edited: 'Edited Case Update',
  case_update_deleted: 'Deleted Case Update',
  user_created: 'Created User', user_updated: 'Updated User',
  user_deactivated: 'Deactivated User', user_role_changed: 'Changed User Role',
  user_permissions_updated: 'Updated User Permissions',
  user_login: 'Logged In', user_registered: 'Registered', client_login: 'Client Logged In',
};

function ActivityDetailDialog({ open, onClose, activity }) {
  if (!activity) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
        Activity Details
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">Activity ID</Typography>
            <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace' }}>{activity.id}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Action</Typography>
            <Typography variant="body2" fontWeight={600}>{ACTION_LABELS[activity.action] || activity.action}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Performed By</Typography>
            <Typography variant="body2" fontWeight={500}>{activity.userName || 'Unknown'}</Typography>
            {activity.advocateId && <Chip label={activity.advocateId} size="small" sx={{ mt: 0.5, fontWeight: 600 }} />}
            {activity.role && <Chip label={activity.role} size="small" variant="outlined" sx={{ ml: 0.5, mt: 0.5, textTransform: 'capitalize' }} />}
          </Box>
          {activity.entity && (
            <Box>
              <Typography variant="caption" color="text.secondary">Entity</Typography>
              <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>{activity.entity} {activity.entityId ? `(${activity.entityId.substring(0, 8)}...)` : ''}</Typography>
            </Box>
          )}
          {activity.caseId && (
            <Box>
              <Typography variant="caption" color="text.secondary">Case ID</Typography>
              <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace' }}>{activity.caseId}</Typography>
            </Box>
          )}
          {activity.module && (
            <Box>
              <Typography variant="caption" color="text.secondary">Module</Typography>
              <Chip label={activity.module} size="small" sx={{ bgcolor: (MODULE_COLORS[activity.module] || '#9e9e9e') + '20', color: MODULE_COLORS[activity.module] || '#9e9e9e', fontWeight: 600 }} />
            </Box>
          )}
          {activity.details && (
            <Box>
              <Typography variant="caption" color="text.secondary">Details</Typography>
              <Typography variant="body2">{activity.details}</Typography>
            </Box>
          )}
          {activity.oldValue && (
            <Box>
              <Typography variant="caption" color="text.secondary">Previous Value</Typography>
              <Box sx={{ bgcolor: 'rgba(244,67,54,0.08)', p: 1.5, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {typeof activity.oldValue === 'object' ? JSON.stringify(activity.oldValue, null, 2) : String(activity.oldValue)}
              </Box>
            </Box>
          )}
          {activity.newValue && (
            <Box>
              <Typography variant="caption" color="text.secondary">New Value</Typography>
              <Box sx={{ bgcolor: 'rgba(76,175,80,0.08)', p: 1.5, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {typeof activity.newValue === 'object' ? JSON.stringify(activity.newValue, null, 2) : String(activity.newValue)}
              </Box>
            </Box>
          )}
          <Box>
            <Typography variant="caption" color="text.secondary">Date & Time</Typography>
            <Typography variant="body2" fontWeight={500}>
              {activity.createdAt ? format(new Date(activity.createdAt), 'dd MMMM yyyy, hh:mm a') : '-'}
            </Typography>
          </Box>
          {activity.ipAddress && (
            <Box>
              <Typography variant="caption" color="text.secondary">IP Address</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{activity.ipAddress}</Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ActivityLog() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, pages: 0 });
  const [search, setSearch] = useState('');
  const [advocateIdFilter, setAdvocateIdFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ actions: [], entities: [], modules: [] });
  const [showFilters, setShowFilters] = useState(false);

  const fetchActivities = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (search) params.search = search;
      if (advocateIdFilter) params.advocateId = advocateIdFilter;
      if (actionFilter) params.action = actionFilter;
      if (moduleFilter) params.module = moduleFilter;
      if (entityFilter) params.entity = entityFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get('/activity-logs', { params });
      setActivities(res.data.data || []);
      setPagination(res.data.pagination || { total: 0, page: 1, limit: 25, pages: 0 });
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    } finally {
      setLoading(false);
    }
  }, [search, advocateIdFilter, actionFilter, moduleFilter, entityFilter, startDate, endDate]);

  const fetchFilterOptions = async () => {
    try {
      const res = await api.get('/activity-logs/actions');
      setFilterOptions(res.data.data || { actions: [], entities: [], modules: [] });
    } catch {}
  };

  useEffect(() => { fetchActivities(); fetchFilterOptions(); }, []);

  const handleSearch = () => fetchActivities(1);
  const handlePageChange = (_, page) => fetchActivities(page);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Activity Log</Typography>
        <Typography variant="body2" color="text.secondary">Complete audit trail of all system activities</Typography>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" placeholder="Search activities..." value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField fullWidth size="small" placeholder="Advocate ID" value={advocateIdFilter} onChange={e => setAdvocateIdFilter(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <Button fullWidth variant="outlined" startIcon={<Search />} onClick={handleSearch}>Search</Button>
            </Grid>
            <Grid item xs={6} sm={1.5}>
              <Button fullWidth variant="outlined" startIcon={<FilterList />} onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? <ExpandLess /> : <ExpandMore />}
              </Button>
            </Grid>
            <Grid item xs={6} sm={1.5}>
              <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={() => { setSearch(''); setAdvocateIdFilter(''); setActionFilter(''); setModuleFilter(''); setEntityFilter(''); setStartDate(''); setEndDate(''); setTimeout(() => fetchActivities(1), 100); }}>Reset</Button>
            </Grid>
          </Grid>

          {showFilters && (
            <Grid container spacing={1.5} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={3}>
                <TextField select fullWidth size="small" label="Action" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
                  <MenuItem value="">All Actions</MenuItem>
                  {filterOptions.actions.map(a => <MenuItem key={a} value={a}>{ACTION_LABELS[a] || a}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField select fullWidth size="small" label="Module" value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
                  <MenuItem value="">All Modules</MenuItem>
                  {filterOptions.modules.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />
          ) : activities.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <History sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography color="text.secondary">No activities found</Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Advocate ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Module</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Info</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activities.map(a => (
                      <TableRow key={a.id} hover sx={{ cursor: 'pointer' }} onClick={() => { setSelectedActivity(a); setDetailOpen(true); }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{a.createdAt ? format(new Date(a.createdAt), 'dd MMM yy') : '-'}</Typography>
                          <Typography variant="caption" color="text.secondary">{a.createdAt ? format(new Date(a.createdAt), 'hh:mm a') : ''}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{a.userName || 'Unknown'}</Typography>
                          {a.role && <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{a.role}</Typography>}
                        </TableCell>
                        <TableCell>
                          {a.advocateId ? <Chip label={a.advocateId} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem' }} /> : <Typography variant="body2" color="text.secondary">-</Typography>}
                        </TableCell>
                        <TableCell>
                          <Chip label={ACTION_LABELS[a.action] || a.action} size="small" sx={{ fontWeight: 500 }} />
                        </TableCell>
                        <TableCell>
                          {a.module ? <Chip label={a.module} size="small" sx={{ bgcolor: (MODULE_COLORS[a.module] || '#9e9e9e') + '20', color: MODULE_COLORS[a.module] || '#9e9e9e', fontWeight: 600, fontSize: '0.7rem' }} /> : '-'}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>{a.details || a.entity || '-'}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          {(a.oldValue || a.newValue) && <Chip label="Changed" size="small" color="info" variant="outlined" sx={{ fontSize: '0.65rem' }} />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {pagination.pages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <Pagination count={pagination.pages} page={pagination.page} onChange={handlePageChange} color="primary" />
                </Box>
              )}
              <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">Total: {pagination.total} activities</Typography>
                <Typography variant="caption" color="text.secondary">Page {pagination.page} of {pagination.pages}</Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      <ActivityDetailDialog open={detailOpen} onClose={() => { setDetailOpen(false); setSelectedActivity(null); }} activity={selectedActivity} />
    </Box>
  );
}
