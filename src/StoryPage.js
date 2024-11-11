// src/StoryPage.js

import React, { useState, useEffect, useRef } from 'react';
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
  // State variables for story generation
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
  const [audioUrls, setAudioUrls] = useState([]); // Stores the URLs of generated audio files
  const [isPlaying, setIsPlaying] = useState(false); // Indicates if playback is in progress
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0); // Tracks the current audio being played
  const audioRef = useRef(null); // Reference to the current Audio object
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://story.ibot1.net';

  // Function to generate stories
  const handleGenerateStory = async (e) => {
    e.preventDefault();

    // Input validation
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

    // Reset state before generating
    setLoading(true);
    setError('');
    setStories([]);
    setCurrentDay(0);
    setAudioUrls([]);
    setIsPlaying(false);
    setCurrentAudioIndex(0);

    let previousStory = '';
    const generatedStories = [];

    try {
      for (let day = 1; day <= numDays; day++) {
        setCurrentDay(day);
        let prompt = '';

        if (day === 1) {
          // Constructing prompt for the first day
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
          // Constructing prompt for subsequent days
          if (previousStory.length > 1500) {
            const summaryPrompt = `Summarize the following story in 200 words:\n\n${previousStory}`;
            const summaryRes = await axios.post(`${backendUrl}/api/chat`, {
              prompt: summaryPrompt,
            });
            previousStory = summaryRes.data.choices[0].message.content.trim();
          }

          prompt = `Continue the following story into Day ${day}:\n\n${previousStory}\n\nEnsure the language difficulty remains ${languageDifficulty.toLowerCase()} and keep the story concise, around 300 words.`;
        }

        // Sending prompt to OpenAI API
        const res = await axios.post(`${backendUrl}/api/chat`, { prompt });
        const assistantMessage = res.data.choices[0].message.content;

        // Storing the generated story
        generatedStories.push({ day, content: assistantMessage.trim() });

        // Updating previousStory for the next iteration
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

  // Function to initiate audio playback
  const handlePlayStories = async () => {
    if (stories.length === 0) {
      alert('No stories to play.');
      return;
    }

    setLoading(true);
    setError('');
    setAudioUrls([]);
    setIsPlaying(false);
    setCurrentAudioIndex(0);

    try {
      // Generating audio for each story
      const audioPromises = stories.map((storyItem) =>
        axios.post(
          `${backendUrl}/api/tts`,
          { text: `Day ${storyItem.day}: ${storyItem.content}` },
          { responseType: 'blob' }
        )
      );

      const audioResponses = await Promise.all(audioPromises);

      // Creating object URLs for the audio blobs
      const urls = audioResponses.map((response) => URL.createObjectURL(response.data));
      setAudioUrls(urls);
      setIsPlaying(true); // Start playback
    } catch (err) {
      console.error('Error:', err.message);
      setError('Error generating speech audio.');
    } finally {
      setLoading(false);
    }
  };

  // Function to stop audio playback
  const handleStopStories = () => {
    if (audioRef.current) {
      audioRef.current.pause(); // Pause the current audio
      audioRef.current.currentTime = 0; // Reset playback time
      audioRef.current = null; // Clear the reference
    }
    setIsPlaying(false); // Update playback state
    setCurrentAudioIndex(0); // Reset audio index
  };

  // useEffect to handle sequential audio playback
  useEffect(() => {
    // If playback is active and there are audios to play
    if (isPlaying && currentAudioIndex < audioUrls.length) {
      const currentUrl = audioUrls[currentAudioIndex];
      const newAudio = new Audio(currentUrl); // Create a new Audio object
      audioRef.current = newAudio; // Store the Audio object in ref

      // Attempt to play the audio
      newAudio.play().catch((error) => {
        console.error('Error playing audio:', error);
        setError('Error playing audio.');
        setIsPlaying(false);
      });

      // Event listener for when the current audio ends
      newAudio.onended = () => {
        setCurrentAudioIndex((prevIndex) => prevIndex + 1); // Move to the next audio
      };

      // Event listener for audio playback errors
      newAudio.onerror = (e) => {
        console.error('Error during audio playback:', e);
        setError('Error during audio playback.');
        setIsPlaying(false);
      };

      // Cleanup function to pause audio if the component unmounts or dependencies change
      return () => {
        newAudio.pause();
      };
    } else if (isPlaying && currentAudioIndex >= audioUrls.length) {
      // All audios have been played
      setIsPlaying(false);
      setCurrentAudioIndex(0);
    }
  }, [isPlaying, currentAudioIndex, audioUrls]);

  // Cleanup object URLs when the component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      audioUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [audioUrls]);

  return (
    <Container maxWidth="md">
      <Box mt={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Generate a Story Series
        </Typography>

        {/* Input Fields Form */}
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

        {/* Display Generated Stories */}
        {stories.length > 0 &&
          stories.map((storyItem) => (
            <Box key={storyItem.day} mt={2} p={2} bgcolor="#f5f5f5" borderRadius={4}>
              <Typography variant="h6">Day {storyItem.day}:</Typography>
              <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                {storyItem.content}
              </Typography>
            </Box>
          ))}

        {/* Display Error Messages */}
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
