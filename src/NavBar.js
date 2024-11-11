// src/NavBar.js

import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Logout from './Logout';
import '../App.css';

function NavBar({ children }) {
  const { currentUser } = useAuth();

  return (
    <AppBar position="static" className="NavBar">
      <Toolbar>
        <Typography variant="h6" style={{ flexGrow: 1 }}>
          iBot Story Generator
        </Typography>
        <Button color="inherit" component={Link} to="/">
          Home
        </Button>
        {currentUser && (
          <>
            <Button color="inherit" component={Link} to="/chat">
              Chat
            </Button>
            <Button color="inherit" component={Link} to="/story">
              Story
            </Button>
            <Button color="inherit" component={Link} to="/history">
              History
            </Button>
          </>
        )}
        {children}
        {currentUser ? (
          <>
            <Typography variant="subtitle1" style={{ marginRight: '16px' }}>
              {currentUser.displayName}
            </Typography>
            <Logout />
          </>
        ) : (
          <Button color="inherit" component={Link} to="/login">
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;
