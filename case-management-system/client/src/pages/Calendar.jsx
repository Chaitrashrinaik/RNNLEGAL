import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Button, IconButton, Chip, Divider,
} from '@mui/material';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import HearingIcon from '@mui/icons-material/Gavel';
import LocationOn from '@mui/icons-material/LocationOn';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths,
  isSameMonth, isSameDay, isToday, parseISO,
} from 'date-fns';
import api from '../api/axios';
import StatusChip from '../components/StatusChip';

const priorityColors = { low: '#4caf50', medium: '#ff9800', high: '#f44336', urgent: '#d32f2f' };
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hearings, setHearings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchHearings(); }, []);

  const fetchHearings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/cases', { params: { limit: 100 } });
      const cases = data.data || data.cases || data || [];
      const extracted = [];
      for (const c of (Array.isArray(cases) ? cases : [])) {
        const caseHearings = c.hearings || c.hearingHistory || [];
        for (const h of caseHearings) {
          if (h.date) {
            extracted.push({
              _id: `${c.id}-${h.date}`,
              title: c.caseTitle || c.title || c.caseNumber,
              caseNumber: c.caseNumber,
              date: h.date,
              notes: h.notes || '',
              outcome: h.outcome || '',
              court: c.courtName || c.court || '',
              priority: c.priority || 'medium',
              caseId: c.id || c._id,
            });
          }
        }
        if (c.nextHearingDate) {
          const alreadyHas = extracted.some(
            (e) => e.caseId === (c.id || c._id) && isSameDay(parseISO(e.date), parseISO(c.nextHearingDate))
          );
          if (!alreadyHas) {
            extracted.push({
              _id: `${c.id}-next`,
              title: c.caseTitle || c.title || c.caseNumber,
              caseNumber: c.caseNumber,
              date: c.nextHearingDate,
              notes: 'Next hearing',
              outcome: '',
              court: c.courtName || c.court || '',
              priority: c.priority || 'medium',
              caseId: c.id || c._id,
            });
          }
        }
      }
      setHearings(extracted);
    } catch {
      setHearings([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    const days = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(new Date(day));
      day = addDays(day, 1);
    }
    return days;
  };

  const getHearingsForDay = (date) => {
    return hearings.filter((h) => {
      try {
        const hDate = typeof h.date === 'string' ? parseISO(h.date) : new Date(h.date);
        return isSameDay(hDate, date);
      } catch {
        return false;
      }
    });
  };

  const days = getDaysInMonth();
  const selectedDayHearings = selectedDate ? getHearingsForDay(selectedDate) : [];
  const todayHearings = getHearingsForDay(new Date());

  const upcoming = hearings
    .filter((h) => {
      try { return parseISO(h.date) >= new Date(); } catch { return false; }
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 8);

  return (
    <Box className="page-container">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Calendar</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>Track hearings and court dates</Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} size="small">
                  <ChevronLeft />
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {format(currentMonth, 'MMMM yyyy')}
                </Typography>
                <IconButton onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} size="small">
                  <ChevronRight />
                </IconButton>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
                {WEEK_DAYS.map((day) => (
                  <Box key={day} sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
                      {day}
                    </Typography>
                  </Box>
                ))}

                {days.map((day, i) => {
                  const dayHearings = getHearingsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const today = isToday(day);

                  return (
                    <Box
                      key={i}
                      onClick={() => setSelectedDate(day)}
                      sx={{
                        minHeight: { xs: 52, sm: 72 },
                        p: 0.5,
                        cursor: 'pointer',
                        border: isSelected
                          ? '2px solid rgba(var(--app-accent-rgb), 0.6)'
                          : today
                            ? '2px solid rgba(var(--app-accent-rgb), 0.25)'
                            : '1px solid rgba(37, 51, 73, 0.3)',
                        borderRadius: 1,
                        backgroundColor: isSelected
                          ? 'rgba(var(--app-accent-rgb), 0.1)'
                          : today
                            ? 'rgba(var(--app-accent-rgb), 0.04)'
                            : 'transparent',
                        opacity: isCurrentMonth ? 1 : 0.25,
                        transition: 'all 0.15s',
                        overflow: 'hidden',
                        '&:hover': {
                          backgroundColor: isCurrentMonth ? 'rgba(var(--app-accent-rgb), 0.08)' : 'transparent',
                        },
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: today ? 700 : 400,
                          color: today ? 'primary.main' : 'text.primary',
                          fontSize: '0.75rem',
                          display: 'block',
                          textAlign: 'right',
                          pr: 0.5,
                          lineHeight: 1.5,
                        }}
                      >
                        {format(day, 'd')}
                      </Typography>
                      {dayHearings.slice(0, 2).map((h, hi) => (
                        <Box
                          key={hi}
                          sx={{
                            px: 0.4,
                            py: 0.15,
                            mb: 0.15,
                            borderRadius: 0.5,
                            // Fallback accent needs to be a real hex colour so the
                            // "18" alpha suffix below stays valid CSS.
                            backgroundColor: (theme) =>
                              `${priorityColors[h.priority?.toLowerCase()] || theme.palette.accent.main}18`,
                            borderLeft: (theme) =>
                              `2px solid ${priorityColors[h.priority?.toLowerCase()] || theme.palette.accent.main}`,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.6rem',
                              lineHeight: 1.2,
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: 'text.primary',
                            }}
                          >
                            {h.caseNumber || h.title}
                          </Typography>
                        </Box>
                      ))}
                      {dayHearings.length > 2 && (
                        <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.secondary', pl: 0.4 }}>
                          +{dayHearings.length - 2} more
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: { md: 320 }, flexShrink: 0 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarMonth sx={{ fontSize: 20, color: 'primary.main' }} />
                {selectedDate ? format(selectedDate, 'dd MMMM yyyy') : 'Today'}
              </Typography>
              {(selectedDate ? selectedDayHearings : todayHearings).length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <HearingIcon sx={{ fontSize: 36, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                    No hearings scheduled
                  </Typography>
                </Box>
              ) : (
                (selectedDate ? selectedDayHearings : todayHearings).map((h) => (
                  <Box key={h._id} sx={{ p: 1.5, mb: 1, borderRadius: 1, border: '1px solid rgba(37, 51, 73, 0.4)', '&:hover': { borderColor: 'rgba(var(--app-accent-rgb), 0.3)' } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>{h.title}</Typography>
                      <StatusChip status={h.priority} type="priority" />
                    </Box>
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 500 }}>{h.caseNumber}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <LocationOn sx={{ fontSize: 13, color: 'text.secondary' }} />
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{h.court || '-'}</Typography>
                    </Box>
                    {h.notes && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>{h.notes}</Typography>
                    )}
                  </Box>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Upcoming Hearings</Typography>
              {upcoming.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', py: 2, textAlign: 'center', fontSize: '0.85rem' }}>
                  No upcoming hearings
                </Typography>
              ) : (
                upcoming.map((h) => (
                  <Box
                    key={h._id}
                    sx={{
                      py: 1.2,
                      borderBottom: '1px solid rgba(37, 51, 73, 0.3)',
                      '&:last-child': { borderBottom: 'none' },
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(var(--app-accent-rgb), 0.04)' },
                      borderRadius: 0.5,
                      px: 0.5,
                    }}
                    onClick={() => {
                      try { setSelectedDate(parseISO(h.date)); } catch {}
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'primary.main', display: 'block' }}>
                          {h.caseNumber}
                        </Typography>
                      </Box>
                      <StatusChip status={h.priority} type="priority" />
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <CalendarMonth sx={{ fontSize: 12 }} />
                      {format(parseISO(h.date), 'dd MMM, hh:mm a')}
                      {h.court && <><LocationOn sx={{ fontSize: 12 }} />{h.court}</>}
                    </Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
