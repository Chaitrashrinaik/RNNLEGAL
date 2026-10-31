import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Tabs, Tab, Divider, Avatar, List, ListItem, ListItemAvatar, ListItemText, TextField, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Chip, LinearProgress, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, Tooltip, Stack } from '@mui/material';
import Grid from '../../components/Grid';
import BackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import HearingIcon from '@mui/icons-material/Schedule';
import DocIcon from '@mui/icons-material/Description';
import NoteIcon from '@mui/icons-material/Note';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import Gavel from '@mui/icons-material/Gavel';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import LocationOn from '@mui/icons-material/LocationOn';
import PaymentsIcon from '@mui/icons-material/Payments';
import CourtIcon from '@mui/icons-material/AccountBalance';
import TimelineIcon from '@mui/icons-material/Timeline';
import TaskIcon from '@mui/icons-material/Assignment';
import TeamIcon from '@mui/icons-material/Group';
import UpdateIcon from '@mui/icons-material/Update';
import AttachMoney from '@mui/icons-material/AttachMoney';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Info from '@mui/icons-material/Info';
import EditNote from '@mui/icons-material/EditNote';
import HistoryIcon from '@mui/icons-material/History';
import Summarize from '@mui/icons-material/Summarize';
import Refresh from '@mui/icons-material/Refresh';
import ViewIcon from '@mui/icons-material/Visibility';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import StatusChip from '../../components/StatusChip';
import DocumentViewer from '../../components/DocumentViewer';
import toast from 'react-hot-toast';

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ py: 3 }}>{children}</Box> : null;
}

function InfoRow({ label, value, span = 6 }) {
  return (
    <Grid item xs={12}>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value || '-'}</Typography>
    </Grid>
  );
}

function StatMini({ label, value, color = 'primary.main' }) {
  return (
    <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 1, bgcolor: 'rgba(37,51,73,0.3)' }}>
      <Typography variant="h6" sx={{ fontWeight: 700, color }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
    </Box>
  );
}

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [hearingDialog, setHearingDialog] = useState(false);
  const [updateHearingDialog, setUpdateHearingDialog] = useState(false);
  const [updateHearingData, setUpdateHearingData] = useState(null);
  const [orderDialog, setOrderDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [caseUpdateDialog, setCaseUpdateDialog] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [hearingForm, setHearingForm] = useState({ date: null, notes: '', outcome: '', arguments: '', documentsSubmitted: '', judgeRemarks: '', nextSteps: '', purpose: '', courtDirections: '', orderPassed: '', nextHearingDate: null, nextHearingPurpose: '' });
  const [updateForm, setUpdateForm] = useState({ notes: '', outcome: '', arguments: '', documentsSubmitted: '', judgeRemarks: '', nextSteps: '', courtDirections: '', orderPassed: '', nextHearingDate: null, nextHearingPurpose: '' });
  const [orderForm, setOrderForm] = useState({ date: null, description: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: 'cash', transactionRef: '', receiptNumber: '', paymentDate: new Date(), notes: '' });
  const [caseUpdateForm, setCaseUpdateForm] = useState({ title: '', description: '', priority: 'medium' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', dueDate: null, startDate: null, taskCategory: '', taskType: '', assignedTo: '', relatedHearingDate: null });
  const [newNote, setNewNote] = useState('');
  const [caseUpdates, setCaseUpdates] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [taskTypes, setTaskTypes] = useState([]);
  const [taskCategories, setTaskCategories] = useState({});
  const [docCategory, setDocCategory] = useState('other');
  const [team, setTeam] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);
  const [caseActivities, setCaseActivities] = useState([]);

  useEffect(() => { fetchCase(); fetchCaseUpdates(); fetchTasks(); fetchPaymentSummary(); fetchTaskTypes(); fetchTaskCategories(); fetchCaseActivities(); fetchTeam(); }, [id]);

  const fetchCase = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/cases/${id}`);
      setCaseData(data.data || data.case || data);
    } catch (err) {
      const msg = err.response?.status === 404 ? 'Case not found. It may have been deleted.' : 'Failed to load case. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const fetchCaseUpdates = async () => {
    try { const { data } = await api.get(`/case-updates/${id}`); setCaseUpdates(data.data || []); } catch {}
  };

  const fetchTasks = async () => {
    try { const { data } = await api.get('/tasks', { params: { caseId: id, limit: 100 } }); setTasks(data.data || []); } catch {}
  };

  const fetchPaymentSummary = async () => {
    try { const { data } = await api.get(`/payments/summary/${id}`); setPaymentSummary(data.data); setPayments(data.data?.paymentHistory || []); } catch {}
  };

  const fetchTaskTypes = async () => {
    try { const { data } = await api.get('/tasks/types'); setTaskTypes(data.data || []); } catch {}
  };

  const fetchTaskCategories = async () => {
    try { const { data } = await api.get('/tasks/categories'); setTaskCategories(data.data || {}); } catch {}
  };

  const fetchCaseActivities = async () => {
    try { const { data } = await api.get(`/activity-logs/case/${id}`); setCaseActivities(data.data || []); } catch {}
  };

  const fetchTeam = async () => {
    try { const { data } = await api.get('/users'); setTeam((data.data || []).filter(u => ['admin', 'advocate'].includes(u.role) && u.isActive !== false)); } catch {}
  };

  const canEdit = hasPermission('cases', 'edit') && (user?.role !== 'advocate' || (caseData?.assignedAdvocates || []).some(a => (a.id || a._id) === user?.id));
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const handleAddHearing = async () => {
    try {
      await api.post(`/cases/${id}/hearings`, {
        date: hearingForm.date?.toISOString(), notes: hearingForm.notes, outcome: hearingForm.outcome,
        arguments: hearingForm.arguments, documentsSubmitted: hearingForm.documentsSubmitted,
        judgeRemarks: hearingForm.judgeRemarks, nextSteps: hearingForm.nextSteps,
        nextHearingDate: hearingForm.nextHearingDate?.toISOString(), purpose: hearingForm.purpose,
        courtDirections: hearingForm.courtDirections, orderPassed: hearingForm.orderPassed,
        nextHearingPurpose: hearingForm.nextHearingPurpose,
      });
      toast.success('Hearing added');
      setHearingDialog(false);
      setHearingForm({ date: null, notes: '', outcome: '', arguments: '', documentsSubmitted: '', judgeRemarks: '', nextSteps: '', purpose: '', courtDirections: '', orderPassed: '', nextHearingDate: null, nextHearingPurpose: '' });
      fetchCase();
    } catch { toast.error('Failed to add hearing'); }
  };

  const handleUpdateHearing = async () => {
    if (!updateHearingData) return;
    try {
      const ref = updateHearingData.hearingId || updateHearingData.index;
      await api.put(`/cases/${id}/hearings/${ref}`, updateForm);
      toast.success('Hearing updated');
      setUpdateHearingDialog(false);
      setUpdateHearingData(null);
      fetchCase();
    } catch { toast.error('Failed to update hearing'); }
  };

  const handleUpdateOutcome = async (outcome) => {
    try { await api.put(`/cases/${id}/outcome`, { caseOutcome: outcome }); toast.success(`Case marked as ${outcome}`); fetchCase(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleAddOrder = async () => {
    try {
      await api.post(`/cases/${id}/orders`, { date: orderForm.date?.toISOString(), description: orderForm.description });
      toast.success('Order added');
      setOrderDialog(false); setOrderForm({ date: null, description: '' }); fetchCase();
    } catch { toast.error('Failed to add order'); }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try { await api.post(`/cases/${id}/notes`, { text: newNote }); toast.success('Note added'); setNewNote(''); fetchCase(); }
    catch { toast.error('Failed to add note'); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', docCategory);
    setUploading(true);
    try { await api.post(`/cases/${id}/documents`, formData, { onUploadProgress: (ev) => { if (ev.total) setUploadProgress(Math.round((ev.loaded * 100) / ev.total)); } }); toast.success('Document uploaded'); fetchCase(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to upload document'); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  const handleViewDoc = (doc) => {
    setViewerDoc({
      _id: doc._id || doc.id,
      name: doc.originalName || doc.title || 'Document',
      fileUrl: doc.fileUrl || doc.cloudUrl || '',
      cloudUrl: doc.cloudUrl || '',
      mimeType: doc.mimeType || '',
      fileSize: doc.fileSize || 0,
    });
    setViewerOpen(true);
  };

  const handleDownloadDoc = async (doc) => {
    const docId = doc._id || doc.id;
    const token = localStorage.getItem('token');
    try {
      const { data } = await api.get(`/documents/${docId}/download-url`);
      if (data?.data?.url) {
        const url = data.data.url.includes('?') ? `${data.data.url}&token=${token}` : `${data.data.url}?token=${token}`;
        const link = document.createElement('a');
        link.href = url; link.download = doc.originalName || doc.title; link.target = '_blank';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        return;
      }
    } catch { /* fall through */ }
    const fallbackUrl = doc.fileUrl || doc.cloudUrl;
    if (fallbackUrl) {
      const url = fallbackUrl.includes('?') ? `${fallbackUrl}&token=${token}` : `${fallbackUrl}?token=${token}`;
      window.open(url, '_blank');
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) return toast.error('Enter valid amount');
    try {
      await api.post('/payments', { caseId: id, amount: parseFloat(paymentForm.amount), paymentMethod: paymentForm.paymentMethod, transactionRef: paymentForm.transactionRef, receiptNumber: paymentForm.receiptNumber, paymentDate: paymentForm.paymentDate?.toISOString(), notes: paymentForm.notes });
      toast.success('Payment recorded');
      setPaymentDialog(false);
      setPaymentForm({ amount: '', paymentMethod: 'cash', transactionRef: '', receiptNumber: '', paymentDate: new Date(), notes: '' });
      fetchPaymentSummary(); fetchCase();
    } catch { toast.error('Failed to record payment'); }
  };

  const handleAddCaseUpdate = async () => {
    if (!caseUpdateForm.title.trim()) return toast.error('Title is required');
    try {
      await api.post(`/case-updates/${id}`, caseUpdateForm);
      toast.success('Update added');
      setCaseUpdateDialog(false); setCaseUpdateForm({ title: '', description: '', priority: 'medium' });
      fetchCaseUpdates();
    } catch { toast.error('Failed to add update'); }
  };

  const handleAddTask = async () => {
    if (!taskForm.title.trim()) return toast.error('Title is required');
    try {
      await api.post('/tasks', {
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate?.toISOString(),
        startDate: taskForm.startDate?.toISOString(),
        taskCategory: taskForm.taskCategory || null,
        taskType: taskForm.taskType || taskForm.title,
        assignedTo: taskForm.assignedTo || caseData?.juniorAdvocateId || null,
        caseId: id,
        relatedHearingDate: taskForm.relatedHearingDate?.toISOString(),
      });
      toast.success('Task created');
      setTaskDialog(false);
      setTaskForm({ title: '', description: '', priority: 'medium', dueDate: null, startDate: null, taskCategory: '', taskType: '', assignedTo: '', relatedHearingDate: null });
      fetchTasks();
    } catch { toast.error('Failed to create task'); }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try { await api.patch(`/tasks/${taskId}/status`, { status: newStatus }); toast.success('Task updated'); fetchTasks(); }
    catch { toast.error('Failed'); }
  };

  const getTimeline = () => {
    if (!caseData) return [];
    const events = [];
    events.push({ type: 'created', date: caseData.createdAt, title: 'Case Created', icon: <AddIcon />, color: '#4caf50' });
    if (caseData.filingDate) events.push({ type: 'filed', date: caseData.filingDate, title: 'Case Filed in Court', icon: <CourtIcon />, color: '#2196f3' });
    (caseData.hearings || []).forEach(h => {
      events.push({ type: 'hearing', date: h.date, title: h.outcome || 'Hearing', description: h.notes, icon: <Gavel />, color: '#ff9800' });
      if (h.nextHearingDate) events.push({ type: 'next-hearing', date: h.nextHearingDate, title: 'Next Hearing Scheduled', icon: <CalendarMonth />, color: '#9c27b0' });
    });
    (caseData.orders || []).forEach(o => {
      events.push({ type: 'order', date: o.date, title: 'Court Order', description: o.description, icon: <Summarize />, color: '#f44336' });
    });
    (caseData.notes || []).forEach(n => {
      events.push({ type: 'note', date: n.date, title: 'Note Added', description: n.text, icon: <NoteIcon />, color: '#607d8b' });
    });
    (payments || []).forEach(p => {
      events.push({ type: 'payment', date: p.paymentDate, title: `Payment – ₹${Number(p.amount).toLocaleString()}`, icon: <PaymentsIcon />, color: '#4caf50' });
    });
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    return events;
  };

  const getDocumentCategoryLabel = (cat) => {
    const map = { petition: 'Petition', complaint: 'Complaint', 'written-statement': 'Written Statement', application: 'Application', evidence: 'Evidence', 'court-order': 'Court Order', notice: 'Notice', summons: 'Summons', judgment: 'Judgment', 'id-proof': 'ID Proof', agreement: 'Agreement', 'supporting': 'Supporting Document', other: 'Other' };
    return map[cat] || cat || 'Other';
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress sx={{ color: 'primary.main' }} /></Box>;
  if (error) return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 600, mx: 'auto', textAlign: 'center', mt: 8 }}>
      <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mr: 2 }}>Go Back</Button>
      <Button variant="contained" startIcon={<Refresh />} onClick={fetchCase}>Retry</Button>
    </Box>
  );
  if (!caseData) return null;

  const nextHearing = caseData.hearings?.filter(h => !h.outcome && h.date && new Date(h.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date))[0] || (caseData.nextHearingDate ? { date: caseData.nextHearingDate, purpose: caseData.nextHearingPurpose } : null);
  const pendingTasks = (tasks || []).filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box className="page-container">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button startIcon={<BackIcon />} onClick={() => navigate('/cases')} sx={{ color: 'text.secondary' }}>Cases</Button>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{caseData.caseNumber}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{caseData.caseTitle}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusChip status={caseData.status} />
            <StatusChip status={caseData.priority} type="priority" />
            {caseData.caseOutcome && <StatusChip status={caseData.caseOutcome} />}
            {canEdit && (
              <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                <Button size="small" variant={caseData.caseOutcome === 'won' ? 'contained' : 'outlined'} color="success" onClick={() => handleUpdateOutcome('won')}>Won</Button>
                <Button size="small" variant={caseData.caseOutcome === 'lost' ? 'contained' : 'outlined'} color="error" onClick={() => handleUpdateOutcome('lost')}>Lost</Button>
                <Button size="small" variant={caseData.caseOutcome === 'settled' ? 'contained' : 'outlined'} color="warning" onClick={() => handleUpdateOutcome('settled')}>Settled</Button>
              </Box>
            )}
            {canEdit && <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/cases/${id}/edit`)} sx={{ ml: 1 }}>Edit</Button>}
          </Box>
        </Box>

        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: '1px solid rgba(37, 51, 73, 0.5)', mb: 0, '& .MuiTab-root': { color: 'text.secondary', '&.Mui-selected': { color: 'primary.main' }, minHeight: 40, py: 0 } }}>
          <Tab label="Overview" icon={<Info sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label={`Updates (${caseUpdates.length})`} icon={<UpdateIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label={`Hearings (${caseData.hearings?.length || 0})`} icon={<Gavel sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Next Hearing" icon={<CalendarMonth sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label={`Documents (${caseData.documents?.length || 0})`} icon={<DocIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Payments" icon={<PaymentsIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label={`Tasks (${pendingTasks.length})`} icon={<TaskIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Timeline" icon={<TimelineIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label={`Notes (${caseData.notes?.length || 0})`} icon={<NoteIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Advocates" icon={<TeamIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="Activity" icon={<HistoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>

        {/* ============ TAB 0: OVERVIEW ============ */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Case Information</Typography>
                  <Grid container spacing={2}>
                    <InfoRow label="Case Type" value={caseData.caseType} />
                    <InfoRow label="Case Category" value={caseData.caseCategory} />
                    <InfoRow label="Court" value={caseData.court} />
                    <InfoRow label="Court Location" value={caseData.courtLocation} />
                    <InfoRow label="Court Name" value={caseData.courtName} />
                    <InfoRow label="Court Number" value={caseData.courtNumber} />
                    <InfoRow label="Judge" value={caseData.judgeName} />
                    <InfoRow label="Location" value={caseData.location} />
                    <InfoRow label="Filing Date" value={caseData.filingDate ? format(new Date(caseData.filingDate), 'dd MMM yyyy') : '-'} />
                    <InfoRow label="Registration Date" value={caseData.caseRegistrationDate ? format(new Date(caseData.caseRegistrationDate), 'dd MMM yyyy') : '-'} />
                    <InfoRow label="Case Stage" value={caseData.caseStage} />
                    <InfoRow label="Opposite Party" value={caseData.oppositeParty} />
                    <InfoRow label="Opposite Party Lawyer" value={caseData.oppositePartyLawyer} />
                    <InfoRow label="CNR Number" value={caseData.cnr} />
                    <InfoRow label="Last Updated" value={caseData.updatedAt ? format(new Date(caseData.updatedAt), 'dd MMM yyyy, hh:mm a') : '-'} />
                  </Grid>
                  {caseData.description && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>Description</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{caseData.description}</Typography>
                    </Box>
                  )}
                  {caseData.tags?.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {caseData.tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ borderColor: 'rgba(201, 169, 110, 0.3)', color: 'text.secondary' }} />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>

              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Case Status</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}><StatMini label="Status" value={caseData.status?.toUpperCase()} color="primary.main" /></Grid>
                    <Grid item xs={6} sm={3}><StatMini label="Priority" value={caseData.priority?.toUpperCase()} color={caseData.priority === 'urgent' ? '#f44336' : caseData.priority === 'high' ? '#ff9800' : '#4caf50'} /></Grid>
                    <Grid item xs={6} sm={3}><StatMini label="Hearings" value={caseData.hearings?.length || 0} /></Grid>
                    <Grid item xs={6} sm={3}><StatMini label="Orders" value={caseData.orders?.length || 0} /></Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Financial Summary</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}><StatMini label="Total Fee" value={`₹${Number(paymentSummary?.totalFee || caseData.totalFee || 0).toLocaleString()}`} color="#2196f3" /></Grid>
                    <Grid item xs={6} sm={3}><StatMini label="Paid" value={`₹${Number(paymentSummary?.amountPaid || caseData.amountPaid || 0).toLocaleString()}`} color="#4caf50" /></Grid>
                    <Grid item xs={6} sm={3}><StatMini label="Pending" value={`₹${Number(paymentSummary?.amountPending || caseData.amountPending || 0).toLocaleString()}`} color="#f44336" /></Grid>
                    <Grid item xs={6} sm={3}>
                      <StatMini label="Next Due" value={caseData.paymentDueDate ? format(new Date(caseData.paymentDueDate), 'dd/MM/yy') : '-'} color="#ff9800" />
                    </Grid>
                  </Grid>
                  {(paymentSummary?.totalFee || caseData.totalFee) > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Payment Progress</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {Math.round(((paymentSummary?.amountPaid || caseData.amountPaid || 0) / (paymentSummary?.totalFee || caseData.totalFee || 1)) * 100)}%
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={((paymentSummary?.amountPaid || caseData.amountPaid || 0) / (paymentSummary?.totalFee || caseData.totalFee || 1)) * 100} sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(37,51,73,0.3)', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: '#4caf50' } }} />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              {caseData.client && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Client</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>{caseData.client.name?.charAt(0)}</Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{caseData.client.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{caseData.client.email}</Typography>
                      </Box>
                    </Box>
                    {caseData.client.phone && <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>📞 {caseData.client.phone}</Typography>}
                    {caseData.client.company && <Typography variant="body2" sx={{ color: 'text.secondary' }}>🏢 {caseData.client.company}</Typography>}
                  </CardContent>
                </Card>
              )}

              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Assigned Advocates</Typography>
                  {caseData.seniorAdvocate && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Senior Advocate</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: '0.75rem' }}>{caseData.seniorAdvocate.name?.charAt(0)}</Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{caseData.seniorAdvocate.name}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{caseData.seniorAdvocate.advocateId || ''} {caseData.seniorAdvocate.barCouncilNumber ? `• BCI: ${caseData.seniorAdvocate.barCouncilNumber}` : ''}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                  {caseData.juniorAdvocate && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Junior Advocate</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.light', color: 'secondary.contrastText', fontSize: '0.75rem' }}>{caseData.juniorAdvocate.name?.charAt(0)}</Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{caseData.juniorAdvocate.name}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{caseData.juniorAdvocate.advocateId || ''} {caseData.juniorAdvocate.barCouncilNumber ? `• BCI: ${caseData.juniorAdvocate.barCouncilNumber}` : ''}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                  {caseData.supportingAdvocates?.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Supporting Advocate(s)</Typography>
                      {caseData.supportingAdvocates.map((adv) => (
                        <Box key={adv._id || adv.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: 'grey.500', fontSize: '0.7rem' }}>{adv.name?.charAt(0)}</Avatar>
                          <Typography variant="body2">{adv.name}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                  {!caseData.seniorAdvocate && !caseData.juniorAdvocate && (caseData.assignedAdvocates || []).length === 0 && (
                    <Typography variant="body2" color="text.secondary">No advocates assigned.</Typography>
                  )}
                  {caseData.assignedOn && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>Assigned On: {format(new Date(caseData.assignedOn), 'dd MMMM yyyy')}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Quick Summary</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>Next Hearing</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{nextHearing?.date ? format(new Date(nextHearing.date), 'dd MMM yyyy') : 'None'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>Pending Tasks</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: overdueTasks.length > 0 ? '#f44336' : 'inherit' }}>{pendingTasks.length}{overdueTasks.length > 0 ? ` (${overdueTasks.length} overdue)` : ''}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>Documents</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{caseData.documents?.length || 0}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>Payments</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{payments.length}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Quick Actions</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button fullWidth variant="outlined" startIcon={<HearingIcon />} onClick={() => { setActiveTab(2); setHearingDialog(true); }}>Add Hearing</Button>
                    <Button fullWidth variant="outlined" startIcon={<UploadIcon />} component="label">Upload Document<input type="file" hidden onChange={handleUpload} /></Button>
                    <Button fullWidth variant="outlined" startIcon={<PaymentsIcon />} onClick={() => setPaymentDialog(true)}>Record Payment</Button>
                    <Button fullWidth variant="outlined" startIcon={<UpdateIcon />} onClick={() => setCaseUpdateDialog(true)}>Add Update</Button>
                    <Button fullWidth variant="outlined" startIcon={<TaskIcon />} onClick={() => setTaskDialog(true)}>Create Task</Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* ============ TAB 1: CASE UPDATES ============ */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCaseUpdateDialog(true)}>Add Update</Button>
          </Box>
          {caseUpdates.length === 0 ? (
            <Typography sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No updates recorded yet</Typography>
          ) : (
            caseUpdates.map((u) => (
              <Card key={u._id || u.id} sx={{ mb: 2 }}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{u.title}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>Added by {u.addedByName || 'Unknown'} • {u.createdAt ? format(new Date(u.createdAt), 'dd MMM yyyy, hh:mm a') : '-'}</Typography>
                    </Box>
                    <StatusChip status={u.priority} type="priority" />
                  </Box>
                  {u.description && <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>{u.description}</Typography>}
                </CardContent>
              </Card>
            ))
          )}
        </TabPanel>

        {/* ============ TAB 2: HEARINGS ============ */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setHearingDialog(true)}>Add Hearing</Button>
          </Box>
          {(!caseData.hearings || caseData.hearings.length === 0) ? (
            <Typography sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No hearings recorded yet</Typography>
          ) : (
            <Box sx={{ pl: 3, borderLeft: '2px solid rgba(201, 169, 110, 0.3)' }}>
              {caseData.hearings?.slice().reverse().map((h, reverseIdx) => {
                const realIdx = caseData.hearings.length - 1 - reverseIdx;
                return (
                  <Card key={h._id || realIdx} sx={{ mb: 2, position: 'relative' }}>
                    <Box sx={{ position: 'absolute', left: -29, top: 20, width: 12, height: 12, borderRadius: '50%', backgroundColor: h.outcome ? '#4caf50' : 'primary.main', border: '2px solid #1a2332' }} />
                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{h.date ? format(new Date(h.date), 'dd MMMM yyyy') : '-'}</Typography>
                          {h.purpose && <Typography variant="caption" sx={{ color: 'primary.main' }}>Purpose: {h.purpose}</Typography>}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          {h.outcome && <StatusChip status={h.outcome} />}
                          {canEdit && (
                            <IconButton size="small" onClick={() => {
                              setUpdateHearingData({ index: realIdx, hearingId: h.id || h._id, hearing: h });
                              setUpdateForm({
                                notes: h.notes || '', outcome: h.outcome || '', arguments: h.arguments || '',
                                documentsSubmitted: h.documentsSubmitted || '', judgeRemarks: h.judgeRemarks || '',
                                nextSteps: h.nextSteps || '', courtDirections: h.courtDirections || '',
                                orderPassed: h.orderPassed || '', nextHearingDate: h.nextHearingDate ? new Date(h.nextHearingDate) : null,
                                nextHearingPurpose: h.nextHearingPurpose || '',
                              });
                              setUpdateHearingDialog(true);
                            }}><EditNote fontSize="small" /></IconButton>
                          )}
                        </Box>
                      </Box>
                      {h.notes && <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>{h.notes}</Typography>}
                      {h.arguments && <Box sx={{ mt: 1 }}><Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>Arguments</Typography><Typography variant="body2" sx={{ color: 'text.secondary' }}>{h.arguments}</Typography></Box>}
                      {h.documentsSubmitted && <Box sx={{ mt: 1 }}><Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>Documents Submitted</Typography><Typography variant="body2" sx={{ color: 'text.secondary' }}>{h.documentsSubmitted}</Typography></Box>}
                      {h.courtDirections && <Box sx={{ mt: 1 }}><Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 600 }}>Court Directions</Typography><Typography variant="body2" sx={{ color: 'text.secondary' }}>{h.courtDirections}</Typography></Box>}
                      {h.judgeRemarks && <Box sx={{ mt: 1 }}><Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>Judge Remarks</Typography><Typography variant="body2" sx={{ color: 'text.secondary' }}>{h.judgeRemarks}</Typography></Box>}
                      {h.orderPassed && <Box sx={{ mt: 1 }}><Typography variant="caption" sx={{ color: '#f44336', fontWeight: 600 }}>Order Passed</Typography><Typography variant="body2" sx={{ color: 'text.secondary' }}>{h.orderPassed}</Typography></Box>}
                      {h.nextSteps && <Box sx={{ mt: 1 }}><Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>Next Steps</Typography><Typography variant="body2" sx={{ color: 'text.secondary' }}>{h.nextSteps}</Typography></Box>}
                      {h.summary && <Alert severity="info" sx={{ mt: 1, py: 0 }}><Typography variant="body2" sx={{ fontStyle: 'italic' }}>{h.summary}</Typography></Alert>}
                      {h.court && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}><LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} /><Typography variant="caption" sx={{ color: 'text.secondary' }}>{h.court}{h.courtHall ? `, Hall ${h.courtHall}` : ''}</Typography></Box>}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </TabPanel>

        {/* ============ TAB 3: NEXT HEARING ============ */}
        <TabPanel value={activeTab} index={3}>
          {nextHearing ? (
            <Card sx={{ maxWidth: 700 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CalendarMonth sx={{ color: 'primary.main', fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>NEXT HEARING</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}><Typography variant="caption" sx={{ color: 'text.secondary' }}>Date</Typography><Typography variant="body1" sx={{ fontWeight: 600 }}>{nextHearing.date ? format(new Date(nextHearing.date), 'dd MMMM yyyy') : '-'}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" sx={{ color: 'text.secondary' }}>Purpose</Typography><Typography variant="body1" sx={{ fontWeight: 600 }}>{nextHearing.purpose || nextHearing.nextHearingPurpose || 'Not specified'}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" sx={{ color: 'text.secondary' }}>Court</Typography><Typography variant="body1">{caseData.courtName || caseData.court}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" sx={{ color: 'text.secondary' }}>Judge</Typography><Typography variant="body1">{caseData.judgeName || '-'}</Typography></Grid>
                </Grid>
                {nextHearing.attendedBy && <Box sx={{ mt: 2 }}><Typography variant="caption" sx={{ color: 'text.secondary' }}>Assigned Advocate</Typography><Typography variant="body1">{nextHearing.attendedBy}</Typography></Box>}
                {pendingTasks.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Preparation Tasks</Typography>
                    {pendingTasks.map(t => (
                      <Box key={t._id || t.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <CheckCircle sx={{ fontSize: 18, color: t.status === 'completed' ? '#4caf50' : 'text.secondary', cursor: 'pointer' }} onClick={() => handleUpdateTaskStatus(t._id || t.id, t.status === 'completed' ? 'pending' : 'completed')} />
                        <Typography variant="body2" sx={{ textDecoration: t.status === 'completed' ? 'line-through' : 'none' }}>{t.title}</Typography>
                        {t.dueDate && <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>Due: {format(new Date(t.dueDate), 'dd MMM')}</Typography>}
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            <Alert severity="info" sx={{ maxWidth: 500 }}>No upcoming hearing scheduled for this case.</Alert>
          )}
        </TabPanel>

        {/* ============ TAB 4: DOCUMENTS ============ */}
        <TabPanel value={activeTab} index={4}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 1 }}>
            <TextField size="small" select label="Category" value={docCategory} onChange={(e) => setDocCategory(e.target.value)} sx={{ minWidth: 180 }}>
              {['other', 'petition', 'complaint', 'written-statement', 'application', 'evidence', 'court-order', 'notice', 'summons', 'judgment', 'id-proof', 'agreement', 'supporting'].map(c => (
                <MenuItem key={c} value={c}>{getDocumentCategoryLabel(c)}</MenuItem>
              ))}
            </TextField>
            <Button variant="contained" component="label" startIcon={<UploadIcon />} disabled={uploading}>{uploading ? `Uploading ${uploadProgress}%` : 'Upload'}<input type="file" hidden onChange={handleUpload} /></Button>
          </Box>
          {uploading && <LinearProgress variant="determinate" value={uploadProgress} sx={{ mb: 2 }} />}
          {(!caseData.documents || caseData.documents.length === 0) ? (
            <Typography sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No documents uploaded yet</Typography>
          ) : (
            <Grid container spacing={2}>
              {caseData.documents?.map((doc) => (
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ '&:hover': { borderColor: 'rgba(201, 169, 110, 0.3)' } }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                      <Avatar sx={{ bgcolor: (doc.mimeType || '').includes('pdf') ? 'error.main' : 'info.main', width: 40, height: 40 }}><DocIcon /></Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.originalName || doc.title}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {getDocumentCategoryLabel(doc.category)} • {((doc.fileSize || 0) / 1024).toFixed(0)} KB • {doc.createdAt ? format(new Date(doc.createdAt), 'dd MMM') : ''}
                        </Typography>
                      </Box>
                      <Tooltip title="View">
                        <IconButton size="small" sx={{ color: 'primary.main' }} onClick={() => handleViewDoc(doc)}><ViewIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Download">
                        <IconButton size="small" onClick={() => handleDownloadDoc(doc)}><DownloadIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* ============ TAB 5: PAYMENTS ============ */}
        <TabPanel value={activeTab} index={5}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AttachMoney />} onClick={() => setPaymentDialog(true)}>Record Payment</Button>
          </Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Payment Summary</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}><StatMini label="Total Fee" value={`₹${Number(paymentSummary?.totalFee || caseData.totalFee || 0).toLocaleString()}`} color="#2196f3" /></Grid>
                <Grid item xs={6} sm={3}><StatMini label="Amount Paid" value={`₹${Number(paymentSummary?.amountPaid || caseData.amountPaid || 0).toLocaleString()}`} color="#4caf50" /></Grid>
                <Grid item xs={6} sm={3}><StatMini label="Amount Pending" value={`₹${Number(paymentSummary?.amountPending || caseData.amountPending || 0).toLocaleString()}`} color="#f44336" /></Grid>
                <Grid item xs={6} sm={3}><StatMini label="Next Due" value={caseData.paymentDueDate ? format(new Date(caseData.paymentDueDate), 'dd/MM/yy') : '-'} color="#ff9800" /></Grid>
              </Grid>
            </CardContent>
          </Card>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Payment History</Typography>
          {payments.length === 0 ? (
            <Typography sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No payments recorded yet</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell><TableCell>Amount</TableCell><TableCell>Method</TableCell><TableCell>Reference</TableCell><TableCell>Recorded By</TableCell><TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p._id || p.id}>
                      <TableCell>{p.paymentDate ? format(new Date(p.paymentDate), 'dd MMM yyyy') : '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#4caf50' }}>₹{Number(p.amount).toLocaleString()}</TableCell>
                      <TableCell>{(p.paymentMethod || 'cash').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</TableCell>
                      <TableCell>{p.transactionRef || p.receiptNumber || '-'}</TableCell>
                      <TableCell>{p.recordedByName || '-'}</TableCell>
                      <TableCell><StatusChip status={p.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* ============ TAB 6: TASKS ============ */}
        <TabPanel value={activeTab} index={6}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTaskDialog(true)}>Create Task</Button>
          </Box>
          {tasks.length === 0 ? (
            <Typography sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No tasks for this case</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Task</TableCell><TableCell>Priority</TableCell><TableCell>Assigned To</TableCell><TableCell>Due Date</TableCell><TableCell>Status</TableCell><TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasks.map((t) => (
                    <TableRow key={t._id || t.id} sx={t.status === 'completed' ? { opacity: 0.6 } : {}}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, textDecoration: t.status === 'completed' ? 'line-through' : 'none' }}>{t.title}</Typography>
                        {t.description && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.description}</Typography>}
                      </TableCell>
                      <TableCell><StatusChip status={t.priority} type="priority" /></TableCell>
                      <TableCell>{t.assigneeName || '-'}</TableCell>
                      <TableCell>{t.dueDate ? format(new Date(t.dueDate), 'dd MMM') : '-'}</TableCell>
                      <TableCell><StatusChip status={t.status} /></TableCell>
                      <TableCell>
                        {t.status !== 'completed' && t.status !== 'cancelled' && (
                          <Button size="small" color="success" onClick={() => handleUpdateTaskStatus(t._id || t.id, 'completed')}>Done</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* ============ TAB 7: TIMELINE ============ */}
        <TabPanel value={activeTab} index={7}>
          {getTimeline().length === 0 ? (
            <Typography sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No events in timeline</Typography>
          ) : (
            <Box sx={{ pl: 3, borderLeft: '2px solid rgba(201, 169, 110, 0.3)' }}>
              {getTimeline().map((event, i) => (
                <Box key={i} sx={{ mb: 2, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', left: -29, top: 4, width: 12, height: 12, borderRadius: '50%', backgroundColor: event.color, border: '2px solid #1a2332' }} />
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ color: event.color, mt: 0.5 }}>{event.icon}</Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{event.title}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{event.date ? format(new Date(event.date), 'dd MMM yyyy, hh:mm a') : '-'}</Typography>
                      {event.description && <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>{event.description}</Typography>}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </TabPanel>

        {/* ============ TAB 8: NOTES ============ */}
        <TabPanel value={activeTab} index={8}>
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField fullWidth size="small" placeholder="Add a note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} />
            <Button variant="contained" onClick={handleAddNote} disabled={!newNote.trim()} sx={{ minWidth: 48 }}><SendIcon /></Button>
          </Box>
          {(!caseData.notes || caseData.notes.length === 0) ? (
            <Typography sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No notes yet</Typography>
          ) : (
            caseData.notes?.slice().reverse().map((n) => (
              <Card key={n._id} sx={{ mb: 2 }}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{n.author || 'You'}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{n.date ? format(new Date(n.date), 'dd MMM yyyy, hh:mm a') : '-'}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{n.text}</Typography>
                </CardContent>
              </Card>
            ))
          )}
        </TabPanel>

        {/* ============ TAB 9: ADVOCATES ============ */}
        <TabPanel value={activeTab} index={9}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Assigned Team</Typography>
                  {(caseData.assignedAdvocates || []).length === 0 ? (
                    <Typography sx={{ color: 'text.secondary' }}>No advocates assigned</Typography>
                  ) : (
                    caseData.assignedAdvocates.map((adv) => (
                      <Card key={adv._id || adv.id} sx={{ mb: 2, bgcolor: 'rgba(37,51,73,0.3)' }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 48, height: 48 }}>{adv.name?.charAt(0)}</Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>{adv.name}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Role: {adv.role || 'Advocate'}</Typography>
                            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                              {adv.email && <Typography variant="caption" sx={{ color: 'text.secondary' }}>✉ {adv.email}</Typography>}
                              {adv.phone && <Typography variant="caption" sx={{ color: 'text.secondary' }}>📞 {adv.phone}</Typography>}
                            </Box>
                            {(adv.barCouncilNumber || adv.advocateId) && (
                              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                {adv.barCouncilNumber && <Typography variant="caption" sx={{ color: 'primary.main' }}>BCI: {adv.barCouncilNumber}</Typography>}
                                {adv.advocateId && <Typography variant="caption" sx={{ color: 'text.secondary' }}>ID: {adv.advocateId}</Typography>}
                              </Box>
                            )}
                          </Box>
                          <Chip label={adv.role === 'admin' ? 'Senior' : 'Junior'} size="small" color={adv.role === 'admin' ? 'primary' : 'secondary'} />
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              {caseData.client && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Client Information</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 56, height: 56 }}>{caseData.client.name?.charAt(0)}</Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>{caseData.client.name}</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{caseData.client.email}</Typography>
                      </Box>
                    </Box>
                    <Grid container spacing={1}>
                      {caseData.client.phone && <Grid item xs={6}><Typography variant="caption" sx={{ color: 'text.secondary' }}>Phone</Typography><Typography variant="body2">{caseData.client.phone}</Typography></Grid>}
                      {caseData.client.company && <Grid item xs={6}><Typography variant="caption" sx={{ color: 'text.secondary' }}>Company</Typography><Typography variant="body2">{caseData.client.company}</Typography></Grid>}
                      {caseData.client.panNumber && <Grid item xs={6}><Typography variant="caption" sx={{ color: 'text.secondary' }}>PAN</Typography><Typography variant="body2">{caseData.client.panNumber}</Typography></Grid>}
                    </Grid>
                  </CardContent>
                </Card>
              )}
              {caseData.createdBy && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Created By</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'secondary.light', width: 40, height: 40 }}>{caseData.createdBy.name?.charAt(0)}</Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{caseData.createdBy.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{caseData.createdBy.email}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={10}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Activity History</Typography>
          {caseActivities.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No activities recorded for this case yet.</Typography>
          ) : (
            <Stack spacing={2}>
              {caseActivities.map(a => (
                <Card key={a.id} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: '0.75rem' }}>
                          {a.userName?.charAt(0) || '?'}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600}>{a.userName || 'Unknown'}</Typography>
                        {a.advocateId && <Chip label={a.advocateId} size="small" sx={{ fontWeight: 600, fontSize: '0.65rem', height: 20 }} />}
                        {a.role && <Chip label={a.role} size="small" variant="outlined" sx={{ textTransform: 'capitalize', fontSize: '0.65rem', height: 20 }} />}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 4.5 }}>{a.details || a.action}</Typography>
                      {a.oldValue && (
                        <Box sx={{ mt: 1, ml: 4.5, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Box sx={{ bgcolor: 'rgba(244,67,54,0.08)', px: 1, py: 0.5, borderRadius: 1 }}>
                            <Typography variant="caption" color="error" fontWeight={600}>Old: </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{typeof a.oldValue === 'object' ? JSON.stringify(a.oldValue) : String(a.oldValue)}</Typography>
                          </Box>
                          {a.newValue && <Box sx={{ bgcolor: 'rgba(76,175,80,0.08)', px: 1, py: 0.5, borderRadius: 1 }}>
                            <Typography variant="caption" color="success.main" fontWeight={600}>New: </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{typeof a.newValue === 'object' ? JSON.stringify(a.newValue) : String(a.newValue)}</Typography>
                          </Box>}
                        </Box>
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      {a.createdAt ? format(new Date(a.createdAt), 'dd MMM yyyy, hh:mm a') : ''}
                    </Typography>
                  </Box>
                </Card>
              ))}
            </Stack>
          )}
        </TabPanel>

        {/* ============ DIALOGS ============ */}

        {/* Add Hearing Dialog */}
        <Dialog open={hearingDialog} onClose={() => setHearingDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 600 }}>Add Hearing</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <DatePicker label="Hearing Date" value={hearingForm.date} onChange={(date) => setHearingForm({ ...hearingForm, date })} slotProps={{ textField: { fullWidth: true } }} />
              <TextField fullWidth label="Purpose" value={hearingForm.purpose} onChange={(e) => setHearingForm({ ...hearingForm, purpose: e.target.value })} placeholder="e.g. Arguments, Cross-examination" />
              <TextField fullWidth label="Outcome" value={hearingForm.outcome} onChange={(e) => setHearingForm({ ...hearingForm, outcome: e.target.value })} placeholder="e.g. Adjourned, Arguments heard" />
              <TextField fullWidth label="Notes" value={hearingForm.notes} onChange={(e) => setHearingForm({ ...hearingForm, notes: e.target.value })} multiline rows={2} />
              <TextField fullWidth label="Arguments Presented" value={hearingForm.arguments} onChange={(e) => setHearingForm({ ...hearingForm, arguments: e.target.value })} multiline rows={2} />
              <TextField fullWidth label="Documents Submitted" value={hearingForm.documentsSubmitted} onChange={(e) => setHearingForm({ ...hearingForm, documentsSubmitted: e.target.value })} multiline rows={2} />
              <TextField fullWidth label="Court Directions" value={hearingForm.courtDirections} onChange={(e) => setHearingForm({ ...hearingForm, courtDirections: e.target.value })} multiline rows={2} />
              <TextField fullWidth label="Judge Remarks" value={hearingForm.judgeRemarks} onChange={(e) => setHearingForm({ ...hearingForm, judgeRemarks: e.target.value })} multiline rows={2} />
              <TextField fullWidth label="Order Passed" value={hearingForm.orderPassed} onChange={(e) => setHearingForm({ ...hearingForm, orderPassed: e.target.value })} multiline rows={2} />
              <TextField fullWidth label="Next Steps" value={hearingForm.nextSteps} onChange={(e) => setHearingForm({ ...hearingForm, nextSteps: e.target.value })} multiline rows={2} />
              <DatePicker label="Next Hearing Date" value={hearingForm.nextHearingDate} onChange={(date) => setHearingForm({ ...hearingForm, nextHearingDate: date })} slotProps={{ textField: { fullWidth: true } }} />
              <TextField fullWidth label="Next Hearing Purpose" value={hearingForm.nextHearingPurpose} onChange={(e) => setHearingForm({ ...hearingForm, nextHearingPurpose: e.target.value })} />
            </Box>
          </DialogContent>
          <DialogActions><Button onClick={() => setHearingDialog(false)}>Cancel</Button><Button variant="contained" onClick={handleAddHearing}>Add</Button></DialogActions>
        </Dialog>

        {/* Update Hearing Dialog */}
        <Dialog open={updateHearingDialog} onClose={() => setUpdateHearingDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 600 }}>Update Hearing{updateHearingData ? ` – ${updateHearingData.hearing?.date ? format(new Date(updateHearingData.hearing.date), 'dd MMM yyyy') : ''}` : ''}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField fullWidth label="Outcome" value={updateForm.outcome} onChange={(e) => setUpdateForm({ ...updateForm, outcome: e.target.value })} />
              <TextField fullWidth label="Notes" value={updateForm.notes} onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })} multiline rows={2} />
              <TextField fullWidth label="Arguments Presented" value={updateForm.arguments} onChange={(e) => setUpdateForm({ ...updateForm, arguments: e.target.value })} multiline rows={2} />
              <TextField fullWidth label="Documents Submitted" value={updateForm.documentsSubmitted} onChange={(e) => setUpdateForm({ ...updateForm, documentsSubmitted: e.target.value })} multiline rows={2} />
              <TextField fullWidth label="Court Directions" value={updateForm.courtDirections} onChange={(e) => setUpdateForm({ ...updateForm, courtDirections: e.target.value })} multiline rows={2} />
              <TextField fullWidth label="Judge Remarks" value={updateForm.judgeRemarks} onChange={(e) => setUpdateForm({ ...updateForm, judgeRemarks: e.target.value })} multiline rows={2} />
              <TextField fullWidth label="Order Passed" value={updateForm.orderPassed} onChange={(e) => setUpdateForm({ ...updateForm, orderPassed: e.target.value })} multiline rows={2} />
              <TextField fullWidth label="Next Steps" value={updateForm.nextSteps} onChange={(e) => setUpdateForm({ ...updateForm, nextSteps: e.target.value })} multiline rows={2} />
              <DatePicker label="Next Hearing Date" value={updateForm.nextHearingDate} onChange={(date) => setUpdateForm({ ...updateForm, nextHearingDate: date })} slotProps={{ textField: { fullWidth: true } }} />
              <TextField fullWidth label="Next Hearing Purpose" value={updateForm.nextHearingPurpose} onChange={(e) => setUpdateForm({ ...updateForm, nextHearingPurpose: e.target.value })} />
            </Box>
          </DialogContent>
          <DialogActions><Button onClick={() => setUpdateHearingDialog(false)}>Cancel</Button><Button variant="contained" onClick={handleUpdateHearing}>Save</Button></DialogActions>
        </Dialog>

        {/* Add Order Dialog */}
        <Dialog open={orderDialog} onClose={() => setOrderDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 600 }}>Add Order</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <DatePicker label="Order Date" value={orderForm.date} onChange={(date) => setOrderForm({ ...orderForm, date })} slotProps={{ textField: { fullWidth: true } }} />
              <TextField fullWidth label="Order Description" value={orderForm.description} onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })} multiline rows={3} />
            </Box>
          </DialogContent>
          <DialogActions><Button onClick={() => setOrderDialog(false)}>Cancel</Button><Button variant="contained" onClick={handleAddOrder}>Add</Button></DialogActions>
        </Dialog>

        {/* Record Payment Dialog */}
        <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 600 }}>Record Payment</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField fullWidth label="Amount (₹)" type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
              <TextField fullWidth select label="Payment Method" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}>
                {['cash', 'bank-transfer', 'upi', 'cheque', 'card', 'other'].map(m => <MenuItem key={m} value={m}>{m.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</MenuItem>)}
              </TextField>
              <TextField fullWidth label="Transaction Reference" value={paymentForm.transactionRef} onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })} />
              <TextField fullWidth label="Receipt Number" value={paymentForm.receiptNumber} onChange={(e) => setPaymentForm({ ...paymentForm, receiptNumber: e.target.value })} />
              <DatePicker label="Payment Date" value={paymentForm.paymentDate} onChange={(date) => setPaymentForm({ ...paymentForm, paymentDate: date })} slotProps={{ textField: { fullWidth: true } }} />
              <TextField fullWidth label="Notes" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} multiline rows={2} />
            </Box>
          </DialogContent>
          <DialogActions><Button onClick={() => setPaymentDialog(false)}>Cancel</Button><Button variant="contained" onClick={handleRecordPayment}>Record</Button></DialogActions>
        </Dialog>

        {/* Add Case Update Dialog */}
        <Dialog open={caseUpdateDialog} onClose={() => setCaseUpdateDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 600 }}>Add Case Update</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField fullWidth label="Title" value={caseUpdateForm.title} onChange={(e) => setCaseUpdateForm({ ...caseUpdateForm, title: e.target.value })} placeholder="e.g. Court directed respondent to submit reply" />
              <TextField fullWidth label="Description" value={caseUpdateForm.description} onChange={(e) => setCaseUpdateForm({ ...caseUpdateForm, description: e.target.value })} multiline rows={3} />
              <TextField fullWidth select label="Priority" value={caseUpdateForm.priority} onChange={(e) => setCaseUpdateForm({ ...caseUpdateForm, priority: e.target.value })}>
                {['low', 'medium', 'high', 'urgent'].map(p => <MenuItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</MenuItem>)}
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions><Button onClick={() => setCaseUpdateDialog(false)}>Cancel</Button><Button variant="contained" onClick={handleAddCaseUpdate}>Add</Button></DialogActions>
        </Dialog>

        {/* Create Task Dialog */}
        <Dialog open={taskDialog} onClose={() => setTaskDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 600 }}>Create Task</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField fullWidth label="Task Title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
              <TextField fullWidth label="Description / Instructions" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} multiline rows={2} />
              <TextField fullWidth select label="Priority" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                {['low', 'medium', 'high', 'urgent'].map(p => <MenuItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</MenuItem>)}
              </TextField>
              <TextField fullWidth select label="Task Category" value={taskForm.taskCategory} onChange={(e) => setTaskForm({ ...taskForm, taskCategory: e.target.value })}>
                <MenuItem value="">None</MenuItem>
                {Object.keys(taskCategories).map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
              </TextField>
              {taskForm.taskCategory && taskCategories[taskForm.taskCategory] && (
                <TextField fullWidth select label="Subcategory" value={taskForm.taskType} onChange={(e) => setTaskForm({ ...taskForm, taskType: e.target.value })}>
                  <MenuItem value="">None</MenuItem>
                  {taskCategories[taskForm.taskCategory].map(sub => <MenuItem key={sub} value={sub}>{sub}</MenuItem>)}
                </TextField>
              )}
              <TextField fullWidth select label="Assign To" value={taskForm.assignedTo} onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}>
                <MenuItem value="">Unassigned</MenuItem>
                {team.map(m => <MenuItem key={m.id || m._id} value={m.id || m._id}>{m.name}</MenuItem>)}
              </TextField>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker label="Start Date" value={taskForm.startDate} onChange={(date) => setTaskForm({ ...taskForm, startDate: date })} slotProps={{ textField: { fullWidth: true } }} />
                <DatePicker label="Due Date" value={taskForm.dueDate} onChange={(date) => setTaskForm({ ...taskForm, dueDate: date })} slotProps={{ textField: { fullWidth: true } }} />
              </Box>
              {caseData?.nextHearingDate && (
                <TextField fullWidth select label="Related Hearing" value={taskForm.relatedHearingDate || ''} onChange={(e) => setTaskForm({ ...taskForm, relatedHearingDate: e.target.value ? new Date(e.target.value) : null })}>
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value={caseData.nextHearingDate}>{format(new Date(caseData.nextHearingDate), 'dd MMMM yyyy')}</MenuItem>
                </TextField>
              )}
            </Box>
          </DialogContent>
          <DialogActions><Button onClick={() => setTaskDialog(false)}>Cancel</Button><Button variant="contained" onClick={handleAddTask}>Create</Button></DialogActions>
        </Dialog>

      </Box>
      <DocumentViewer open={viewerOpen} onClose={() => setViewerOpen(false)} doc={viewerDoc} />
    </LocalizationProvider>
  );
}
