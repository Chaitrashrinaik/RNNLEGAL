import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, TextField, InputAdornment, Chip, List, ListItem, ListItemAvatar, ListItemText, Avatar, Divider, Tabs, Tab, CircularProgress, Alert, Badge } from '@mui/material';
import Grid from '../../components/Grid';
import SearchIcon from '@mui/icons-material/Search';
import Gavel from '@mui/icons-material/Gavel';
import People from '@mui/icons-material/People';
import Description from '@mui/icons-material/Description';
import Receipt from '@mui/icons-material/Receipt';
import FilterList from '@mui/icons-material/FilterList';
import { format, parseISO } from 'date-fns';
import api from '../../api/axios';

const TABS = [
  { value: 'all', label: 'All', icon: <FilterList /> },
  { value: 'cases', label: 'Cases', icon: <Gavel /> },
  { value: 'clients', label: 'Clients', icon: <People /> },
  { value: 'documents', label: 'Documents', icon: <Description /> },
  { value: 'invoices', label: 'Invoices', icon: <Receipt /> },
];

const STATUS_COLORS = {
  active: '#4caf50', 'in-progress': '#2196f3', pending: '#ff9800', draft: '#9e9e9e',
  closed: '#607d8b', won: '#2e7d32', lost: '#c62828',
};

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [tab, setTab] = useState('all');
  const [results, setResults] = useState({ cases: [], clients: [], documents: [], invoices: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setResults({ cases: [], clients: [], documents: [], invoices: [] }); setSearched(false); return; }
    setLoading(true);
    try {
      const { data: res } = await api.get('/search', { params: { q, type: tab === 'all' ? undefined : tab, limit: 20 } });
      setResults(res.data || { cases: [], clients: [], documents: [], invoices: [] });
      setSearched(true);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { const q = searchParams.get('q'); if (q) { setQuery(q); doSearch(q); } }, [searchParams]);
  useEffect(() => { if (searched) doSearch(query); }, [tab]);

  const handleKeyDown = (e) => { if (e.key === 'Enter') doSearch(query); };

  const totalResults = (results.cases?.length || 0) + (results.clients?.length || 0) + (results.documents?.length || 0) + (results.invoices?.length || 0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} mb={3}>Global Search</Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth size="small" placeholder="Search cases, clients, documents, invoices..."
            value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            autoFocus
          />
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 2 }}>
            {TABS.map(t => <Tab key={t.value} value={t.value} label={t.label} icon={t.icon} iconPosition="start" sx={{ minHeight: 36, textTransform: 'none' }} />)}
          </Tabs>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : !searched ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">Type at least 2 characters and press Enter to search</Typography></Box>
      ) : totalResults === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">No results found for "{query}"</Typography></Box>
      ) : (
        <Grid container spacing={2}>
          {results.cases?.length > 0 && (tab === 'all' || tab === 'cases') && (
            <Grid size={{ xs: 12, md: tab === 'all' ? 6 : 12 }}>
              <Card><CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>Cases ({results.cases.length})</Typography>
                <List dense disablePadding>
                  {results.cases.map(c => (
                    <ListItem key={c._id} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1, mb: 0.5 }} onClick={() => navigate(`/cases/${c._id}`)}>
                      <ListItemAvatar><Avatar sx={{ bgcolor: (STATUS_COLORS[c.status] || '#9e9e9e') + '20', color: STATUS_COLORS[c.status] || '#9e9e9e', width: 36, height: 36 }}><Gavel sx={{ fontSize: 18 }} /></Avatar></ListItemAvatar>
                      <ListItemText primary={<Typography variant="body2" fontWeight={600}>{c.caseTitle}</Typography>} secondary={<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}><Typography variant="caption" color="text.secondary">{c.caseNumber}</Typography><Chip label={c.status} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />{c.courtName && <Typography variant="caption" color="text.secondary">{c.courtName}</Typography>}</Box>} />
                    </ListItem>
                  ))}
                </List>
              </CardContent></Card>
            </Grid>
          )}
          {results.clients?.length > 0 && (tab === 'all' || tab === 'clients') && (
            <Grid size={{ xs: 12, md: tab === 'all' ? 6 : 12 }}>
              <Card><CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>Clients ({results.clients.length})</Typography>
                <List dense disablePadding>
                  {results.clients.map(c => (
                    <ListItem key={c._id} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1, mb: 0.5 }} onClick={() => navigate(`/clients/${c._id}`)}>
                      <ListItemAvatar><Avatar sx={{ bgcolor: '#9c27b020', color: '#9c27b0', width: 36, height: 36 }}><People sx={{ fontSize: 18 }} /></Avatar></ListItemAvatar>
                      <ListItemText primary={<Typography variant="body2" fontWeight={600}>{c.name}</Typography>} secondary={<Box sx={{ display: 'flex', gap: 1 }}><Typography variant="caption" color="text.secondary">{c.email}</Typography>{c.phone && <Typography variant="caption" color="text.secondary">{c.phone}</Typography>}</Box>} />
                    </ListItem>
                  ))}
                </List>
              </CardContent></Card>
            </Grid>
          )}
          {results.documents?.length > 0 && (tab === 'all' || tab === 'documents') && (
            <Grid size={{ xs: 12, md: tab === 'all' ? 6 : 12 }}>
              <Card><CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>Documents ({results.documents.length})</Typography>
                <List dense disablePadding>
                  {results.documents.map(d => (
                    <ListItem key={d._id} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1, mb: 0.5 }} onClick={() => navigate(`/documents`)}>
                      <ListItemAvatar><Avatar sx={{ bgcolor: '#ff980020', color: '#ff9800', width: 36, height: 36 }}><Description sx={{ fontSize: 18 }} /></Avatar></ListItemAvatar>
                      <ListItemText primary={<Typography variant="body2" fontWeight={600}>{d.title || d.originalName}</Typography>} secondary={<Typography variant="caption" color="text.secondary">{d.caseNumber && `${d.caseNumber} - `}{d.category || 'Uncategorized'}</Typography>} />
                    </ListItem>
                  ))}
                </List>
              </CardContent></Card>
            </Grid>
          )}
          {results.invoices?.length > 0 && (tab === 'all' || tab === 'invoices') && (
            <Grid size={{ xs: 12, md: tab === 'all' ? 6 : 12 }}>
              <Card><CardContent>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>Invoices ({results.invoices.length})</Typography>
                <List dense disablePadding>
                  {results.invoices.map(i => (
                    <ListItem key={i._id} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1, mb: 0.5 }} onClick={() => navigate(`/invoices/${i._id}`)}>
                      <ListItemAvatar><Avatar sx={{ bgcolor: '#00695c20', color: '#00695c', width: 36, height: 36 }}><Receipt sx={{ fontSize: 18 }} /></Avatar></ListItemAvatar>
                      <ListItemText primary={<Typography variant="body2" fontWeight={600}>{i.invoiceNumber}</Typography>} secondary={<Box sx={{ display: 'flex', gap: 1 }}><Typography variant="caption" color="text.secondary">{i.clientName}</Typography><Chip label={i.status} size="small" sx={{ height: 18, fontSize: '0.65rem' }} /></Box>} />
                    </ListItem>
                  ))}
                </List>
              </CardContent></Card>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
