// src/GeneratedStoryPage.js

import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Container, CircularProgress } from '@mui/material';
import axios from 'axios';

function GeneratedStoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { stories, selectedVoice } = location.state || {}; // Destructure the state passed from the StoryPage

  const [audioUrls, setAudioUrls] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef(null);
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://ibotstorybackend-f6e0c4f9h9bkbef8.eastus2-01.azurewebsites.net';

  const handleGenerateVoice = async () => {
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
          { text: `Day ${storyItem.day}: ${storyItem.content}`, voice: selectedVoice },
          { responseType: 'blob' }
        )
      );

      const audioResponses = await Promise.all(audioPromises);

      const urls = audioResponses.map((response) => URL.createObjectURL(response.data));
      setAudioUrls(urls);
    } catch (err) {
      console.error('Error:', err.message);
      setError('Error generating speech audio.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayStories = () => {
    if (audioUrls.length === 0) return;

    setIsPlaying(true);
    setCurrentAudioIndex(0);
  };

  const handleStopStories = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentAudioIndex(0);
  };

  useEffect(() => {
    // If playback is active and there are audios to play
    if (isPlaying && currentAudioIndex < audioUrls.length) {
      const currentUrl = audioUrls[currentAudioIndex];
      const newAudio = new Audio(currentUrl);
      audioRef.current = newAudio;

      newAudio.play().catch((error) => {
        console.error('Error playing audio:', error);
        setError('Error playing audio.');
        setIsPlaying(false);
      });

      newAudio.onended = () => {
        setCurrentAudioIndex((prevIndex) => prevIndex + 1);
      };

      newAudio.onerror = (e) => {
        console.error('Error during audio playback:', e);
        setError('Error during audio playback.');
        setIsPlaying(false);
      };

      return () => {
        newAudio.pause();
      };
    } else if (isPlaying && currentAudioIndex >= audioUrls.length) {
      setIsPlaying(false);
      setCurrentAudioIndex(0);
    }
  }, [isPlaying, currentAudioIndex, audioUrls]);

  useEffect(() => {
    return () => {
      audioUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [audioUrls]);

  return (
    <Container maxWidth="md" style={{ marginTop: '75px' }}>
      <Box mt={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Your Generated Story
        </Typography>
        {stories.length > 0 &&
          stories.map((storyItem) => (
            <Box key={storyItem.day} mt={2} p={2} bgcolor="#f5f5f5" borderRadius={4}>
              <Typography variant="h6">Day {storyItem.day}:</Typography>
              <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                {storyItem.content}
              </Typography>
            </Box>
          ))}

        <Box display="flex" alignItems="center" mt={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateVoice}
            disabled={loading || stories.length === 0}
          >
            {loading ? 'Generating Voice...' : 'Generate Voice'}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handlePlayStories}
            style={{ marginLeft: '16px' }}
            disabled={loading || isPlaying || audioUrls.length === 0}
          >
            Play Stories
          </Button>
          <Button
            variant="outlined"
            color="default"
            onClick={handleStopStories}
            style={{ marginLeft: '16px' }}
            disabled={!isPlaying}
          >
            Stop
          </Button>
        </Box>

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

export default GeneratedStoryPage;
