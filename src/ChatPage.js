import React, { useState } from 'react';
import axios from 'axios';
import {
  TextField,
  IconButton,
  Typography,
  Container,
  Box,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import './App.css';

function ChatPage() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://ibotstorybackend-f6e0c4f9h9bkbef8.eastus2-01.azurewebsites.net';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await axios.post(`${backendUrl}/api/chat`, { prompt });
      const assistantMessage = res.data.choices[0].message.content;

      setResponse(assistantMessage);
      setPrompt('');
    } catch (err) {
      console.error('Error:', err.response ? err.response.data : err.message);
      setError(
        err.response && err.response.data && err.response.data.error
          ? err.response.data.error
          : 'Error communicating with the server.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" style={{ marginTop: '100px' }}>
      <Box mt={4}>
        <div className='Subtitle'>
          Chat with ChatGPT
        </div>

        {/* Input Field */}
        <Box component="form" onSubmit={handleSubmit} mb={2} display="flex">
          <TextField
            fullWidth
            placeholder="Type your message..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            variant="outlined"
            required
            disabled={loading}
          />
          <IconButton type="submit" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : <SendIcon />}
          </IconButton>
        </Box>

        {/* Display AI Response */}
        {response && (
          <Box mt={2} p={2} bgcolor="#f5f5f5" borderRadius={4}>
            <Typography variant="h6">Response:</Typography>
            <Typography variant="body1">{response}</Typography>
          </Box>
        )}

        {/* Display Error Message */}
        {error && (
          <Box mt={2} p={2} bgcolor="#ffebee" borderRadius={4}>
            <Typography color="error" variant="body1">
              {error}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
}

export default ChatPage;