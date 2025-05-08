import React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import ReportGenerator from './components/ReportGenerator';

const theme = createTheme();

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ReportGenerator />
    </ThemeProvider>
  );
}

export default App; 