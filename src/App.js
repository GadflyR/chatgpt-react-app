import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, IconButton, Button, Box } from '@mui/material';
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
import HistoryPage from './HistoryPage'; // Import HistoryPage

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
        <Box sx={{ display: 'flex' }}>
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
            <HistoryButton />
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

// History Button Component
function HistoryButton() {
  const navigate = useNavigate();

  return (
    <Button
      variant="contained"
      color="primary"
      sx={{
        width: '80px',
        height: '200px',
        borderRadius: '0 10px 10px 0',
        textTransform: 'none',
        fontSize: '18px',
      }}
      onClick={() => navigate('/history')}
    >
      History
    </Button>
  );
}

export default App;
