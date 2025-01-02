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

  // ------------------- Local states for TTS & generation -------------------
  const [selectedVoice, setSelectedVoice] = useState('en-US-JennyNeural');
  const [selectedTranslationLanguage, setSelectedTranslationLanguage] = useState('Chinese');

  // The actually generated story data (we store it here so TTS can operate on it)
  const [stories, setStories] = useState([]);       // e.g., [ { day, content }, ... ]
  const [imageUrl, setImageUrl] = useState(null);   // optional DALL·E image
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  // TTS and steps
  const [ttsCache, setTtsCache] = useState({});
  const [voiceSteps, setVoiceSteps] = useState([]);
  const [audioSequence, setAudioSequence] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);

  // Loading states
  const [generateLoading, setGenerateLoading] = useState(false);  // For the "Generate" call
  const [loading, setLoading] = useState(false);         // For read-aloud
  const [shadowLoading, setShadowLoading] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);

  // Error or translation text
  const [error, setError] = useState('');
  const [translatedText, setTranslatedText] = useState('');

  // For translation-language dropdown
  const [translateAnchorEl, setTranslateAnchorEl] = useState(null);

  // Audio ref & pause management
  const audioRef = useRef(null);
  const pauseTimeoutIdRef = useRef(null);
  const wasInPauseRef = useRef(false);
  const currentPauseDurationRef = useRef(0);

  // Backend URL
  const backendUrl =
    process.env.REACT_APP_BACKEND_URL ||
    'https://your-backend.azurewebsites.net';

  // ------------------- HELPER: Split text into sentences for shadow reading -------------------
  const getSentences = (text) => {
    return text.match(/[^\.!\?]+[\.!\?]+/g) || [];
  };

  // ------------------- 1) Generate the story on "Generate" click -------------------
  const handleGenerateStory = async () => {
    setGenerateLoading(true);
    setError('');
    setStories([]);
    setImageUrl(null);

    try {
      // Construct your request payload from formData + any TTS preferences if relevant
      const payload = {
        storyLanguage: formData.storyLanguage,
        numDays: formData.numDays,
        generateImage: formData.generateImage,
        // plus other fields: formData.title, formData.storyType, etc.
        // voice: selectedVoice, // if needed for generation logic
      };

      // Example call to a custom endpoint that returns { stories, imageUrl }
      // Adapt this to your actual backend route
      const response = await axios.post(`${backendUrl}/api/generateStory`, payload);
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

  // ------------------- Once we have a story, TTS logic can be used -------------------
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
    if (stories.length === 0) return;
    setCurrentDayIndex((prev) => Math.max(0, prev - 1));
    resetAudioState();
  };

  const handleNextDay = () => {
    if (stories.length === 0) return;
    setCurrentDayIndex((prev) => Math.min(stories.length - 1, prev + 1));
    resetAudioState();
  };

  const handleJumpToDay = (dayIndex) => {
    setCurrentDayIndex(dayIndex);
    resetAudioState();
  };

  // Unique key for TTS caching
  const buildCacheKey = (action, day, language) =>
    language ? `${action}:${day}:${language}` : `${action}:${day}`;

  const generateTtsSequence = async (text, voice, isShadow = false) => {
    if (isShadow) {
      // Break text into sentences, generate each + pause
      const sentences = getSentences(text);
      const sequence = [];

      for (let sentence of sentences) {
        const wordsCount = sentence.trim().split(/\s+/).length;
        const pauseDuration = wordsCount * 200; // adjust as you like

        const response = await axios.post(
          `${backendUrl}/api/tts`,
          { text: sentence, voice },
          { responseType: 'blob' }
        );
        if (!response.data) throw new Error('No audio data returned.');
        const audioUrl = URL.createObjectURL(response.data);
        sequence.push({ type: 'audio', url: audioUrl, pauseDuration });
      }
      return sequence;
    } else {
      // Single TTS call
      const response = await axios.post(
        `${backendUrl}/api/tts`,
        { text, voice },
        { responseType: 'blob' }
      );
      if (!response.data) throw new Error('No audio data returned.');
      const audioUrl = URL.createObjectURL(response.data);
      return [{ type: 'audio', url: audioUrl, pauseDuration: 0 }];
    }
  };

  // ------------------- READ ALOUD -------------------
  const handleReadAloud = async () => {
    if (stories.length === 0) return;
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

  // ------------------- TRANSLATION -------------------
  const handleTranslate = async () => {
    if (stories.length === 0) return;
    const { content } = stories[currentDayIndex] || {};
    if (!content) return;

    setTranslateLoading(true);
    setError('');
    setTranslatedText('');

    try {
      const sentences = getSentences(content);
      const translatedSentences = [];

      for (let sentence of sentences) {
        const translationPrompt = `
Translate the following sentence to ${selectedTranslationLanguage}:
"${sentence}"
Provide only the translated sentence, no extra text.
`;
        const translationRes = await axios.post(`${backendUrl}/api/chat`, {
          prompt: translationPrompt,
        });
        translatedSentences.push(
          translationRes.data.choices[0].message.content.trim()
        );
      }
      const joinedTranslation = translatedSentences.join(' ');
      setTranslatedText(joinedTranslation);
    } catch (err) {
      console.error('Error translating:', err);
      setError('Error translating the text.');
    } finally {
      setTranslateLoading(false);
    }
  };

  // ------------------- GENERATE TRANSLATED VOICE -------------------
  const handleGenerateTranslatedVoice = async () => {
    if (stories.length === 0 || !translatedText) return;
    const dayItem = stories[currentDayIndex];
    if (!dayItem) return;

    setTranslateLoading(true);
    setError('');

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
      setError('Error generating translated voice.');
      setTtsCache((prev) => ({
        ...prev,
        [cacheKey]: { status: 'error', sequence: null },
      }));
    } finally {
      setTranslateLoading(false);
    }
  };

  // ------------------- SHADOW READING -------------------
  const handleShadowReading = async () => {
    if (stories.length === 0) return;
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
      setError('Error generating shadow reading.');
      setTtsCache((prev) => ({
        ...prev,
        [cacheKey]: { status: 'error', sequence: null },
      }));
    } finally {
      setShadowLoading(false);
    }
  };

  // ------------------- STEPS & PLAYBACK -------------------
  const addVoiceStep = (label, cacheKey) => {
    const newStep = {
      id: Date.now(),
      label,
      cacheKey,
    };
    setVoiceSteps((prev) => [...prev, newStep]);
  };

  const handleDeleteStep = (stepId) => {
    setVoiceSteps((prev) => prev.filter((s) => s.id !== stepId));
  };

  const handlePlayAll = () => {
    stopPlayback(); // reset first

    // Combine all steps with TTS ready
    const doneSteps = voiceSteps.filter((step) => {
      const entry = ttsCache[step.cacheKey];
      return entry && entry.status === 'done';
    });
    const combined = doneSteps.flatMap((step) => ttsCache[step.cacheKey].sequence);
    if (combined.length === 0) return;

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
        setError('Error playing audio.');
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

  // Are any steps "done"?
  const hasReadyAudio = voiceSteps.some((step) => {
    const entry = ttsCache[step.cacheKey];
    return entry && entry.status === 'done';
  });

  // ------------------- Navigate to final "GeneratedStoryPage" (no TTS) -------------------
  const handleViewFinalStory = () => {
    if (!stories || stories.length === 0) {
      setError('No story generated yet.');
      return;
    }
    // Just pass the story data to the final page
    navigate('/generated-story', {
      state: {
        stories,
        imageUrl,
      },
    });
  };

  // Current day's story text (if any)
  const currentStory = stories[currentDayIndex] || {};

  return (
    <Container maxWidth="lg" sx={{ marginTop: '50px' }}>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Voice / TTS Options
        </Typography>
        <Typography variant="body1">
          Configure voice settings, generate the story, and optionally test
          text-to-speech or translations before viewing the final story.
        </Typography>
      </Box>

      {/* ========== 1) Generate Story Button ========== */}
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

      {/* Show error if story generation fails */}
      {error && (
        <Box mt={2} p={2} bgcolor="#ffebee" borderRadius={2}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {/* ========== 2) If we have a story, show TTS controls ========== */}
      {stories.length > 0 && (
        <Grid container spacing={4}>
          {/* LEFT: Current story text & navigation */}
          <Grid item xs={12} md={8}>
            {/* Optional DALL·E image if returned */}
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

            {/* Jump to Day */}
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

            <Box p={2} bgcolor="#f5f5f5" borderRadius={2}>
              <Typography variant="h6">Day {currentStory.day}</Typography>
              <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                {currentStory.content}
              </Typography>
            </Box>

            {/* If we have a translation, show it */}
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

          {/* RIGHT: Voice selection & TTS controls */}
          <Grid item xs={12} md={4}>
            <Typography variant="h5" gutterBottom>
              TTS Actions
            </Typography>

            {/* Select Voice */}
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

            {/* Buttons: Read, Translate, Shadow */}
            <Box display="flex" flexDirection="column" alignItems="flex-start" mt={2}>
              {/* Read Aloud */}
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

              {/* Translate button group */}
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
                <Button size="small" onClick={(e) => setTranslateAnchorEl(e.currentTarget)}>
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
                {shadowLoading ? 'Generating Shadow...' : 'Shadow Reading (This Day)'}
              </Button>

              {/* Play/Pause/Stop for steps */}
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

            {/* Show TTS loading spinners */}
            {(loading || translateLoading || shadowLoading) && (
              <Box mt={2}>
                <CircularProgress />
              </Box>
            )}

            {/* Show any TTS errors */}
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
