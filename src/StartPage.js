import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography, Container, Box } from '@mui/material';

function StartPage() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/chat');
  };

  return (
    <Container maxWidth="sm">
      <Box textAlign="center" mt={10}>
        <Typography variant="h2" component="h1" gutterBottom>
          Welcome to ChatGPT App
        </Typography>
        <Typography variant="h5" component="p" gutterBottom>
          Your AI-powered chat companion
        </Typography>
        <Button variant="contained" color="primary" onClick={handleClick} size="large">
          Start Chatting
        </Button>
      </Box>
    </Container>
  );
}

export default StartPage;
