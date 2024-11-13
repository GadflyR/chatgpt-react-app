import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography, Container, Box } from '@mui/material';
import { styled } from '@mui/system';
import BackgroundImage from './assets/background.jpg';
import './App.css';

const BackgroundBox = styled(Box)(({ theme }) => ({
  backgroundImage: `url(${BackgroundImage})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  height: '100vh', // Ensures full viewport height
  width: '100vw', // Ensures full viewport width
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.common.white,
  textAlign: 'center',
  padding: theme.spacing(2),
  position: 'absolute',
  top: '0',
}));

const StartPage = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/story');
  };

  return (
    <BackgroundBox>
      <Container maxWidth="sm">
        <Typography variant="h2" component="h1" gutterBottom className='Title'>
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
          className="NavBar"
        >
          Start Personalized Story Creating
        </Button>
      </Container>
    </BackgroundBox>
  );
};

export default StartPage;
