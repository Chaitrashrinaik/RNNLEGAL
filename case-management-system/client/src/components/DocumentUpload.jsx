import { useState, useRef } from 'react';
import {
  Box, Button, Typography, LinearProgress, Stack, IconButton, Chip, Alert,
} from '@mui/material';
import { CloudUpload, Close, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ACCEPTED_TYPES = [
  'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'application/zip', 'application/x-zip-compressed',
];

const MAX_SIZE = 50 * 1024 * 1024;

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getFileExt(name) {
  const parts = (name || '').split('.');
  return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE';
}

export default function DocumentUpload({ caseId, category, onUploadComplete, buttonText, compact }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    if (!ACCEPTED_TYPES.includes(selectedFile.mimetype || '')) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      const allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip'];
      if (!allowedExts.includes(ext)) {
        toast.error('File type not supported');
        return;
      }
    }
    if (selectedFile.size > MAX_SIZE) {
      toast.error('File size exceeds 50MB limit');
      return;
    }
    setFile(selectedFile);
    setUploadResult(null);
    setUploadError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (caseId) formData.append('caseId', caseId);
    if (category) formData.append('category', category);
    formData.append('title', file.name);

    try {
      const { data } = await api.post('/documents', formData, {
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      setUploadResult(data.data);
      setFile(null);
      toast.success('Document uploaded successfully');
      onUploadComplete?.(data.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed';
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setUploadResult(null);
    setUploadError(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Box>
      {!file && !uploadResult && (
        <Box
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          sx={{
            border: '2px dashed',
            borderColor: dragOver ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            p: compact ? 2 : 3,
            textAlign: 'center',
            cursor: 'pointer',
            bgcolor: dragOver ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
            transition: 'all 0.2s',
            '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(25, 118, 210, 0.04)' },
          }}
        >
          <input
            ref={inputRef}
            type="file"
            hidden
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.zip"
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
          <CloudUpload sx={{ fontSize: compact ? 32 : 40, color: dragOver ? 'primary.main' : 'text.secondary', mb: 1 }} />
          <Typography variant={compact ? 'body2' : 'body1'} color="text.secondary">
            {buttonText || 'Click or drag a file here to upload'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, GIF, WEBP, TXT, ZIP (max 50MB)
          </Typography>
        </Box>
      )}

      {file && !uploadResult && (
        <Box sx={{ border: '1px solid', borderColor: 'grey.300', borderRadius: 2, p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Chip label={getFileExt(file.name)} size="small" color="primary" variant="outlined" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={500} noWrap>{file.name}</Typography>
              <Typography variant="caption" color="text.secondary">{formatFileSize(file.size)}</Typography>
            </Box>
            <IconButton size="small" onClick={handleClear}><Close fontSize="small" /></IconButton>
          </Stack>
          {uploading && (
            <Box sx={{ mt: 1.5 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Uploading... {progress}%
              </Typography>
            </Box>
          )}
          {!uploading && (
            <Button variant="contained" size="small" onClick={handleUpload} sx={{ mt: 1.5 }} fullWidth>
              Upload
            </Button>
          )}
        </Box>
      )}

      {uploadResult && (
        <Alert
          severity="success"
          action={<IconButton size="small" onClick={handleClear}><Close fontSize="small" /></IconButton>}
          icon={<CheckCircle />}
          sx={{ borderRadius: 2 }}
        >
          <Typography variant="body2" fontWeight={500}>{uploadResult.originalName || 'Document'} uploaded</Typography>
        </Alert>
      )}

      {uploadError && (
        <Alert
          severity="error"
          action={<IconButton size="small" onClick={() => setUploadError(null)}><Close fontSize="small" /></IconButton>}
          icon={<ErrorIcon />}
          sx={{ mt: file ? 0 : 2, borderRadius: 2 }}
        >
          {uploadError}
        </Alert>
      )}
    </Box>
  );
}
