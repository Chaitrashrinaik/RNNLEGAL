import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { Warning } from '@mui/icons-material';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  severity = 'error',
}) {
  const colors = {
    error: { confirm: '#f44336', icon: '#f44336' },
    warning: { confirm: '#ff9800', icon: '#ff9800' },
    info: { confirm: '#29b6f6', icon: '#29b6f6' },
  };

  const color = colors[severity] || colors.error;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backgroundColor: '#1a2332',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Warning sx={{ color: color.icon, fontSize: 28 }} />
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="outlined" sx={{ color: 'text.secondary' }}>
          {cancelLabel}
        </Button>
        <Button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          variant="contained"
          sx={{
            backgroundColor: color.confirm,
            '&:hover': { backgroundColor: color.confirm, opacity: 0.9 },
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
