import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';  // or wherever your AuthContext is
import { db } from './firebase';         // Firestore instance
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
  const [mergedStories, setMergedStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserStories = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userStoryCollection = collection(
          db,
          'users',
          currentUser.uid,
          'generatedStories'
        );
        const userStoriesSnapshot = await getDocs(userStoryCollection);

        /**
         * We'll store docs in a dictionary keyed by storyId:
         *
         * grouped[storyId] = {
         *   storyId: string,
         *   days: [ { day, content, timestamp }, ... ],
         *   maxTimestamp: <the latest timestamp among those days>
         * }
         */
        const grouped = {};

        userStoriesSnapshot.forEach((doc) => {
          // Each doc might have { storyId, day, content, timestamp }
          const data = doc.data();
          const { storyId, day, content, timestamp } = data;

          if (!storyId) {
            // If no storyId, skip or handle differently
            return;
          }

          // If we haven't seen this storyId yet, create a new entry
          if (!grouped[storyId]) {
            grouped[storyId] = {
              storyId,
              days: [],
              maxTimestamp: null
            };
          }

          // Add this doc's day to the days array
          grouped[storyId].days.push({ day, content, timestamp });

          // Update maxTimestamp if needed
          const currentTs = getTimeValue(timestamp);
          const existingMax = getTimeValue(grouped[storyId].maxTimestamp);
          if (currentTs > existingMax) {
            grouped[storyId].maxTimestamp = timestamp;
          }
        });

        // Convert the grouped object into an array
        let merged = Object.values(grouped); 
        // merged is now [ { storyId, days: [...], maxTimestamp }, ... ]

        // Sort the days within each story by ascending day
        merged.forEach((story) => {
          story.days.sort((a, b) => a.day - b.day);
        });

        // Sort stories so the newest is at the top (descending by maxTimestamp)
        merged.sort((a, b) => {
          const aTime = getTimeValue(a.maxTimestamp);
          const bTime = getTimeValue(b.maxTimestamp);
          return bTime - aTime;
        });

        setMergedStories(merged);
      } catch (err) {
        console.error('Error fetching stories:', err);
        setError('Error fetching user stories.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserStories();
  }, [currentUser]);

  /**
   * Helper: convert Firestore Timestamp / Date / string -> number (ms since epoch)
   */
  const getTimeValue = (ts) => {
    if (!ts) return 0;
    // If Firestore Timestamp:
    if (ts.toMillis) {
      return ts.toMillis();
    }
    // If string or Date:
    return new Date(ts).getTime();
  };

  /**
   * Helper: format timestamp for display
   */
  const formatTimestamp = (ts) => {
    if (!ts) return 'Unknown date';
    // If Firestore Timestamp
    if (ts.toDate) {
      return ts.toDate().toLocaleString();
    }
    // else if string or Date
    return new Date(ts).toLocaleString();
  };

  /**
   * ============== NEW: Delete story (all docs) by storyId ============= 
   */
  const handleDeleteStory = async (storyIdToDelete) => {
    if (!currentUser) return;

    try {
      // 1) Query all docs with that storyId
      const storyRef = collection(db, 'users', currentUser.uid, 'generatedStories');
      const qStories = query(storyRef, where('storyId', '==', storyIdToDelete));
      const snapshots = await getDocs(qStories);

      // 2) Delete each doc
      for (const docSnap of snapshots.docs) {
        await deleteDoc(docSnap.ref);
      }

      // 3) Remove from local state
      setMergedStories((prev) => prev.filter((s) => s.storyId !== storyIdToDelete));
    } catch (err) {
      console.error('Error deleting story:', err);
      setError('Failed to delete the story. Please try again.');
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

        {mergedStories.length > 0 ? (
          mergedStories.map((story) => {
            // story = { storyId, days: [ { day, content, timestamp }, ... ], maxTimestamp }
            const dayCount = story.days.length;
            const firstDay = story.days[0];
            // Snippet of the first day's content
            const snippet = firstDay.content
              ? firstDay.content.substring(0, 100)
              : '';

            return (
              <Card
                key={story.storyId}
                variant="outlined"
                style={{ marginBottom: '16px' }}
              >
                {/* 
                  CardActionArea is clickable to view the story.
                  We'll add CardActions below for the Delete button.
                */}
                <CardActionArea
                  onClick={() =>
                    navigate('/generated-story', {
                      state: {
                        // Pass the array of days to the GeneratedStoryPage
                        stories: story.days
                      },
                    })
                  }
                >
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">
                      {/* Show the newest date across all days */}
                      Generated on: {formatTimestamp(story.maxTimestamp)}
                    </Typography>
                    <Typography variant="body1" style={{ marginTop: 8 }}>
                      {/* e.g. "This story contains 4 days." */}
                      This story contains {dayCount} day
                      {dayCount > 1 ? 's' : ''}.
                    </Typography>
                    {snippet && (
                      <Typography variant="body2" style={{ marginTop: 8 }}>
                        {snippet}
                        {firstDay.content.length > 100 && '...'}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>

                {/* New: CardActions with Delete button */}
                <CardActions>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the CardActionArea
                      handleDeleteStory(story.storyId);
                    }}
                  >
                    Delete
                  </Button>
                </CardActions>
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