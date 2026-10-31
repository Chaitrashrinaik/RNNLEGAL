import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Card, CardContent, List, ListItem, ListItemAvatar, ListItemText, Avatar, TextField, IconButton, Badge, CircularProgress, Chip } from '@mui/material';
import Send from '@mui/icons-material/Send';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Chat from '@mui/icons-material/Chat';
import { format, parseISO } from 'date-fns';
import api from '../../api/axios';

export default function ClientPortalMessages() {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { fetchConversations(); }, []);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/client-portal/messages/conversations');
      setConversations(data.data || []);
    } catch { setConversations([]); } finally { setLoading(false); }
  };

  const fetchMessages = async (userId) => {
    try {
      const { data } = await api.get('/client-portal/messages', { params: { withUser: userId, limit: 50 } });
      const msgs = (data.data || []).reverse();
      setMessages(msgs);
      setSelectedConv(conversations.find(c => c.otherUser?.id === userId));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      await api.put('/client-portal/messages/read', { senderId: userId });
      fetchConversations();
    } catch {}
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    setSending(true);
    try {
      const { data } = await api.post('/client-portal/messages', {
        receiverId: selectedConv.otherUser.id,
        text: newMessage.trim(),
      });
      setMessages(prev => [...prev, data.data]);
      setNewMessage('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      fetchConversations();
    } catch {} finally { setSending(false); }
  };

  if (selectedConv) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <IconButton onClick={() => { setSelectedConv(null); setMessages([]); }} sx={{ color: 'rgba(255,255,255,0.5)' }}><ArrowBack /></IconButton>
          <Avatar sx={{ bgcolor: '#c9a96e18', color: '#c9a96e', width: 36, height: 36 }}>{(selectedConv.otherUser?.name || '?').charAt(0)}</Avatar>
          <Typography variant="body2" fontWeight={600} sx={{ color: '#fff' }}>{selectedConv.otherUser?.name || 'Unknown'}</Typography>
        </Box>

        <Card sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'auto', mb: 2, p: 2 }}>
          {messages.map((m, i) => {
            const isMe = m.senderType === 'client';
            return (
              <Box key={m.id || i} sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', mb: 1.5 }}>
                <Box sx={{ maxWidth: '70%', bgcolor: isMe ? '#c9a96e' : 'rgba(255,255,255,0.08)', borderRadius: 2, px: 1.5, py: 1 }}>
                  <Typography variant="body2" sx={{ color: isMe ? '#0a0e1a' : '#fff', fontSize: '0.8125rem', wordBreak: 'break-word' }}>{m.text}</Typography>
                  <Typography variant="caption" sx={{ color: isMe ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.3)', fontSize: '0.6rem', display: 'block', textAlign: 'right', mt: 0.25 }}>
                    {m.createdAt ? format(parseISO(m.createdAt), 'hh:mm a') : ''}
                  </Typography>
                </Box>
              </Box>
            );
          })}
          <div ref={messagesEndRef} />
        </Card>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField fullWidth size="small" placeholder="Type a message..." value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            sx={{ '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: '#c9a96e' } } }} />
          <IconButton onClick={handleSend} disabled={!newMessage.trim() || sending}
            sx={{ bgcolor: '#c9a96e', color: '#0a0e1a', '&:hover': { bgcolor: '#b8944f' }, '&.Mui-disabled': { bgcolor: 'rgba(201,169,110,0.3)', color: 'rgba(0,0,0,0.3)' } }}><Send /></IconButton>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ color: '#fff', mb: 3 }}>Messages</Typography>
      {loading ? <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box> : conversations.length === 0 ? (
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}><Chat sx={{ fontSize: 48, color: 'rgba(255,255,255,0.15)', mb: 1 }} /><Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>No conversations yet</Typography></CardContent>
        </Card>
      ) : (
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <List dense disablePadding>
            {conversations.map((conv, i) => (
              <ListItem key={i} onClick={() => fetchMessages(conv.otherUser?.id)}
                sx={{ px: 2.5, py: 1.5, cursor: 'pointer', borderBottom: i < conversations.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                <ListItemAvatar sx={{ minWidth: 48 }}>
                  <Badge badgeContent={conv.unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem' } }}>
                    <Avatar sx={{ bgcolor: '#c9a96e18', color: '#c9a96e', width: 40, height: 40 }}>{(conv.otherUser?.name || '?').charAt(0)}</Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" fontWeight={conv.unreadCount > 0 ? 600 : 400} sx={{ color: '#fff', fontSize: '0.875rem' }}>{conv.otherUser?.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>{conv.lastMessage?.createdAt ? format(parseISO(conv.lastMessage.createdAt), 'MMM dd, hh:mm a') : ''}</Typography>
                  </Box>}
                  secondary={<Typography variant="body2" noWrap sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', mt: 0.25 }}>{conv.lastMessage?.text || 'No messages'}</Typography>} />
              </ListItem>
            ))}
          </List>
        </Card>
      )}
    </Box>
  );
}
