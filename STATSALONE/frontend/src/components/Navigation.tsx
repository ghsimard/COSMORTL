import React from 'react';
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  Container
} from '@mui/material';
import { useHistory, useLocation } from 'react-router-dom';

export const Navigation: React.FC = () => {
  const history = useHistory();
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/frequency', label: 'Distribución de Frecuencias' },
    { path: '/monitoring', label: 'Monitoreo' }
  ];

  return (
    <AppBar 
      position="static" 
      sx={{ 
        mb: 3,
        bgcolor: 'white',
        boxShadow: 'none',
        borderBottom: '1px solid #e0e0e0'
      }}
    >
      <Toolbar disableGutters sx={{ px: 0 }}>
        <img 
          src="/images/LogoCosmo.png" 
          alt="COSMO Logo" 
          style={{ 
            height: '40px',
            marginLeft: '25px',
            marginRight: '24px'
          }} 
        />
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', gap: 2 }}>
            {menuItems.map((item) => (
              <Button
                key={item.path}
                onClick={() => history.push(item.path)}
                sx={{
                  textTransform: 'none',
                  color: '#1B3C6C',
                  fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                  borderBottom: location.pathname === item.path ? '2px solid #1B3C6C' : 'none',
                  borderRadius: 0,
                  '&:hover': {
                    borderBottom: '2px solid rgba(27, 60, 108, 0.5)'
                  }
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Container>
      </Toolbar>
    </AppBar>
  );
}; 