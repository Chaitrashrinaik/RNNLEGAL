import { Card, CardContent, Box, Typography, Chip } from '@mui/material';
import { Schedule, LocationOn, Person } from '@mui/icons-material';
import { format } from 'date-fns';

export default function HearingCard({ hearing, onClick }) {
  const hearingDate = new Date(hearing.date);
  const isToday = new Date().toDateString() === hearingDate.toDateString();
  const isPast = hearingDate < new Date();

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        border: isToday ? '1px solid rgba(201, 169, 110, 0.4)' : '1px solid rgba(37, 51, 73, 0.5)',
        backgroundColor: isToday ? 'rgba(201, 169, 110, 0.05)' : 'background.paper',
        transition: 'all 0.2s ease',
        opacity: isPast ? 0.6 : 1,
        '&:hover': {
          borderColor: 'rgba(201, 169, 110, 0.3)',
          transform: 'translateY(-1px)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', flex: 1 }}>
            {hearing.title || hearing.caseTitle || 'Hearing'}
          </Typography>
          {isToday && (
            <Chip
              label="Today"
              size="small"
              sx={{
                backgroundColor: 'rgba(201, 169, 110, 0.2)',
                color: 'primary.main',
                fontWeight: 600,
                fontSize: '0.65rem',
                height: 22,
              }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <Schedule sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {format(hearingDate, 'dd MMM yyyy, hh:mm a')}
          </Typography>
        </Box>

        {hearing.court && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {hearing.court}
            </Typography>
          </Box>
        )}

        {hearing.judge && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Person sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {hearing.judge}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
