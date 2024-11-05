import React from 'react';
import { Button, Container, Typography, Box } from '@mui/material';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from './firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  React.useEffect(() => {
    if (currentUser) {
      // If user is already logged in, redirect them
      navigate('/chat');
    }
  }, [currentUser, navigate]);
  
  const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();

    signInWithPopup(auth, provider)
      .then((result) => {
        console.log('User signed in:', result.user);
        // Redirect to the desired page after login
        navigate('/');
      })
      .catch((error) => {
        console.error('Error during sign-in:', error);
      });
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: '100px', textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        Sign in to ChatGPT App
      </Typography>
      <Button variant="contained" color="primary" onClick={handleGoogleSignIn}>
        Sign in with Google
      </Button>
    </Container>
  );
};

export default Login;