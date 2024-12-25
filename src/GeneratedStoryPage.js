import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Container,
  CircularProgress,
  Menu,
  MenuItem,
  ButtonGroup,
  TextField,
  MenuItem as TextFieldMenuItem,
  Select,
  FormControl,
  InputLabel,
  List,
  ListItem,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

function GeneratedStoryPage() {
  const location = useLocation();
  const { stories } = location.state || {};

  // Keep track of which day index is currently displayed
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  /**
   * ========== AUDIO/VOICE STATES ==========
   */
  const [selectedVoice, setSelectedVoice] = useState('en-US-JennyNeural');
  const [selectedTranslationLanguage, setSelectedTranslationLanguage] = useState('Chinese');

  // A collection of "steps" that the user generated
  // Each step is { id, label, audioSequence: [ {type:'audio', url:'...', pauseDuration: number}, ... ] }
  const [voiceSteps, setVoiceSteps] = useState([]);

  // The combined audio sequence for "Play"
  const [audioSequence, setAudioSequence] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);

  /**
   * ========== LOADING / ERROR STATES ==========
   */
  const [loading, setLoading] = useState(false);
  const [shadowLoading, setShadowLoading] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [error, setError] = useState('');

  // For translation
  const [translatedText, setTranslatedText] = useState('');

  // For our "Translate" button’s pop-up menu
  const [translateAnchorEl, setTranslateAnchorEl] = useState(null);

  // Audio refs
  const audioRef = useRef(null);
  const pauseTimeoutIdRef = useRef(null);
  const wasInPauseRef = useRef(false);
  const currentPauseDurationRef = useRef(0);

  const backendUrl =
    process.env.REACT_APP_BACKEND_URL ||
    'https://ibotstorybackend-f6e0c4f9h9bkbef8.eastus2-01.azurewebsites.net';

  // Helper to split text into sentences
  const getSentences = (text) => {
    return text.match(/[^\.!\?]+[\.!\?]+/g) || [];
  };

  /**
   * ========== DAY NAVIGATION ==========
   */
  const handlePreviousDay = () => {
    if (!stories) return;
    setCurrentDayIndex((prev) => Math.max(0, prev - 1));
    resetAudioState();
  };

  const handleNextDay = () => {
    if (!stories) return;
    setCurrentDayIndex((prev) => Math.min(stories.length - 1, prev + 1));
    resetAudioState();
  };

  const handleJumpToDay = (dayIndex) => {
    setCurrentDayIndex(dayIndex);
    resetAudioState();
  };

  const resetAudioState = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (pauseTimeoutIdRef.current) {
      clearTimeout(pauseTimeoutIdRef.current);
      pauseTimeoutIdRef.current = null;
    }
    setAudioSequence([]);
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentAudioIndex(0);
    setError('');
    setTranslatedText('');
    // We do NOT clear voiceSteps here, because the user might
    // want to keep the steps they've generated from previous days.
  };

  /**
   * Helper to add a new voice step to the voiceSteps array
   */
  const addVoiceStep = (label, sequence) => {
    const newStep = {
      id: Date.now(), // simple unique ID
      label,
      audioSequence: sequence || []
    };
    setVoiceSteps((prev) => [...prev, newStep]);
  };

  /**
   * ========== READ ALOUD (ONE DAY ONLY) ==========
   */
  const handleReadAloud = async () => {
    if (!stories || !stories[currentDayIndex]) return;
    setLoading(true);
    setError('');

    try {
      const dayItem = stories[currentDayIndex];
      const response = await axios.post(
        `${backendUrl}/api/tts`,
        {
          text: `Day ${dayItem.day}: ${dayItem.content}`,
          voice: selectedVoice,
        },
        { responseType: 'blob' }
      );

      if (!response.data) {
        throw new Error('Failed to retrieve audio data from server.');
      }

      const audioUrl = URL.createObjectURL(response.data);
      // Create the step
      const stepSequence = [{ type: 'audio', url: audioUrl, pauseDuration: 0 }];
      addVoiceStep(`Read Aloud (Day ${dayItem.day})`, stepSequence);
    } catch (err) {
      console.error('Error:', err.message);
      setError('Error generating speech audio.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * ========== TRANSLATION (ONE DAY ONLY) ==========
   */
  const handleTranslate = async () => {
    if (!stories || !stories[currentDayIndex]) return;
    setTranslateLoading(true);
    setError('');
    setTranslatedText('');

    try {
      const { content } = stories[currentDayIndex];
      const sentences = getSentences(content);
      const translatedSentences = [];

      for (let sentence of sentences) {
        const translationPrompt = `Translate the following sentence to ${selectedTranslationLanguage}:\n\n"${sentence}"\n\nProvide only the translated sentence.`;
        const translationRes = await axios.post(`${backendUrl}/api/chat`, {
          prompt: translationPrompt,
        });
        translatedSentences.push(translationRes.data.choices[0].message.content.trim());
      }

      const joinedTranslation = translatedSentences.join(' ');
      setTranslatedText(joinedTranslation);
    } catch (err) {
      console.error('Error:', err.message);
      setError('Error translating the story.');
    } finally {
      setTranslateLoading(false);
    }
  };

  /**
   * ========== GENERATE VOICE FOR TRANSLATED TEXT (ONE DAY ONLY) ==========
   */
  const handleGenerateTranslatedVoice = async () => {
    if (!stories || !stories[currentDayIndex] || !translatedText) return;
    setTranslateLoading(true);
    setError('');

    try {
      const dayItem = stories[currentDayIndex];
      const response = await axios.post(
        `${backendUrl}/api/tts`,
        {
          text: `Day ${dayItem.day}: ${translatedText}`,
          voice: selectedVoice,
        },
        { responseType: 'blob' }
      );

      if (!response.data) {
        throw new Error('Failed to retrieve audio data from server.');
      }

      const audioUrl = URL.createObjectURL(response.data);
      const stepSequence = [{ type: 'audio', url: audioUrl, pauseDuration: 0 }];
      addVoiceStep(
        `Translated Voice (Day ${dayItem.day}, ${selectedTranslationLanguage})`,
        stepSequence
      );
    } catch (err) {
      console.error('Error:', err.message);
      setError('Error generating translated speech audio.');
    } finally {
      setTranslateLoading(false);
    }
  };

  /**
   * ========== SHADOW READING (ONE DAY ONLY) ==========
   */
  const handleShadowReading = async () => {
    if (!stories || !stories[currentDayIndex]) return;
    setShadowLoading(true);
    setError('');

    try {
      const sequence = [];
      const { content } = stories[currentDayIndex];
      const sentences = getSentences(content);

      for (let sentence of sentences) {
        const wordsCount = sentence.trim().split(/\s+/).length;
        const pauseDuration = wordsCount * 200; // adjust as needed

        const response = await axios.post(
          `${backendUrl}/api/tts`,
          {
            text: sentence,
            voice: selectedVoice,
          },
          { responseType: 'blob' }
        );

        if (!response.data) {
          throw new Error('Failed to retrieve audio data from server.');
        }

        const audioUrl = URL.createObjectURL(response.data);
        sequence.push({ type: 'audio', url: audioUrl, pauseDuration });
      }

      addVoiceStep(`Shadow Reading (Day ${stories[currentDayIndex].day})`, sequence);
    } catch (err) {
      console.error('Error:', err.message);
      setError('Error generating shadow reading audio.');
    } finally {
      setShadowLoading(false);
    }
  };

  /**
   * ========== COMBINE ALL STEPS & PLAYBACK CONTROLS ==========
   */
  const handlePlayAll = () => {
    if (voiceSteps.length === 0) return;
    // Combine all steps in the order they were added
    const combinedSequence = voiceSteps.flatMap((step) => step.audioSequence);
    setAudioSequence(combinedSequence);

    // Now start playing
    setIsPlaying(true);
    setIsPaused(false);
    setCurrentAudioIndex(0);
    playNextSegment(0);
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
          return;
        }
        // After audio ends, do a pause
        doPauseThenNext(index, segment.pauseDuration);
      };
    }
  };

  const doPauseThenNext = (index, pauseDuration) => {
    if (pauseDuration <= 0) {
      const nextIndex = index + 1;
      setCurrentAudioIndex(nextIndex);
      playNextSegment(nextIndex);
      return;
    }

    if (isPaused) {
      wasInPauseRef.current = true;
      currentPauseDurationRef.current = pauseDuration;
      return;
    }

    wasInPauseRef.current = false;
    currentPauseDurationRef.current = pauseDuration;

    pauseTimeoutIdRef.current = setTimeout(() => {
      pauseTimeoutIdRef.current = null;
      if (isPaused) {
        wasInPauseRef.current = true;
        return;
      }
      const nextIndex = index + 1;
      setCurrentAudioIndex(nextIndex);
      playNextSegment(nextIndex);
    }, pauseDuration);
  };

  const handleStop = () => {
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
    if (!isPlaying && !isPaused) return;

    if (!isPaused) {
      // Pause
      setIsPaused(true);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (pauseTimeoutIdRef.current) {
        clearTimeout(pauseTimeoutIdRef.current);
        pauseTimeoutIdRef.current = null;
      }
    } else {
      // Resume
      setIsPaused(false);
      if (audioRef.current) {
        audioRef.current
          .play()
          .catch((err) => console.error('Error resuming audio:', err));
      } else {
        // If we were in a pause, re-initiate that pause
        if (wasInPauseRef.current && currentPauseDurationRef.current > 0) {
          pauseTimeoutIdRef.current = setTimeout(() => {
            pauseTimeoutIdRef.current = null;
            if (isPaused) {
              wasInPauseRef.current = true;
              return;
            }
            const nextIndex = currentAudioIndex + 1;
            setCurrentAudioIndex(nextIndex);
            playNextSegment(nextIndex);
          }, currentPauseDurationRef.current);
        } else {
          // Otherwise, just continue from next
          const nextIndex = currentAudioIndex;
          playNextSegment(nextIndex);
        }
      }
    }
  };

  /**
   * ========== DELETE A STEP ==========
   */
  const handleDeleteStep = (stepId) => {
    setVoiceSteps((prev) => prev.filter((s) => s.id !== stepId));
  };

  /**
   * ========== TRANSLATE MENU HANDLERS ==========
   */
  const handleTranslateMenuClick = (event) => {
    setTranslateAnchorEl(event.currentTarget);
  };

  const handleTranslateMenuClose = (language) => {
    setTranslateAnchorEl(null);
    if (language) {
      setSelectedTranslationLanguage(language);
    }
  };

  if (!stories || stories.length === 0) {
    return (
      <Container maxWidth="md" style={{ marginTop: '75px' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          No stories to display.
        </Typography>
      </Container>
    );
  }

  const currentStory = stories[currentDayIndex];

  return (
    <Container maxWidth="md" style={{ marginTop: '75px' }}>
      <Box mt={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Your Generated Story (Day {currentStory.day})
        </Typography>

        {/**
         * ========== TABLE OF CONTENTS / DAY NAVIGATION ==========
         */}
        <Box mb={2} display="flex" alignItems="center">
          <Typography variant="body1" style={{ marginRight: '8px' }}>
            Jump to Day:
          </Typography>
          <FormControl size="small">
            <InputLabel>Day</InputLabel>
            <Select
              value={currentDayIndex}
              label="Day"
              onChange={(e) => handleJumpToDay(e.target.value)}
              style={{ width: 100 }}
            >
              {stories.map((s, idx) => (
                <MenuItem key={s.day} value={idx}>
                  {s.day}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box mb={2} display="flex" justifyContent="space-between">
          <Button
            variant="outlined"
            disabled={currentDayIndex === 0}
            onClick={handlePreviousDay}
          >
            ← Previous Day
          </Button>
          <Button
            variant="outlined"
            disabled={currentDayIndex === stories.length - 1}
            onClick={handleNextDay}
          >
            Next Day →
          </Button>
        </Box>

        {/**
         * ========== CURRENT DAY CONTENT ==========
         */}
        <Box mt={2} p={2} bgcolor="#f5f5f5" borderRadius={4}>
          <Typography variant="h6">Day {currentStory.day}:</Typography>
          <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
            {currentStory.content}
          </Typography>
        </Box>

        {/**
         * If we have a translation for this day, display it
         */}
        {translatedText && (
          <Box mt={2} p={2} bgcolor="#e8f5e9" borderRadius={4}>
            <Typography variant="h6">
              Day {currentStory.day} (Translated to {selectedTranslationLanguage}):
            </Typography>
            <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
              {translatedText}
            </Typography>
          </Box>
        )}

        {/**
         * ========== VOICE SELECTION ==========
         */}
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
          <TextFieldMenuItem value="en-US-JennyNeural">Jenny (US)</TextFieldMenuItem>
          <TextFieldMenuItem value="en-US-GuyNeural">Guy (US)</TextFieldMenuItem>
          <TextFieldMenuItem value="en-GB-LibbyNeural">Libby (UK)</TextFieldMenuItem>
          <TextFieldMenuItem value="en-GB-RyanNeural">Ryan (UK)</TextFieldMenuItem>
          <TextFieldMenuItem value="en-AU-NatashaNeural">Natasha (AU)</TextFieldMenuItem>
          <TextFieldMenuItem value="en-IN-NeerjaNeural">Neerja (IN)</TextFieldMenuItem>
          <TextFieldMenuItem value="zh-CN-XiaoxiaoNeural">Xiaoxiao (Chinese)</TextFieldMenuItem>
          <TextFieldMenuItem value="zh-CN-YunxiNeural">Yunxi (Chinese)</TextFieldMenuItem>
        </TextField>

        {/**
         * ========== ACTION BUTTONS (All create new "Steps") ==========
         */}
        <Box display="flex" flexDirection="column" alignItems="flex-start" mt={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleReadAloud}
            disabled={loading}
            fullWidth
            style={{ marginBottom: '16px' }}
          >
            {loading ? 'Generating Voice...' : 'Read Aloud (This Day)'}
          </Button>

          <ButtonGroup
            variant="contained"
            color="secondary"
            disabled={translateLoading}
            style={{ marginBottom: '16px' }}
            fullWidth
          >
            <Button onClick={handleTranslate}>
              {translateLoading
                ? 'Translating...'
                : `Translate to ${selectedTranslationLanguage} (This Day)`}
            </Button>
            <Button size="small" onClick={handleTranslateMenuClick}>
              ▼
            </Button>
          </ButtonGroup>
          <Menu
            anchorEl={translateAnchorEl}
            open={Boolean(translateAnchorEl)}
            onClose={() => handleTranslateMenuClose(null)}
          >
            <MenuItem onClick={() => handleTranslateMenuClose('Chinese')}>Chinese</MenuItem>
            <MenuItem onClick={() => handleTranslateMenuClose('Spanish')}>Spanish</MenuItem>
            <MenuItem onClick={() => handleTranslateMenuClose('French')}>French</MenuItem>
            <MenuItem onClick={() => handleTranslateMenuClose('German')}>German</MenuItem>
            <MenuItem onClick={() => handleTranslateMenuClose('Japanese')}>Japanese</MenuItem>
          </Menu>

          {translatedText && (
            <Button
              variant="contained"
              color="success"
              onClick={handleGenerateTranslatedVoice}
              disabled={translateLoading || !translatedText}
              fullWidth
              style={{ marginBottom: '16px' }}
            >
              {translateLoading
                ? 'Generating Translated Voice...'
                : 'Generate Voice for Translated Text (This Day)'}
            </Button>
          )}

          <Button
            variant="contained"
            color="warning"
            onClick={handleShadowReading}
            disabled={shadowLoading}
            fullWidth
          >
            {shadowLoading ? 'Generating Shadow Reading...' : 'Shadow Reading (This Day)'}
          </Button>

          {/**
           * ========== PLAY/PAUSE/STOP FOR ALL STEPS ==========
           */}
          <Box display="flex" alignItems="center" mt={2} width="100%">
            <Button
              variant="contained"
              color="primary"
              onClick={handlePlayAll}
              disabled={isPlaying || voiceSteps.length === 0}
              fullWidth
              style={{ marginRight: '8px' }}
            >
              Play All
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
              onClick={handleStop}
              disabled={!isPlaying && !isPaused}
              fullWidth
            >
              Stop
            </Button>
          </Box>
        </Box>

        {/**
         * ========== PANEL OF VOICE STEPS ==========
         */}
        {voiceSteps.length > 0 && (
          <Box mt={4} p={2} bgcolor="#fff8e1" borderRadius={4}>
            <Typography variant="h6" gutterBottom>
              Steps to Play (in Order):
            </Typography>
            <List>
              {voiceSteps.map((step) => (
                <ListItem
                  key={step.id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteStep(step.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <Typography variant="body1">{step.label}</Typography>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/**
         * ========== LOADING INDICATORS & ERRORS ==========
         */}
        {(loading || translateLoading || shadowLoading) && (
          <Box mt={2}>
            <CircularProgress />
          </Box>
        )}
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
