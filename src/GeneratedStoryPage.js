import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Button, Typography, Container, CircularProgress, TextField, MenuItem } from '@mui/material';
import axios from 'axios';

function GeneratedStoryPage() {
  const location = useLocation();
  const { stories } = location.state || {};

  const [selectedVoice, setSelectedVoice] = useState('en-US-JennyNeural');
  const [selectedTranslationLanguage, setSelectedTranslationLanguage] = useState('Chinese');
  const [audioSequence, setAudioSequence] = useState([]); // Array of {type:'audio', url:'...', pauseDuration: number}
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [shadowLoading, setShadowLoading] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [error, setError] = useState('');
  const [translatedStories, setTranslatedStories] = useState([]);
  
  const audioRef = useRef(null);
  const pauseTimeoutIdRef = useRef(null);
  const wasInPauseRef = useRef(false);
  const currentPauseDurationRef = useRef(0);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://ibotstorybackend-f6e0c4f9h9bkbef8.eastus2-01.azurewebsites.net';

  const getSentences = (text) => {
    return text.match(/[^\.!\?]+[\.!\?]+/g) || [];
  };

  const handleReadAloud = async () => {
    setLoading(true);
    setError('');
    setAudioSequence([]);
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentAudioIndex(0);

    try {
      const audioPromises = stories.map(async (storyItem) => {
        const response = await axios.post(
          `${backendUrl}/api/tts`,
          {
            text: `Day ${storyItem.day}: ${storyItem.content}`,
            voice: selectedVoice,
          },
          { responseType: 'blob' }
        );

        if (!response.data) {
          throw new Error("Failed to retrieve audio data from server.");
        }

        const audioUrl = URL.createObjectURL(response.data);
        return { type: 'audio', url: audioUrl, pauseDuration: 0 }; 
      });

      const sequence = await Promise.all(audioPromises);
      setAudioSequence(sequence);
    } catch (err) {
      console.error('Error:', err.message);
      setError('Error generating speech audio.');
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    setTranslateLoading(true);
    setError('');
    setTranslatedStories([]);
    setAudioSequence([]);
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentAudioIndex(0);

    try {
      const translated = [];
      for (let storyItem of stories) {
        const sentences = getSentences(storyItem.content);
        const translatedSentences = [];

        for (let sentence of sentences) {
          const translationPrompt = `Translate the following sentence to ${selectedTranslationLanguage}:\n\n"${sentence}"\n\nProvide only the translated sentence.`;
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

  const handleGenerateTranslatedVoice = async () => {
    setTranslateLoading(true);
    setError('');
    setAudioSequence([]);
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentAudioIndex(0);

    try {
      const audioPromises = translatedStories.map(async (storyItem) => {
        const response = await axios.post(
          `${backendUrl}/api/tts`,
          {
            text: `Day ${storyItem.day}: ${storyItem.translated}`,
            voice: selectedVoice,
          },
          { responseType: 'blob' }
        );

        if (!response.data) {
          throw new Error("Failed to retrieve audio data from server.");
        }

        const audioUrl = URL.createObjectURL(response.data);
        return { type: 'audio', url: audioUrl, pauseDuration: 0 };
      });

      const sequence = await Promise.all(audioPromises);
      setAudioSequence(sequence);
    } catch (err) {
      console.error('Error:', err.message);
      setError('Error generating translated speech audio.');
    } finally {
      setTranslateLoading(false);
    }
  };

  // In shadow reading, we create a sequence of (audio, pause) pairs.
  // The pause duration is based on sentence length (e.g., 200ms per word).
  const handleShadowReading = async () => {
    setShadowLoading(true);
    setError('');
    setAudioSequence([]);
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentAudioIndex(0);

    try {
      const sequence = [];
      for (let storyItem of stories) {
        const sentences = getSentences(storyItem.content);
        for (let sentence of sentences) {
          const wordsCount = sentence.trim().split(/\s+/).length;
          const pauseDuration = wordsCount * 200; // Adjust as needed

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
          // Each entry includes the audio and a calculated pause after it
          sequence.push({ type: 'audio', url: audioUrl, pauseDuration });
        }
      }

      setAudioSequence(sequence);
    } catch (err) {
      console.error('Error:', err.message);
      setError('Error generating shadow reading audio.');
    } finally {
      setShadowLoading(false);
    }
  };

  const handlePlayStories = () => {
    if (audioSequence.length > 0) {
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentAudioIndex(0);
      playNextSegment(0);
    }
  };

  const playNextSegment = (index) => {
    if (index >= audioSequence.length) {
      setIsPlaying(false);
      setCurrentAudioIndex(0);
      return;
    }

    if (isPaused) {
      // If paused, do nothing. We'll resume from here later.
      return;
    }

    const segment = audioSequence[index];
    if (segment.type === 'audio') {
      // Play the audio
      const newAudio = new Audio(segment.url);
      audioRef.current = newAudio;

      newAudio.play().catch((error) => {
        console.error('Error playing audio:', error);
        setError('Error playing audio.');
        setIsPlaying(false);
      });

      newAudio.onended = () => {
        audioRef.current = null;
        if (isPaused) {
          // If paused right after ended, wait for resume
          return;
        }

        // After audio ends, we do a pause
        doPauseThenNext(index, segment.pauseDuration);
      };
    }
  };

  const doPauseThenNext = (index, pauseDuration) => {
    // If no pause needed, just move on
    if (pauseDuration <= 0) {
      const nextIndex = index + 1;
      setCurrentAudioIndex(nextIndex);
      playNextSegment(nextIndex);
      return;
    }

    if (isPaused) {
      // If paused right here, just return. We'll resume later.
      wasInPauseRef.current = true;
      currentPauseDurationRef.current = pauseDuration; // store the pause we needed
      return;
    }

    // Not paused, set a timeout for the pause
    wasInPauseRef.current = false;
    currentPauseDurationRef.current = pauseDuration;

    pauseTimeoutIdRef.current = setTimeout(() => {
      pauseTimeoutIdRef.current = null;
      if (isPaused) {
        // If user paused during timeout:
        wasInPauseRef.current = true;
        // We'll handle resume later
        return;
      }

      // Move to next index after pause
      const nextIndex = index + 1;
      setCurrentAudioIndex(nextIndex);
      playNextSegment(nextIndex);
    }, pauseDuration);
  };

  const handleStopStories = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (pauseTimeoutIdRef.current) {
      clearTimeout(pauseTimeoutIdRef.current);
      pauseTimeoutIdRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentAudioIndex(0);
  };

  const handlePauseResume = () => {
    if (!isPaused) {
      // Pause
      setIsPaused(true);
      // If audio is playing, pause it
      if (audioRef.current) {
        audioRef.current.pause();
      }
      // If we are in a pause timeout, clear it
      if (pauseTimeoutIdRef.current) {
        clearTimeout(pauseTimeoutIdRef.current);
        pauseTimeoutIdRef.current = null;
      }
    } else {
      // Resume
      setIsPaused(false);
      // If we have audioRef, resume it (if it ended, there's nothing to resume)
      if (audioRef.current) {
        audioRef.current.play().catch((err) => {
          console.error("Error resuming audio:", err);
        });
      } else {
        // If we were in a pause, re-initiate that pause
        if (wasInPauseRef.current && currentPauseDurationRef.current > 0) {
          // Re-start the pause from scratch
          pauseTimeoutIdRef.current = setTimeout(() => {
            pauseTimeoutIdRef.current = null;
            if (isPaused) {
              // If paused again during the pause
              wasInPauseRef.current = true;
              return;
            }
            // Move to the next track
            const nextIndex = currentAudioIndex + 1;
            setCurrentAudioIndex(nextIndex);
            playNextSegment(nextIndex);
          }, currentPauseDurationRef.current);
        } else {
          // Otherwise, just continue
          const nextIndex = currentAudioIndex;
          playNextSegment(nextIndex);
        }
      }
    }
  };

  return (
    <Container maxWidth="md" style={{ marginTop: '75px' }}>
      <Box mt={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Your Generated Story
        </Typography>
        {stories && stories.length > 0 &&
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
          <MenuItem value="zh-CN-XiaoxiaoNeural">Xiaoxiao (Chinese)</MenuItem>
          <MenuItem value="zh-CN-YunxiNeural">Yunxi (Chinese)</MenuItem>
        </TextField>

        {/* Language selection for translation */}
        <TextField
          select
          fullWidth
          label="Select Translation Language"
          value={selectedTranslationLanguage}
          onChange={(e) => setSelectedTranslationLanguage(e.target.value)}
          variant="outlined"
          margin="normal"
          required
        >
          <MenuItem value="Chinese">Chinese</MenuItem>
          <MenuItem value="Spanish">Spanish</MenuItem>
          <MenuItem value="French">French</MenuItem>
          <MenuItem value="German">German</MenuItem>
          <MenuItem value="Japanese">Japanese</MenuItem>
        </TextField>

        <Box display="flex" flexDirection="column" alignItems="flex-start" mt={2}>

          {/* Read Aloud Button */}
          <Button
            variant="contained"
            color="primary"
            onClick={handleReadAloud}
            disabled={loading || !stories || stories.length === 0}
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
            disabled={translateLoading || !stories || stories.length === 0}
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
            disabled={shadowLoading || !stories || stories.length === 0}
            fullWidth
          >
            {shadowLoading ? 'Generating Shadow Reading...' : 'Shadow Reading'}
          </Button>

          {/* Play, Pause/Resume, and Stop Buttons */}
          <Box display="flex" alignItems="center" mt={2} width="100%">
            <Button
              variant="contained"
              color="primary"
              onClick={handlePlayStories}
              disabled={loading || translateLoading || shadowLoading || isPlaying || audioSequence.length === 0}
              fullWidth
              style={{ marginRight: '8px' }}
            >
              Play
            </Button>
            <Button
              variant="contained"
              color="info"
              onClick={handlePauseResume}
              disabled={!isPlaying && !isPaused}
              fullWidth
              style={{ marginRight: '8px' }}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              variant="outlined"
              color="default"
              onClick={handleStopStories}
              disabled={!isPlaying && !isPaused}
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
