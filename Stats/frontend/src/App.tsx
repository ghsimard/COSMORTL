import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import { ThemeProvider, createTheme, Container } from '@mui/material';
import { Dashboard } from './components/Dashboard';
import { FrequencyChart } from './components/FrequencyChart';
import { MonitoringSurvey } from './components/MonitoringSurvey';
import { Navigation } from './components/Navigation';
import { config } from './config';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

export const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <Router basename={process.env.NODE_ENV === 'production' ? '/' : undefined}>
        <Navigation />
        <Container maxWidth="lg">
          <Switch>
            <Route exact path="/" component={Dashboard} />
            <Route path="/frequency" component={FrequencyChart} />
            <Route path="/monitoring" component={MonitoringSurvey} />
            <Redirect to="/" />
          </Switch>
        </Container>
      </Router>
    </ThemeProvider>
  );
};
