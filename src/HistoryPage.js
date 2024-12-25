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
  const [storyDocs, setStoryDocs] = useState([]);
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

          const fetched = [];
          userStoriesSnapshot.forEach((doc) => {
            // Each doc has { content, day, timestamp } (single day)
            fetched.push({ id: doc.id, ...doc.data() });
          });

          setStoryDocs(fetched);
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

  // If your docs store the date in docItem.timestamp,
  // you can parse it here if it's a string or a Firestore Timestamp.
  const formatTimestamp = (ts) => {
    if (!ts) return 'Unknown date';

    // If it's a Firestore Timestamp:
    if (ts.toDate) {
      return ts.toDate().toLocaleString();
    }

    // If it's a normal string or Date:
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return String(ts); // fallback
    }
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

        {storyDocs.length > 0 ? (
          storyDocs.map((docItem) => {
            // docItem = { id, content, day, timestamp }

            // 1) We'll artificially create an array "stories"
            const storiesArray = [
              {
                day: docItem.day,
                content: docItem.content
              }
            ];

            // 2) We'll display a snippet from docItem.content
            const snippet = docItem.content
              ? docItem.content.substring(0, 100)
              : '';

            return (
              <Card key={docItem.id} variant="outlined" style={{ marginBottom: '16px' }}>
                <CardActionArea
                  onClick={() =>
                    navigate('/generated-story', {
                      state: {
                        // Pass the artificially created array:
                        stories: storiesArray,
                        // Optional: pass the timestamp if you need it
                        timestamp: docItem.timestamp
                      }
                    })
                  }
                >
                  <CardContent>
                    {/* Show date */}
                    <Typography variant="subtitle2" color="textSecondary">
                      Generated on: {formatTimestamp(docItem.timestamp)}
                    </Typography>

                    {/* If we only have 1 day, we can say "This story contains 1 day." */}
                    <Typography variant="body1" style={{ marginTop: 8 }}>
                      This story contains 1 day.
                    </Typography>

                    {/* snippet from single day content */}
                    {snippet && (
                      <Typography variant="body2" style={{ marginTop: 8 }}>
                        {snippet}
                        {docItem.content.length > 100 && '...'}
                      </Typography>
                    )}
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
