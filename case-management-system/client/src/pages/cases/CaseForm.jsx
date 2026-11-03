import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Box, Typography, Card, CardContent, TextField, Button, MenuItem, Autocomplete, Chip, CircularProgress, Divider, Alert } from '@mui/material';
import Grid from '../../components/Grid';
import BackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const defaultCaseTypes = ['civil', 'criminal', 'family', 'corporate', 'labor', 'consumer', 'other'];
const courts = [
  { value: 'district', label: 'District Court' },
  { value: 'high', label: 'High Court' },
  { value: 'supreme', label: 'Supreme Court' },
  { value: 'nclt', label: 'NCLT' },
  { value: 'drt', label: 'DRT' },
  { value: 'rera', label: 'RERA' },
  { value: 'consumer', label: 'Consumer Forum' },
  { value: 'other', label: 'Other' },
];
const courtLocations = [
  { value: 'dharwad', label: 'Dharwad' },
  { value: 'gulbarga', label: 'Gulbarga' },
  { value: 'bangalore', label: 'Bangalore' },
  { value: 'other', label: 'Other' },
];
const statusOptions = ['pending', 'active', 'in-progress', 'closed', 'disposed'];
const priorityOptions = ['low', 'medium', 'high', 'urgent'];

const emptyForm = {
  caseNumber: '',
  caseTitle: '',
  caseType: '',
  court: '',
  courtLocation: '',
  courtName: '',
  courtNumber: '',
  judgeName: '',
  client: null,
  assignedAdvocates: [],
  seniorAdvocateId: '',
  juniorAdvocateId: '',
  supportingAdvocateIds: [],
  filingDate: null,
  caseRegistrationDate: null,
  nextHearingDate: null,
  description: '',
  oppositeParty: '',
  oppositePartyLawyer: '',
  priority: 'medium',
  status: 'pending',
  tags: [],
  caseCategory: '',
  location: '',
  caseStage: '',
  totalFee: '',
};

export default function CaseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(emptyForm);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});
  const [caseTypes, setCaseTypes] = useState(defaultCaseTypes.map(t => ({ code: t, description: t.charAt(0).toUpperCase() + t.slice(1) })));

  useEffect(() => {
    fetchClients();
    fetchTeam();
    fetchCaseTypes();
    if (isEdit) fetchCase();
    else if (user?.id) setForm(prev => ({ ...prev, seniorAdvocateId: user.id }));
  }, [id]);

  const fetchCaseTypes = async () => {
    try {
      const { data: res } = await api.get('/ecourts/enums');
      const types = res.data?.enums?.caseType || [];
      if (types.length > 0) {
        const defaultObjs = defaultCaseTypes.map(t => ({ code: t, description: t.charAt(0).toUpperCase() + t.slice(1) }));
        const seen = new Set(defaultCaseTypes);
        const eciTypes = types.filter(t => !seen.has(t.code)).map(t => ({ code: t.code, description: t.description }));
        setCaseTypes([...defaultObjs, ...eciTypes]);
      }
    } catch {
      // keep defaults
    }
  };

  const fetchClients = async () => {
    try {
      const { data } = await api.get('/clients', { params: { limit: 200 } });
      setClients(data.clients || data.data || data || []);
    } catch {
      setClients([]);
      toast.error('Could not load clients. Please refresh and try again.');
    }
  };

  const fetchTeam = async () => {
    try {
      const { data } = await api.get('/team');
      setTeamMembers(data.members || data.data || data || []);
    } catch {
      setTeamMembers([]);
    }
  };

  const getAdvocateLabel = (adv) => {
    if (!adv) return '';
    const parts = [adv.name];
    if (adv.advocateId) parts.push(adv.advocateId);
    if (adv.barCouncilNumber) parts.push(`BCI: ${adv.barCouncilNumber}`);
    return parts.join(' – ');
  };

  const fetchCase = async () => {
    try {
      const { data } = await api.get(`/cases/${id}`);
      const c = data.data || data.case || data;

      if (user?.role === 'advocate') {
        const isAssigned = (c.assignedAdvocates || []).some(a => (a.id || a._id || a) === user?.id);
        if (!isAssigned) {
          toast.error('You can only edit cases assigned to you');
          navigate('/cases');
          return;
        }
      }

      setForm({
        caseNumber: c.caseNumber || '',
        caseTitle: c.caseTitle || c.title || '',
        caseType: c.caseType || c.type || '',
        court: c.court || '',
        courtLocation: c.courtLocation || '',
        courtName: c.courtName || '',
        courtNumber: c.courtNumber || '',
        judgeName: c.judgeName || c.judge || '',
        client: c.client?._id || c.clientId || null,
        assignedAdvocates: c.assignedAdvocates?.map((a) => a._id || a) || [],
        seniorAdvocateId: c.seniorAdvocateId || c.seniorAdvocate?._id || '',
        juniorAdvocateId: c.juniorAdvocateId || c.juniorAdvocate?._id || '',
        supportingAdvocateIds: c.supportingAdvocates?.map(a => a._id || a.id) || [],
        filingDate: c.filingDate ? new Date(c.filingDate) : null,
        caseRegistrationDate: c.caseRegistrationDate ? new Date(c.caseRegistrationDate) : null,
        nextHearingDate: c.nextHearingDate ? new Date(c.nextHearingDate) : null,
        description: c.description || '',
        oppositeParty: c.oppositeParty || '',
        oppositePartyLawyer: c.oppositePartyLawyer || '',
        priority: c.priority || 'medium',
        status: c.status || 'pending',
        tags: c.tags || [],
        caseCategory: c.caseCategory || '',
        location: c.location || '',
        caseStage: c.caseStage || '',
        totalFee: c.totalFee || '',
      });
    } catch {
      toast.error('Failed to load case');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.caseNumber) errs.caseNumber = 'Case number is required';
    if (!form.caseTitle) errs.caseTitle = 'Case title is required';
    if (!form.caseType) errs.caseType = 'Case type is required';
    if (!form.court) errs.court = 'Court is required';
    if (!form.client) errs.client = 'Client is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      const message = 'Please fill in the required fields highlighted below.';
      setError(message);
      toast.error(message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      ...form,
      filingDate: form.filingDate?.toISOString(),
      nextHearingDate: form.nextHearingDate?.toISOString(),
      caseRegistrationDate: form.caseRegistrationDate?.toISOString(),
      seniorAdvocateId: form.seniorAdvocateId || null,
      juniorAdvocateId: form.juniorAdvocateId || null,
      supportingAdvocateIds: form.supportingAdvocateIds || [],
      courtLocation: form.courtLocation || null,
    };
    delete payload.clientId;

    try {
      if (isEdit) {
        await api.put(`/cases/${id}`, payload);
        toast.success('Case updated successfully');
      } else {
        await api.post('/cases', payload);
        toast.success('Case created successfully');
      }
      navigate('/cases');
    } catch (err) {
      const message = err.response?.data?.message
        || err.response?.data?.errors?.[0]?.msg
        || 'Failed to save case';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box className="page-container">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ color: 'text.secondary' }}>
            Back
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {isEdit ? 'Edit Case' : 'New Case'}
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Case Information</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Case Number *"
                    value={form.caseNumber}
                    onChange={handleChange('caseNumber')}
                    error={!!errors.caseNumber}
                    helperText={errors.caseNumber || 'e.g. O.S. 123/2024 or cl200412'}
                    placeholder="e.g. O.S. 123/2024"
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    select
                    label="Case Type *"
                    value={form.caseType}
                    onChange={handleChange('caseType')}
                    error={!!errors.caseType}
                    helperText={errors.caseType}
                    SelectProps={{
                      MenuProps: {
                        PaperProps: {
                          sx: { maxHeight: 400, minWidth: 350 },
                        },
                      },
                    }}
                  >
                    {caseTypes.map((opt) => (
                      <MenuItem key={typeof opt === 'string' ? opt : opt.code} value={typeof opt === 'string' ? opt : opt.code}>
                        {typeof opt === 'string' ? opt.charAt(0).toUpperCase() + opt.slice(1) : `${opt.code} - ${opt.description}`}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Case Title *"
                    value={form.caseTitle}
                    onChange={handleChange('caseTitle')}
                    error={!!errors.caseTitle}
                    helperText={errors.caseTitle}
                    placeholder="e.g. Rajesh Kumar vs. State of Maharashtra"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={form.description}
                    onChange={handleChange('description')}
                    multiline
                    rows={3}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Court Details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Court *"
                    value={form.court}
                    onChange={handleChange('court')}
                    error={!!errors.court}
                    helperText={errors.court}
                  >
                    {courts.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Court Location"
                    value={form.courtLocation}
                    onChange={handleChange('courtLocation')}
                    error={!!errors.courtLocation}
                    helperText={errors.courtLocation || 'Optional'}
                  >
                    {courtLocations.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Court Name / Bench"
                    value={form.courtName}
                    onChange={handleChange('courtName')}
                    placeholder="e.g. Bombay High Court, Bench at Goa"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Judge Name"
                    value={form.judgeName}
                    onChange={handleChange('judgeName')}
                    placeholder="e.g. Justice Patil"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={clients}
                    getOptionLabel={(option) => option.name || ''}
                    noOptionsText="No clients found — add a client first"
                    value={clients.find((c) => c._id === form.client) || null}
                    onChange={(e, newValue) => {
                      setForm({ ...form, client: newValue?._id || null });
                      if (errors.client) setErrors({ ...errors, client: undefined });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Client *"
                        error={!!errors.client}
                        helperText={errors.client}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={teamMembers}
                    getOptionLabel={(option) => getAdvocateLabel(option)}
                    value={teamMembers.find((t) => t._id === form.seniorAdvocateId) || null}
                    onChange={(e, newValue) => setForm({ ...form, seniorAdvocateId: newValue?._id || '' })}
                    disabled
                    renderInput={(params) => <TextField {...params} label="Assigned Senior Advocate (Admin)" placeholder="Nagendra Naik (Admin)" />}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={teamMembers}
                    getOptionLabel={(option) => getAdvocateLabel(option)}
                    value={teamMembers.find((t) => t._id === form.juniorAdvocateId) || null}
                    onChange={(e, newValue) => {
                      setForm({ ...form, juniorAdvocateId: newValue?._id || '' });
                      if (errors.juniorAdvocateId) setErrors({ ...errors, juniorAdvocateId: undefined });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Assigned Junior Advocate"
                        error={!!errors.juniorAdvocateId}
                        helperText={errors.juniorAdvocateId || 'Optional — the advocate handling the day-to-day work'}
                        placeholder="Select junior advocate"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={teamMembers.filter(t => t._id !== form.seniorAdvocateId && t._id !== form.juniorAdvocateId)}
                    getOptionLabel={(option) => getAdvocateLabel(option)}
                    value={teamMembers.filter((t) => form.supportingAdvocateIds.includes(t._id))}
                    onChange={(e, newValue) => setForm({ ...form, supportingAdvocateIds: newValue.map((v) => v._id) })}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip {...getTagProps({ index })} key={option._id} label={option.name} size="small" />
                      ))
                    }
                    renderInput={(params) => <TextField {...params} label="Supporting Advocate(s)" placeholder="Select supporting advocates" />}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Opposite Party"
                    value={form.oppositeParty}
                    onChange={handleChange('oppositeParty')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Opposite Party Lawyer"
                    value={form.oppositePartyLawyer}
                    onChange={handleChange('oppositePartyLawyer')}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Dates & Status</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="Filing Date"
                    value={form.filingDate}
                    onChange={(date) => setForm({ ...form, filingDate: date })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="Next Hearing Date"
                    value={form.nextHearingDate}
                    onChange={(date) => setForm({ ...form, nextHearingDate: date })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    select
                    label="Priority"
                    value={form.priority}
                    onChange={handleChange('priority')}
                  >
                    {priorityOptions.map((opt) => (
                      <MenuItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    select
                    label="Status"
                    value={form.status}
                    onChange={handleChange('status')}
                  >
                    {statusOptions.map((opt) => (
                      <MenuItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                      size="small"
                      label="Add Tag"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      sx={{ minWidth: 200 }}
                    />
                    <Button variant="outlined" size="small" onClick={handleAddTag}>
                      Add
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                    {form.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" onDelete={() => handleRemoveTag(tag)} />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Additional Details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Case Category" value={form.caseCategory} onChange={handleChange('caseCategory')} placeholder="e.g. Family Dispute, Property" />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Court Number" value={form.courtNumber} onChange={handleChange('courtNumber')} placeholder="e.g. Court Room 5" />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Location" value={form.location} onChange={handleChange('location')} placeholder="e.g. Mumbai, Maharashtra" />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <DatePicker label="Case Registration Date" value={form.caseRegistrationDate} onChange={(date) => setForm({ ...form, caseRegistrationDate: date })} slotProps={{ textField: { fullWidth: true } }} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Case Stage" value={form.caseStage} onChange={handleChange('caseStage')} placeholder="e.g. Trial, Arguments, Evidence" />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth label="Total Case Fee (₹)" value={form.totalFee} onChange={handleChange('totalFee')} type="number" placeholder="e.g. 50000" />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => navigate(-1)} sx={{ color: 'text.secondary' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
              disabled={saving}
            >
              {saving ? 'Saving...' : isEdit ? 'Update Case' : 'Create Case'}
            </Button>
          </Box>
        </form>
      </Box>
    </LocalizationProvider>
  );
}
