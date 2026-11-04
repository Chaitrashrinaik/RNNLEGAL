import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, Card, CardContent, List, ListItem, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import InvoiceIcon from '@mui/icons-material/Receipt';
import { DataGrid } from '@mui/x-data-grid';
import { format } from 'date-fns';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import StatusChip from '../../components/StatusChip';
import SearchBar from '../../components/SearchBar';

export default function InvoicesList() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const isClient = user?.role === 'client';
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [rowCount, setRowCount] = useState(0);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isClient ? '/client/invoices' : '/invoices';
      const { data } = await api.get(endpoint, {
        params: isClient ? {} : { page: paginationModel.page + 1, limit: paginationModel.pageSize, search },
      });
      const raw = data.data || data.invoices || data || [];
      const rows = (Array.isArray(raw) ? raw : []).map((inv, i) => ({
        ...inv, id: inv._id || inv.id || `row-${i}`,
        amount: inv.total || inv.amount || 0,
      }));
      let filtered = rows;
      if (isClient && search) {
        const q = search.toLowerCase();
        filtered = rows.filter(r =>
          r.invoiceNumber?.toLowerCase().includes(q) ||
          r.status?.toLowerCase().includes(q)
        );
      }
      setInvoices(filtered);
      setRowCount(isClient ? filtered.length : (data.pagination?.total ?? filtered.length));
    } catch {
      setInvoices([]);
      setRowCount(0);
    } finally { setLoading(false); }
  }, [paginationModel, search, isClient]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  if (isClient) {
    return (
      <Box className="page-container">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>My Invoices</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            View your billing and payment status
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search invoices..." sx={{ maxWidth: 400 }} />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: 'primary.main' }} /></Box>
        ) : invoices.length === 0 ? (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}>
            <InvoiceIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>No invoices found</Typography>
          </CardContent></Card>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {invoices.map((inv) => (
              <Card key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                sx={{ cursor: 'pointer', '&:hover': { borderColor: 'rgba(var(--app-accent-rgb), 0.3)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>{inv.invoiceNumber}</Typography>
                        <StatusChip status={inv.status} />
                      </Box>
                      {inv.case && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Case: {inv.case.caseNumber} — {inv.case.caseTitle}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>₹{(inv.total || inv.amount || 0).toLocaleString()}</Typography>
                      {inv.dueDate && (
                        <Typography variant="caption" sx={{ color: inv.status === 'overdue' ? '#f44336' : 'text.secondary' }}>
                          Due: {format(new Date(inv.dueDate), 'MMM dd, yyyy')}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  const columns = [
    { field: 'invoiceNumber', headerName: 'Invoice #', width: 130, renderCell: (params) => (
      <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>{params.value}</Typography>
    )},
    { field: 'client', headerName: 'Client', flex: 1, minWidth: 160, renderCell: (params) => (
      <Typography variant="body2">{params.row.client?.name || params.value?.name || '-'}</Typography>
    )},
    { field: 'caseNumber', headerName: 'Case', width: 150, renderCell: (params) => (
      <Typography variant="body2">{params.value || '-'}</Typography>
    )},
    { field: 'amount', headerName: 'Amount', width: 130, renderCell: (params) => (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{params.value?.toLocaleString()}</Typography>
    )},
    { field: 'status', headerName: 'Status', width: 120, renderCell: (params) => (
      <StatusChip status={params.value} />
    )},
    { field: 'dueDate', headerName: 'Due Date', width: 130, renderCell: (params) => (
      params.value ? <Typography variant="body2">{format(new Date(params.value), 'dd MMM yyyy')}</Typography> : '-'
    )},
  ];

  return (
    <Box className="page-container">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Invoices</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>Track billing and payments</Typography>
        </Box>
        {hasPermission('invoices', 'add') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/invoices/new')}>
            Create Invoice
          </Button>
        )}
      </Box>

      <Box sx={{ mb: 3 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search invoices..." sx={{ maxWidth: 400 }} />
      </Box>

      <Box sx={{ height: 'calc(100vh - 280px)' }}>
        <DataGrid rows={invoices} columns={columns} loading={loading}
          paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
          paginationMode="server" rowCount={rowCount} disableRowSelectionOnClick
          onRowClick={(params) => navigate(`/invoices/${params.row.id}`)}
          pageSizeOptions={[5, 10, 25]}
          sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
        />
      </Box>
    </Box>
  );
}
