import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography, Container, Box } from '@mui/material';
import { styled } from '@mui/system';
import BackgroundImage from './assets/background.jpg'; // Add a background image

const BackgroundBox = styled(Box)(({ theme }) => ({
  backgroundImage: `url(${BackgroundImage})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.common.white,
  textAlign: 'center',
  padding: theme.spacing(2),
}));

const StartPage = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/story');
  };

  return (
    <BackgroundBox>
      <Container maxWidth="sm">
        <Typography variant="h2" component="h1" gutterBottom>
          Customize Your Own Series!
        </Typography>
        <Typography variant="h5" component="p" gutterBottom>
          iBot Story Generator
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleClick}
          size="large"
        >
          Start Personalized Story Creating
        </Button>
      </Container>
    </BackgroundBox>
  );
};

export default StartPage;