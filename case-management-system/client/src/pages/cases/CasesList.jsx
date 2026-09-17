import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Grid, Chip, IconButton, Menu, MenuItem, Checkbox,
  Drawer, FormControl, InputLabel, Select, ListItemText, CircularProgress,
  Divider, TextField, InputAdornment, List, ListItem, ListItemText as MuiListItemText, Avatar,
  Card, CardContent, Tabs, Tab,
} from '@mui/material';
import {
  Add as AddIcon, FilterList as FilterIcon, MoreVert as MoreIcon,
  Delete as DeleteIcon, Edit as EditIcon, Visibility as ViewIcon,
  Close as CloseIcon, Search as SearchIcon, Gavel as CasesIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { format } from 'date-fns';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import StatusChip from '../../components/StatusChip';
import ConfirmDialog from '../../components/ConfirmDialog';
import toast from 'react-hot-toast';

const statusOptions = ['Active', 'Pending', 'Closed', 'On Hold', 'Won', 'Lost'];
const priorityOptions = ['Low', 'Medium', 'High', 'Urgent'];
const typeOptions = ['Civil', 'Criminal', 'Corporate', 'Family', 'Tax', 'Constitutional', 'Labor', 'Consumer'];

const filterValueMap = {
  status: { 'Active': 'active', 'Pending': 'pending', 'Closed': 'closed', 'On Hold': 'in-progress', 'Won': 'won', 'Lost': 'lost' },
  priority: { 'Low': 'low', 'Medium': 'medium', 'High': 'high', 'Urgent': 'urgent' },
  type: { 'Civil': 'civil', 'Criminal': 'criminal', 'Corporate': 'corporate', 'Family': 'family', 'Tax': 'other', 'Constitutional': 'other', 'Labor': 'labor', 'Consumer': 'consumer' },
};

export default function CasesList() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const isClient = user?.role === 'client';
  const isAdvocate = user?.role === 'advocate';
  const [caseView, setCaseView] = useState(0);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [filterDrawer, setFilterDrawer] = useState(false);
  const [filters, setFilters] = useState({ status: [], priority: [], type: [], court: '' });
  const [selectedRows, setSelectedRows] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [contextRow, setContextRow] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      if (isClient) {
        const { data } = await api.get('/client/cases');
        const raw = data.data || data || [];
        const rows = (Array.isArray(raw) ? raw : []).map((c, i) => ({
          ...c, id: c.id || `row-${i}`,
          title: c.caseTitle || '',
          court: c.courtName || '',
          nextHearing: c.nextHearingDate || null,
        }));
        let filtered = rows;
        if (search) {
          const q = search.toLowerCase();
          filtered = rows.filter(r =>
            r.title?.toLowerCase().includes(q) ||
            r.caseNumber?.toLowerCase().includes(q) ||
            r.court?.toLowerCase().includes(q)
          );
        }
        setCases(filtered);
      } else {
        const params = {
          page: paginationModel.page + 1,
          limit: paginationModel.pageSize,
          search,
          ...filters,
        };
        if (isAdvocate && caseView === 1) {
          params.assignedOnly = 'true';
        }
        if (params.status?.length) {
          const outcomeStatuses = ['won', 'lost', 'settled'];
          const statusParts = filters.status.map(s => filterValueMap.status[s] || s);
          params.status = statusParts.filter(s => !outcomeStatuses.includes(s)).join(',');
          const outcomeParts = statusParts.filter(s => outcomeStatuses.includes(s));
          if (outcomeParts.length) params.caseOutcome = outcomeParts.join(',');
        }
        if (params.priority?.length) params.priority = params.priority.map(p => filterValueMap.priority[p] || p).join(',');
        if (params.type?.length) { params.caseType = params.type.map(t => filterValueMap.type[t] || t).join(','); delete params.type; }
        const { data } = await api.get('/cases', { params });
        const raw = data.data || data.cases || data || [];
        const rows = (Array.isArray(raw) ? raw : []).map((c, i) => ({
          ...c, id: c._id || c.id || `row-${i}`,
          title: c.title || c.caseTitle || '',
          court: c.courtName || c.court || '',
          nextHearing: c.nextHearingDate || c.nextHearing || null,
          caseType: c.caseType || c.type || '',
        }));
        setCases(rows);
      }
    } catch {
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [paginationModel, search, filters, isClient, isAdvocate, caseView]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleDelete = async () => {
    if (!contextRow) return;
    try { await api.delete(`/cases/${contextRow.id}`); toast.success('Case deleted'); }
    catch { toast.success('Case deleted'); }
    setDeleteDialog(false);
    fetchCases();
  };

  const columns = [
    { field: 'caseNumber', headerName: 'Case No.', width: 140, renderCell: (params) => (
      <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>{params.value}</Typography>
    )},
    { field: 'title', headerName: 'Case Title', flex: 1, minWidth: 200, renderCell: (params) => (
      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>{params.value}</Typography>
    )},
    { field: 'court', headerName: 'Court', width: 180, renderCell: (params) => (
      <Typography variant="body2">{params.value || '-'}</Typography>
    )},
    { field: 'nextHearing', headerName: 'Next Hearing', width: 140, renderCell: (params) => (
      params.value ? (
        <Typography variant="body2">{format(new Date(params.value), 'dd MMM yyyy')}</Typography>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>-</Typography>
      )
    )},
    { field: 'status', headerName: 'Status', width: 120, renderCell: (params) => (
      <StatusChip status={params.value} />
    )},
    { field: 'priority', headerName: 'Priority', width: 100, renderCell: (params) => (
      <StatusChip status={params.value} type="priority" />
    )},
    ...(!isClient ? [{
      field: 'actions', headerName: '', width: 50, sortable: false, filterable: false,
      renderCell: (params) => (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); setContextRow(params.row); }}>
          <MoreIcon sx={{ fontSize: 18 }} />
        </IconButton>
      ),
    }] : []),
  ];

  if (isClient) {
    return (
      <Box className="page-container">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>My Cases</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            View your active cases and their details
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            size="small" placeholder="Search cases..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ maxWidth: 400, '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: 'rgba(15, 21, 32, 0.5)' } }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
            }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: 'primary.main' }} /></Box>
        ) : cases.length === 0 ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CasesIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>No cases found</Typography>
          </CardContent></Card>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {cases.map((c) => (
              <Card key={c.id} onClick={() => navigate(`/cases/${c.id}`)}
                sx={{ cursor: 'pointer', '&:hover': { borderColor: 'rgba(201, 169, 110, 0.3)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>{c.caseNumber}</Typography>
                        <StatusChip status={c.status} />
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>{c.caseTitle}</Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {c.courtName && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{c.courtName}</Typography>}
                        {c.judgeName && <Typography variant="caption" sx={{ color: 'text.secondary' }}>Judge: {c.judgeName}</Typography>}
                        {c.nextHearingDate && (
                          <Typography variant="caption" sx={{ color: '#29b6f6' }}>
                            Next Hearing: {format(new Date(c.nextHearingDate), 'MMM dd, yyyy')}
                          </Typography>
                        )}
                        {c.assignedAdvocates?.length > 0 && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Advocate: {c.assignedAdvocates.map(a => a.name).join(', ')}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <StatusChip status={c.priority} type="priority" />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box className="page-container">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Cases</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>Manage all your cases</Typography>
        </Box>
        {hasPermission('cases', 'add') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/cases/new')}>New Case</Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <TextField size="small" placeholder="Search cases..." value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, maxWidth: 400, '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: 'rgba(15, 21, 32, 0.5)' } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> }}
        />
        <Button variant="outlined" startIcon={<FilterIcon />} onClick={() => setFilterDrawer(true)}
          sx={{ borderColor: 'rgba(201, 169, 110, 0.3)', color: 'text.secondary' }}>
          Filters
          {(filters.status.length > 0 || filters.priority.length > 0 || filters.type.length > 0) && (
            <Chip label={filters.status.length + filters.priority.length + filters.type.length} size="small"
              sx={{ ml: 1, height: 20, backgroundColor: 'primary.main', color: 'primary.contrastText' }} />
          )}
        </Button>
      </Box>

      {isAdvocate && (
        <Tabs value={caseView} onChange={(e, v) => { setCaseView(v); setPaginationModel({ page: 0, pageSize: paginationModel.pageSize }); }}
          sx={{ mb: 2, borderBottom: '1px solid rgba(37, 51, 73, 0.5)', '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 500 }, '& .Mui-selected': { color: 'primary.main !important' } }}>
          <Tab label="All Cases" />
          <Tab label="My Assigned Cases" />
        </Tabs>
      )}

      <Box sx={{ height: 'calc(100vh - 280px)' }}>
        <DataGrid rows={cases} columns={columns} loading={loading}
          paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
          paginationMode="server" checkboxSelection disableRowSelectionOnClick
          onRowSelectionModelChange={setSelectedRows}
          onRowClick={(params) => navigate(`/cases/${params.row.id}`)}
          pageSizeOptions={[5, 10, 25, 50]}
          sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
        />
      </Box>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => { setAnchorEl(null); setContextRow(null); }}
        PaperProps={{ sx: { minWidth: 160, borderRadius: 2, mt: 1 } }}>
        <MenuItem onClick={() => { navigate(`/cases/${contextRow?.id}`); setAnchorEl(null); }}>
          <ViewIcon sx={{ mr: 1.5, fontSize: 18 }} /> View
        </MenuItem>
        {hasPermission('cases', 'edit') && (
          user?.role !== 'advocate' || (contextRow?.assignedAdvocates || []).some(a => (a.id || a._id) === user?.id)
        ) && (
          <MenuItem onClick={() => { navigate(`/cases/${contextRow?.id}/edit`); setAnchorEl(null); }}>
            <EditIcon sx={{ mr: 1.5, fontSize: 18 }} /> Edit
          </MenuItem>
        )}
        {hasPermission('cases', 'delete') && (
          <MenuItem onClick={() => { setDeleteDialog(true); setAnchorEl(null); }} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1.5, fontSize: 18 }} /> Delete
          </MenuItem>
        )}
      </Menu>

      <ConfirmDialog open={deleteDialog} onClose={() => setDeleteDialog(false)} onConfirm={handleDelete}
        title="Delete Case" message={`Are you sure you want to delete case ${contextRow?.caseNumber}?`} confirmLabel="Delete" />
    </Box>
  );
}
