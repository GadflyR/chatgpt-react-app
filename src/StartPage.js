import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Container, Box } from '@mui/material';
import { styled } from '@mui/system';
import BackgroundImage from './assets/background.jpg';
import './App.css';

const BackgroundBox = styled(Box)(() => ({
  backgroundImage: `url(${BackgroundImage})`,
}));

const StartPage = () => {
  const navigate = useNavigate();

  const handleStartClick = () => {
    navigate('/story');
  };

  return (
    <BackgroundBox className="Background">
      <Container maxWidth="sm">
        <div className="Title">Customize Your Own Series!</div>
        <Button
          className="Button"
          variant="contained"
          onClick={handleStartClick}
          size="large"
        >
          Start Personalized Story Creating
        </Button>
      </Container>

      {/* History Button */}
      {/* Remove inline styling; just give it an id or class that we'll style via CSS */}
      <Link to="/history" id="history">
        History
      </Link>
    </BackgroundBox>
  );
};

export default StartPage;
