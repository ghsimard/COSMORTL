import React from 'react';
import { useHistory } from 'react-router-dom';
import { Button, Container, Typography, Box, Paper, Stack } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import AssessmentIcon from '@mui/icons-material/Assessment';

export const Dashboard: React.FC = () => {
  const history = useHistory();

  const handleNavigateToFrequency = () => {
    history.push('/frequency');
  };

  const handleNavigateToMonitoring = () => {
    history.push('/monitoring');
  };

  return (
    <div className="dashboard">
      <header className="bg-white shadow">
        <Container maxWidth="lg">
          <Box py={4} display="flex" alignItems="center" gap={2}>
            <img 
              src="/images/LogoCosmo.png"
              alt="Logo" 
              style={{ 
                height: '50px',
                width: 'auto'
              }} 
            />
            <Typography variant="h3" component="h1" gutterBottom sx={{ mb: 0 }}>
              Dashboard
            </Typography>
          </Box>
        </Container>
      </header>

      <Container maxWidth="lg">
        <Box py={4}>
          <Paper elevation={3}>
            <Box p={4}>
              <Typography variant="h5" gutterBottom>
                Bienvenido al Dashboard de COSMO
              </Typography>
              <Typography paragraph>
                Seleccione una de las siguientes opciones para visualizar los datos:
              </Typography>
              
              <Box mt={4}>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<BarChartIcon />}
                    onClick={handleNavigateToFrequency}
                  >
                    Distribución de Frecuencias
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    startIcon={<AssessmentIcon />}
                    onClick={handleNavigateToMonitoring}
                  >
                    Encuesta Monitoreo
                  </Button>
                </Stack>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>
    </div>
  );
}; 