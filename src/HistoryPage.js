import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase'; // Import Firestore instance
import { collection, getDocs } from "firebase/firestore";
import {
  Typography,
  Container,
  Box,
  CircularProgress,
  Button,
} from '@mui/material';

function HistoryPage() {
  const { currentUser } = useAuth(); // Use the user info to fetch their stories
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserStories = async () => {
      if (currentUser) {
        try {
          const userStoryCollection = collection(db, 'users', currentUser.uid, 'generatedStories');
          const userStoriesSnapshot = await getDocs(userStoryCollection);

          const fetchedStories = [];
          userStoriesSnapshot.forEach((doc) => {
            fetchedStories.push({ id: doc.id, ...doc.data() });
          });

          setStories(fetchedStories);
        } catch (err) {
          console.error("Error fetching stories:", err);
          setError("Error fetching user stories.");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchUserStories();
  }, [currentUser]);

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box mt={4} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" style={{ marginTop: '75px' }}>
      <Box mt={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Your Story History
        </Typography>
        {error && (
          <Box mt={2} p={2} bgcolor="#ffebee" borderRadius={4}>
            <Typography color="error" variant="body1">
              {error}
            </Typography>
          </Box>
        )}
        {stories.length > 0 ? (
          stories.map((storyItem, index) => (
            <Box key={index} mt={2} p={2} bgcolor="#f5f5f5" borderRadius={4}>
              <Typography variant="h6">Day {storyItem.day}:</Typography>
              <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                {storyItem.content}
              </Typography>
              {storyItem.audioUrl && (
                <Box mt={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    href={storyItem.audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Play Audio
                  </Button>
                </Box>
              )}
            </Box>
          ))
        ) : (
          <Typography variant="body1">No stories generated yet.</Typography>
        )}
      </Box>
    </Container>
  );
}

export default HistoryPage;
