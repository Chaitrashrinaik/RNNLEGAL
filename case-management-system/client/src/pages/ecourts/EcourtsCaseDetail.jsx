import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Skeleton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Gavel as GavelIcon,
  People as PeopleIcon,
  Description as DescriptionIcon,
  History as HistoryIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import axios from '../../api/axios';

const STATUS_COLORS = {
  pending: 'warning',
  disposed: 'success',
  active: 'info',
};

const STATUS_LABELS = {
  pending: 'Pending',
  disposed: 'Disposed',
  active: 'Active',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function EcourtsCaseDetail() {
  const { cnr } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [markdownDialog, setMarkdownDialog] = useState({ open: false, content: '', title: '' });
  const [markdownLoading, setMarkdownLoading] = useState(false);

  const fetchCaseData = useCallback(async () => {
    try {
      setError(null);
      const { data: res } = await axios.get(`/ecourts/case/${cnr}`);
      if (res.success && res.data) {
        const raw = res.data.courtCaseData || res.data;
        const mapped = {
          cnr: raw.cnr || cnr,
          caseTitle: raw.petitioners?.length ? `${raw.petitioners[0]} vs ${raw.respondents?.[0] || 'Unknown'}` : raw.caseTypeRaw || raw.caseType || '',
          caseNumber: raw.filingNumber || raw.registrationNumber || raw.caseNumber || '',
          caseType: raw.caseTypeRaw || raw.caseType || '',
          courtName: raw.courtName || '',
          court: raw.district || '',
          judge: raw.judges?.join(', ') || '',
          status: raw.caseStatus || '',
          stage: raw.stageOfCaseRaw || raw.stageOfCase || '',
          filingDate: raw.filingDate || null,
          nextHearingDate: raw.nextHearingDate || null,
          parties: [
            ...(raw.petitioners || []).map(p => ({ name: p, type: 'Petitioner' })),
            ...(raw.respondents || []).map(r => ({ name: r, type: 'Respondent' })),
          ],
          advocates: [
            ...(raw.petitionerAdvocates || []).map(a => ({ name: a, type: 'Petitioner Advocate' })),
            ...(raw.respondentAdvocates || []).map(a => ({ name: a, type: 'Respondent Advocate' })),
          ],
          hearings: raw.historyOfCaseHearings || [],
          actsAndSections: raw.actsAndSections || '',
          caseCategory: raw.caseCategoryFacetPath || '',
          lastHearingDate: raw.lastHearingDate || null,
          firstHearingDate: raw.firstHearingDate || null,
          processes: raw.processes || [],
          filingToFirstHearingDays: raw.filingToFirstHearingDays || 0,
          linkedCases: raw.linkCases || [],
        };
        setCaseData(mapped);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load case details.');
    }
  }, [cnr]);

  const fetchOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      const { data: res } = await axios.get(`/ecourts/case/${cnr}/orders`);
      if (res.success) setOrders(res.data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [cnr]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCaseData(), fetchOrders()]).finally(() => setLoading(false));
  }, [fetchCaseData, fetchOrders]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await axios.post(`/ecourts/refresh/${cnr}`);
      await Promise.all([fetchCaseData(), fetchOrders()]);
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewOrder = async (order) => {
    setMarkdownDialog({ open: true, content: '', title: order.title || 'Order' });
    setMarkdownLoading(true);
    try {
      const { data: res } = await axios.get(`/ecourts/case/${cnr}/orders/${order.id}/markdown`);
      if (res.success) {
        setMarkdownDialog((prev) => ({ ...prev, content: res.data.markdown || 'No content available.' }));
      }
    } catch {
      setMarkdownDialog((prev) => ({ ...prev, content: 'Failed to load order content.' }));
    } finally {
      setMarkdownLoading(false);
    }
  };

  const getPartyTypeColor = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('petitioner')) return 'primary';
    if (t.includes('respondent')) return 'secondary';
    return 'default';
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={120} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={80} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={260} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={260} />
          </Grid>
          <Grid item xs={12}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (error) {
    let friendlyError = error;
    if (error.includes('CASE_NOT_FOUND') || error.includes('not found')) {
      friendlyError = `No case found for CNR "${cnr}". Please verify the CNR number and try again.`;
    } else if (error.includes('404')) {
      friendlyError = `No case found for CNR "${cnr}". Please verify the CNR number.`;
    } else if (error.includes('401') || error.includes('Unauthorized')) {
      friendlyError = 'API authentication failed. Please check the API key configuration.';
    } else if (error.includes('429')) {
      friendlyError = 'Too many requests. Please wait a moment and try again.';
    } else if (error.includes('500') || error.includes('Internal Server Error')) {
      friendlyError = 'The court service is temporarily unavailable. Please try again later.';
    } else if (error.length > 100) {
      friendlyError = 'Failed to load case details. Please check the CNR number and try again.';
    }

    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/ecourts')} sx={{ mb: 2 }}>
          Back
        </Button>
        <Alert severity="error" action={<Button onClick={handleRefresh}>Retry</Button>}>
          {friendlyError}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate('/ecourts')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Case Detail
        </Typography>
        <Tooltip title="Refresh data">
          <span>
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {caseData && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                CNR: {caseData.cnr}
              </Typography>
              <Typography variant="h6">{caseData.caseTitle || 'Untitled Case'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {caseData.courtName || caseData.court}
              </Typography>
            </Box>
            <Chip
              label={STATUS_LABELS[caseData.status] || caseData.status}
              color={STATUS_COLORS[caseData.status] || 'default'}
              variant="filled"
              sx={{ fontWeight: 600 }}
            />
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={<InfoIcon color="primary" />}
              title="Case Information"
            />
            <CardContent>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {[
                      ['CNR', caseData?.cnr],
                      ['Case Number', caseData?.caseNumber],
                      ['Case Type', caseData?.caseType],
                      ['Court', caseData?.courtName || caseData?.court],
                      ['Judge', caseData?.judge],
                      ['Status', caseData?.status],
                      ['Stage', caseData?.stage],
                      ['Filing Date', formatDate(caseData?.filingDate)],
                      ['Next Hearing', formatDate(caseData?.nextHearingDate)],
                    ].map(([label, value]) => (
                      <TableRow key={label}>
                        <TableCell sx={{ fontWeight: 600, width: '40%' }}>{label}</TableCell>
                        <TableCell>{value || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={<PeopleIcon color="primary" />}
              title="Parties"
            />
            <CardContent>
              {caseData?.parties?.length > 0 ? (
                <List dense disablePadding>
                  {caseData.parties.map((party, idx) => (
                    <ListItem key={idx} disableGutters>
                      <ListItemText
                        primary={party.name}
                        secondary={party.type}
                      />
                      <Chip
                        label={party.type}
                        color={getPartyTypeColor(party.type)}
                        size="small"
                        variant="outlined"
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No party information available.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={<GavelIcon color="primary" />}
              title="Advocates"
            />
            <CardContent>
              {caseData?.advocates?.length > 0 ? (
                <List dense disablePadding>
                  {caseData.advocates.map((adv, idx) => (
                    <ListItem key={idx} disableGutters>
                      <ListItemText
                        primary={adv.name}
                        secondary={adv.type}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No advocate information available.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={<HistoryIcon color="primary" />}
              title="Hearing History"
            />
            <CardContent>
              {caseData?.hearings?.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Judge</TableCell>
                        <TableCell>Purpose</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {caseData.hearings.slice().reverse().map((hearing, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{formatDate(hearing.hearingDate || hearing.date)}</TableCell>
                          <TableCell>{hearing.judge || '—'}</TableCell>
                          <TableCell>{hearing.purposeOfListing || hearing.purpose || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No hearing history available.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardHeader
              avatar={<DescriptionIcon color="primary" />}
              title="Orders & Judgments"
            />
            <CardContent>
              {ordersLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress />
                </Box>
              ) : orders.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>{formatDate(order.date)}</TableCell>
                          <TableCell>
                            <Chip label={order.type} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{order.title || '—'}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              startIcon={<ViewIcon />}
                              onClick={() => handleViewOrder(order)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No orders or judgments available.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={markdownDialog.open}
        onClose={() => setMarkdownDialog({ open: false, content: '', title: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{markdownDialog.title}</DialogTitle>
        <DialogContent dividers>
          {markdownLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                lineHeight: 1.6,
              }}
            >
              {markdownDialog.content}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMarkdownDialog({ open: false, content: '', title: '' })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
