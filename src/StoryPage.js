import React, { useState } from 'react';
import axios from 'axios';
import {
  TextField,
  Button,
  Typography,
  Container,
  Box,
  CircularProgress,
  MenuItem,
} from '@mui/material';

function StoryPage() {
  const [title, setTitle] = useState('');
  const [protagonist, setProtagonist] = useState('');
  const [storyType, setStoryType] = useState('');
  const [languageDifficulty, setLanguageDifficulty] = useState('');
  const [characterName, setCharacterName] = useState(''); // New state variable
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateStory = async (e) => {
    e.preventDefault();

    // Validate mandatory inputs
    if (!languageDifficulty) {
      setError('Please select a language difficulty level.');
      return;
    }

    if (!characterName.trim()) {
      setError('Please enter a character name.');
      return;
    }

    setLoading(true);
    setError('');
    setStory('');

    // Construct the prompt
    let prompt = `Write a ${languageDifficulty.toLowerCase()} language story`;

    if (storyType.trim()) {
      prompt += ` in the ${storyType} genre`;
    }
    if (title.trim()) {
      prompt += ` titled "${title}"`;
    }
    prompt += ` featuring a character named ${characterName}`;
    if (protagonist.trim()) {
      prompt += ` who is ${protagonist}`;
    }
    if (time.trim() || place.trim()) {
      prompt += ' set';
      if (time.trim()) {
        prompt += ` in ${time}`;
      }
      if (place.trim()) {
        prompt += time.trim() ? ` at ${place}` : ` in ${place}`;
      }
    }
    prompt += '.';

    // Optional: Log the prompt to check correctness
    // console.log('Constructed Prompt:', prompt);

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
          {/* Title (Optional) */}
          <TextField
            fullWidth
            label="Title (Optional)"
            placeholder="e.g., The Brave Adventurer"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            variant="outlined"
            margin="normal"
          />

          {/* Story Type (Optional) */}
          <TextField
            fullWidth
            label="Story Type (Optional)"
            placeholder="e.g., adventure, mystery, romance"
            value={storyType}
            onChange={(e) => setStoryType(e.target.value)}
            variant="outlined"
            margin="normal"
          />

          {/* Language Difficulty (Mandatory) */}
          <TextField
            select
            fullWidth
            label="Language Difficulty"
            value={languageDifficulty}
            onChange={(e) => setLanguageDifficulty(e.target.value)}
            variant="outlined"
            margin="normal"
            required
          >
            <MenuItem value="Easy">Easy</MenuItem>
            <MenuItem value="Intermediate">Intermediate</MenuItem>
            <MenuItem value="Advanced">Advanced</MenuItem>
          </TextField>

          {/* Character Name (Mandatory) */}
          <TextField
            fullWidth
            label="Character Name"
            placeholder="e.g., Alice, John"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            variant="outlined"
            margin="normal"
            required
          />

          {/* Protagonist Characteristics (Optional) */}
          <TextField
            fullWidth
            label="Protagonist Characteristics (Optional)"
            placeholder="e.g., a courageous knight, a curious child"
            value={protagonist}
            onChange={(e) => setProtagonist(e.target.value)}
            variant="outlined"
            margin="normal"
          />

          {/* Time (Optional) */}
          <TextField
            fullWidth
            label="Time (Optional)"
            placeholder="e.g., medieval times, the future"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            variant="outlined"
            margin="normal"
          />

          {/* Place (Optional) */}
          <TextField
            fullWidth
            label="Place (Optional)"
            placeholder="e.g., a small village, outer space"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            variant="outlined"
            margin="normal"
          />

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
            style={{ marginTop: '16px' }}
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