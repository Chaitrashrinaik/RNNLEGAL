import { Card, CardContent, Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TrendingUp from '@mui/icons-material/TrendingUp';
import TrendingDown from '@mui/icons-material/TrendingDown';

export default function StatsCard({ icon, value, label, trend, trendValue, color }) {
  // Real hex so the "15" alpha suffix below stays valid CSS; falls back to
  // the current theme's accent (blue in light, gold in dark).
  const theme = useTheme();
  const accent = color || theme.palette.accent.main;
  return (
    <Card
      sx={{
        height: '100%',
        background: (theme) => (theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #1a2332 0%, #1e2d4a 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #eef2f7 100%)'),
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'rgba(var(--app-accent-rgb), 0.3)',
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, fontWeight: 500 }}>
              {label}
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
              {value}
            </Typography>
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {trend === 'up' ? (
                  <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />
                )}
                <Typography
                  variant="caption"
                  sx={{
                    color: trend === 'up' ? 'success.main' : 'error.main',
                    fontWeight: 500,
                  }}
                >
                  {trendValue}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
                  vs last month
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${accent}15`,
              color: accent,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
