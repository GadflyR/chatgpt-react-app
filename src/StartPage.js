import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography, Container, Box } from '@mui/material';
import { styled } from '@mui/system';
import BackgroundImage from './assets/background.jpg';
import './App.css';

const BackgroundBox = styled(Box)(() => ({
  backgroundImage: `url(${BackgroundImage})`,
}));

const StartPage = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/story');
  };

  return (
    <BackgroundBox className='Background'>
      <Container maxWidth="sm">
        <div className='Title'>
          Customize Your Own Series!
        </div>
        <Typography variant="h5" component="p" gutterBottom>
          iBot Story Generator
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleClick}
          size="large"
          className="Button"
        >
          Start Personalized Story Creating
        </Button>
      </Container>
    </BackgroundBox>
  );
};

export default StartPage;
