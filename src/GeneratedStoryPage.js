// GeneratedStoryPage.jsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Container, Typography, Box } from '@mui/material';

function GeneratedStoryPage() {
  const location = useLocation();
  // The final generated data from VoiceOptionsPage
  const { stories, imageUrl } = location.state || {};

  if (!stories || stories.length === 0) {
    return (
      <Container maxWidth="md" sx={{ marginTop: '50px' }}>
        <Typography variant="h5">No story available.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ marginTop: '50px' }}>
      <Box>
        {/* Display optional DALL·E image if present */}
        {imageUrl && (
          <Box mb={3} textAlign="center">
            <img
              src={imageUrl}
              alt="Generated illustration"
              style={{ maxWidth: '100%', borderRadius: 8 }}
            />
          </Box>
        )}

        <Typography variant="h4" gutterBottom>
          Your Generated Story
        </Typography>

        {/* Display each day */}
        {stories.map((storyItem) => (
          <Box key={storyItem.day} mb={4} p={2} sx={{ backgroundColor: '#f5f5f5' }}>
            <Typography variant="h6">Day {storyItem.day}</Typography>
            <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
              {storyItem.content}
            </Typography>
          </Box>
        ))}
      </Box>
    </Container>
  );
}

export default GeneratedStoryPage;
