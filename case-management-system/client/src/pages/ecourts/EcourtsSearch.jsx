import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, TextField, InputAdornment, Grid, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Collapse, CircularProgress, Alert, Select, MenuItem,
  FormControl, InputLabel, TablePagination,
} from '@mui/material';
import {
  Search as SearchIcon, AccountBalance, FilterList, ExpandMore, ExpandLess,
  OpenInNew,
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../api/axios';

const COURT_TYPES = [
  { value: '', label: 'All Courts' },
  { value: 'supreme', label: 'Supreme Court' },
  { value: 'high', label: 'High Courts' },
  { value: 'district', label: 'District Courts' },
  { value: 'nclt', label: 'NCLT' },
  { value: 'drt', label: 'DRT' },
  { value: 'consumer', label: 'Consumer Forums' },
  { value: 'rera', label: 'RERA' },
];

const STATUS_COLORS = {
  pending: '#ff9800', active: '#4caf50', disposed: '#607d8b',
  'under-trial': '#2196f3', decided: '#9c27b0',
};

export default function EcourtsSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    court: '', petitioner: '', respondent: '', advocate: '', judge: '', caseType: '',
  });

  const doSearch = useCallback(async (p = page, ps = pageSize) => {
    if (!query.trim() && !filters.petitioner && !filters.respondent && !filters.advocate && !filters.judge) return;
    setLoading(true);
    setError('');
    try {
      const params = { q: query || undefined, ...filters, page: p + 1, pageSize: ps };
      Object.keys(params).forEach(k => { if (params[k] === '' || params[k] === undefined) delete params[k]; });
      const { data: res } = await api.get('/ecourts/search', { params });
      const searchResults = res.data?.results || [];
      setResults(searchResults);
      setTotal(res.data?.totalHits || searchResults.length || 0);
      setSearched(true);
      if (searchResults.length === 0 && query.trim()) {
        setError(`No cases found for "${query.trim()}". Please check the CNR number or try different search criteria.`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search cases');
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, filters, page, pageSize]);

  useEffect(() => {
    if (searched) doSearch();
  }, [page, pageSize]);

  const handleKeyDown = (e) => { if (e.key === 'Enter') { setPage(0); doSearch(0); } };
  const handleSearch = () => { setPage(0); doSearch(0); };
  const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

  return (
    <Box className="page-container">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <AccountBalance sx={{ color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Court Lookup</Typography>
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Search cases across 29,000+ Indian courts
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth size="small" placeholder="Search by CNR number, case title, party name, or keyword..."
              value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment> }}
              autoFocus
            />
            <IconButton onClick={() => setFiltersOpen(!filtersOpen)} sx={{ color: filtersOpen ? 'primary.main' : 'text.secondary' }}>
              <FilterList />
              {filtersOpen ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={filtersOpen}>
            <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Court Type</InputLabel>
                  <Select value={filters.court} label="Court Type" onChange={e => handleFilterChange('court', e.target.value)}>
                    {COURT_TYPES.map(ct => <MenuItem key={ct.value} value={ct.value}>{ct.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth size="small" label="Petitioner" value={filters.petitioner}
                  onChange={e => handleFilterChange('petitioner', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth size="small" label="Respondent" value={filters.respondent}
                  onChange={e => handleFilterChange('respondent', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth size="small" label="Advocate" value={filters.advocate}
                  onChange={e => handleFilterChange('advocate', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth size="small" label="Judge" value={filters.judge}
                  onChange={e => handleFilterChange('judge', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth size="small" label="Case Type" value={filters.caseType}
                  onChange={e => handleFilterChange('caseType', e.target.value)} placeholder="e.g. Civil, Criminal" />
              </Grid>
            </Grid>
          </Collapse>

          <Box sx={{ mt: 1.5, textAlign: 'right' }}>
            <Chip label="Search" clickable onClick={handleSearch}
              sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 600, '&:hover': { bgcolor: 'primary.dark' } }} />
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.includes('404') || error.includes('not found') ? 'No cases found. Please try different search criteria.' : error.includes('429') ? 'Too many requests. Please wait a moment and try again.' : error.includes('500') ? 'Court service temporarily unavailable. Please try again later.' : error.length > 100 ? 'Search failed. Please try again with different criteria.' : error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : !searched ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <AccountBalance sx={{ fontSize: 56, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">Search for court cases</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Enter a CNR number, case title, party name, or use filters to find cases
            </Typography>
          </CardContent>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <AccountBalance sx={{ fontSize: 56, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No cases found</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Try adjusting your search terms or filters
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>CNR</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Case</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Court</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Next Hearing</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.cnr} hover sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => navigate(`/ecourts/${r.cnr}`)}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>{r.cnr}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{r.caseTitle}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.caseNumber}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{r.courtName || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={r.status || 'N/A'} size="small"
                        sx={{
                          bgcolor: (STATUS_COLORS[r.status?.toLowerCase()] || '#607d8b') + '20',
                          color: STATUS_COLORS[r.status?.toLowerCase()] || '#607d8b',
                          fontWeight: 500, fontSize: '0.7rem', height: 22,
                        }} />
                    </TableCell>
                    <TableCell>
                      {r.nextHearingDate ? (
                        <Typography variant="body2">{format(new Date(r.nextHearingDate), 'dd MMM yyyy')}</Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={e => { e.stopPropagation(); navigate(`/ecourts/${r.cnr}`); }}>
                        <OpenInNew sx={{ fontSize: 16 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div" count={total} page={page} rowsPerPage={pageSize}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={e => { setPageSize(parseInt(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Card>
      )}
    </Box>
  );
}
