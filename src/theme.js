import { createTheme } from '@mui/material/styles';

export const getTheme = (mode) =>
  createTheme({
    palette: {
      mode, // 'light' or 'dark'
      primary: {
        main: '#1a73e8',
      },
      secondary: {
        main: '#ff5252',
      },
    },
    typography: {
      fontFamily: 'Roboto, Arial, sans-serif',
    },
  });