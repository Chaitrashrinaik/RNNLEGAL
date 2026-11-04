import { Box, Typography, Button } from '@mui/material';

export default function EmptyState({
  icon,
  title = 'No data found',
  description = 'There are no items to display yet.',
  actionLabel,
  onAction,
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 4,
        textAlign: 'center',
      }}
    >
      {icon && (
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(var(--app-accent-rgb), 0.08)',
            color: 'primary.main',
            mb: 3,
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, maxWidth: 400 }}>
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          sx={{
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { backgroundColor: 'primary.dark' },
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
