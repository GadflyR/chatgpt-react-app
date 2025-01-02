// StoryPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext'; // Access current user
import { db } from './firebase';        // Firestore instance
import { collection, addDoc } from 'firebase/firestore';
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
import { v4 as uuidv4 } from 'uuid'; // For generating a unique storyId
import './App.css'; // Ensure this includes the .Subtitle class for your custom font

function StoryPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // --------------------- SUGGESTION ARRAYS ---------------------
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

  // --------------------- INDEX STATES (for cycling suggestions) ---------------------
  const [titleIndex, setTitleIndex] = useState(0);
  const [timeIndex, setTimeIndex] = useState(0);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [characterNameIndex, setCharacterNameIndex] = useState(0);
  const [protagonistIndex, setProtagonistIndex] = useState(0);
  const [mainStorylineIndex, setMainStorylineIndex] = useState(0);
  const [storyLengthIndex, setStoryLengthIndex] = useState(0);

  // --------------------- FIELD STATES ---------------------
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

  // --------------------- LOADING / ERROR STATES ---------------------
  const [loading, setLoading] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [error, setError] = useState('');

  // --------------------- NEW: Generate Image? ---------------------
  const [generateImage, setGenerateImage] = useState(false);

  // --------------------- BACKEND URL ---------------------
  const backendUrl =
    process.env.REACT_APP_BACKEND_URL ||
    'https://ibotstorybackend-f6e0c4f9h9bkbef8.eastus2-01.azurewebsites.net';

  // --------------------- Local Storage Effects ---------------------
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

  // --------------------- KEYDOWN FOR SUGGESTIONS ---------------------
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

  // --------------------- STORY LENGTH PARSER ---------------------
  const getLengthInstruction = (input) => {
    if (!input.trim()) {
      return "Keep it around 300 words.";
    }
    if (input.includes("-")) {
      const [minRaw, maxRaw] = input.split("-").map((str) => str.trim());
      const minVal = parseInt(minRaw, 10);
      const maxVal = parseInt(maxRaw, 10);
      if (!isNaN(minVal) && !isNaN(maxVal)) {
        return `Try to keep it between ${minVal} and ${maxVal} words.`;
      } else {
        return `Try to keep it around ${input} words.`;
      }
    }
    return `Try to keep it around ${input.trim()} words.`;
  };

  // --------------------- STORY GENERATION ---------------------
  const handleGenerateStory = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCurrentDay(0);

    let previousStory = '';
    const generatedStories = [];

    try {
      // Generate a unique storyId for the entire multi-day story
      const storyId = uuidv4();

      // If user left numDays empty, default to 1
      const totalDays = numDays ? parseInt(numDays, 10) : 1;

      for (let day = 1; day <= totalDays; day++) {
        setCurrentDay(day);

        let prompt = '';
        if (day === 1) {
          prompt = 'Write a story';

          // Language / difficulty
          if (storyLanguage.trim()) {
            prompt += ` in ${storyLanguage.toLowerCase()}`;
          }
          if (languageDifficulty.trim()) {
            prompt += `, making it ${languageDifficulty.toLowerCase()} difficulty`;
          }

          // Title / Story Type
          if (title.trim()) {
            prompt += ` titled "${title}"`;
          }
          if (storyType.trim()) {
            prompt += ` in the ${storyType} genre`;
          }

          // Character Name / Protagonist
          if (characterName.trim()) {
            prompt += ` featuring a character named ${characterName}`;
          }
          if (protagonist.trim()) {
            prompt += ` who is ${protagonist}`;
          }

          // Time / Place
          if (time.trim() || place.trim()) {
            prompt += ' set';
            if (time.trim()) {
              prompt += ` in ${time}`;
            }
            if (place.trim()) {
              prompt += time.trim() ? ` at ${place}` : ` in ${place}`;
            }
          }

          // Main storyline
          if (mainStoryline.trim()) {
            prompt += ` with the main storyline focusing on ${mainStoryline}`;
          }

          // Story length
          prompt += '. ' + getLengthInstruction(storyLength);
        } else {
          // Day 2 or later
          if (previousStory.length > 1500) {
            // Summarize to keep prompt shorter
            const summaryPrompt = `Summarize the following story in 200 words:\n\n${previousStory}`;
            const summaryRes = await axios.post(`${backendUrl}/api/chat`, {
              prompt: summaryPrompt,
            });
            previousStory = summaryRes.data.choices[0].message.content.trim();
          }

          prompt += `Continue the following story into Day ${day}:\n\n${previousStory}\n\n`;

          // Keep language / difficulty consistent
          if (languageDifficulty.trim() || storyLanguage.trim()) {
            prompt += 'Ensure it remains';
            if (languageDifficulty.trim()) {
              prompt += ` ${languageDifficulty.toLowerCase()} difficulty`;
            }
            if (storyLanguage.trim()) {
              prompt += ` in ${storyLanguage.toLowerCase()}`;
            }
            prompt += '. ';
          }

          // Story length again
          prompt += getLengthInstruction(storyLength);
        }

        // Call the backend
        const res = await axios.post(`${backendUrl}/api/chat`, { prompt });
        const assistantMessage = res.data.choices[0].message.content.trim();

        generatedStories.push({ day, content: assistantMessage });
        previousStory = assistantMessage;
      }

      // If user is logged in, store each day in Firestore
      if (currentUser) {
        const userStoryCollection = collection(
          db,
          'users',
          currentUser.uid,
          'generatedStories'
        );
        for (let storyItem of generatedStories) {
          await addDoc(userStoryCollection, {
            storyId, // The crucial line for grouping
            day: storyItem.day,
            content: storyItem.content,
            timestamp: new Date(),
          });
        }
      }

      // ============= DALL·E IMAGE GENERATION (if checkbox is checked) =============
      let storyImageUrl = null;
      if (generateImage) {
        try {
          // 1) Combine the entire story's content
          const combinedText = generatedStories
            .map((s) => `Day ${s.day}: ${s.content}`)
            .join('\n');

          // 2) If it's > 1000 chars, summarize via GPT to keep it short
          let dallEPrompt = combinedText;
          if (dallEPrompt.length > 1000) {
            const summaryPrompt = `
              Summarize the following text in 200 characters or fewer for an image prompt:
              ${dallEPrompt}
            `;
            const summaryRes = await axios.post(`${backendUrl}/api/chat`, {
              prompt: summaryPrompt,
            });
            dallEPrompt = summaryRes.data.choices[0].message.content.trim();
          }

          // 3) Use the final short prompt for DALL·E
          const imagePrompt = `Create an illustration for this story: ${dallEPrompt}`;

          const imgRes = await axios.post(`${backendUrl}/api/generateImage`, {
            prompt: imagePrompt,
          });
          storyImageUrl = imgRes.data.imageUrl;
        } catch (imgErr) {
          console.error('Error generating story image:', imgErr);
        }
      }

      // Clear localStorage after success
      [
        'storyLanguage',
        'numDays',
        'languageDifficulty',
        'storyLength',
        'title',
        'storyType',
        'time',
        'place',
        'characterName',
        'protagonist',
        'mainStoryline',
      ].forEach((key) => localStorage.removeItem(key));

      // Navigate to /generated-story with the generated text + optional image
      navigate('/generated-story', {
        state: {
          stories: generatedStories,
          imageUrl: storyImageUrl,
        },
      });
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
          width: { xs: '100%', sm: '90%', md: '80%' }, // Adjust the width for different screen sizes
          marginLeft: { xs: '10px', sm: '50px', md: '100px' }, // Leave more blank space on the left
        }}
      >
        <div className="Subtitle">Generate a Story Series</div>

        <Box component="form" onSubmit={handleGenerateStory} mb={2}>
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
          {/* OPTIONAL FIELDS */}
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

          {/* NEW: Checkbox for generating an image with DALL·E */}
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

          {/* SUBMIT BUTTON */}
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
              <Typography variant="body1" ml={2}>
                Generating Day {currentDay} of {numDays || 1}...
              </Typography>
            )}
          </Box>
        </Box>

        {error && (
          <Box mt={2} p={2} bgcolor="#ffebee" borderRadius={2}>
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
