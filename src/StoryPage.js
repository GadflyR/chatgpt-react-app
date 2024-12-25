import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext'; // Import to access current user
import { db } from './firebase';       // Import Firestore instance
import { collection, addDoc } from 'firebase/firestore'; // Firestore functions
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

import './App.css';

function StoryPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // ----------- State -----------
  // Required fields
  const [storyLanguage, setStoryLanguage] = useState(
    () => localStorage.getItem('storyLanguage') || ''
  );
  const [languageDifficulty, setLanguageDifficulty] = useState(
    () => localStorage.getItem('languageDifficulty') || ''
  );
  const [characterName, setCharacterName] = useState(
    () => localStorage.getItem('characterName') || ''
  );
  const [numDays, setNumDays] = useState(() => {
    const savedNumDays = localStorage.getItem('numDays');
    return savedNumDays ? parseInt(savedNumDays, 10) : 1;
  });

  // Optional fields
  const [title, setTitle] = useState(
    () => localStorage.getItem('title') || ''
  );
  const [storyType, setStoryType] = useState(
    () => localStorage.getItem('storyType') || ''
  );
  const [protagonist, setProtagonist] = useState(
    () => localStorage.getItem('protagonist') || ''
  );
  const [time, setTime] = useState(() => localStorage.getItem('time') || '');
  const [place, setPlace] = useState(
    () => localStorage.getItem('place') || ''
  );
  const [mainStoryline, setMainStoryline] = useState(
    () => localStorage.getItem('mainStoryline') || ''
  );

  // Other states
  const [loading, setLoading] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [error, setError] = useState('');

  // Show/hide toggle for optional fields
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const backendUrl =
    process.env.REACT_APP_BACKEND_URL ||
    'https://ibotstorybackend-f6e0c4f9h9bkbef8.eastus2-01.azurewebsites.net';

  // ----------- useEffects to save localStorage -----------
  useEffect(() => {
    localStorage.setItem('storyLanguage', storyLanguage);
  }, [storyLanguage]);

  useEffect(() => {
    localStorage.setItem('languageDifficulty', languageDifficulty);
  }, [languageDifficulty]);

  useEffect(() => {
    localStorage.setItem('characterName', characterName);
  }, [characterName]);

  useEffect(() => {
    localStorage.setItem('numDays', numDays);
  }, [numDays]);

  // Optional
  useEffect(() => {
    localStorage.setItem('title', title);
  }, [title]);

  useEffect(() => {
    localStorage.setItem('storyType', storyType);
  }, [storyType]);

  useEffect(() => {
    localStorage.setItem('protagonist', protagonist);
  }, [protagonist]);

  useEffect(() => {
    localStorage.setItem('time', time);
  }, [time]);

  useEffect(() => {
    localStorage.setItem('place', place);
  }, [place]);

  useEffect(() => {
    localStorage.setItem('mainStoryline', mainStoryline);
  }, [mainStoryline]);

  // ----------- Story Generation -----------
  const handleGenerateStory = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!storyLanguage.trim()) {
      setError('Please select a story language.');
      return;
    }
    if (!languageDifficulty.trim()) {
      setError('Please select a language difficulty level.');
      return;
    }
    if (!characterName.trim()) {
      setError('Please enter a character name.');
      return;
    }
    if (!numDays || isNaN(numDays) || numDays < 1) {
      setError('Please enter a valid number of days (minimum 1).');
      return;
    }

    // Reset state before generating
    setLoading(true);
    setError('');
    setCurrentDay(0);

    let previousStory = '';
    const generatedStories = [];

    try {
      for (let day = 1; day <= numDays; day++) {
        setCurrentDay(day);

        let prompt = '';
        if (day === 1) {
          // Day 1 Prompt
          prompt = `Write a ${languageDifficulty.toLowerCase()} ${storyLanguage.toLowerCase()} story`;

          // Title, story type, etc., if provided
          if (storyType.trim()) {
            prompt += ` in the ${storyType} genre`;
          }
          if (title.trim()) {
            prompt += ` titled "${title}"`;
          }
          prompt += ` featuring a character named ${characterName}`;
          if (protagonist.trim()) {
            prompt += ` who is ${protagonist}`;
          }
          if (time.trim() || place.trim()) {
            prompt += ' set';
            if (time.trim()) {
              prompt += ` in ${time}`;
            }
            if (place.trim()) {
              prompt += time.trim() ? ` at ${place}` : ` in ${place}`;
            }
          }
          if (mainStoryline.trim()) {
            prompt += ` with the main storyline focusing on ${mainStoryline}`;
          }
          prompt += '. Keep the story concise, around 300 words.';
        } else {
          // Subsequent Days
          // If the previous story is very long, let's summarize it first
          if (previousStory.length > 1500) {
            const summaryPrompt = `Summarize the following story in 200 words:\n\n${previousStory}`;
            const summaryRes = await axios.post(`${backendUrl}/api/chat`, {
              prompt: summaryPrompt,
            });
            previousStory = summaryRes.data.choices[0].message.content.trim();
          }

          prompt = `Continue the following story into Day ${day}:\n\n${previousStory}\n\n` +
                   `Ensure the language difficulty remains ${languageDifficulty.toLowerCase()} ` +
                   `and the story remains in ${storyLanguage.toLowerCase()}. Keep it around 300 words.`;
        }

        const res = await axios.post(`${backendUrl}/api/chat`, { prompt });
        const assistantMessage = res.data.choices[0].message.content.trim();

        generatedStories.push({ day, content: assistantMessage });
        previousStory = assistantMessage;
      }

      // Store in Firestore if the user is logged in
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

      // Clear localStorage after successful generation
      localStorage.removeItem('title');
      localStorage.removeItem('storyType');
      localStorage.removeItem('protagonist');
      localStorage.removeItem('time');
      localStorage.removeItem('place');
      localStorage.removeItem('mainStoryline');
      localStorage.removeItem('storyLanguage');
      localStorage.removeItem('languageDifficulty');
      localStorage.removeItem('characterName');
      localStorage.removeItem('numDays');

      // Navigate to the GeneratedStoryPage with the generated stories
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

  // ----------- JSX Return -----------
  return (
    <Container maxWidth="md" style={{ marginTop: '100px' }}>
      <Box mt={4}>
        <div className="Subtitle">Generate a Story Series</div>

        <Box component="form" onSubmit={handleGenerateStory} mb={2}>
          {/* Required: Story Language */}
          <TextField
            select
            fullWidth
            label="Story Language (Required)"
            value={storyLanguage}
            onChange={(e) => setStoryLanguage(e.target.value)}
            variant="outlined"
            margin="normal"
            required
          >
            <MenuItem value="English">English</MenuItem>
            <MenuItem value="Spanish">Spanish</MenuItem>
            <MenuItem value="Chinese">Chinese</MenuItem>
            <MenuItem value="French">French</MenuItem>
            <MenuItem value="German">German</MenuItem>
            <MenuItem value="Japanese">Japanese</MenuItem>
            {/* Add more as needed */}
          </TextField>

          {/* Required: Language Difficulty */}
          <TextField
            select
            fullWidth
            label="Language Difficulty (Required)"
            value={languageDifficulty}
            onChange={(e) => setLanguageDifficulty(e.target.value)}
            variant="outlined"
            margin="normal"
            required
          >
            <MenuItem value="Easy">Easy</MenuItem>
            <MenuItem value="Intermediate">Intermediate</MenuItem>
            <MenuItem value="Advanced">Advanced</MenuItem>
          </TextField>

          {/* Required: Character Name */}
          <TextField
            fullWidth
            label="Character Name (Required)"
            placeholder="e.g., Alice, John"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            variant="outlined"
            margin="normal"
            required
          />

          {/* Required: Number of Days */}
          <TextField
            fullWidth
            label="How many days do you want to generate? (Required)"
            type="number"
            inputProps={{ min: 1 }}
            value={numDays}
            onChange={(e) => setNumDays(e.target.value)}
            variant="outlined"
            margin="normal"
            required
          />

          {/* Toggle button to show/hide optional fields */}
          <Box mt={2} mb={1}>
            <Button
              variant="outlined"
              onClick={() => setShowOptionalFields(!showOptionalFields)}
            >
              {showOptionalFields ? 'Hide Optional Fields' : 'Show Optional Fields'}
            </Button>
          </Box>

          {/* Conditionally render optional fields */}
          {showOptionalFields && (
            <>
              <TextField
                fullWidth
                label="Title (Optional)"
                placeholder="e.g., The Brave Adventurer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                variant="outlined"
                margin="normal"
              />

              <TextField
                select
                fullWidth
                label="Story Type (Optional)"
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

              <TextField
                fullWidth
                label="Protagonist Characteristics (Optional)"
                placeholder="e.g., a courageous knight, a curious child"
                value={protagonist}
                onChange={(e) => setProtagonist(e.target.value)}
                variant="outlined"
                margin="normal"
              />

              <TextField
                fullWidth
                label="Time (Optional)"
                placeholder="e.g., medieval times, the future"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                variant="outlined"
                margin="normal"
              />

              <TextField
                fullWidth
                label="Place (Optional)"
                placeholder="e.g., a small village, outer space"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                variant="outlined"
                margin="normal"
              />

              <TextField
                fullWidth
                label="Main Storyline (Optional)"
                placeholder="e.g., A quest to find the lost treasure"
                value={mainStoryline}
                onChange={(e) => setMainStoryline(e.target.value)}
                variant="outlined"
                margin="normal"
              />
            </>
          )}

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
              <Typography variant="body1" style={{ marginLeft: '16px' }}>
                Generating Day {currentDay} of {numDays}...
              </Typography>
            )}
          </Box>
        </Box>

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

export default StoryPage;
