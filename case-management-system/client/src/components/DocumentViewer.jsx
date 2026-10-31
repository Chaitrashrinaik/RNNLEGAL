import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Box, Typography,
  Button, CircularProgress, Chip, Stack,
} from '@mui/material';
import Close from '@mui/icons-material/Close';
import Download from '@mui/icons-material/Download';
import OpenInNew from '@mui/icons-material/OpenInNew';
import PdfIcon from '@mui/icons-material/PictureAsPdf';
import DocIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import ExcelIcon from '@mui/icons-material/TableChart';
import FileIcon from '@mui/icons-material/InsertDriveFile';
import PptIcon from '@mui/icons-material/Slideshow';
import TxtIcon from '@mui/icons-material/TextSnippet';
import ZipIcon from '@mui/icons-material/FolderZip';
import api from '../api/axios';
import { renderAsync } from 'docx-preview';

const PREVIEWABLE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'text/plain'];
const PDF_TYPES = ['application/pdf'];
const DOCX_MIMES = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/vnd.ms-word'];

function withToken(url) {
  if (!url || url.startsWith('http')) return url;
  const token = localStorage.getItem('token') || localStorage.getItem('clientToken');
  if (!token) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${token}`;
}

function getFileIcon(mimeType) {
  if (!mimeType) return <FileIcon />;
  if (mimeType.includes('pdf')) return <PdfIcon />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <DocIcon />;
  if (mimeType.includes('image')) return <ImageIcon />;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <ExcelIcon />;
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return <PptIcon />;
  if (mimeType.includes('text')) return <TxtIcon />;
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return <ZipIcon />;
  return <FileIcon />;
}

function formatFileSize(bytes) {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getFileExtension(fileName) {
  if (!fileName) return '';
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop().toUpperCase() : '';
}

export default function DocumentViewer({ open, onClose, documentId, fileName: propFileName, fileUrl: propFileUrl, mimeType: propMimeType, doc: propDoc }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const docxContainerRef = useRef(null);
  const [docxLoading, setDocxLoading] = useState(false);
  const [docxError, setDocxError] = useState(null);

  const activeDoc = propDoc || doc;
  const docFileName = activeDoc?.originalName || propDoc?.name || activeDoc?.name || propFileName || 'Document';
  const docMimeType = (activeDoc?.mimeType || propMimeType || '').toLowerCase();
  const docFileUrl = withToken(activeDoc?.fileUrl || activeDoc?.cloudUrl || propDoc?.fileUrl || propFileUrl || '');
  const docFileSize = activeDoc?.fileSize || 0;
  const effectiveDocumentId = propDoc?._id || propDoc?.id || documentId;

  useEffect(() => {
    if (open && effectiveDocumentId && !propDoc && !propFileUrl) {
      setLoading(true);
      setError(null);
      api.get(`/documents/${effectiveDocumentId}`)
        .then(({ data }) => {
          setDoc(data.data);
          setLoading(false);
        })
        .catch(() => {
          setError('Document not found or inaccessible.');
          setLoading(false);
        });
    } else if (open) {
      setDoc(null);
      setError(null);
    }
  }, [open, effectiveDocumentId, propDoc, propFileUrl]);

  useEffect(() => {
    if (!open) {
      setDoc(null);
      setError(null);
    }
  }, [open]);

  const isPreviewable = PREVIEWABLE_TYPES.includes(docMimeType) || docMimeType.startsWith('image/');
  const isPdf = docMimeType.includes('pdf');
  const isDocx = DOCX_MIMES.includes(docMimeType) || docMimeType.includes('word') || docMimeType.includes('officedocument');

  useEffect(() => {
    if (!open || !isDocx || !docFileUrl || !docxContainerRef.current) return;
    let cancelled = false;
    setDocxLoading(true);
    setDocxError(null);
    docxContainerRef.current.innerHTML = '';
    fetch(docFileUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch document');
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        return renderAsync(blob, docxContainerRef.current, null, { inWrapper: false });
      })
      .then(() => {
        if (!cancelled) setDocxLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setDocxError('Failed to preview Word document');
          setDocxLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [open, isDocx, docFileUrl]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (effectiveDocumentId) {
        const { data } = await api.get(`/documents/${effectiveDocumentId}/download-url`);
        if (data?.data?.url) {
          const link = document.createElement('a');
          link.href = withToken(data.data.url);
          link.download = docFileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else if (docFileUrl) {
        const link = document.createElement('a');
        link.href = docFileUrl;
        link.download = docFileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      if (docFileUrl) {
        window.open(docFileUrl, '_blank');
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenExternal = () => {
    if (docFileUrl) {
      window.open(docFileUrl, '_blank');
    }
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 300, gap: 2 }}>
          <FileIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
          <Typography color="error">{error}</Typography>
        </Box>
      );
    }

    if (!docFileUrl) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 300, gap: 2 }}>
          <FileIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
          <Typography color="text.secondary">Document URL not available</Typography>
        </Box>
      );
    }

    if (isPdf) {
      return (
        <iframe
          src={docFileUrl}
          title={docFileName}
          style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8 }}
        />
      );
    }

    if (isPreviewable && docMimeType.startsWith('image/')) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300, p: 2 }}>
          <img
            src={docFileUrl}
            alt={docFileName}
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }}
          />
        </Box>
      );
    }

    if (isPreviewable && docMimeType === 'text/plain') {
      return (
        <iframe
          src={docFileUrl}
          title={docFileName}
          style={{ width: '100%', height: '70vh', border: '1px solid #ddd', borderRadius: 8 }}
        />
      );
    }

    if (isDocx) {
      return (
        <Box sx={{ minHeight: 300, maxHeight: '70vh', overflow: 'auto', p: 2, bgcolor: 'white', color: 'black', borderRadius: 1 }}>
          {docxLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          )}
          {docxError && (
            <Typography color="error" sx={{ textAlign: 'center', py: 2 }}>{docxError}</Typography>
          )}
          <Box ref={docxContainerRef} sx={{ '& .docx-wrapper': { bgcolor: 'white' } }} />
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 300, gap: 2, p: 3 }}>
        <Box sx={{ color: 'text.secondary' }}>
          {getFileIcon(docMimeType)}
        </Box>
        <Typography variant="h6" fontWeight={600}>{docFileName}</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Chip label={getFileExtension(docFileName) || 'FILE'} size="small" color="primary" variant="outlined" />
          <Chip label={formatFileSize(docFileSize)} size="small" variant="outlined" />
          <Chip label={docMimeType || 'Unknown type'} size="small" variant="outlined" />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Preview is not available for this file type. Download the file to view it.
        </Typography>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={isPdf || isPreviewable ? 'lg' : 'sm'}
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={600} noWrap>{docFileName}</Typography>
          {doc && (
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Chip icon={getFileIcon(docMimeType)} label={getFileExtension(docFileName) || 'FILE'} size="small" variant="outlined" sx={{ height: 22 }} />
              <Chip label={formatFileSize(docFileSize)} size="small" variant="outlined" sx={{ height: 22 }} />
            </Stack>
          )}
        </Box>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {renderPreview()}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        {docFileUrl && (
          <Button startIcon={<OpenInNew />} onClick={handleOpenExternal} size="small">
            Open
          </Button>
        )}
        <Button
          variant="contained"
          startIcon={downloading ? <CircularProgress size={16} /> : <Download />}
          onClick={handleDownload}
          disabled={downloading || !docFileUrl}
          size="small"
        >
          {downloading ? 'Downloading...' : 'Download'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
