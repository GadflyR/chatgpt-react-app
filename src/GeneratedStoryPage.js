import React, { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Button, Typography, Container, CircularProgress, TextField, MenuItem } from '@mui/material';
import axios from 'axios';

function GeneratedStoryPage() {
  const location = useLocation();
  const { stories } = location.state || {};

  const [selectedVoice, setSelectedVoice] = useState('en-US-JennyNeural');
  const [audioUrls, setAudioUrls] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [shadowLoading, setShadowLoading] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [error, setError] = useState('');
  const [translatedStories, setTranslatedStories] = useState([]);
  const audioRef = useRef(null);
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://ibotstorybackend-f6e0c4f9h9bkbef8.eastus2-01.azurewebsites.net';

  // Utility function to split text into sentences using regex
  const getSentences = (text) => {
    return text.match(/[^\.!\?]+[\.!\?]+/g) || [];
  };

  // Handler for "Read Aloud"
  const handleReadAloud = async () => {
    setLoading(true);
    setError('');
    setAudioUrls([]);
    setIsPlaying(false);
    setCurrentAudioIndex(0);

    try {
      // Generating audio for each story
      const audioPromises = stories.map(async (storyItem) => {
        const response = await axios.post(
          `${backendUrl}/api/tts`,
          {
            text: `Day ${storyItem.day}: ${storyItem.content}`,
            voice: selectedVoice,
          },
          { responseType: 'blob' }
        );

        // Ensure response is a valid blob
        if (!response.data) {
          throw new Error("Failed to retrieve audio data from server.");
        }

        // Create an object URL from the response data (Blob)
        const audioUrl = URL.createObjectURL(response.data);
        return audioUrl;
      });

      // Resolve all audio URLs and set state
      const urls = await Promise.all(audioPromises);
      setAudioUrls(urls);
    } catch (err) {
      console.error('Error:', err.message);
      setError('Error generating speech audio.');
    } finally {
      setLoading(false);
    }
  };

  // Handler for "Translate Sentence-by-Sentence"
  const handleTranslate = async () => {
    setTranslateLoading(true);
    setError('');
    setTranslatedStories([]);
    setAudioUrls([]);
    setIsPlaying(false);
    setCurrentAudioIndex(0);

    try {
      const translated = [];

      for (let storyItem of stories) {
        const sentences = getSentences(storyItem.content);
        const translatedSentences = [];

        for (let sentence of sentences) {
          // Translate each sentence to Chinese
          const translationPrompt = `Translate the following sentence to Chinese:\n\n"${sentence}"\n\nProvide only the translated sentence.`;
          const translationRes = await axios.post(`${backendUrl}/api/chat`, {
            prompt: translationPrompt,
          });

          const translatedSentence = translationRes.data.choices[0].message.content.trim();
          translatedSentences.push(translatedSentence);
        }

        translated.push({
          day: storyItem.day,
          original: storyItem.content,
          translated: translatedSentences.join(' '),
        });
      }

      setTranslatedStories(translated);
    } catch (err) {
      console.error('Error:', err.message);
      setError('Error translating the story.');
    } finally {
      setTranslateLoading(false);
    }
  };

  // Handler to generate voice for translated stories
  const handleGenerateTranslatedVoice = async () => {
    setTranslateLoading(true);
    setError('');
    setAudioUrls([]);
    setIsPlaying(false);
    setCurrentAudioIndex(0);

    try {
      // Generating audio for each translated story
      const audioPromises = translatedStories.map(async (storyItem) => {
        const response = await axios.post(
          `${backendUrl}/api/tts`,
          {
            text: `Day ${storyItem.day}: ${storyItem.translated}`,
            voice: selectedVoice,
          },
          { responseType: 'blob' }
        );

        // Ensure response is a valid blob
        if (!response.data) {
          throw new Error("Failed to retrieve audio data from server.");
        }

        // Create an object URL from the response data (Blob)
        const audioUrl = URL.createObjectURL(response.data);
        return audioUrl;
      });

      // Resolve all audio URLs and set state
      const urls = await Promise.all(audioPromises);
      setAudioUrls(urls);
    } catch (err) {
      console.error('Error:', err.message);
      setError('Error generating translated speech audio.');
    } finally {
      setTranslateLoading(false);
    }
  };

  // Handler for "Shadow Reading"
  const handleShadowReading = async () => {
    setShadowLoading(true);
    setError('');
    setAudioUrls([]);
    setIsPlaying(false);
    setCurrentAudioIndex(0);

    try {
      const shadowAudioUrls = [];

      for (let storyItem of stories) {
        const sentences = getSentences(storyItem.content);

        for (let sentence of sentences) {
          // Generate audio for each sentence
          const response = await axios.post(
            `${backendUrl}/api/tts`,
            {
              text: sentence,
              voice: selectedVoice,
            },
            { responseType: 'blob' }
          );

          if (!response.data) {
            throw new Error("Failed to retrieve audio data from server.");
          }

          const audioUrl = URL.createObjectURL(response.data);
          shadowAudioUrls.push(audioUrl);

          // Insert a placeholder for 10-second pause
          shadowAudioUrls.push('PAUSE_10_SECONDS'); // Custom marker
        }
      }

      setAudioUrls(shadowAudioUrls);
    } catch (err) {
      console.error('Error:', err.message);
      setError('Error generating shadow reading audio.');
    } finally {
      setShadowLoading(false);
    }
  };

  // Play audio sequences with handling for pauses
  const handlePlayStories = () => {
    if (audioUrls.length > 0) {
      setIsPlaying(true);
      playAudioAtIndex(currentAudioIndex);
    }
  };

  const playAudioAtIndex = (index) => {
    if (index >= audioUrls.length) {
      setIsPlaying(false);
      setCurrentAudioIndex(0);
      return;
    }

    const currentUrl = audioUrls[index];

    if (currentUrl === 'PAUSE_10_SECONDS') {
      // Implement a 10-second pause
      setTimeout(() => {
        setCurrentAudioIndex(prevIndex => prevIndex + 1);
        playAudioAtIndex(index + 1);
      }, 10000); // 10,000 milliseconds = 10 seconds
    } else {
      const newAudio = new Audio(currentUrl);
      audioRef.current = newAudio;

      newAudio.play().catch((error) => {
        console.error('Error playing audio:', error);
        setError('Error playing audio.');
        setIsPlaying(false);
      });

      newAudio.onended = () => {
        setCurrentAudioIndex(prevIndex => prevIndex + 1);
        playAudioAtIndex(index + 1);
      };
    }
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

        {/* Display Translated Stories */}
        {translatedStories.length > 0 &&
          translatedStories.map((storyItem) => (
            <Box key={`translated-${storyItem.day}`} mt={2} p={2} bgcolor="#e8f5e9" borderRadius={4}>
              <Typography variant="h6">Day {storyItem.day} (Translated):</Typography>
              <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                {storyItem.translated}
              </Typography>
            </Box>
          ))}

        <TextField
          select
          fullWidth
          label="Select Voice"
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          variant="outlined"
          margin="normal"
          required
        >
          <MenuItem value="en-US-JennyNeural">Jenny (US)</MenuItem>
          <MenuItem value="en-US-GuyNeural">Guy (US)</MenuItem>
          <MenuItem value="en-GB-LibbyNeural">Libby (UK)</MenuItem>
          <MenuItem value="en-GB-RyanNeural">Ryan (UK)</MenuItem>
          <MenuItem value="en-AU-NatashaNeural">Natasha (AU)</MenuItem>
          <MenuItem value="en-IN-NeerjaNeural">Neerja (IN)</MenuItem>
          {/* Add Chinese voices if available */}
          <MenuItem value="zh-CN-XiaoxiaoNeural">Xiaoxiao (Chinese)</MenuItem>
          <MenuItem value="zh-CN-YunxiNeural">Yunxi (Chinese)</MenuItem>
        </TextField>

        <Box display="flex" flexDirection="column" alignItems="flex-start" mt={2}>

          {/* Read Aloud Button */}
          <Button
            variant="contained"
            color="primary"
            onClick={handleReadAloud}
            disabled={loading || stories.length === 0}
            fullWidth
            style={{ marginBottom: '16px' }}
          >
            {loading ? 'Generating Voice...' : 'Read Aloud'}
          </Button>

          {/* Translate Sentence-by-Sentence Button */}
          <Button
            variant="contained"
            color="secondary"
            onClick={handleTranslate}
            disabled={translateLoading || stories.length === 0}
            fullWidth
            style={{ marginBottom: '16px' }}
          >
            {translateLoading ? 'Translating...' : 'Translate Sentence-by-Sentence'}
          </Button>

          {/* Generate Voice for Translated Stories */}
          {translatedStories.length > 0 && (
            <Button
              variant="contained"
              color="success"
              onClick={handleGenerateTranslatedVoice}
              disabled={translateLoading || translatedStories.length === 0}
              fullWidth
              style={{ marginBottom: '16px' }}
            >
              {translateLoading ? 'Generating Translated Voice...' : 'Generate Voice for Translated Story'}
            </Button>
          )}

          {/* Shadow Reading Button */}
          <Button
            variant="contained"
            color="warning"
            onClick={handleShadowReading}
            disabled={shadowLoading || stories.length === 0}
            fullWidth
          >
            {shadowLoading ? 'Generating Shadow Reading...' : 'Shadow Reading'}
          </Button>

          {/* Play and Stop Buttons */}
          <Box display="flex" alignItems="center" mt={2} width="100%">
            <Button
              variant="contained"
              color="primary"
              onClick={handlePlayStories}
              disabled={loading || translateLoading || shadowLoading || isPlaying || audioUrls.length === 0}
              fullWidth
              style={{ marginRight: '8px' }}
            >
              Play Stories
            </Button>
            <Button
              variant="outlined"
              color="default"
              onClick={handleStopStories}
              disabled={!isPlaying}
              fullWidth
            >
              Stop
            </Button>
          </Box>
        </Box>

        {/* Loading Indicators */}
        {(loading || translateLoading || shadowLoading) && (
          <Box mt={2}>
            <CircularProgress />
          </Box>
        )}

        {/* Error Message */}
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
