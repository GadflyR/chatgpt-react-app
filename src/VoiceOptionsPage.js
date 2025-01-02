// VoiceOptionsPage.jsx
import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Menu,
  MenuItem as TextFieldMenuItem,
  ButtonGroup,
  List,
  ListItem,
  IconButton,
  Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

// ------------------- Map from translation language to recommended voice -------------------
const TRANSLATION_VOICE_MAP = {
  Chinese: 'zh-CN-XiaoxiaoNeural',
  Spanish: 'es-ES-ElviraNeural',
  French: 'fr-FR-DeniseNeural',
  German: 'de-DE-KatjaNeural',
  Japanese: 'ja-JP-NanamiNeural',
};

// ------------------- Additional multi-language voices for user selection -------------------
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

function VoiceOptionsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // ------------------- Data from StoryPage (title, language, days, etc.) -------------------
  const formData = location.state || {};
  // e.g. formData.storyLanguage, formData.numDays, formData.generateImage, etc.

  // ------------------- Local states for story generation & TTS logic -------------------
  const [stories, setStories] = useState([]);    // array of { day, content }
  const [imageUrl, setImageUrl] = useState(null);

  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  const [selectedVoice, setSelectedVoice] = useState('en-US-JennyNeural');
  const [selectedTranslationLanguage, setSelectedTranslationLanguage] = useState('Chinese');

  // TTS: cache, steps, playback sequence
  const [ttsCache, setTtsCache] = useState({});
  const [voiceSteps, setVoiceSteps] = useState([]);
  const [audioSequence, setAudioSequence] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);

  // Loading states
  const [generateLoading, setGenerateLoading] = useState(false); // For the story generation
  const [loading, setLoading] = useState(false);       // For read-aloud TTS
  const [shadowLoading, setShadowLoading] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);

  // Error or translation text
  const [error, setError] = useState('');
  const [translatedText, setTranslatedText] = useState('');

  // For translation-language dropdown
  const [translateAnchorEl, setTranslateAnchorEl] = useState(null);

  // Audio/pause ref
  const audioRef = useRef(null);
  const pauseTimeoutIdRef = useRef(null);
  const wasInPauseRef = useRef(false);
  const currentPauseDurationRef = useRef(0);

  // Your backend URL
  const backendUrl =
    process.env.REACT_APP_BACKEND_URL ||
    'https://your-backend-url.azurewebsites.net';

  // ------------------- Helper: Split text into sentences -------------------
  const getSentences = (text) => {
    return text.match(/[^\.!\?]+[\.!\?]+/g) || [];
  };

  // ------------------- 1) Generate the story when user clicks "Generate" -------------------
  const handleGenerateStory = async () => {
    setGenerateLoading(true);
    setError('');
    setStories([]);
    setImageUrl(null);

    try {
      // Construct your request payload
      const payload = {
        storyLanguage: formData.storyLanguage,
        numDays: formData.numDays,
        generateImage: formData.generateImage,
        // ... other fields from formData
      };

      // Example call to your backend that returns { stories: [...], imageUrl }
      const response = await axios.post(`${backendUrl}/api/chat`, payload);
      const { stories: newStories, imageUrl: newImage } = response.data;

      setStories(newStories || []);
      setImageUrl(newImage || null);
      setCurrentDayIndex(0);

    } catch (err) {
      console.error('Error generating story:', err);
      setError('Failed to generate story.');
    } finally {
      setGenerateLoading(false);
    }
  };

  // ------------------- 2) TTS Playback Helpers -------------------
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

  const resetAudioState = () => {
    stopPlayback();
    setError('');
    setTranslatedText('');
  };

  const handlePreviousDay = () => {
    if (!stories.length) return;
    setCurrentDayIndex((prev) => Math.max(0, prev - 1));
    resetAudioState();
  };

  const handleNextDay = () => {
    if (!stories.length) return;
    setCurrentDayIndex((prev) => Math.min(stories.length - 1, prev + 1));
    resetAudioState();
  };

  const handleJumpToDay = (index) => {
    setCurrentDayIndex(index);
    resetAudioState();
  };

  // Helper: cache keys for TTS
  const buildCacheKey = (action, day, language) => {
    return language ? `${action}:${day}:${language}` : `${action}:${day}`;
  };

  const generateTtsSequence = async (text, voice, isShadow = false) => {
    if (isShadow) {
      // Shadow reading: break into sentences
      const sentences = getSentences(text);
      const sequence = [];
      for (let sentence of sentences) {
        const wordsCount = sentence.trim().split(/\s+/).length;
        const pauseDuration = wordsCount * 200; // tune as needed

        const res = await axios.post(
          `${backendUrl}/api/tts`,
          { text: sentence, voice },
          { responseType: 'blob' }
        );
        if (!res.data) throw new Error('No audio data returned.');
        const audioUrl = URL.createObjectURL(res.data);
        sequence.push({ type: 'audio', url: audioUrl, pauseDuration });
      }
      return sequence;
    } else {
      // Single TTS
      const res = await axios.post(
        `${backendUrl}/api/tts`,
        { text, voice },
        { responseType: 'blob' }
      );
      if (!res.data) throw new Error('No audio data returned.');
      const audioUrl = URL.createObjectURL(res.data);
      return [{ type: 'audio', url: audioUrl, pauseDuration: 0 }];
    }
  };

  // ------------------- 3) TTS Action Handlers: Read, Translate, Shadow -------------------
  const handleReadAloud = async () => {
    if (!stories.length) return;
    const dayItem = stories[currentDayIndex];
    if (!dayItem) return;

    setLoading(true);
    setError('');

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

  const handleTranslate = async () => {
    if (!stories.length) return;
    const { content } = stories[currentDayIndex];
    if (!content) return;

    setTranslateLoading(true);
    setError('');
    setTranslatedText('');

    try {
      const sentences = getSentences(content);
      const translations = [];
      for (let sentence of sentences) {
        const prompt = `Translate the following sentence to ${selectedTranslationLanguage}:\n"${sentence}"`;
        const res = await axios.post(`${backendUrl}/api/chat`, { prompt });
        translations.push(res.data.choices[0].message.content.trim());
      }
      setTranslatedText(translations.join(' '));
    } catch (err) {
      console.error(err);
      setError('Error translating the text.');
    } finally {
      setTranslateLoading(false);
    }
  };

  const handleGenerateTranslatedVoice = async () => {
    if (!stories.length) return;
    const dayItem = stories[currentDayIndex];
    if (!dayItem || !translatedText) return;

    setTranslateLoading(true);
    setError('');

    const autoVoice =
      TRANSLATION_VOICE_MAP[selectedTranslationLanguage] || 'zh-CN-XiaoxiaoNeural';
    const cacheKey = buildCacheKey('TRANSLATED', dayItem.day, selectedTranslationLanguage);

    const existing = ttsCache[cacheKey];
    if (existing && (existing.status === 'pending' || existing.status === 'done')) {
      addVoiceStep(`Translated Voice (Day ${dayItem.day}, ${selectedTranslationLanguage})`, cacheKey);
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
      setError('Error generating translated voice audio.');
      setTtsCache((prev) => ({
        ...prev,
        [cacheKey]: { status: 'error', sequence: null },
      }));
    } finally {
      setTranslateLoading(false);
    }
  };

  const handleShadowReading = async () => {
    if (!stories.length) return;
    const dayItem = stories[currentDayIndex];
    if (!dayItem) return;

    setShadowLoading(true);
    setError('');

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
      const sequence = await generateTtsSequence(dayItem.content, selectedVoice, true);
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

  // ------------------- 4) Steps array & playback controls -------------------
  const addVoiceStep = (label, cacheKey) => {
    setVoiceSteps((prev) => [
      ...prev,
      { id: Date.now(), label, cacheKey },
    ]);
  };

  const handleDeleteStep = (stepId) => {
    setVoiceSteps((prev) => prev.filter((step) => step.id !== stepId));
  };

  const handlePlayAll = () => {
    stopPlayback();
    // Gather all steps that are "done"
    const doneSteps = voiceSteps.filter((step) => {
      const entry = ttsCache[step.cacheKey];
      return entry && entry.status === 'done';
    });
    if (!doneSteps.length) return;

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
      const audio = new Audio(segment.url);
      audioRef.current = audio;
      audio.play().catch((err) => {
        console.error('Error playing audio:', err);
        setError('Audio playback error.');
        setIsPlaying(false);
      });
      audio.onended = () => {
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
        audioRef.current
          .play()
          .catch((err) => console.error('Error resuming audio:', err));
      } else {
        // If we paused between segments:
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

  // Check if we have any TTS steps that are ready
  const hasReadyAudio = voiceSteps.some((step) => {
    const entry = ttsCache[step.cacheKey];
    return entry && entry.status === 'done';
  });

  // ------------------- 5) Navigate to GeneratedStoryPage with TTS data  -------------------
  const handleViewFinalStory = () => {
    if (!stories.length) {
      setError('No story generated yet.');
      return;
    }
    // Pass along stories, imageUrl, AND the TTS data
    navigate('/generated-story', {
      state: {
        stories,
        imageUrl,
        voiceSteps,
        ttsCache,
      },
    });
  };

  const currentStory = stories[currentDayIndex] || {};

  return (
    <Container maxWidth="lg" sx={{ marginTop: '50px' }}>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Voice / TTS Options
        </Typography>
        <Typography variant="body1">
          Configure voice settings, generate the story, and test TTS before
          viewing the final version.
        </Typography>
      </Box>

      {/* 1) Generate Story Button */}
      <Box mb={4}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleGenerateStory}
          disabled={generateLoading}
          sx={{ marginRight: 2 }}
        >
          {generateLoading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Generating...
            </>
          ) : (
            'Generate Story'
          )}
        </Button>

        <Button variant="outlined" onClick={handleViewFinalStory}>
          View Final Story
        </Button>
      </Box>

      {/* Error on generation */}
      {error && (
        <Box mt={2} p={2} bgcolor="#ffebee" borderRadius={2}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {/* 2) Show TTS controls once story is generated */}
      {stories.length > 0 && (
        <Grid container spacing={4}>
          {/* LEFT: story display & day nav */}
          <Grid item xs={12} md={8}>
            {imageUrl && (
              <Box mb={2} textAlign="center">
                <img
                  src={imageUrl}
                  alt="Generated illustration"
                  style={{ maxWidth: '100%', borderRadius: 8 }}
                />
              </Box>
            )}

            <Typography variant="h5" gutterBottom>
              Story Preview (Day {currentStory.day})
            </Typography>

            {/* Day navigation */}
            <Box mb={2} display="flex" alignItems="center">
              <Typography variant="body1" sx={{ mr: 1 }}>
                Jump to Day:
              </Typography>
              <FormControl size="small">
                <InputLabel>Day</InputLabel>
                <Select
                  value={currentDayIndex}
                  label="Day"
                  onChange={(e) => handleJumpToDay(e.target.value)}
                  sx={{ width: 80 }}
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
                onClick={handlePreviousDay}
                disabled={currentDayIndex === 0}
              >
                ← Previous Day
              </Button>
              <Button
                variant="outlined"
                onClick={handleNextDay}
                disabled={currentDayIndex === stories.length - 1}
              >
                Next Day →
              </Button>
            </Box>

            <Box p={2} bgcolor="#f5f5f5" borderRadius={2}>
              <Typography variant="h6">Day {currentStory.day}</Typography>
              <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                {currentStory.content}
              </Typography>
            </Box>

            {/* If translated text is present */}
            {translatedText && (
              <Box mt={2} p={2} bgcolor="#e8f5e9" borderRadius={2}>
                <Typography variant="h6">
                  Translated to {selectedTranslationLanguage}:
                </Typography>
                <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                  {translatedText}
                </Typography>
              </Box>
            )}
          </Grid>

          {/* RIGHT: TTS action buttons & Steps */}
          <Grid item xs={12} md={4}>
            <Typography variant="h5" gutterBottom>
              TTS Actions
            </Typography>

            {/* Voice selection */}
            <TextField
              select
              fullWidth
              label="Select Voice"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              variant="outlined"
              margin="normal"
            >
              {ALL_AVAILABLE_VOICES.map((v) => (
                <TextFieldMenuItem key={v.value} value={v.value}>
                  {v.label}
                </TextFieldMenuItem>
              ))}
            </TextField>

            {/* Buttons: read, translate, shadow */}
            <Box display="flex" flexDirection="column" alignItems="flex-start" mt={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleReadAloud}
                disabled={loading}
                fullWidth
                sx={{ mb: 2 }}
              >
                {loading ? 'Generating Voice...' : 'Read Aloud (This Day)'}
              </Button>

              <ButtonGroup
                variant="contained"
                color="secondary"
                disabled={translateLoading}
                fullWidth
                sx={{ mb: 2 }}
              >
                <Button onClick={handleTranslate}>
                  {translateLoading
                    ? 'Translating...'
                    : `Translate to ${selectedTranslationLanguage} (This Day)`}
                </Button>
                <Button onClick={(e) => setTranslateAnchorEl(e.currentTarget)}>
                  ▼
                </Button>
              </ButtonGroup>
              <Menu
                anchorEl={translateAnchorEl}
                open={Boolean(translateAnchorEl)}
                onClose={() => setTranslateAnchorEl(null)}
              >
                <MenuItem onClick={() => { setSelectedTranslationLanguage('Chinese'); setTranslateAnchorEl(null); }}>Chinese</MenuItem>
                <MenuItem onClick={() => { setSelectedTranslationLanguage('Spanish'); setTranslateAnchorEl(null); }}>Spanish</MenuItem>
                <MenuItem onClick={() => { setSelectedTranslationLanguage('French'); setTranslateAnchorEl(null); }}>French</MenuItem>
                <MenuItem onClick={() => { setSelectedTranslationLanguage('German'); setTranslateAnchorEl(null); }}>German</MenuItem>
                <MenuItem onClick={() => { setSelectedTranslationLanguage('Japanese'); setTranslateAnchorEl(null); }}>Japanese</MenuItem>
              </Menu>

              {/* Generate Translated Voice */}
              {translatedText && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleGenerateTranslatedVoice}
                  disabled={translateLoading || !translatedText}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  {translateLoading
                    ? 'Generating Translated Voice...'
                    : 'Generate Voice for Translated Text'
                  }
                </Button>
              )}

              <Button
                variant="contained"
                color="warning"
                onClick={handleShadowReading}
                disabled={shadowLoading}
                fullWidth
              >
                {shadowLoading ? 'Generating Shadow...' : 'Shadow Reading (This Day)'}
              </Button>

              {/* Playback: play/pause/stop */}
              <Box display="flex" alignItems="center" mt={2} width="100%">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handlePlayAll}
                  disabled={!hasReadyAudio || isPlaying}
                  fullWidth
                  sx={{ mr: 1 }}
                >
                  Play All
                </Button>
                <Button
                  variant="contained"
                  color="info"
                  onClick={handlePauseResume}
                  disabled={!isPlaying && !isPaused}
                  fullWidth
                  sx={{ mr: 1 }}
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleStop}
                  disabled={!isPlaying && !isPaused}
                  fullWidth
                >
                  Stop
                </Button>
              </Box>
            </Box>

            {/* Steps to Play */}
            {voiceSteps.length > 0 && (
              <Box mt={4} p={2} bgcolor="#fff8e1" borderRadius={2}>
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

            {/* Show TTS spinners */}
            {(loading || translateLoading || shadowLoading) && (
              <Box mt={2}>
                <CircularProgress />
              </Box>
            )}

            {/* Show TTS errors */}
            {error && (
              <Box mt={2} p={2} bgcolor="#ffebee" borderRadius={2}>
                <Typography color="error" variant="body1">
                  {error}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      )}
    </Container>
  );
}

export default VoiceOptionsPage;
