import React, { useState } from 'react';
import axios from 'axios';
import {
  TextField,
  Button,
  Typography,
  Container,
  Box,
  CircularProgress,
} from '@mui/material';

function StoryPage() {
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [character, setCharacter] = useState('');
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateStory = async (e) => {
    e.preventDefault();

    // Validate inputs
    if (!time.trim() || !place.trim() || !character.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');
    setStory('');

    // Construct the prompt
    const prompt = `Write a story set in ${time} at ${place}, featuring a character named ${character}.`;

    try {
      const res = await axios.post('http://localhost:5000/api/chat', { prompt });
      const assistantMessage = res.data.choices[0].message.content;

      setStory(assistantMessage);
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
    <Container maxWidth="md">
      <Box mt={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Generate a Story
        </Typography>

        {/* Input Fields */}
        <Box component="form" onSubmit={handleGenerateStory} mb={2}>
          <TextField
            fullWidth
            label="Time"
            placeholder="e.g., medieval times, the future"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            variant="outlined"
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Place"
            placeholder="e.g., a small village, outer space"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            variant="outlined"
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Character Name"
            placeholder="e.g., Alice, John"
            value={character}
            onChange={(e) => setCharacter(e.target.value)}
            variant="outlined"
            margin="normal"
            required
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Generating...' : 'Generate Story'}
          </Button>
        </Box>

        {/* Display Story */}
        {story && (
          <Box mt={2} p={2} bgcolor="#f5f5f5" borderRadius={4}>
            <Typography variant="h6">Your Story:</Typography>
            <Typography variant="body1">{story}</Typography>
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

export default StoryPage;