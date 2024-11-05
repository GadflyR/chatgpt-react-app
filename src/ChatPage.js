import React, { useState } from 'react';
import axios from 'axios';
import { TextField, Button, Typography, Container, Box, CircularProgress } from '@mui/material';

function ChatPage() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    const userMessage = { role: 'user', content: prompt };
    const updatedMessages = [...messages, userMessage];
  
    try {
      const res = await axios.post('http://localhost:5000/api/chat', { messages: updatedMessages });
      const assistantMessage = res.data.choices[0].message;
      setMessages([...updatedMessages, assistantMessage]);
      setPrompt('');
    } catch (err) {
      console.error('Error:', err.response ? err.response.data : err.message);
      setError('Error communicating with the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box mt={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Chat with ChatGPT
        </Typography>

        <Box component="form" onSubmit={handleSubmit} mb={2}>
          <TextField
            fullWidth
            label="Type your message"
            multiline
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            variant="outlined"
            margin="normal"
            required
          />
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Send'}
          </Button>
        </Box>

        {error && (
          <Typography color="error" variant="body1">
            {error}
          </Typography>
        )}

        <Box mt={4}>
          {messages.map((msg, index) => (
            <Box key={index} mb={2}>
              <Typography variant="subtitle1" color={msg.role === 'user' ? 'primary' : 'secondary'}>
                <strong>{msg.role === 'user' ? 'You' : 'ChatGPT'}:</strong>
              </Typography>
              <Typography variant="body1">{msg.content}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Container>
  );
}

export default ChatPage;
