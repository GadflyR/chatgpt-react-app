import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext'; // Import to access current user
import { db } from './firebase'; // Import Firestore instance
import { collection, addDoc } from "firebase/firestore"; // Firestore functions
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

  // Initialize state with localStorage values or defaults
  const [title, setTitle] = useState(() => localStorage.getItem('title') || '');
  const [protagonist, setProtagonist] = useState(() => localStorage.getItem('protagonist') || '');
  const [storyType, setStoryType] = useState(() => localStorage.getItem('storyType') || '');
  const [languageDifficulty, setLanguageDifficulty] = useState(() => localStorage.getItem('languageDifficulty') || '');
  const [characterName, setCharacterName] = useState(() => localStorage.getItem('characterName') || '');
  const [time, setTime] = useState(() => localStorage.getItem('time') || '');
  const [place, setPlace] = useState(() => localStorage.getItem('place') || '');
  const [numDays, setNumDays] = useState(() => {
    const savedNumDays = localStorage.getItem('numDays');
    return savedNumDays ? parseInt(savedNumDays, 10) : 1;
  });
  const [mainStoryline, setMainStoryline] = useState(() => localStorage.getItem('mainStoryline') || ''); // New State
  const [loading, setLoading] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [error, setError] = useState('');

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://ibotstorybackend-f6e0c4f9h9bkbef8.eastus2-01.azurewebsites.net';

  // Save to localStorage whenever inputs change
  useEffect(() => {
    localStorage.setItem('title', title);
  }, [title]);

  useEffect(() => {
    localStorage.setItem('protagonist', protagonist);
  }, [protagonist]);

  useEffect(() => {
    localStorage.setItem('storyType', storyType);
  }, [storyType]);

  useEffect(() => {
    localStorage.setItem('languageDifficulty', languageDifficulty);
  }, [languageDifficulty]);

  useEffect(() => {
    localStorage.setItem('characterName', characterName);
  }, [characterName]);

  useEffect(() => {
    localStorage.setItem('time', time);
  }, [time]);

  useEffect(() => {
    localStorage.setItem('place', place);
  }, [place]);

  useEffect(() => {
    localStorage.setItem('numDays', numDays);
  }, [numDays]);

  useEffect(() => {
    localStorage.setItem('mainStoryline', mainStoryline); // Save Main Storyline
  }, [mainStoryline]);

  // Function to generate stories
  const handleGenerateStory = async (e) => {
    e.preventDefault();

    // Input validation
    if (!languageDifficulty) {
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
          prompt = `Write a ${languageDifficulty.toLowerCase()} language story`;
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
          // Incorporate Main Storyline if provided
          if (mainStoryline.trim()) {
            prompt += ` with the main storyline focusing on ${mainStoryline}`;
          }
          prompt += '.';
          prompt += ' Keep the story concise, around 300 words.';
        } else {
          if (previousStory.length > 1500) {
            const summaryPrompt = `Summarize the following story in 200 words:\n\n${previousStory}`;
            const summaryRes = await axios.post(`${backendUrl}/api/chat`, {
              prompt: summaryPrompt,
            });
            previousStory = summaryRes.data.choices[0].message.content.trim();
          }

          prompt = `Continue the following story into Day ${day}:\n\n${previousStory}\n\nEnsure the language difficulty remains ${languageDifficulty.toLowerCase()} and keep the story concise, around 300 words.`;
        }

        const res = await axios.post(`${backendUrl}/api/chat`, { prompt });
        const assistantMessage = res.data.choices[0].message.content;

        generatedStories.push({ day, content: assistantMessage.trim() });
        previousStory = assistantMessage.trim();
      }

      if (currentUser) {
        const userStoryCollection = collection(db, 'users', currentUser.uid, 'generatedStories');
        for (let storyItem of generatedStories) {
          await addDoc(userStoryCollection, {
            day: storyItem.day,
            content: storyItem.content,
            timestamp: new Date(),
            // Optionally store mainStoryline with each story
            // mainStoryline: mainStoryline.trim() || null,
          });
        }
      }

      // Clear localStorage after successful generation
      localStorage.removeItem('title');
      localStorage.removeItem('protagonist');
      localStorage.removeItem('storyType');
      localStorage.removeItem('languageDifficulty');
      localStorage.removeItem('characterName');
      localStorage.removeItem('time');
      localStorage.removeItem('place');
      localStorage.removeItem('numDays');
      localStorage.removeItem('mainStoryline'); // Clear Main Storyline

      // Navigate to GeneratedStoryPage with the generated stories
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

  return (
    <Container maxWidth="md" style={{ marginTop: '100px' }}>
      <Box mt={4}>
        <div className='Subtitle'>
          Generate a Story Series
        </div>

        <Box component="form" onSubmit={handleGenerateStory} mb={2}>
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
            select
            fullWidth
            label="Language Difficulty"
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

          <TextField
            fullWidth
            label="Character Name"
            placeholder="e.g., Alice, John"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            variant="outlined"
            margin="normal"
            required
          />

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

          <TextField
            fullWidth
            label="How many days do you want to generate?"
            type="number"
            inputProps={{ min: 1 }}
            value={numDays}
            onChange={(e) => setNumDays(e.target.value)}
            variant="outlined"
            margin="normal"
            required
          />

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
