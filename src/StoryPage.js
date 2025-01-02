// StoryPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Typography,
  Container,
  Box,
  CircularProgress,
  MenuItem,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { v4 as uuidv4 } from 'uuid'; // if needed
import './App.css'; // for your custom fonts

// Example Auth / Firestore imports (only needed if you do auth or DB calls):
// import { useAuth } from './AuthContext';
// import { db } from './firebase';
// import { collection, addDoc } from 'firebase/firestore';

function StoryPage() {
  const navigate = useNavigate();
  // const { currentUser } = useAuth(); // if you need the logged-in user

  // ---------------- SUGGESTION ARRAYS ----------------
  const titleSuggestions = [
    "A Brave Adventure",
    "Midnight in the Woods",
    "The Lost City",
    "Journey into Twilight",
    "Shadows of the Past",
  ];
  const timeSuggestions = [
    "medieval times",
    "the future",
    "the roaring 1920s",
    "prehistoric era",
    "the year 3000",
  ];
  const placeSuggestions = [
    "a small village",
    "outer space",
    "an underwater city",
    "the Sahara Desert",
    "a bustling metropolis",
  ];
  const characterNameSuggestions = [
    "Alice",
    "John",
    "Kai",
    "Maria",
    "Luca",
  ];
  const protagonistSuggestions = [
    "a courageous knight",
    "a curious child",
    "an eccentric detective",
    "a timid librarian",
    "a fearless astronaut",
  ];
  const mainStorylineSuggestions = [
    "A quest to find the lost treasure",
    "Stopping a sinister villain",
    "A journey of self-discovery",
    "Reuniting two estranged worlds",
    "Unraveling a family secret",
  ];
  const storyLengthSuggestions = [
    "300-500",
    "500-700",
    "800-1000",
    "250-400",
    "1000-1200",
  ];

  // ---------------- INDEX STATES (cycling suggestions) ----------------
  const [titleIndex, setTitleIndex] = useState(0);
  const [timeIndex, setTimeIndex] = useState(0);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [characterNameIndex, setCharacterNameIndex] = useState(0);
  const [protagonistIndex, setProtagonistIndex] = useState(0);
  const [mainStorylineIndex, setMainStorylineIndex] = useState(0);
  const [storyLengthIndex, setStoryLengthIndex] = useState(0);

  // ---------------- FORM FIELD STATES ----------------
  const [storyLanguage, setStoryLanguage] = useState(
    () => localStorage.getItem('storyLanguage') || ''
  );
  const [numDays, setNumDays] = useState(() => {
    const savedNumDays = localStorage.getItem('numDays');
    return savedNumDays ? parseInt(savedNumDays, 10) : '';
  });
  const [languageDifficulty, setLanguageDifficulty] = useState(
    () => localStorage.getItem('languageDifficulty') || ''
  );
  const [storyLength, setStoryLength] = useState(
    () => localStorage.getItem('storyLength') || ''
  );
  const [title, setTitle] = useState(
    () => localStorage.getItem('title') || ''
  );
  const [storyType, setStoryType] = useState(
    () => localStorage.getItem('storyType') || ''
  );
  const [time, setTime] = useState(
    () => localStorage.getItem('time') || ''
  );
  const [place, setPlace] = useState(
    () => localStorage.getItem('place') || ''
  );
  const [characterName, setCharacterName] = useState(
    () => localStorage.getItem('characterName') || ''
  );
  const [protagonist, setProtagonist] = useState(
    () => localStorage.getItem('protagonist') || ''
  );
  const [mainStoryline, setMainStoryline] = useState(
    () => localStorage.getItem('mainStoryline') || ''
  );
  const [generateImage, setGenerateImage] = useState(false);

  // ---------------- LOADING / ERROR STATES ----------------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ---------------- Save fields to localStorage on change ----------------
  useEffect(() => {
    localStorage.setItem('storyLanguage', storyLanguage);
  }, [storyLanguage]);

  useEffect(() => {
    localStorage.setItem('numDays', numDays);
  }, [numDays]);

  useEffect(() => {
    localStorage.setItem('languageDifficulty', languageDifficulty);
  }, [languageDifficulty]);

  useEffect(() => {
    localStorage.setItem('storyLength', storyLength);
  }, [storyLength]);

  useEffect(() => {
    localStorage.setItem('title', title);
  }, [title]);

  useEffect(() => {
    localStorage.setItem('storyType', storyType);
  }, [storyType]);

  useEffect(() => {
    localStorage.setItem('time', time);
  }, [time]);

  useEffect(() => {
    localStorage.setItem('place', place);
  }, [place]);

  useEffect(() => {
    localStorage.setItem('characterName', characterName);
  }, [characterName]);

  useEffect(() => {
    localStorage.setItem('protagonist', protagonist);
  }, [protagonist]);

  useEffect(() => {
    localStorage.setItem('mainStoryline', mainStoryline);
  }, [mainStoryline]);

  // ---------------- KEYDOWN for SUGGESTIONS (Enter cycles next) ----------------
  const handleSuggestionKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      switch (field) {
        case 'title':
          setTitle(titleSuggestions[titleIndex]);
          setTitleIndex((prev) => (prev + 1) % titleSuggestions.length);
          break;
        case 'time':
          setTime(timeSuggestions[timeIndex]);
          setTimeIndex((prev) => (prev + 1) % timeSuggestions.length);
          break;
        case 'place':
          setPlace(placeSuggestions[placeIndex]);
          setPlaceIndex((prev) => (prev + 1) % placeSuggestions.length);
          break;
        case 'characterName':
          setCharacterName(characterNameSuggestions[characterNameIndex]);
          setCharacterNameIndex((prev) => (prev + 1) % characterNameSuggestions.length);
          break;
        case 'protagonist':
          setProtagonist(protagonistSuggestions[protagonistIndex]);
          setProtagonistIndex((prev) => (prev + 1) % protagonistSuggestions.length);
          break;
        case 'mainStoryline':
          setMainStoryline(mainStorylineSuggestions[mainStorylineIndex]);
          setMainStorylineIndex((prev) => (prev + 1) % mainStorylineSuggestions.length);
          break;
        case 'storyLength':
          setStoryLength(storyLengthSuggestions[storyLengthIndex]);
          setStoryLengthIndex((prev) => (prev + 1) % storyLengthSuggestions.length);
          break;
        default:
          break;
      }
    }
  };

  // ---------------- "Next Step" => go to VoiceOptionsPage ----------------
  const handleNextStep = () => {
    setLoading(true);
    setError('');

    try {
      // Collect the user’s form data
      const formData = {
        storyLanguage,
        numDays,
        languageDifficulty,
        storyLength,
        title,
        storyType,
        time,
        place,
        characterName,
        protagonist,
        mainStoryline,
        generateImage,
      };

      // Navigate to /voice-options, passing formData in route state
      navigate('/voice-options', { state: formData });
    } catch (err) {
      console.error('Error in next step:', err);
      setError('Unable to proceed to the next step.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      maxWidth="lg"
      sx={{
        marginTop: '100px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Box
        mt={4}
        sx={{
          width: { xs: '100%', sm: '90%', md: '80%' },
          marginLeft: { xs: '10px', sm: '50px', md: '100px' },
        }}
      >
        <div className="Subtitle">Generate a Story Series</div>

        {/* BASIC OPTIONS */}
        <Box
          p={3}
          mb={4}
          borderRadius={2}
          sx={{ backgroundColor: '#e0e0e0' }}
        >
          <Typography variant="h6" gutterBottom>
            Basic Options
          </Typography>
          <Box
            display="flex"
            flexDirection={{ xs: 'column', md: 'row' }}
            gap={3}
          >
            <TextField
              fullWidth
              select
              label="Story Language"
              value={storyLanguage}
              onChange={(e) => setStoryLanguage(e.target.value)}
              variant="outlined"
              margin="normal"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="English">English</MenuItem>
              <MenuItem value="Spanish">Spanish</MenuItem>
              <MenuItem value="Chinese">Chinese</MenuItem>
              <MenuItem value="French">French</MenuItem>
              <MenuItem value="German">German</MenuItem>
              <MenuItem value="Japanese">Japanese</MenuItem>
            </TextField>

            <TextField
              fullWidth
              label="Number of Days"
              type="number"
              value={numDays}
              onChange={(e) => setNumDays(e.target.value)}
              variant="outlined"
              margin="normal"
              inputProps={{ min: 1 }}
            />
          </Box>
        </Box>

        <Typography variant="h6" gutterBottom>
          Optional:
        </Typography>

        {/* STORY SETUP */}
        <Box
          p={3}
          mb={4}
          borderRadius={2}
          sx={{ backgroundColor: '#f5f5f5' }}
        >
          <Typography variant="h6" gutterBottom>
            Story Setup
          </Typography>
          <Box
            display="flex"
            flexDirection={{ xs: 'column', md: 'row' }}
            gap={3}
            mb={3}
          >
            <TextField
              fullWidth
              label="Title"
              placeholder="e.g., The Brave Adventurer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => handleSuggestionKeyDown(e, 'title')}
              variant="outlined"
              margin="normal"
            />

            <TextField
              fullWidth
              select
              label="Story Type"
              value={storyType}
              onChange={(e) => setStoryType(e.target.value)}
              variant="outlined"
              margin="normal"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="Adventure">Adventure</MenuItem>
              <MenuItem value="Mystery">Mystery</MenuItem>
              <MenuItem value="Romance">Romance</MenuItem>
              <MenuItem value="Fantasy">Fantasy</MenuItem>
              <MenuItem value="Science Fiction">Science Fiction</MenuItem>
              <MenuItem value="Horror">Horror</MenuItem>
            </TextField>
          </Box>

          <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
            <TextField
              fullWidth
              label="Time"
              placeholder="e.g., medieval times, the future"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              onKeyDown={(e) => handleSuggestionKeyDown(e, 'time')}
              variant="outlined"
              margin="normal"
            />
            <TextField
              fullWidth
              label="Place"
              placeholder="e.g., a small village, outer space"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              onKeyDown={(e) => handleSuggestionKeyDown(e, 'place')}
              variant="outlined"
              margin="normal"
            />
          </Box>
        </Box>

        {/* MAIN CHARACTER */}
        <Box
          p={3}
          mb={4}
          borderRadius={2}
          sx={{ backgroundColor: '#f5f5f5' }}
        >
          <Typography variant="h6" gutterBottom>
            Main Character
          </Typography>
          <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
            <TextField
              fullWidth
              label="Character Name"
              placeholder="e.g., Alice, John"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              onKeyDown={(e) => handleSuggestionKeyDown(e, 'characterName')}
              variant="outlined"
              margin="normal"
            />
            <TextField
              fullWidth
              label="Protagonist Characteristics"
              placeholder="e.g., a courageous knight, a curious child"
              value={protagonist}
              onChange={(e) => setProtagonist(e.target.value)}
              onKeyDown={(e) => handleSuggestionKeyDown(e, 'protagonist')}
              variant="outlined"
              margin="normal"
            />
          </Box>
        </Box>

        {/* MAIN STORYLINE */}
        <Box
          p={3}
          mb={4}
          borderRadius={2}
          sx={{ backgroundColor: '#f5f5f5' }}
        >
          <Typography variant="h6" gutterBottom>
            Main Storyline
          </Typography>
          <TextField
            fullWidth
            label="Main Storyline"
            placeholder="e.g., A quest to find the lost treasure"
            value={mainStoryline}
            onChange={(e) => setMainStoryline(e.target.value)}
            onKeyDown={(e) => handleSuggestionKeyDown(e, 'mainStoryline')}
            variant="outlined"
            margin="normal"
          />
        </Box>

        {/* DIFFICULTY & STORY LENGTH */}
        <Box
          p={3}
          mb={4}
          borderRadius={2}
          sx={{ backgroundColor: '#f5f5f5' }}
        >
          <Typography variant="h6" gutterBottom>
            Difficulty & Story Length
          </Typography>
          <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
            <TextField
              fullWidth
              select
              label="Language Difficulty"
              value={languageDifficulty}
              onChange={(e) => setLanguageDifficulty(e.target.value)}
              variant="outlined"
              margin="normal"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="Easy">Easy</MenuItem>
              <MenuItem value="Intermediate">Intermediate</MenuItem>
              <MenuItem value="Advanced">Advanced</MenuItem>
            </TextField>

            <TextField
              fullWidth
              label="Story Length"
              placeholder="e.g. 300-500"
              value={storyLength}
              onChange={(e) => setStoryLength(e.target.value)}
              onKeyDown={(e) => handleSuggestionKeyDown(e, 'storyLength')}
              variant="outlined"
              margin="normal"
            />
          </Box>
        </Box>

        {/* Checkbox for generating image */}
        <FormControlLabel
          control={
            <Checkbox
              checked={generateImage}
              onChange={(e) => setGenerateImage(e.target.checked)}
              color="primary"
            />
          }
          label="Generate Story Image (DALL·E)"
        />

        {/* Show error if any */}
        {error && (
          <Box mt={2} p={2} bgcolor="#ffebee" borderRadius={2}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}

        {/* "Next Step" Button => /voice-options */}
        <Box display="flex" alignItems="center" mt={3}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleNextStep}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Processing...' : 'Next Step'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default StoryPage;
