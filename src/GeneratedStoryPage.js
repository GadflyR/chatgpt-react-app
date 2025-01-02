// GeneratedStoryPage.jsx
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

// Map from translation language to recommended voice
const TRANSLATION_VOICE_MAP = {
  Chinese: 'zh-CN-XiaoxiaoNeural',
  Spanish: 'es-ES-ElviraNeural',
  French: 'fr-FR-DeniseNeural',
  German: 'de-DE-KatjaNeural',
  Japanese: 'ja-JP-NanamiNeural',
};

// Additional multi-language voices for user selection
const ALL_AVAILABLE_VOICES = [
  { label: 'Jenny (US)', value: 'en-US-JennyNeural' },
  { label: 'Guy (US)', value: 'en-US-GuyNeural' },
  { label: 'Libby (UK)', value: 'en-GB-LibbyNeural' },
  { label: 'Ryan (UK)', value: 'en-GB-RyanNeural' },
  { label: 'Natasha (AU)', value: 'en-AU-NatashaNeural' },
  { label: 'Neerja (IN)', value: 'en-IN-NeerjaNeural' },
  { label: 'Xiaoxiao (Chinese)', value: 'zh-CN-XiaoxiaoNeural' },
  { label: 'Yunxi (Chinese)', value: 'zh-CN-YunxiNeural' },
  { label: 'Elvira (Spanish)', value: 'es-ES-ElviraNeural' },
  { label: 'Alvaro (Spanish)', value: 'es-ES-AlvaroNeural' },
  { label: 'Denise (French)', value: 'fr-FR-DeniseNeural' },
  { label: 'Henri (French)', value: 'fr-FR-HenriNeural' },
  { label: 'Katja (German)', value: 'de-DE-KatjaNeural' },
  { label: 'Nanami (Japanese)', value: 'ja-JP-NanamiNeural' },
];

function GeneratedStoryPage() {
  const location = useLocation();
  // We expect an array named "stories" from the StoryPage, plus optional imageUrl
  const { stories, imageUrl } = location.state || {};
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  // The user-chosen voice for read/shadow
  const [selectedVoice, setSelectedVoice] = useState('en-US-JennyNeural');
  const [selectedTranslationLanguage, setSelectedTranslationLanguage] = useState('Chinese');

  // Cache to store TTS requests by key
  const [ttsCache, setTtsCache] = useState({});
  // Steps array for playback
  const [voiceSteps, setVoiceSteps] = useState([]);
  // Combined audio sequence for current playback
  const [audioSequence, setAudioSequence] = useState([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [shadowLoading, setShadowLoading] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);

  const [error, setError] = useState('');
  const [translatedText, setTranslatedText] = useState('');

  // For the "Translate to X" menu
  const [translateAnchorEl, setTranslateAnchorEl] = useState(null);

  // Audio ref
  const audioRef = useRef(null);
  const pauseTimeoutIdRef = useRef(null);
  const wasInPauseRef = useRef(false);
  const currentPauseDurationRef = useRef(0);

  const backendUrl =
    process.env.REACT_APP_BACKEND_URL ||
    'https://ibotstorybackend-f6e0c4f9h9bkbef8.eastus2-01.azurewebsites.net';

  // Helper: split text into sentences
  const getSentences = (text) => {
    return text.match(/[^\.!\?]+[\.!\?]+/g) || [];
  };

  /**
   * ========== DAY NAVIGATION & RESET ==========
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
    stopPlayback();
    setError('');
    setTranslatedText('');
  };

  const stopPlayback = () => {
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
    setAudioSequence([]);
  };

  // Build a cache key for each “action type”
  const buildCacheKey = (action, day, language) => {
    // e.g. "READ_ALOUD:1", "TRANSLATED:1:Chinese", "SHADOW:4"
    return language
      ? `${action}:${day}:${language}`
      : `${action}:${day}`;
  };

  /**
   * ========== Reusable TTS Generation ========== 
   */
  const generateTtsSequence = async (text, voice, isShadow = false) => {
    if (isShadow) {
      // Split the text into sentences, generate audio for each, add a pause
      const sentences = getSentences(text);
      const sequence = [];
      for (let sentence of sentences) {
        const wordsCount = sentence.trim().split(/\s+/).length;
        const pauseDuration = wordsCount * 200; // tune as needed

        const response = await axios.post(
          `${backendUrl}/api/tts`,
          { text: sentence, voice },
          { responseType: 'blob' }
        );
        if (!response.data) {
          throw new Error('Failed to retrieve audio data from server.');
        }
        const audioUrl = URL.createObjectURL(response.data);
        sequence.push({ type: 'audio', url: audioUrl, pauseDuration });
      }
      return sequence;
    } else {
      // Normal single TTS call
      const response = await axios.post(
        `${backendUrl}/api/tts`,
        { text, voice },
        { responseType: 'blob' }
      );
      if (!response.data) {
        throw new Error('Failed to retrieve audio data from server.');
      }
      const audioUrl = URL.createObjectURL(response.data);
      return [{ type: 'audio', url: audioUrl, pauseDuration: 0 }];
    }
  };

  /**
   * ========== READ ALOUD (ONE DAY) ========== 
   */
  const handleReadAloud = async () => {
    if (!stories || !stories[currentDayIndex]) return;
    setLoading(true);
    setError('');

    const dayItem = stories[currentDayIndex];
    const cacheKey = buildCacheKey('READ_ALOUD', dayItem.day);

    const existing = ttsCache[cacheKey];
    if (existing && (existing.status === 'pending' || existing.status === 'done')) {
      addVoiceStep(`Read Aloud (Day ${dayItem.day})`, cacheKey);
      setLoading(false);
      return;
    }

    setTtsCache((prev) => ({
      ...prev,
      [cacheKey]: { status: 'pending', sequence: null },
    }));
    addVoiceStep(`Read Aloud (Day ${dayItem.day})`, cacheKey);

    try {
      const text = `Day ${dayItem.day}: ${dayItem.content}`;
      const sequence = await generateTtsSequence(text, selectedVoice);

      setTtsCache((prev) => ({
        ...prev,
        [cacheKey]: { status: 'done', sequence },
      }));
    } catch (err) {
      console.error(err);
      setError('Error generating speech audio.');
      setTtsCache((prev) => ({
        ...prev,
        [cacheKey]: { status: 'error', sequence: null },
      }));
    } finally {
      setLoading(false);
    }
  };

  /**
   * ========== TRANSLATION (ONE DAY) ========== 
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
      console.error('Error:', err);
      setError('Error translating the story.');
    } finally {
      setTranslateLoading(false);
    }
  };

  /**
   * ========== GENERATE VOICE FOR TRANSLATED TEXT ========== 
   */
  const handleGenerateTranslatedVoice = async () => {
    if (!stories || !stories[currentDayIndex] || !translatedText) return;
    setTranslateLoading(true);
    setError('');

    const dayItem = stories[currentDayIndex];
    const autoVoice =
      TRANSLATION_VOICE_MAP[selectedTranslationLanguage] || 'zh-CN-XiaoxiaoNeural';

    const cacheKey = buildCacheKey(
      'TRANSLATED',
      dayItem.day,
      selectedTranslationLanguage
    );

    const existing = ttsCache[cacheKey];
    if (existing && (existing.status === 'pending' || existing.status === 'done')) {
      addVoiceStep(
        `Translated Voice (Day ${dayItem.day}, ${selectedTranslationLanguage})`,
        cacheKey
      );
      setTranslateLoading(false);
      return;
    }

    setTtsCache((prev) => ({
      ...prev,
      [cacheKey]: { status: 'pending', sequence: null },
    }));
    addVoiceStep(
      `Translated Voice (Day ${dayItem.day}, ${selectedTranslationLanguage})`,
      cacheKey
    );

    try {
      const text = `Day ${dayItem.day}: ${translatedText}`;
      const sequence = await generateTtsSequence(text, autoVoice);
      setTtsCache((prev) => ({
        ...prev,
        [cacheKey]: { status: 'done', sequence },
      }));
    } catch (err) {
      console.error(err);
      setError('Error generating translated speech audio.');
      setTtsCache((prev) => ({
        ...prev,
        [cacheKey]: { status: 'error', sequence: null },
      }));
    } finally {
      setTranslateLoading(false);
    }
  };

  /**
   * ========== SHADOW READING (ONE DAY) ========== 
   */
  const handleShadowReading = async () => {
    if (!stories || !stories[currentDayIndex]) return;
    setShadowLoading(true);
    setError('');

    const dayItem = stories[currentDayIndex];
    const cacheKey = buildCacheKey('SHADOW', dayItem.day);

    const existing = ttsCache[cacheKey];
    if (existing && (existing.status === 'pending' || existing.status === 'done')) {
      addVoiceStep(`Shadow Reading (Day ${dayItem.day})`, cacheKey);
      setShadowLoading(false);
      return;
    }

    setTtsCache((prev) => ({
      ...prev,
      [cacheKey]: { status: 'pending', sequence: null },
    }));
    addVoiceStep(`Shadow Reading (Day ${dayItem.day})`, cacheKey);

    try {
      const sequence = await generateTtsSequence(
        dayItem.content,
        selectedVoice,
        true // isShadow
      );
      setTtsCache((prev) => ({
        ...prev,
        [cacheKey]: { status: 'done', sequence },
      }));
    } catch (err) {
      console.error(err);
      setError('Error generating shadow reading audio.');
      setTtsCache((prev) => ({
        ...prev,
        [cacheKey]: { status: 'error', sequence: null },
      }));
    } finally {
      setShadowLoading(false);
    }
  };

  /**
   * ========== ADD STEP TO voiceSteps ========== 
   */
  const addVoiceStep = (label, cacheKey) => {
    const newStep = {
      id: Date.now(),
      label,
      cacheKey,
    };
    setVoiceSteps((prev) => [...prev, newStep]);
  };

  /**
   * ========== DELETE A STEP ========== 
   */
  const handleDeleteStep = (stepId) => {
    setVoiceSteps((prev) => prev.filter((s) => s.id !== stepId));
  };

  /**
   * ========== PLAY/PAUSE/STOP (ALL STEPS) ========== 
   */
  const handlePlayAll = () => {
    stopPlayback(); // reset first

    // Build the combined sequence of steps with status=done
    const doneSteps = voiceSteps.filter((step) => {
      const entry = ttsCache[step.cacheKey];
      return entry && entry.status === 'done';
    });
    const combinedSequence = doneSteps.flatMap(
      (step) => ttsCache[step.cacheKey].sequence
    );

    if (combinedSequence.length === 0) {
      // no playable audio
      return;
    }

    setAudioSequence(combinedSequence);
    setIsPlaying(true);
    setIsPaused(false);
    setCurrentAudioIndex(0);
    playNextSegment(0, combinedSequence);
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
      const newAudio = new Audio(segment.url);
      audioRef.current = newAudio;
      newAudio.play().catch((err) => {
        console.error('Error playing audio:', err);
        setError('Error playing audio.');
        setIsPlaying(false);
      });

      newAudio.onended = () => {
        audioRef.current = null;
        if (isPaused) return;
        doPauseThenNext(index, segment.pauseDuration, sequence);
      };
    }
  };

  const doPauseThenNext = (index, pauseDuration, sequence) => {
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

    pauseTimeoutIdRef.current = setTimeout(() => {
      pauseTimeoutIdRef.current = null;
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
      if (pauseTimeoutIdRef.current) {
        clearTimeout(pauseTimeoutIdRef.current);
        pauseTimeoutIdRef.current = null;
      }
    } else {
      // Resume
      setIsPaused(false);
      if (audioRef.current) {
        audioRef.current.play().catch((err) =>
          console.error('Error resuming audio:', err)
        );
      } else {
        if (wasInPauseRef.current && currentPauseDurationRef.current > 0) {
          pauseTimeoutIdRef.current = setTimeout(() => {
            pauseTimeoutIdRef.current = null;
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

  // Are there any steps with status === 'done'?
  const hasReadyAudio = voiceSteps.some((step) => {
    const entry = ttsCache[step.cacheKey];
    return entry && entry.status === 'done';
  });

  // If no stories passed or stories is empty, show error
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

        {/* ============= NEW: Display the generated image if we have one ============= */}
        {imageUrl && (
          <Box mb={2} textAlign="center">
            <img
              src={imageUrl}
              alt="Generated by DALL·E"
              style={{ maxWidth: '100%', borderRadius: '8px' }}
            />
          </Box>
        )}

        <Typography variant="h4" component="h1" gutterBottom>
          Your Generated Story (Day {currentStory.day})
        </Typography>

        {/* ======== TABLE OF CONTENTS / DAY NAVIGATION ======== */}
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

        {/* ======== CURRENT DAY CONTENT ======== */}
        <Box mt={2} p={2} bgcolor="#f5f5f5" borderRadius={4}>
          <Typography variant="h6">Day {currentStory.day}:</Typography>
          <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
            {currentStory.content}
          </Typography>
        </Box>

        {/* If we have a translation for this day, display it */}
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

        {/* ======== VOICE SELECTION ======== */}
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
          {ALL_AVAILABLE_VOICES.map((v) => (
            <TextFieldMenuItem key={v.value} value={v.value}>
              {v.label}
            </TextFieldMenuItem>
          ))}
        </TextField>

        {/* ======== ACTION BUTTONS ======== */}
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

          {/* Generate Translated Voice */}
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

          {/* Shadow Reading */}
          <Button
            variant="contained"
            color="warning"
            onClick={handleShadowReading}
            disabled={shadowLoading}
            fullWidth
          >
            {shadowLoading ? 'Generating Shadow Reading...' : 'Shadow Reading (This Day)'}
          </Button>

          {/* PLAY/PAUSE/STOP for all steps */}
          <Box display="flex" alignItems="center" mt={2} width="100%">
            <Button
              variant="contained"
              color="primary"
              onClick={handlePlayAll}
              disabled={!hasReadyAudio || isPlaying}
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

        {/* ======== LIST OF STEPS (in order) ======== */}
        {voiceSteps.length > 0 && (
          <Box mt={4} p={2} bgcolor="#fff8e1" borderRadius={4}>
            <Typography variant="h6" gutterBottom>
              Steps to Play (in Order):
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
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeleteStep(step.id)}
                      >
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

        {/* ======== LOADING & ERRORS ======== */}
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
