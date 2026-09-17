import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Grid, Card, CardContent, IconButton, Avatar, CircularProgress,
  Collapse, List, ListItem, ListItemAvatar, ListItemText, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Chip, Tooltip,
} from '@mui/material';
import {
  Upload as UploadIcon, Download as DownloadIcon, Delete as DeleteIcon,
  PictureAsPdf as PdfIcon, Description as DocIcon, Image as ImageIcon,
  TableChart as ExcelIcon, InsertDriveFile as FileIcon,
  ExpandMore as ExpandIcon, ExpandLess as CollapseIcon,
  Visibility as ViewIcon, Edit as RenameIcon, Folder as FolderIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import SearchBar from '../../components/SearchBar';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import DocumentViewer from '../../components/DocumentViewer';
import toast from 'react-hot-toast';

const fileTypeConfig = {
  pdf: { icon: <PdfIcon />, color: '#f44336', bg: 'rgba(244, 67, 54, 0.1)' },
  doc: { icon: <DocIcon />, color: '#29b6f6', bg: 'rgba(41, 182, 246, 0.1)' },
  docx: { icon: <DocIcon />, color: '#29b6f6', bg: 'rgba(41, 182, 246, 0.1)' },
  jpg: { icon: <ImageIcon />, color: '#4caf50', bg: 'rgba(76, 175, 80, 0.1)' },
  jpeg: { icon: <ImageIcon />, color: '#4caf50', bg: 'rgba(76, 175, 80, 0.1)' },
  png: { icon: <ImageIcon />, color: '#4caf50', bg: 'rgba(76, 175, 80, 0.1)' },
  gif: { icon: <ImageIcon />, color: '#4caf50', bg: 'rgba(76, 175, 80, 0.1)' },
  webp: { icon: <ImageIcon />, color: '#4caf50', bg: 'rgba(76, 175, 80, 0.1)' },
  xls: { icon: <ExcelIcon />, color: '#ff9800', bg: 'rgba(255, 152, 0, 0.1)' },
  xlsx: { icon: <ExcelIcon />, color: '#ff9800', bg: 'rgba(255, 152, 0, 0.1)' },
  ppt: { icon: <DocIcon />, color: '#ff5722', bg: 'rgba(255, 87, 34, 0.1)' },
  pptx: { icon: <DocIcon />, color: '#ff5722', bg: 'rgba(255, 87, 34, 0.1)' },
  txt: { icon: <DocIcon />, color: '#607d8b', bg: 'rgba(96, 125, 139, 0.1)' },
  zip: { icon: <FileIcon />, color: '#9c27b0', bg: 'rgba(156, 39, 176, 0.1)' },
};

function getFileConfig(type) {
  return fileTypeConfig[type] || { icon: <FileIcon />, color: '#9e9e9e', bg: 'rgba(158, 158, 158, 0.1)' };
}

function formatFileSize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function DocumentsList() {
  const { user, hasPermission } = useAuth();
  const isClient = user?.role === 'client';
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCases, setExpandedCases] = useState({});
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [contextDoc, setContextDoc] = useState(null);
  const [renameDialog, setRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isClient ? '/client/documents' : '/documents';
      const { data } = await api.get(endpoint, { params: { search, limit: 100 } });
      const raw = data.data || data.documents || data || [];
      const mapped = (Array.isArray(raw) ? raw : []).map(d => ({
        _id: d._id || d.id,
        name: d.title || d.originalName || d.fileName || 'Untitled',
        type: (d.originalName || d.fileName || '').split('.').pop()?.toLowerCase() || 'pdf',
        size: d.fileSize || d.size || 0,
        caseId: d.case?.id || d.caseId || '',
        caseNumber: d.case?.caseNumber || d.caseNumber || 'Unassigned',
        caseTitle: d.case?.caseTitle || d.caseTitle || '',
        uploadedBy: d.uploadedBy?.name || d.uploadedBy || 'Unknown',
        uploadedAt: d.createdAt || d.uploadedAt || new Date().toISOString(),
        category: d.category || 'other',
        filePath: d.filePath || '',
        fileUrl: d.fileUrl || d.cloudUrl || d.filePath || '',
        cloudUrl: d.cloudUrl || '',
        mimeType: d.mimeType || '',
        fileSize: d.fileSize || 0,
      }));
      setDocuments(mapped);
      const cases = {};
      mapped.forEach(d => {
        const key = d.caseId || '__unassigned__';
        if (!cases[key]) cases[key] = true;
      });
      setExpandedCases(cases);
    } catch {
      setDocuments([]);
    } finally { setLoading(false); }
  }, [search, isClient]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleDelete = async () => {
    try {
      await api.delete(`/documents/${contextDoc?._id}`);
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete');
    }
    setDeleteDialog(false);
    setContextDoc(null);
    fetchDocuments();
  };

  const handleRename = async () => {
    if (!renameValue.trim()) return;
    try {
      await api.put(`/documents/${contextDoc._id}/rename`, { name: renameValue.trim() });
      toast.success('Document renamed');
      setRenameDialog(false);
      setContextDoc(null);
      fetchDocuments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to rename');
    }
  };

  const handleView = (doc) => {
    setViewerDoc(doc);
    setViewerOpen(true);
  };

  const handleDownload = async (doc) => {
    const token = localStorage.getItem('token');
    try {
      const docId = doc._id;
      if (docId) {
        const { data } = await api.get(`/documents/${docId}/download-url`);
        if (data?.data?.url) {
          const url = data.data.url.includes('?') ? `${data.data.url}&token=${token}` : `${data.data.url}?token=${token}`;
          const link = document.createElement('a');
          link.href = url;
          link.download = doc.name;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }
      }
      if (doc.fileUrl) {
        const url = doc.fileUrl.includes('?') ? `${doc.fileUrl}&token=${token}` : `${doc.fileUrl}?token=${token}`;
        window.open(url, '_blank');
      }
    } catch {
      if (doc.fileUrl) {
        const url = doc.fileUrl.includes('?') ? `${doc.fileUrl}&token=${token}` : `${doc.fileUrl}?token=${token}`;
        window.open(url, '_blank');
      }
    }
  };

  const toggleCase = (caseId) => {
    setExpandedCases(prev => ({ ...prev, [caseId]: !prev[caseId] }));
  };

  const filteredDocs = documents.filter(d =>
    !search || d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.caseNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const caseGroups = {};
  filteredDocs.forEach(d => {
    const key = d.caseId || '__unassigned__';
    if (!caseGroups[key]) {
      caseGroups[key] = { caseNumber: d.caseNumber, caseTitle: d.caseTitle, docs: [] };
    }
    caseGroups[key].docs.push(d);
  });

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <CircularProgress sx={{ color: 'primary.main' }} />
    </Box>
  );

  return (
    <Box className="page-container">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Documents</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {isClient ? 'View your documents' : 'Documents organized by case'}
          </Typography>
        </Box>
        {hasPermission('documents', 'add') && (
          <Button variant="contained" component="label" startIcon={<UploadIcon />} disabled={uploading}>
            {uploading ? `Uploading ${uploadProgress}%` : 'Upload'}
            <input type="file" hidden onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append('file', file);
              setUploading(true);
              setUploadProgress(0);
              try {
                await api.post('/documents', fd, {
                  onUploadProgress: (ev) => { if (ev.total) setUploadProgress(Math.round((ev.loaded * 100) / ev.total)); },
                });
                toast.success('Uploaded');
                fetchDocuments();
              } catch (err) { toast.error(err.response?.data?.message || 'Upload failed'); }
              finally { setUploading(false); setUploadProgress(0); }
            }} />
          </Button>
        )}
      </Box>

      <Box sx={{ mb: 3 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search documents by name or case..." sx={{ maxWidth: 400 }} />
      </Box>

      {Object.keys(caseGroups).length === 0 ? (
        <EmptyState icon={<FileIcon sx={{ fontSize: 40 }} />} title="No documents found"
          description="No documents available yet." />
      ) : (
        Object.entries(caseGroups).map(([caseId, group]) => {
          const isExpanded = expandedCases[caseId] !== false;
          return (
            <Card key={caseId} sx={{ mb: 2, background: 'rgba(255,255,255,0.02)' }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => toggleCase(caseId)}
              >
                <Avatar sx={{ bgcolor: 'rgba(201,169,110,0.15)', color: '#c9a96e', width: 36, height: 36 }}>
                  <FolderIcon sx={{ fontSize: 20 }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {group.caseNumber}{group.caseTitle ? ` — ${group.caseTitle}` : ''}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {group.docs.length} document{group.docs.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                <Chip label={group.docs.length} size="small" sx={{ bgcolor: 'rgba(201,169,110,0.1)', color: '#c9a96e' }} />
                {isExpanded ? <CollapseIcon sx={{ color: 'text.secondary' }} /> : <ExpandIcon sx={{ color: 'text.secondary' }} />}
              </Box>

              <Collapse in={isExpanded}>
                <Grid container spacing={1.5} sx={{ p: 2, pt: 0 }}>
                  {group.docs.map(doc => {
                    const config = getFileConfig(doc.type);
                    return (
                      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, key: doc._id }}>
                        <Card sx={{
                          transition: 'all 0.2s',
                          border: '1px solid rgba(37, 51, 73, 0.3)',
                          '&:hover': { borderColor: 'rgba(201, 169, 110, 0.3)', transform: 'translateY(-1px)' },
                        }}>
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                              <Avatar sx={{ bgcolor: config.bg, color: config.color, width: 40, height: 40 }}>
                                {config.icon}
                              </Avatar>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Tooltip title="View">
                                  <IconButton size="small" onClick={() => handleView(doc)}>
                                    <ViewIcon sx={{ fontSize: 16, color: '#29b6f6' }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Download">
                                  <IconButton size="small" onClick={() => handleDownload(doc)}>
                                    <DownloadIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                                  </IconButton>
                                </Tooltip>
                                {!isClient && hasPermission('documents', 'edit') && (
                                  <Tooltip title="Rename">
                                    <IconButton size="small" onClick={() => { setContextDoc(doc); setRenameValue(doc.name); setRenameDialog(true); }}>
                                      <RenameIcon sx={{ fontSize: 16, color: '#c9a96e' }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {!isClient && hasPermission('documents', 'delete') && (
                                  <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => { setContextDoc(doc); setDeleteDialog(true); }}>
                                      <DeleteIcon sx={{ fontSize: 16, color: '#f44336' }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doc.name}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {formatFileSize(doc.size)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {format(new Date(doc.uploadedAt), 'dd MMM')}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Collapse>
            </Card>
          );
        })
      )}

      <Dialog open={renameDialog} onClose={() => setRenameDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rename Document</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="Document Name" value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRename}>Rename</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={deleteDialog} onClose={() => setDeleteDialog(false)} onConfirm={handleDelete}
        title="Delete Document" message={`Delete "${contextDoc?.name}"?`} confirmLabel="Delete" />

      <DocumentViewer open={viewerOpen} onClose={() => setViewerOpen(false)} doc={viewerDoc} />
    </Box>
  );
}
