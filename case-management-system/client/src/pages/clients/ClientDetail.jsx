import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Button, Avatar, Divider, List, ListItem, ListItemText, CircularProgress, Chip,
} from '@mui/material';
import {
  ArrowBack as BackIcon, Edit as EditIcon, Email as EmailIcon, Phone as PhoneIcon, Business as CompanyIcon, CreditCard as PanIcon, VpnKey as PortalIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import StatusChip from '../../components/StatusChip';
import toast from 'react-hot-toast';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchClient(); }, [id]);

  const fetchClient = async () => {
    try {
      const { data } = await api.get(`/clients/${id}`);
      setClient(data.data || data.client || data);
    } catch {
      toast.error('Failed to load client');
    } finally { setLoading(false); }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <CircularProgress sx={{ color: 'primary.main' }} />
    </Box>
  );

  if (!client) return null;

  return (
    <Box className="page-container">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<BackIcon />} onClick={() => navigate('/clients')} sx={{ color: 'text.secondary' }}>Clients</Button>
          <Divider orientation="vertical" flexItem />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{client.name}</Typography>
        </Box>
        {hasPermission('clients', 'edit') && (
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/clients/${id}/edit`)}>
            Edit
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: '1.5rem', fontWeight: 600, mx: 'auto', mb: 2 }}>
                {client.name?.charAt(0)}
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>{client.name}</Typography>
              {client.company && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{client.company}</Typography>}
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                Client since {format(new Date(client.createdAt), 'MMM yyyy')}
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Contact Details</Typography>
              <List disablePadding>
                <ListItem disablePadding sx={{ py: 1 }}>
                  <EmailIcon sx={{ mr: 2, fontSize: 20, color: 'text.secondary' }} />
                  <ListItemText primary={client.email} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItem>
                <ListItem disablePadding sx={{ py: 1 }}>
                  <PhoneIcon sx={{ mr: 2, fontSize: 20, color: 'text.secondary' }} />
                  <ListItemText primary={client.phone || '-'} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItem>
                {client.company && (
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <CompanyIcon sx={{ mr: 2, fontSize: 20, color: 'text.secondary' }} />
                    <ListItemText primary={client.company} primaryTypographyProps={{ variant: 'body2' }} />
                  </ListItem>
                )}
                {client.panNumber && (
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <PanIcon sx={{ mr: 2, fontSize: 20, color: 'text.secondary' }} />
                    <ListItemText primary={`PAN: ${client.panNumber}`} primaryTypographyProps={{ variant: 'body2' }} />
                  </ListItem>
                )}
              </List>
              {client.address && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Address</Typography>
                  <Typography variant="body2">
                    {typeof client.address === 'string'
                      ? client.address
                      : [client.address.street, client.address.area, client.address.city, client.address.state, client.address.pincode].filter(Boolean).join(', ')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Cases ({client.cases?.length || 0})</Typography>
              {!client.cases?.length ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>No cases found</Typography>
              ) : (
                <List disablePadding>
                  {client.cases?.map((c) => (
                    <ListItem
                      key={c._id}
                      disablePadding
                      sx={{ py: 1.5, cursor: 'pointer', borderRadius: 1, px: 1, '&:hover': { backgroundColor: 'rgba(201, 169, 110, 0.05)' } }}
                      onClick={() => navigate(`/cases/${c._id}`)}
                    >
                      <ListItemText
                        primary={<Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>{c.caseNumber}</Typography>}
                        secondary={<Typography variant="caption" sx={{ color: 'text.secondary' }}>{c.caseTitle}</Typography>}
                      />
                      <StatusChip status={c.status} />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Invoices</Typography>
              {!client.invoices?.length ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>No invoices</Typography>
              ) : (
                <List disablePadding>
                  {client.invoices?.map((inv) => (
                    <ListItem key={inv._id} disablePadding sx={{ py: 1.5 }}>
                      <ListItemText
                        primary={<Typography variant="body2" sx={{ fontWeight: 500 }}>{inv.invoiceNumber}</Typography>}
                        secondary={<Typography variant="caption" sx={{ color: 'text.secondary' }}>₹{inv.total?.toLocaleString()}</Typography>}
                      />
                      <StatusChip status={inv.status} />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          {client.notes && (
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Notes</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{client.notes}</Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
