// src/StoryPage.js

import React, { useState, useEffect } from 'react';
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
  const [characterName, setCharacterName] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [numDays, setNumDays] = useState(1);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [error, setError] = useState('');

  // State variables for audio playback
  const [audioUrls, setAudioUrls] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);

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

    if (!numDays || isNaN(numDays) || numDays < 1) {
      setError('Please enter a valid number of days (minimum 1).');
      return;
    }

    setLoading(true);
    setError('');
    setStories([]);
    setCurrentDay(0);

    let previousStory = '';
    const generatedStories = [];

    try {
      for (let day = 1; day <= numDays; day++) {
        setCurrentDay(day);
        let prompt = '';

        if (day === 1) {
          // Day 1: Initial story
          prompt = `Write a ${languageDifficulty.toLowerCase()} language story`;
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
          prompt += ' Keep the story concise, around 300 words.';
        } else {
          // Subsequent days: Continue the story
          // Summarize previous stories if necessary
          if (previousStory.length > 1500) {
            const summaryPrompt = `Summarize the following story in 200 words:\n\n${previousStory}`;
            const summaryRes = await axios.post('http://localhost:5000/api/chat', {
              prompt: summaryPrompt,
            });
            previousStory = summaryRes.data.choices[0].message.content.trim();
          }

          prompt = `Continue the following story into Day ${day}:\n\n${previousStory}\n\nEnsure the language difficulty remains ${languageDifficulty.toLowerCase()} and keep the story concise, around 300 words.`;
        }

        // Optional: Log the prompt
        // console.log(`Prompt for Day ${day}:`, prompt);

        const res = await axios.post('http://localhost:5000/api/chat', { prompt });
        const assistantMessage = res.data.choices[0].message.content;

        // Save the generated story
        generatedStories.push({ day, content: assistantMessage.trim() });

        // Update the previous story
        previousStory = assistantMessage.trim();
      }

      setStories(generatedStories);
    } catch (err) {
      console.error('Error:', err.response ? err.response.data : err.message);
      setError(
        err.response && err.response.data && err.response.data.error
          ? err.response.data.error
          : 'Error communicating with the server.'
      );
    } finally {
      setLoading(false);
      setCurrentDay(0);
    }
  };

  const getSpeechAudio = async (text) => {
    const subscriptionKey = process.env.REACT_APP_AZURE_TTS_KEY;
    const region = process.env.REACT_APP_AZURE_REGION;
    const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const ssml = `<speak version='1.0' xml:lang='en-US'>
      <voice xml:lang='en-US' xml:gender='Female' name='en-US-JennyNeural'>
        ${text}
      </voice>
    </speak>`;

    const headers = {
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
    };

    const response = await axios.post(endpoint, ssml, {
      headers,
      responseType: 'blob',
    });

    return response.data;
  };

  const handlePlayStories = async () => {
    if (stories.length === 0) {
      alert('No stories to play.');
      return;
    }

    setLoading(true);
    setError('');
    setAudioUrls([]);
    setCurrentAudioIndex(0);

    try {
      const audioPromises = stories.map((storyItem) =>
        getSpeechAudio(`Day ${storyItem.day}: ${storyItem.content}`)
      );

      const audioBlobs = await Promise.all(audioPromises);

      // Create URLs for the audio blobs
      const urls = audioBlobs.map((blob) => URL.createObjectURL(blob));
      setAudioUrls(urls);
      setIsPlaying(true);
    } catch (err) {
      console.error('Error:', err.message);
      setError('Error generating speech audio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let audioElement = null;

    const playAudio = () => {
      if (currentAudioIndex < audioUrls.length) {
        audioElement = new Audio(audioUrls[currentAudioIndex]);
        audioElement.play();

        audioElement.onended = () => {
          setCurrentAudioIndex((prevIndex) => prevIndex + 1);
        };

        audioElement.onerror = (e) => {
          console.error('Error playing audio:', e);
          setError('Error playing audio.');
          setIsPlaying(false);
        };
      } else {
        setIsPlaying(false);
        setCurrentAudioIndex(0);
      }
    };

    if (isPlaying && audioUrls.length > 0) {
      playAudio();
    }

    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [isPlaying, currentAudioIndex, audioUrls]);

  const handleStopStories = () => {
    setIsPlaying(false);
    setCurrentAudioIndex(0);
  };

  return (
    <Container maxWidth="md">
      <Box mt={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Generate a Story Series
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
            select
            fullWidth
            label="Story Type (Optional)"
            value={storyType}
            onChange={(e) => setStoryType(e.target.value)}
            variant="outlined"
            margin="normal"
          >
            <MenuItem value="Adventure">Adventure</MenuItem>
            <MenuItem value="Mystery">Mystery</MenuItem>
            <MenuItem value="Romance">Romance</MenuItem>
            <MenuItem value="Fantasy">Fantasy</MenuItem>
            <MenuItem value="Science Fiction">Science Fiction</MenuItem>
            <MenuItem value="Horror">Horror</MenuItem>
            {/* Add more options as desired */}
          </TextField>

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

          {/* Number of Days (Mandatory) */}
          <TextField
            fullWidth
            label="How many days do you want to generate?"
            type="number"
            inputProps={{ min: 1 }}
            value={numDays}
            onChange={(e) => setNumDays(e.target.value)}
            variant="outlined"
            margin="normal"
            required
          />

          {/* Submit Button */}
          <Box display="flex" alignItems="center" mt={2}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Generating...' : 'Generate Story'}
            </Button>
            {loading && currentDay > 0 && (
              <Typography variant="body1" style={{ marginLeft: '16px' }}>
                Generating Day {currentDay} of {numDays}...
              </Typography>
            )}
          </Box>
        </Box>

        {/* Play and Stop Buttons */}
        {stories.length > 0 && (
          <Box display="flex" alignItems="center" mt={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={handlePlayStories}
              disabled={loading || isPlaying}
            >
              {isPlaying ? 'Playing...' : 'Play Stories'}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleStopStories}
              style={{ marginLeft: '16px' }}
              disabled={!isPlaying}
            >
              Stop Stories
            </Button>
          </Box>
        )}

        {/* Display Stories */}
        {stories.length > 0 &&
          stories.map((storyItem) => (
            <Box key={storyItem.day} mt={2} p={2} bgcolor="#f5f5f5" borderRadius={4}>
              <Typography variant="h6">Day {storyItem.day}:</Typography>
              <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                {storyItem.content}
              </Typography>
            </Box>
          ))}

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
