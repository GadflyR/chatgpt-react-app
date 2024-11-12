import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Button, Typography, Container, CircularProgress, TextField, MenuItem } from '@mui/material';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { db } from './firebase'; // Import Firestore instance
import { doc, updateDoc } from 'firebase/firestore';
import { uploadBytes, getDownloadURL, ref, getStorage } from 'firebase/storage';

const storage = getStorage();

function GeneratedStoryPage() {
  const location = useLocation();
  const { stories } = location.state || {};
  const { currentUser } = useAuth();

  const [selectedVoice, setSelectedVoice] = useState('en-US-JennyNeural');
  const [audioUrls, setAudioUrls] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef(null);
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://ibotstorybackend-f6e0c4f9h9bkbef8.eastus2-01.azurewebsites.net';

  const handleGenerateVoice = async () => {
    setLoading(true);
    setError('');
    setAudioUrls([]);
    setIsPlaying(false);
    setCurrentAudioIndex(0);
  
    try {
      // Generating audio for each story
      const audioPromises = stories.map(async (storyItem) => {
        // Make a request to your server to generate TTS audio
        const response = await axios.post(
          `${backendUrl}/api/tts`,
          {
            text: `Day ${storyItem.day}: ${storyItem.content}`,
            voice: selectedVoice,
          },
          { responseType: 'blob' }
        );
  
        const audioBlob = response.data;
        const audioFile = new File([audioBlob], `story_${uuidv4()}.mp3`, {
          type: 'audio/mpeg',
        });
  
        // Upload the audio file to Firebase Storage
        const storageRef = ref(storage, `user_stories/${currentUser.uid}/story_${storyItem.day}_${uuidv4()}.mp3`);
        const uploadResult = await uploadBytes(storageRef, audioFile);
  
        // Get the download URL from Firebase Storage
        const audioUrl = await getDownloadURL(uploadResult.ref);
  
        // Save the download URL to Firestore
        const storyDocRef = doc(db, 'users', currentUser.uid, 'generatedStories', storyItem.day.toString());
        await updateDoc(storyDocRef, { audioUrl });
  
        return audioUrl;
      });
  
      const urls = await Promise.all(audioPromises);
      setAudioUrls(urls);
    } catch (err) {
      console.error('Error:', err.message);
      setError('Error generating speech audio.');
    } finally {
      setLoading(false);
    }
  };  

  return (
    <Container maxWidth="md" style={{ marginTop: '75px' }}>
      <Box mt={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Your Generated Story
        </Typography>
        {stories.length > 0 &&
          stories.map((storyItem) => (
            <Box key={storyItem.day} mt={2} p={2} bgcolor="#f5f5f5" borderRadius={4}>
              <Typography variant="h6">Day {storyItem.day}:</Typography>
              <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                {storyItem.content}
              </Typography>
            </Box>
          ))}

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
          <MenuItem value="en-US-JennyNeural">Jenny (US)</MenuItem>
          <MenuItem value="en-US-GuyNeural">Guy (US)</MenuItem>
          <MenuItem value="en-GB-LibbyNeural">Libby (UK)</MenuItem>
          <MenuItem value="en-GB-RyanNeural">Ryan (UK)</MenuItem>
          <MenuItem value="en-AU-NatashaNeural">Natasha (AU)</MenuItem>
          <MenuItem value="en-IN-NeerjaNeural">Neerja (IN)</MenuItem>
        </TextField>

        <Box display="flex" alignItems="center" mt={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateVoice}
            disabled={loading || stories.length === 0}
          >
            {loading ? 'Generating Voice...' : 'Generate Voice'}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => setIsPlaying(true)}
            style={{ marginLeft: '16px' }}
            disabled={loading || isPlaying || audioUrls.length === 0}
          >
            Play Stories
          </Button>
          <Button
            variant="outlined"
            color="default"
            onClick={() => setIsPlaying(false)}
            style={{ marginLeft: '16px' }}
            disabled={!isPlaying}
          >
            Stop
          </Button>
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

export default GeneratedStoryPage;
