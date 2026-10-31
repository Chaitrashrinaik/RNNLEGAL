import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, IconButton, Menu, MenuItem, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ViewIcon from '@mui/icons-material/Visibility';
import { DataGrid } from '@mui/x-data-grid';
import { format } from 'date-fns';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import SearchBar from '../../components/SearchBar';
import ConfirmDialog from '../../components/ConfirmDialog';
import toast from 'react-hot-toast';

export default function ClientsList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [rowCount, setRowCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [contextRow, setContextRow] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/clients', {
        params: { page: paginationModel.page + 1, limit: paginationModel.pageSize, search },
      });
      const rows = (data.clients || data.data || data || []).map((c, i) => ({
        ...c, id: c._id || c.id || `row-${i}`,
        casesCount: c.cases?.length || c.casesCount || 0,
      }));
      setClients(rows);
      setRowCount(data.pagination?.total || rows.length);
    } catch {
      setClients([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [paginationModel, search]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleDelete = async () => {
    try {
      await api.delete(`/clients/${contextRow?.id}`);
      toast.success('Client deleted');
      setDeleteDialog(false);
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete client');
      setDeleteDialog(false);
    }
  };

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180, renderCell: (params) => (
      <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>{params.value}</Typography>
    )},
    { field: 'email', headerName: 'Email', width: 220 },
    { field: 'phone', headerName: 'Phone', width: 150 },
    { field: 'casesCount', headerName: 'Cases', width: 80, renderCell: (params) => (
      <Typography variant="body2" sx={{ textAlign: 'center', width: '100%' }}>{params.value || 0}</Typography>
    )},
    { field: 'createdAt', headerName: 'Added', width: 120, renderCell: (params) => (
      params.value ? format(new Date(params.value), 'dd MMM yyyy') : '-'
    )},
    { field: 'actions', headerName: '', width: 50, sortable: false, filterable: false, renderCell: (params) => (
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); setContextRow(params.row); }}>
        <MoreIcon sx={{ fontSize: 18 }} />
      </IconButton>
    )},
  ];

  return (
    <Box className="page-container">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Clients</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>Manage your client base</Typography>
        </Box>
        {hasPermission('clients', 'add') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/clients/new')}>
            Add Client
          </Button>
        )}
      </Box>

      <Box sx={{ mb: 3 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search clients..." sx={{ maxWidth: 400 }} />
      </Box>

      <Box sx={{ height: 'calc(100vh - 280px)' }}>
        <DataGrid
          rows={clients}
          columns={columns}
          loading={loading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          rowCount={rowCount}
          paginationMode="server"
          disableRowSelectionOnClick
          onRowClick={(params) => navigate(`/clients/${params.row.id}`)}
          pageSizeOptions={[5, 10, 25]}
          sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
        />
      </Box>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => { setAnchorEl(null); setContextRow(null); }} PaperProps={{ sx: { minWidth: 160, borderRadius: 2, mt: 1 } }}>
        <MenuItem onClick={() => { navigate(`/clients/${contextRow?.id}`); setAnchorEl(null); }}><ViewIcon sx={{ mr: 1.5, fontSize: 18 }} /> View</MenuItem>
        {hasPermission('clients', 'edit') && (
          <MenuItem onClick={() => { navigate(`/clients/${contextRow?.id}/edit`); setAnchorEl(null); }}><EditIcon sx={{ mr: 1.5, fontSize: 18 }} /> Edit</MenuItem>
        )}
        {hasPermission('clients', 'delete') && (
          <MenuItem onClick={() => { setDeleteDialog(true); setAnchorEl(null); }} sx={{ color: 'error.main' }}><DeleteIcon sx={{ mr: 1.5, fontSize: 18 }} /> Delete</MenuItem>
        )}
      </Menu>

      <ConfirmDialog open={deleteDialog} onClose={() => setDeleteDialog(false)} onConfirm={handleDelete} title="Delete Client" message={`Delete client ${contextRow?.name}? This will not delete associated cases.`} confirmLabel="Delete" />
    </Box>
  );
}
