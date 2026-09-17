import { useState } from 'react';
import {
  Box, Typography, IconButton, Stack, Tooltip, Chip,
} from '@mui/material';
import {
  Visibility as ViewIcon, Download as DownloadIcon,
  PictureAsPdf as PdfIcon, Description as DocIcon, Image as ImageIcon,
  TableChart as ExcelIcon, InsertDriveFile as FileIcon,
  Slideshow as PptIcon, TextSnippet as TxtIcon, FolderZip as ZipIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../api/axios';
import DocumentViewer from './DocumentViewer';

const FILE_TYPE_CONFIG = {
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
  ppt: { icon: <PptIcon />, color: '#ff5722', bg: 'rgba(255, 87, 34, 0.1)' },
  pptx: { icon: <PptIcon />, color: '#ff5722', bg: 'rgba(255, 87, 34, 0.1)' },
  txt: { icon: <TxtIcon />, color: '#607d8b', bg: 'rgba(96, 125, 139, 0.1)' },
  zip: { icon: <ZipIcon />, color: '#9c27b0', bg: 'rgba(156, 39, 176, 0.1)' },
};

function getFileConfig(name) {
  const ext = (name || '').split('.').pop()?.toLowerCase() || '';
  return FILE_TYPE_CONFIG[ext] || { icon: <FileIcon />, color: '#9e9e9e', bg: 'rgba(158, 158, 158, 0.1)' };
}

function formatFileSize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function DocumentListItem({ document: doc, onDownload }) {
  const [viewerOpen, setViewerOpen] = useState(false);

  const fileName = doc.originalName || doc.title || doc.fileName || 'Untitled';
  const fileUrl = doc.fileUrl || doc.cloudUrl || doc.filePath || null;
  const mimeType = doc.mimeType || '';
  const fileSize = doc.fileSize || 0;
  const uploadDate = doc.createdAt;
  const uploaderName = doc.uploadedBy?.name || doc.uploadedBy || '';
  const config = getFileConfig(fileName);

  const handleView = (e) => {
    e?.stopPropagation();
    setViewerOpen(true);
  };

  const handleDownloadClick = async (e) => {
    e?.stopPropagation();
    if (onDownload) {
      onDownload(doc);
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const docId = doc._id || doc.id;
      if (docId) {
        const { data } = await api.get(`/documents/${docId}/download-url`);
        if (data?.data?.url) {
          const url = data.data.url.includes('?') ? `${data.data.url}&token=${token}` : `${data.data.url}?token=${token}`;
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }
      }
      if (fileUrl) {
        const url = fileUrl.includes('?') ? `${fileUrl}&token=${token}` : `${fileUrl}?token=${token}`;
        window.open(url, '_blank');
      }
    } catch {
      if (fileUrl) {
        const url = fileUrl.includes('?') ? `${fileUrl}&token=${token}` : `${fileUrl}?token=${token}`;
        window.open(url, '_blank');
      }
    }
  };

  const docId = doc._id || doc.id;

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 1.5,
          px: 2,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'grey.200',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.01)', borderColor: 'grey.300' },
          transition: 'all 0.15s',
        }}
      >
        <Box
          sx={{
            width: 40, height: 40, borderRadius: 1.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: config.bg, color: config.color,
          }}
        >
          {config.icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>{fileName}</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
            <Typography variant="caption" color="text.secondary">{formatFileSize(fileSize)}</Typography>
            {uploadDate && (
              <Typography variant="caption" color="text.secondary">
                {format(new Date(uploadDate), 'dd MMM yyyy')}
              </Typography>
            )}
            {uploaderName && (
              <Typography variant="caption" color="text.secondary">
                by {typeof uploaderName === 'string' ? uploaderName : uploaderName}
              </Typography>
            )}
          </Stack>
        </Box>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View">
            <IconButton size="small" onClick={handleView} color="primary">
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download">
            <IconButton size="small" onClick={handleDownloadClick}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <DocumentViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        documentId={docId}
        fileName={fileName}
        fileUrl={fileUrl}
        mimeType={mimeType}
      />
    </>
  );
}
