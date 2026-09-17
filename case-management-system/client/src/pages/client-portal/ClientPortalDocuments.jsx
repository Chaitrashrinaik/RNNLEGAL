import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, List, ListItem, ListItemAvatar, ListItemText, Avatar, TextField, InputAdornment, CircularProgress, Button, MenuItem, Chip } from '@mui/material';
import { Description, Search, Download, FilterList } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import api from '../../api/axios';

const CATEGORIES = { petition: '#c9a96e', evidence: '#4caf50', correspondence: '#2196f3', court: '#ff9800', financial: '#9c27b0', other: '#607d8b' };

export default function ClientPortalDocuments() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [caseFilter, setCaseFilter] = useState('');
  const [cases, setCases] = useState([]);

  useEffect(() => { fetchDocs(); fetchCases(); }, [caseFilter]);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (caseFilter) params.caseId = caseFilter;
      const { data } = await api.get('/client-portal/documents', { params });
      setDocs(data.data || []);
    } catch { setDocs([]); } finally { setLoading(false); }
  };

  const fetchCases = async () => {
    try {
      const { data } = await api.get('/client-portal/cases', { params: { limit: 100 } });
      setCases(data.data || []);
    } catch {}
  };

  const handleDownload = async (d) => {
    try {
      const { data } = await api.get(`/client-portal/documents/${d.id}/download-url`);
      if (data?.data?.url) {
        const link = document.createElement('a');
        link.href = data.data.url; link.download = d.originalName || d.title || 'document'; link.target = '_blank';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
      }
    } catch { window.open(d.fileUrl, '_blank'); }
  };

  const filtered = docs.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (d.title || '').toLowerCase().includes(q) || (d.originalName || '').toLowerCase().includes(q) || (d.caseNumber || '').toLowerCase().includes(q);
  });

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#fff' }}>Documents</Typography>
        <Chip label={`${docs.length} files`} sx={{ bgcolor: '#c9a96e20', color: '#c9a96e', fontWeight: 600 }} />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField fullWidth size="small" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} /></InputAdornment> }}
          sx={{ '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: '#c9a96e' } } }} />
        <TextField select size="small" value={caseFilter} onChange={e => setCaseFilter(e.target.value)} sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}>
          <MenuItem value="">All Cases</MenuItem>
          {cases.map(c => <MenuItem key={c.id} value={c.id}>{c.caseNumber}</MenuItem>)}
        </TextField>
      </Box>

      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box> : filtered.length === 0 ? (
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}><Description sx={{ fontSize: 48, color: 'rgba(255,255,255,0.15)', mb: 1 }} /><Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>No documents found</Typography></CardContent>
        </Card>
      ) : (
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <List dense disablePadding>
            {filtered.map((d, i) => (
              <ListItem key={d.id || i}
                sx={{ px: 2.5, py: 1.5, borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                <ListItemAvatar sx={{ minWidth: 48 }}>
                  <Avatar sx={{ bgcolor: (CATEGORIES[d.category] || '#607d8b') + '18', color: CATEGORIES[d.category] || '#607d8b', width: 40, height: 40 }}><Description sx={{ fontSize: 18 }} /></Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight={500} sx={{ color: '#fff', fontSize: '0.875rem' }}>{d.title || d.originalName}</Typography>
                    <Chip size="small" label={d.category} sx={{ height: 18, fontSize: '0.55rem', fontWeight: 600, bgcolor: (CATEGORIES[d.category] || '#607d8b') + '20', color: CATEGORIES[d.category] || '#607d8b' }} />
                  </Box>}
                  secondary={<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{d.caseNumber}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{formatSize(d.fileSize)}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{d.createdAt ? format(parseISO(d.createdAt), 'MMM dd, yyyy') : ''}</Typography>
                    </Box>
                    {d.filePath && <Button size="small" onClick={() => handleDownload(d)} target="_blank" startIcon={<Download sx={{ fontSize: '12px !important' }} />} sx={{ textTransform: 'none', fontSize: '0.7rem', color: '#c9a96e', minWidth: 0, py: 0 }}>Download</Button>}
                  </Box>} />
              </ListItem>
            ))}
          </List>
        </Card>
      )}
    </Box>
  );
}
