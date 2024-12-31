import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Typography, Container, Box } from '@mui/material';
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
    <BackgroundBox className='Background'>
      <Container maxWidth="sm">
        <div className='Title'>
          Customize Your Own Series!
        </div>
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
      <Box
        sx={{
          position: 'fixed',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          padding: 2,
        }}
      >
        <Link to="/history" style={{ textDecoration: 'none' }}>
          <Box
            sx={{
              width: '90px',
              height: '200px',
              borderRadius: '10px',
              backgroundColor: '#1e88e5',
              color: 'white',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.2)',
              textAlign: 'center',
              transition: 'transform 0.3s, background-color 0.3s',
            }}
            className="history-button"
          >
            History
          </Box>
        </Link>
      </Box>
    </BackgroundBox>
  );
};

export default StartPage;
