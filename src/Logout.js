import React from 'react';
import { Button } from '@mui/material';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { useNavigate } from 'react-router-dom';

const Logout = () => {
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        console.log('User signed out');
        // Optionally navigate to the home page
        navigate('/');
      })
      .catch((error) => {
        console.error('Error during sign-out:', error);
      });
  };

  return (
    <Button color="inherit" onClick={handleSignOut}>
      Logout
    </Button>
  );
};

export default Logout;