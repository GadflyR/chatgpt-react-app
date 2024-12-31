import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider, CssBaseline, IconButton, Box } from '@mui/material';
import { getTheme } from './theme';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import StartPage from './StartPage';
import ChatPage from './ChatPage';
import StoryPage from './StoryPage';
import GeneratedStoryPage from './GeneratedStoryPage';
import Login from './Login';
import NavBar from './NavBar';
import PrivateRoute from './PrivateRoute';
import HistoryPage from './HistoryPage';

function App() {
  const [mode, setMode] = useState('light');
  const theme = getTheme(mode);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <NavBar>
          <IconButton color="inherit" onClick={toggleTheme}>
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </NavBar>
        <Box sx={{ display: 'flex', height: '100vh' }}>
          {/* Button for navigating to HistoryPage */}
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
          {/* Main App Content */}
          <Box sx={{ flexGrow: 1, marginLeft: '100px' }}>
            <Routes>
              <Route path="/" element={<StartPage />} />
              <Route
                path="/chat"
                element={
                  <PrivateRoute>
                    <ChatPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/story"
                element={
                  <PrivateRoute>
                    <StoryPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/generated-story"
                element={
                  <PrivateRoute>
                    <GeneratedStoryPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <PrivateRoute>
                    <HistoryPage />
                  </PrivateRoute>
                }
              />
              <Route path="/login" element={<Login />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
