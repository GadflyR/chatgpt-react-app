// src/App.js

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, IconButton } from '@mui/material';
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
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>}/>
          <Route path="/story" element={<PrivateRoute><StoryPage /></PrivateRoute>}/>
          <Route path="/voice-options" element={<PrivateRoute><VoiceOptionsPage /></PrivateRoute>} />
          <Route path="/generated-story" element={<PrivateRoute><GeneratedStoryPage /></PrivateRoute>}/>
          <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>}/>
          <Route path="/login" element={<Login />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
