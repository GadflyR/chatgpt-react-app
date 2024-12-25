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
} from '@mui/material';

import './App.css'; // Suppose this has the .Subtitle class for your custom font

function StoryPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // ----------------- State -----------------
  // All fields are optional
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
  const [storyWordLimit, setStoryWordLimit] = useState(
    () => localStorage.getItem('storyWordLimit') || ''
  );

  const [title, setTitle] = useState(
    () => localStorage.getItem('title') || ''
  );
  const [storyType, setStoryType] = useState(
    () => localStorage.getItem('storyType') || ''
  );
  const [time, setTime] = useState(() => localStorage.getItem('time') || '');
  const [place, setPlace] = useState(() => localStorage.getItem('place') || '');
  const [characterName, setCharacterName] = useState(
    () => localStorage.getItem('characterName') || ''
  );
  const [protagonist, setProtagonist] = useState(
    () => localStorage.getItem('protagonist') || ''
  );
  const [mainStoryline, setMainStoryline] = useState(
    () => localStorage.getItem('mainStoryline') || ''
  );

  // Loading/generation states
  const [loading, setLoading] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [error, setError] = useState('');

  const backendUrl =
    process.env.REACT_APP_BACKEND_URL ||
    'https://ibotstorybackend-f6e0c4f9h9bkbef8.eastus2-01.azurewebsites.net';

  // ----------------- useEffects to store in localStorage -----------------
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
    localStorage.setItem('storyWordLimit', storyWordLimit);
  }, [storyWordLimit]);

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

  // ----------------- Story Generation -----------------
  const handleGenerateStory = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError('');
    setCurrentDay(0);

    let previousStory = '';
    const generatedStories = [];

    try {
      // If user left numDays empty, default to 1
      const totalDays = numDays ? parseInt(numDays, 10) : 1;

      for (let day = 1; day <= totalDays; day++) {
        setCurrentDay(day);

        let prompt = '';
        if (day === 1) {
          prompt = 'Write a story';

          // If user specified language or difficulty
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

          // Word limit
          if (storyWordLimit.trim()) {
            prompt += `. Keep it under ${storyWordLimit} words.`;
          } else {
            prompt += '. Keep it around 300 words.';
          }
        } else {
          // Subsequent Days
          if (previousStory.length > 1500) {
            // Summarize if too long
            const summaryPrompt = `Summarize the following story in 200 words:\n\n${previousStory}`;
            const summaryRes = await axios.post(`${backendUrl}/api/chat`, {
              prompt: summaryPrompt,
            });
            previousStory = summaryRes.data.choices[0].message.content.trim();
          }

          prompt = `Continue the following story into Day ${day}:\n\n${previousStory}\n\n`;

          // Language / Difficulty continuing
          if (storyLanguage.trim() || languageDifficulty.trim()) {
            prompt += 'Ensure it remains';
            if (languageDifficulty.trim()) {
              prompt += ` ${languageDifficulty.toLowerCase()} difficulty`;
            }
            if (storyLanguage.trim()) {
              prompt += ` in ${storyLanguage.toLowerCase()}`;
            }
            prompt += '.';
          }

          // Word limit
          if (storyWordLimit.trim()) {
            prompt += ` Keep it under ${storyWordLimit} words.`;
          } else {
            prompt += ' Keep it around 300 words.';
          }
        }

        const res = await axios.post(`${backendUrl}/api/chat`, { prompt });
        const assistantMessage = res.data.choices[0].message.content.trim();

        generatedStories.push({ day, content: assistantMessage });
        previousStory = assistantMessage;
      }

      // If user is logged in, store in Firestore
      if (currentUser) {
        const userStoryCollection = collection(
          db,
          'users',
          currentUser.uid,
          'generatedStories'
        );
        for (let storyItem of generatedStories) {
          await addDoc(userStoryCollection, {
            day: storyItem.day,
            content: storyItem.content,
            timestamp: new Date(),
          });
        }
      }

      // Clear localStorage after success
      [
        'storyLanguage',
        'numDays',
        'languageDifficulty',
        'storyWordLimit',
        'title',
        'storyType',
        'time',
        'place',
        'characterName',
        'protagonist',
        'mainStoryline',
      ].forEach((key) => localStorage.removeItem(key));

      // Go to generated stories page
      navigate('/generated-story', {
        state: {
          stories: generatedStories,
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

  // ----------------- Render -----------------
  return (
    <Container maxWidth="md" sx={{ marginTop: '100px' }}>
      <Box mt={4}>
        {/* Use your custom font for the heading */}
        <div className="Subtitle">Generate a Story Series</div>

        <Box component="form" onSubmit={handleGenerateStory} mb={2}>
          {/* Block 1: Basic Options */}
          <Box
            p={2}
            mb={3}
            borderRadius={2}
            sx={{ backgroundColor: '#f9f9f9' }}
          >
            <Typography variant="h6" gutterBottom>
              Basic Options
            </Typography>
            <Box
              display="flex"
              flexDirection={{ xs: 'column', md: 'row' }}
              gap={2}
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

          {/* Optional: */}
          <Typography variant="body1" color="textSecondary" gutterBottom>
            Optional:
          </Typography>

          {/* Merged Block: Title, Story Type, Time, Place */}
          <Box
            p={2}
            mb={3}
            borderRadius={2}
            sx={{ backgroundColor: '#f0f0f0' }}
          >
            <Typography variant="h6" gutterBottom>
              Story Setup
            </Typography>
            <Box
              display="flex"
              flexDirection={{ xs: 'column', md: 'row' }}
              gap={2}
              mb={2}
            >
              <TextField
                fullWidth
                label="Title"
                placeholder="e.g., The Brave Adventurer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
                <MenuItem value="Adventure">Adventure</MenuItem>
                <MenuItem value="Mystery">Mystery</MenuItem>
                <MenuItem value="Romance">Romance</MenuItem>
                <MenuItem value="Fantasy">Fantasy</MenuItem>
                <MenuItem value="Science Fiction">Science Fiction</MenuItem>
                <MenuItem value="Horror">Horror</MenuItem>
              </TextField>
            </Box>

            <Box
              display="flex"
              flexDirection={{ xs: 'column', md: 'row' }}
              gap={2}
            >
              <TextField
                fullWidth
                label="Time"
                placeholder="e.g., medieval times, the future"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                variant="outlined"
                margin="normal"
              />

              <TextField
                fullWidth
                label="Place"
                placeholder="e.g., a small village, outer space"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                variant="outlined"
                margin="normal"
              />
            </Box>
          </Box>

          {/* Block: Main Character */}
          <Box
            p={2}
            mb={3}
            borderRadius={2}
            sx={{ backgroundColor: '#f9f9f9' }}
          >
            <Typography variant="h6" gutterBottom>
              Main Character
            </Typography>
            <Box
              display="flex"
              flexDirection={{ xs: 'column', md: 'row' }}
              gap={2}
            >
              <TextField
                fullWidth
                label="Character Name"
                placeholder="e.g., Alice, John"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                variant="outlined"
                margin="normal"
              />

              <TextField
                fullWidth
                label="Protagonist Characteristics"
                placeholder="e.g., a courageous knight, a curious child"
                value={protagonist}
                onChange={(e) => setProtagonist(e.target.value)}
                variant="outlined"
                margin="normal"
              />
            </Box>
          </Box>

          {/* Block: Main Storyline */}
          <Box
            p={2}
            mb={3}
            borderRadius={2}
            sx={{ backgroundColor: '#f0f0f0' }}
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
              variant="outlined"
              margin="normal"
            />
          </Box>

          {/* Block: Difficulty & Word Limit */}
          <Box
            p={2}
            mb={2}
            borderRadius={2}
            sx={{ backgroundColor: '#f9f9f9' }}
          >
            <Typography variant="h6" gutterBottom>
              Difficulty & Word Limit
            </Typography>
            <Box
              display="flex"
              flexDirection={{ xs: 'column', md: 'row' }}
              gap={2}
            >
              <TextField
                fullWidth
                select
                label="Language Difficulty"
                value={languageDifficulty}
                onChange={(e) => setLanguageDifficulty(e.target.value)}
                variant="outlined"
                margin="normal"
              >
                <MenuItem value="Easy">Easy</MenuItem>
                <MenuItem value="Intermediate">Intermediate</MenuItem>
                <MenuItem value="Advanced">Advanced</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Story Word Limit"
                placeholder="e.g. 500"
                type="number"
                value={storyWordLimit}
                onChange={(e) => setStoryWordLimit(e.target.value)}
                variant="outlined"
                margin="normal"
                inputProps={{ min: 1 }}
              />
            </Box>
          </Box>

          {/* Submit Button */}
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

        {/* Error Message */}
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
