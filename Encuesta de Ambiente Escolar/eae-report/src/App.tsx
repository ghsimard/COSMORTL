import React from 'react';
import { CssBaseline, ThemeProvider, createTheme, Container } from '@mui/material';
import DonutChartDemo from './components/DonutChartDemo';

const theme = createTheme();

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <DonutChartDemo />
      </Container>
    </ThemeProvider>
  );
}

export default App;
