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
  const [storiesList, setStoriesList] = useState([]);
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
            // Suppose each doc has: { createdAt, stories: [ { day, content }, ... ] }
            // Or something similar. Adjust as needed.
            fetchedStories.push({ id: doc.id, ...doc.data() });
          });

          // Sort by createdAt desc (latest first)
          // If createdAt is a Firestore timestamp, compare with toMillis()
          fetchedStories.sort((a, b) => {
            // If 'createdAt' is a Firestore Timestamp
            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
            return bTime - aTime; // descending
          });

          setStoriesList(fetchedStories);
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

        {/* Show each doc as one multi-day story */}
        {storiesList.length > 0 ? (
          storiesList.map((docItem) => {
            // docItem might look like { id, createdAt, stories: [ {day, content}, ... ] }
            // We'll show how many days it contains, plus a snippet from the first day.
            const { id, createdAt, stories = [] } = docItem;
            const dayCount = stories.length;

            // If we have at least one day:
            let snippet = '';
            if (dayCount > 0) {
              const firstDayContent = stories[0].content || '';
              snippet = firstDayContent.substring(0, 100);
            }

            return (
              <Card key={id} variant="outlined" style={{ marginBottom: '16px' }}>
                <CardActionArea
                  onClick={() =>
                    // Pass the entire array of days to the GeneratedStoryPage
                    navigate('/generated-story', {
                      state: {
                        stories,
                      },
                    })
                  }
                >
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">
                      {/* Show createdAt date */}
                      Generated on: {formatTimestamp(createdAt)}
                    </Typography>
                    <Typography variant="body1" style={{ marginTop: 8 }}>
                      {/* e.g. "This story contains 4 days" */}
                      This story contains {dayCount} day{dayCount !== 1 ? 's' : ''}.
                    </Typography>
                    {/* Show snippet of the first day's text */}
                    {dayCount > 0 && (
                      <Typography variant="body2" style={{ marginTop: 8 }}>
                        {snippet}
                        {stories[0].content?.length > 100 && '...'}
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
