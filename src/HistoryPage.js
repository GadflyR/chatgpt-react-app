import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase'; // Import Firestore instance
import { collection, getDocs } from 'firebase/firestore';
import {
  Typography,
  Container,
  Box,
  CircularProgress,
  Card,
  CardActionArea,
  CardContent,
} from '@mui/material';
import { useNavigate } from 'react-router-dom'; // for navigation
import './App.css';

function HistoryPage() {
  const { currentUser } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserStories = async () => {
      if (currentUser) {
        try {
          const userStoryCollection = collection(
            db,
            'users',
            currentUser.uid,
            'generatedStories'
          );
          const userStoriesSnapshot = await getDocs(userStoryCollection);

          const fetchedStories = [];
          userStoriesSnapshot.forEach((doc) => {
            // Each doc might contain fields like: { createdAt, stories: [ {day, content}, ... ] }
            fetchedStories.push({ id: doc.id, ...doc.data() });
          });

          setStories(fetchedStories);
        } catch (err) {
          console.error('Error fetching stories:', err);
          setError('Error fetching user stories.');
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

  // Helper to format date (if needed)
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown Date';
    // If it’s a Firestore Timestamp object, convert to JS Date
    const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return dateObj.toLocaleString(); // or any date format you prefer
  };

  return (
    <Container maxWidth="md" style={{ marginTop: '100px' }}>
      <Box mt={4}>
        <Typography variant="h5" gutterBottom>
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
          stories.map((storyItem, index) => {
            // Suppose storyItem has a field `createdAt` and an array `stories`:
            // storyItem.stories = [ { day: 1, content: '...' }, { day: 2, content: '...' } ]
            const day1Content = storyItem.stories?.[0]?.content || '';
            const snippet = day1Content.substring(0, 100); // first 100 chars

            return (
              <Card
                key={storyItem.id}
                variant="outlined"
                style={{ marginBottom: '16px' }}
              >
                <CardActionArea
                  onClick={() =>
                    navigate('/generated-story', {
                      state: {
                        stories: storyItem.stories,
                        // Any other data you want to pass along
                      },
                    })
                  }
                >
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">
                      {`Generated on: ${formatDate(storyItem.createdAt)}`}
                    </Typography>
                    <Typography variant="body1" style={{ marginTop: 8 }}>
                      {snippet}
                      {day1Content.length > 100 && '...'} {/* Ellipsis if longer than 100 */}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })
        ) : (
          <Typography variant="body1">
            No stories generated yet.
          </Typography>
        )}
      </Box>
    </Container>
  );
}

export default HistoryPage;
