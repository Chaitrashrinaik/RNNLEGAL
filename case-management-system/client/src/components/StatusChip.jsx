import { Chip } from '@mui/material';

const statusColors = {
  active: { bg: 'rgba(76, 175, 80, 0.15)', color: '#4caf50', border: 'rgba(76, 175, 80, 0.3)' },
  inactive: { bg: 'rgba(158, 158, 158, 0.15)', color: '#9e9e9e', border: 'rgba(158, 158, 158, 0.3)' },
  pending: { bg: 'rgba(255, 152, 0, 0.15)', color: '#ff9800', border: 'rgba(255, 152, 0, 0.3)' },
  closed: { bg: 'rgba(158, 158, 158, 0.15)', color: '#9e9e9e', border: 'rgba(158, 158, 158, 0.3)' },
  won: { bg: 'rgba(76, 175, 80, 0.15)', color: '#4caf50', border: 'rgba(76, 175, 80, 0.3)' },
  lost: { bg: 'rgba(244, 67, 54, 0.15)', color: '#f44336', border: 'rgba(244, 67, 54, 0.3)' },
  settled: { bg: 'rgba(33, 150, 243, 0.15)', color: '#2196f3', border: 'rgba(33, 150, 243, 0.3)' },
  'on hold': { bg: 'rgba(255, 152, 0, 0.15)', color: '#ff9800', border: 'rgba(255, 152, 0, 0.3)' },
  adjourned: { bg: 'rgba(255, 152, 0, 0.15)', color: '#ff9800', border: 'rgba(255, 152, 0, 0.3)' },
  upcoming: { bg: 'rgba(41, 182, 246, 0.15)', color: '#29b6f6', border: 'rgba(41, 182, 246, 0.3)' },
  completed: { bg: 'rgba(76, 175, 80, 0.15)', color: '#4caf50', border: 'rgba(76, 175, 80, 0.3)' },
  draft: { bg: 'rgba(158, 158, 158, 0.15)', color: '#9e9e9e', border: 'rgba(158, 158, 158, 0.3)' },
  sent: { bg: 'rgba(41, 182, 246, 0.15)', color: '#29b6f6', border: 'rgba(41, 182, 246, 0.3)' },
  paid: { bg: 'rgba(76, 175, 80, 0.15)', color: '#4caf50', border: 'rgba(76, 175, 80, 0.3)' },
  overdue: { bg: 'rgba(244, 67, 54, 0.15)', color: '#f44336', border: 'rgba(244, 67, 54, 0.3)' },
  partially_paid: { bg: 'rgba(255, 152, 0, 0.15)', color: '#ff9800', border: 'rgba(255, 152, 0, 0.3)' },
  cancelled: { bg: 'rgba(244, 67, 54, 0.15)', color: '#f44336', border: 'rgba(244, 67, 54, 0.3)' },
  'hearing scheduled': { bg: 'rgba(33, 150, 243, 0.15)', color: '#2196f3', border: 'rgba(33, 150, 243, 0.3)' },
  'awaiting order': { bg: 'rgba(255, 193, 7, 0.15)', color: '#ffc107', border: 'rgba(255, 193, 7, 0.3)' },
  disposed: { bg: 'rgba(158, 158, 158, 0.15)', color: '#9e9e9e', border: 'rgba(158, 158, 158, 0.3)' },
  transferred: { bg: 'rgba(121, 85, 72, 0.15)', color: '#8d6e63', border: 'rgba(121, 85, 72, 0.3)' },
  'in-progress': { bg: 'rgba(33, 150, 243, 0.15)', color: '#2196f3', border: 'rgba(33, 150, 243, 0.3)' },
  scheduled: { bg: 'rgba(33, 150, 243, 0.15)', color: '#2196f3', border: 'rgba(33, 150, 243, 0.3)' },
  'in progress': { bg: 'rgba(33, 150, 243, 0.15)', color: '#2196f3', border: 'rgba(33, 150, 243, 0.3)' },
};

const priorityColors = {
  low: { bg: 'rgba(76, 175, 80, 0.15)', color: '#4caf50', border: 'rgba(76, 175, 80, 0.3)' },
  medium: { bg: 'rgba(255, 152, 0, 0.15)', color: '#ff9800', border: 'rgba(255, 152, 0, 0.3)' },
  high: { bg: 'rgba(244, 67, 54, 0.15)', color: '#f44336', border: 'rgba(244, 67, 54, 0.3)' },
  urgent: { bg: 'rgba(211, 47, 47, 0.2)', color: '#ff1744', border: 'rgba(211, 47, 47, 0.4)' },
};

const defaultColor = { bg: 'rgba(158, 158, 158, 0.15)', color: '#9e9e9e', border: 'rgba(158, 158, 158, 0.3)' };

export default function StatusChip({ status, type = 'status', size = 'small' }) {
  const colors = type === 'priority'
    ? priorityColors[status?.toLowerCase()] || defaultColor
    : statusColors[status?.toLowerCase()] || defaultColor;

  const label = status
    ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
    : 'Unknown';

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        backgroundColor: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        fontWeight: 500,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        height: size === 'small' ? 24 : 30,
      }}
    />
  );
}
