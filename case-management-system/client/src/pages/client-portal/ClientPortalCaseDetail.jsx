import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Chip, Avatar, List, ListItem, ListItemAvatar, ListItemText, Tabs, Tab, CircularProgress, Button, Divider } from '@mui/material';
import Grid from '../../components/Grid';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Gavel from '@mui/icons-material/Gavel';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Description from '@mui/icons-material/Description';
import Person from '@mui/icons-material/Person';
import LocationOn from '@mui/icons-material/LocationOn';
import Note from '@mui/icons-material/Note';
import CheckCircle from '@mui/icons-material/CheckCircle';
import UploadIcon from '@mui/icons-material/Upload';
import { format, parseISO } from 'date-fns';
import api from '../../api/axios';

const STATUS_COLORS = { active: '#4caf50', 'in-progress': '#2196f3', pending: '#ff9800', closed: '#607d8b', disposed: '#795548', won: '#2e7d32', lost: '#c62828' };

function TabPanel({ children, value, index }) { return value === index ? <Box>{children}</Box> : null; }

const TIMELINE_ICONS = { 'case-created': <Gavel />, filing: <Description />, hearing: <CalendarMonth />, order: <CheckCircle />, document: <UploadIcon /> };
const TIMELINE_COLORS = { 'case-created': '#c9a96e', filing: '#2196f3', hearing: '#ff9800', order: '#4caf50', document: '#9c27b0' };

export default function ClientPortalCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [caseRes, timeRes] = await Promise.all([
        api.get(`/client-portal/cases/${id}`),
        api.get(`/client-portal/cases/${id}/timeline`),
      ]);
      setCaseData(caseRes.data?.data || caseRes.data);
      setTimeline(timeRes.data?.data || []);
    } catch { } finally { setLoading(false); }
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

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!caseData) return <Box sx={{ textAlign: 'center', py: 8 }}><Typography color="error">Case not found</Typography></Box>;

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/client-portal/cases')} sx={{ color: 'rgba(255,255,255,0.5)', mb: 2, textTransform: 'none' }}>Back to Cases</Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#fff' }}>{caseData.caseTitle}</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>{caseData.caseNumber}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip size="small" label={caseData.status} sx={{ bgcolor: (STATUS_COLORS[caseData.status] || '#9e9e9e') + '20', color: STATUS_COLORS[caseData.status] || '#9e9e9e', fontWeight: 600 }} />
          <Chip size="small" label={caseData.priority} sx={{ bgcolor: '#ff980020', color: '#ff9800', fontWeight: 600 }} />
        </Box>
      </Box>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', textTransform: 'none' }, '& .Mui-selected': { color: '#c9a96e !important' } }}>
        <Tab label="Overview" /><Tab label={`Hearings (${caseData.hearingHistory?.length || 0})`} />
        <Tab label={`Orders (${caseData.orders?.length || 0})`} /><Tab label={`Documents (${caseData.documents?.length || 0})`} />
        <Tab label="Timeline" />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#c9a96e', mb: 1.5 }}>Case Details</Typography>
                <Grid container spacing={2}>
                  {[
                    ['Court', caseData.courtName || caseData.court],
                    ['Judge', caseData.judgeName],
                    ['Type', caseData.caseType],
                    ['Filing Date', caseData.filingDate ? format(parseISO(caseData.filingDate), 'MMM dd, yyyy') : ''],
                    ['Next Hearing', caseData.nextHearingDate ? format(parseISO(caseData.nextHearingDate), 'MMM dd, yyyy hh:mm a') : ''],
                    ['Opposite Party', caseData.oppositeParty],
                    ['Opposite Lawyer', caseData.oppositePartyLawyer],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <Grid size={{ xs: 6, key: label }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', display: 'block', mb: 0.25 }}>{label}</Typography>
                      <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.8125rem' }}>{val}</Typography>
                    </Grid>
                  ))}
                </Grid>
                {caseData.description && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', display: 'block', mb: 0.25 }}>Description</Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem' }}>{caseData.description}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#c9a96e', mb: 1.5 }}>Assigned Advocates</Typography>
                {(caseData.assignedAdvocates || []).length > 0 ? (
                  <List dense disablePadding>
                    {caseData.assignedAdvocates.map((a, i) => (
                      <ListItem key={i} sx={{ px: 0, py: 0.75 }}>
                        <ListItemAvatar sx={{ minWidth: 38 }}>
                          <Avatar sx={{ bgcolor: '#c9a96e18', color: '#c9a96e', width: 32, height: 32 }}><Person sx={{ fontSize: 16 }} /></Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={<Typography variant="body2" sx={{ color: '#fff', fontSize: '0.8125rem' }}>{a.name}</Typography>}
                          secondary={<Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>{a.email}</Typography>} />
                      </ListItem>
                    ))}
                  </List>
                ) : <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>No advocates assigned</Typography>}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            {(caseData.hearingHistory || []).length > 0 ? (
              <List dense disablePadding>
                {caseData.hearingHistory.map((h, i) => (
                  <ListItem key={i} sx={{ px: 0, py: 1.5, borderBottom: i < caseData.hearingHistory.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <ListItemAvatar sx={{ minWidth: 42 }}>
                      <Avatar sx={{ bgcolor: '#ff980018', color: '#ff9800', width: 36, height: 36 }}><CalendarMonth sx={{ fontSize: 16 }} /></Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ color: '#fff', fontSize: '0.8125rem' }}>{h.date ? format(parseISO(h.date), 'MMM dd, yyyy') : 'Date TBD'}</Typography>}
                      secondary={<Box><Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', display: 'block' }}>{h.notes || 'No notes'}</Typography>
                        {h.outcome && <Chip size="small" label={h.outcome} sx={{ mt: 0.5, height: 18, fontSize: '0.6rem', bgcolor: '#4caf5020', color: '#4caf50' }} />}</Box>} />
                  </ListItem>
                ))}
              </List>
            ) : <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 4 }}>No hearing history</Typography>}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            {(caseData.orders || []).length > 0 ? (
              <List dense disablePadding>
                {caseData.orders.map((o, i) => (
                  <ListItem key={i} sx={{ px: 0, py: 1.5, borderBottom: i < caseData.orders.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <ListItemAvatar sx={{ minWidth: 42 }}>
                      <Avatar sx={{ bgcolor: '#4caf5018', color: '#4caf50', width: 36, height: 36 }}><CheckCircle sx={{ fontSize: 16 }} /></Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ color: '#fff', fontSize: '0.8125rem' }}>{o.date ? format(parseISO(o.date), 'MMM dd, yyyy') : ''}</Typography>}
                      secondary={<Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>{o.description}</Typography>} />
                  </ListItem>
                ))}
              </List>
            ) : <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 4 }}>No court orders</Typography>}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tab} index={3}>
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            {(caseData.documents || []).length > 0 ? (
              <List dense disablePadding>
                {caseData.documents.map((d, i) => (
                  <ListItem key={i} sx={{ px: 0, py: 1.5, borderBottom: i < caseData.documents.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <ListItemAvatar sx={{ minWidth: 42 }}>
                      <Avatar sx={{ bgcolor: '#9c27b018', color: '#9c27b0', width: 36, height: 36 }}><Description sx={{ fontSize: 16 }} /></Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ color: '#fff', fontSize: '0.8125rem' }}>{d.title || d.originalName}</Typography>}
                      secondary={<Box><Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', display: 'block' }}>{d.category} · {d.createdAt ? format(parseISO(d.createdAt), 'MMM dd, yyyy') : ''}</Typography>
                        {d.filePath && <Button size="small" onClick={() => handleDownload(d)} sx={{ mt: 0.5, textTransform: 'none', fontSize: '0.7rem', color: '#c9a96e' }}>Download</Button>}</Box>} />
                  </ListItem>
                ))}
              </List>
            ) : <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 4 }}>No documents uploaded</Typography>}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tab} index={4}>
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            {timeline.length > 0 ? (
              <List dense disablePadding>
                {timeline.map((t, i) => (
                  <ListItem key={i} sx={{ px: 0, py: 1.5, borderBottom: i < timeline.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <ListItemAvatar sx={{ minWidth: 42 }}>
                      <Avatar sx={{ bgcolor: (TIMELINE_COLORS[t.type] || '#9e9e9e') + '18', color: TIMELINE_COLORS[t.type] || '#9e9e9e', width: 36, height: 36 }}>
                        {TIMELINE_ICONS[t.type] || <Gavel sx={{ fontSize: 16 }} />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" fontWeight={500} sx={{ color: '#fff', fontSize: '0.8125rem' }}>{t.title}</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>{t.date ? format(parseISO(t.date), 'MMM dd, yyyy') : ''}</Typography>
                      </Box>}
                      secondary={<Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>{t.description}{t.outcome ? ` — ${t.outcome}` : ''}</Typography>} />
                  </ListItem>
                ))}
              </List>
            ) : <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 4 }}>No timeline events</Typography>}
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
}
