import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase'; // Firestore instance
import { collection, getDocs } from 'firebase/firestore';
import {
  Typography,
  Container,
  Box,
  CircularProgress,
  Card,
  CardActionArea,
  CardContent
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

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
          // For each user, we have a sub-collection "generatedStories" in Firestore.
          const userStoryCollection = collection(
            db,
            'users',
            currentUser.uid,
            'generatedStories'
          );
          const userStoriesSnapshot = await getDocs(userStoryCollection);

          const fetchedStories = [];
          userStoriesSnapshot.forEach((doc) => {
            // doc.data() might have { content, day, timestamp }
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

  // Helper: format the timestamp for display
  const formatTimestamp = (ts) => {
    // If it's a Firestore Timestamp object:
    if (ts && ts.toDate) {
      return ts.toDate().toLocaleString();
    }
    // If it's a string or Date:
    if (typeof ts === 'string' || ts instanceof Date) {
      return new Date(ts).toLocaleString();
    }
    // fallback
    return 'Unknown date';
  };

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
          stories.map((storyItem) => {
            // e.g. storyItem = { id, content, day, timestamp }
            const { id, content = '', day, timestamp } = storyItem;
            // We'll show only first 100 chars
            const snippet = content.substring(0, 100);

            return (
              <Card key={id} variant="outlined" style={{ marginBottom: '16px' }}>
                <CardActionArea
                  onClick={() =>
                    // Pass an array named "stories" to GeneratedStoryPage
                    navigate('/generated-story', {
                      state: {
                        stories: [
                          {
                            day,
                            content,
                            timestamp,
                          },
                        ],
                      },
                    })
                  }
                >
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">
                      Generated on: {formatTimestamp(timestamp)}
                    </Typography>
                    <Typography variant="body1" style={{ marginTop: 8 }}>
                      {snippet}
                      {content.length > 100 && '...'}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })
        ) : (
          <Typography variant="body1">No stories generated yet.</Typography>
        )}
      </Box>
    </Container>
  );
}

export default HistoryPage;
