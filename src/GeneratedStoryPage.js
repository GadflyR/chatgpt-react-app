// GeneratedStoryPage.jsx

import React, { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Button,
  CircularProgress,
  List,
  ListItem,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

function GeneratedStoryPage() {
  const location = useLocation();

  // Get state from the VoiceOptionsPage
  const {
    stories,
    imageUrl,
    voiceSteps: initialVoiceSteps,
    ttsCache: initialTtsCache
  } = location.state || {};

  // Provide fallback so we never skip Hook calls
  // We ALWAYS call these Hooks (even if we have no stories).
  const finalStories = stories || [];

  const [voiceSteps, setVoiceSteps] = useState(initialVoiceSteps || []);
  const [ttsCache, setTtsCache] = useState(initialTtsCache || {});
  const [audioSequence, setAudioSequence] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [error, setError] = useState('');

  // Refs for audio playback
  const audioRef = useRef(null);
  const pauseTimeoutRef = useRef(null);
  const wasInPauseRef = useRef(false);
  const currentPauseDurationRef = useRef(0);

  // ========== If no stories, show a message AFTER all Hooks are declared ==========
  if (finalStories.length === 0) {
    return (
      <Container maxWidth="md" sx={{ marginTop: '50px' }}>
        <Typography variant="h5">No story available.</Typography>
      </Container>
    );
  }

  // ================== Playback logic (unconditional Hooks above) ==================
  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentAudioIndex(0);
    setAudioSequence([]);
  };

  const handlePlayAll = () => {
    stopPlayback();

    // Filter steps that have status === 'done'
    const doneSteps = voiceSteps.filter((step) => {
      const entry = ttsCache[step.cacheKey];
      return entry && entry.status === 'done';
    });
    if (!doneSteps.length) return;

    // Combine all audio segments
    const combined = doneSteps.flatMap((step) => ttsCache[step.cacheKey].sequence);
    setAudioSequence(combined);
    setIsPlaying(true);
    setIsPaused(false);
    setCurrentAudioIndex(0);
    playNextSegment(0, combined);
  };

  const playNextSegment = (index, sequence) => {
    if (index >= sequence.length) {
      setIsPlaying(false);
      setCurrentAudioIndex(0);
      return;
    }
    if (isPaused) return;

    const segment = sequence[index];
    if (segment.type === 'audio') {
      const audioEl = new Audio(segment.url);
      audioRef.current = audioEl;

      audioEl
        .play()
        .catch((err) => {
          console.error('Audio play error:', err);
          setError('Could not play audio.');
          setIsPlaying(false);
        });

      audioEl.onended = () => {
        audioRef.current = null;
        if (isPaused) return;
        handlePauseThenNext(index, segment.pauseDuration, sequence);
      };
    }
  };

  const handlePauseThenNext = (index, pauseDuration, sequence) => {
    if (pauseDuration <= 0) {
      const nextIndex = index + 1;
      setCurrentAudioIndex(nextIndex);
      playNextSegment(nextIndex, sequence);
      return;
    }

    if (isPaused) {
      wasInPauseRef.current = true;
      currentPauseDurationRef.current = pauseDuration;
      return;
    }
    wasInPauseRef.current = false;
    currentPauseDurationRef.current = pauseDuration;

    pauseTimeoutRef.current = setTimeout(() => {
      pauseTimeoutRef.current = null;
      if (isPaused) {
        wasInPauseRef.current = true;
        return;
      }
      const nextIndex = index + 1;
      setCurrentAudioIndex(nextIndex);
      playNextSegment(nextIndex, sequence);
    }, pauseDuration);
  };

  const handleStop = () => {
    stopPlayback();
  };

  const handlePauseResume = () => {
    if (!isPlaying && !isPaused) return;

    if (!isPaused) {
      // Pause
      setIsPaused(true);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
    } else {
      // Resume
      setIsPaused(false);
      if (audioRef.current) {
        audioRef.current.play().catch((err) => {
          console.error('Resume audio error:', err);
        });
      } else {
        // We were paused between segments
        if (wasInPauseRef.current && currentPauseDurationRef.current > 0) {
          pauseTimeoutRef.current = setTimeout(() => {
            pauseTimeoutRef.current = null;
            if (isPaused) {
              wasInPauseRef.current = true;
              return;
            }
            const nextIndex = currentAudioIndex + 1;
            setCurrentAudioIndex(nextIndex);
            playNextSegment(nextIndex, audioSequence);
          }, currentPauseDurationRef.current);
        } else {
          playNextSegment(currentAudioIndex, audioSequence);
        }
      }
    }
  };

  const handleDeleteStep = (stepId) => {
    setVoiceSteps((prev) => prev.filter((step) => step.id !== stepId));
  };

  const hasReadyAudio = voiceSteps.some((step) => {
    const entry = ttsCache[step.cacheKey];
    return entry && entry.status === 'done';
  });

  // ================== Actual UI Rendering ==================
  return (
    <Container maxWidth="lg" sx={{ marginTop: '50px' }}>
      <Grid container spacing={4}>
        {/* LEFT: Display the final story & optional image */}
        <Grid item xs={12} md={8}>
          {imageUrl && (
            <Box mb={3} textAlign="center">
              <img
                src={imageUrl}
                alt="Generated illustration"
                style={{ maxWidth: '100%', borderRadius: 8 }}
              />
            </Box>
          )}

          <Typography variant="h4" gutterBottom>
            Your Generated Story
          </Typography>

          {/* Render each day of the story */}
          {finalStories.map((storyItem) => (
            <Box
              key={storyItem.day}
              mb={4}
              p={2}
              sx={{ backgroundColor: '#f5f5f5' }}
            >
              <Typography variant="h6">Day {storyItem.day}</Typography>
              <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                {storyItem.content}
              </Typography>
            </Box>
          ))}
        </Grid>

        {/* RIGHT: playback controls (Play, Pause, Stop) and steps list */}
        <Grid item xs={12} md={4}>
          <Typography variant="h5" gutterBottom>
            Playback Controls
          </Typography>

          <Box display="flex" alignItems="center" mb={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={handlePlayAll}
              disabled={!hasReadyAudio || isPlaying}
              sx={{ marginRight: 1 }}
            >
              Play All
            </Button>
            <Button
              variant="contained"
              color="info"
              onClick={handlePauseResume}
              disabled={!isPlaying && !isPaused}
              sx={{ marginRight: 1 }}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleStop}
              disabled={!isPlaying && !isPaused}
            >
              Stop
            </Button>
          </Box>

          {/* Steps to Play (no TTS generation, only display & remove) */}
          {voiceSteps.length > 0 && (
            <Box p={2} bgcolor="#fff8e1" borderRadius={2}>
              <Typography variant="h6" gutterBottom>
                Steps to Play (in Order)
              </Typography>
              <List>
                {voiceSteps.map((step) => {
                  const entry = ttsCache[step.cacheKey] || {};
                  const statusLabel =
                    entry.status === 'done'
                      ? '(Ready)'
                      : entry.status === 'pending'
                      ? '(Generating...)'
                      : entry.status === 'error'
                      ? '(Error)'
                      : '(?)';

                  return (
                    <ListItem
                      key={step.id}
                      secondaryAction={
                        <IconButton onClick={() => handleDeleteStep(step.id)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <Typography variant="body1">
                        {step.label} {statusLabel}
                      </Typography>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}

          {/* Show error or spinner if needed */}
          {(isPlaying || isPaused) && !audioSequence.length && (
            <Box mt={2}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Box mt={2} p={2} bgcolor="#ffebee" borderRadius={2}>
              <Typography color="error">{error}</Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}

export default GeneratedStoryPage;
