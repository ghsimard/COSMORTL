import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Button,
  Grid
} from '@mui/material';
import { getFrequencyRatings } from '../services/databaseService';
import { FrequencyData } from '../types';
import Spinner from './Spinner';
import './FrequencyChart.css';
import DownloadIcon from '@mui/icons-material/Download';
import { config } from '../config';
import { GradesPieChart } from './GradesPieChart';

export const FrequencyChart: React.FC = () => {
  const [data, setData] = useState<FrequencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<string[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('');

  // Fetch available schools
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await fetch(`${config.api.baseUrl}/api/monitoring`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const text = await response.text();
          if (text.toLowerCase().includes('<!doctype')) {
            throw new Error('El servidor no está respondiendo correctamente. Por favor, verifica que el servidor esté en ejecución.');
          }
          throw new Error(`Error al cargar las escuelas: ${response.status} ${response.statusText}`);
        }
        
        // Add type definition for the response data
        interface SchoolData {
          schoolName: string;
          [key: string]: any; // Allow other properties
        }
        
        const data = await response.json() as SchoolData[];
        const schoolNames = data.map(school => school.schoolName);
        
        // Remove duplicate school names
        const uniqueSchools = Array.from(new Set(schoolNames));
        console.log(`Removed ${schoolNames.length - uniqueSchools.length} duplicate school names`);
        
        setSchools(uniqueSchools);
      } catch (err) {
        console.error('Error fetching schools:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar las escuelas');
      }
    };

    fetchSchools();
  }, []);

  // Fetch frequency data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const frequencyData = await getFrequencyRatings(selectedSchool);
        console.log('Received data:', frequencyData);
        
        // Validate that frequencyData is an array
        if (!frequencyData) {
          console.error('No data received from server');
          setError('No se recibieron datos del servidor');
          setData([]);
          return;
        }
        
        if (!Array.isArray(frequencyData)) {
          console.error('Expected array but received:', typeof frequencyData);
          setError('Formato de datos inválido recibido del servidor');
          setData([]);
          return;
        }
        
        if (frequencyData.length === 0) {
          console.log('Received empty array from server');
          setData([]);
          return;
        }
        
        // Validate each item in the array
        const isValidData = frequencyData.every(item => 
          item && 
          typeof item === 'object' && 
          'title' in item && 
          'questions' in item &&
          Array.isArray(item.questions)
        );
        
        if (!isValidData) {
          console.error('Invalid data structure received:', frequencyData);
          setError('Estructura de datos inválida recibida del servidor');
          setData([]);
          return;
        }
        
        setData(frequencyData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar los datos de frecuencia');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSchool]);

  const handleSchoolChange = (event: SelectChangeEvent) => {
    setSelectedSchool(event.target.value);
  };

  const handleDownloadPDF = async () => {
    try {
      console.log('Starting PDF download process');
      const apiUrl = `${config.api.baseUrl}/api/generate-pdf${selectedSchool ? `?school=${encodeURIComponent(selectedSchool)}` : ''}`;
      console.log('API URL:', apiUrl);
      
      console.log('Sending fetch request...');
      const response = await fetch(apiUrl);
      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers).reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {} as Record<string, string>),
        ok: response.ok
      });
      
      if (!response.ok) throw new Error(`Error generating PDF: ${response.status} ${response.statusText}`);
      
      // Create a blob from the response
      console.log('Creating blob from response...');
      const blob = await response.blob();
      console.log('Blob created:', {
        size: blob.size,
        type: blob.type
      });
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      console.log('URL created:', url);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.download = `frequency-report${selectedSchool ? `-${selectedSchool}` : ''}.pdf`;
      console.log('Link created with attributes:', {
        href: link.href,
        download: link.download
      });
      
      // Append the link to the document, click it, and remove it
      console.log('Triggering download...');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      window.URL.revokeObjectURL(url);
      console.log('Download process completed');
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Error downloading PDF');
    }
  };

  // Add a function to handle generating all PDFs
  const handleGenerateAllPDFs = async () => {
    try {
      setLoading(true);
      console.log('Starting all PDFs generation process');
      const apiUrl = `${config.api.baseUrl}/api/generate-all-pdfs`;
      console.log('API URL:', apiUrl);
      
      console.log('Sending fetch request...');
      const response = await fetch(apiUrl);
      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers).reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {} as Record<string, string>),
        ok: response.ok
      });
      
      if (!response.ok) throw new Error(`Error generating PDFs: ${response.status} ${response.statusText}`);
      
      // Create a blob from the response
      console.log('Creating blob from response...');
      const blob = await response.blob();
      console.log('Blob created:', {
        size: blob.size,
        type: blob.type
      });
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      console.log('URL created:', url);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.download = 'all-frequency-reports.zip';
      console.log('Link created with attributes:', {
        href: link.href,
        download: link.download
      });
      
      // Append the link to the document, click it, and remove it
      console.log('Triggering download...');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      window.URL.revokeObjectURL(url);
      console.log('Download process completed');
      setLoading(false);
    } catch (err) {
      console.error('Error downloading all PDFs:', err);
      setError('Error al generar todos los PDFs');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spinner />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  const ratings = ['S', 'A', 'N'] as const;
  type Rating = typeof ratings[number];
  
  const ratingLabels: Record<Rating, string> = {
    S: 'S',
    A: 'A',
    N: 'N'
  };

  const headerGroups = ['Docentes', 'Estudiantes', 'Acudientes'];

  const renderFrequencyValue = (value: number | null | undefined | string) => {
    if (value === null || value === undefined || value === "NA") {
      return '';
    }
    if (value === -1) {
      return 'Sin datos';
    }
    return `${value}%`;
  };

  const getCellStyle = (value: number | null | undefined | string, rating: string, isLastInGroup: boolean) => {
    const numValue = typeof value === 'number' ? value : parseInt(value as string);
    const shouldEmphasize = rating === 'S' && !isNaN(numValue) && numValue < 50 && numValue !== -1;
    const isNA = value === "NA" || value === null || value === undefined;
    const isNoData = value === -1;

    return {
      borderRight: isLastInGroup ? '2px solid #e0e0e0' : 'none',
      padding: '4px 8px',
      color: shouldEmphasize ? '#ffffff' : '#000000',
      ...(shouldEmphasize && {
        backgroundColor: '#000000',
        fontWeight: 'bold'
      }),
      ...(isNA && {
        backgroundImage: 'repeating-linear-gradient(45deg, #ffffff, #ffffff 8px, #f0f0f0 8px, #f0f0f0 16px)',
        color: '#666666',
        fontStyle: 'italic'
      }),
      ...(isNoData && {
        backgroundColor: '#f5f5f5',
        color: '#666666',
        fontStyle: 'italic'
      })
    };
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Distribución de Frecuencias
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleDownloadPDF}
            disabled={loading}
            startIcon={<DownloadIcon />}
          >
            Descargar PDF
          </Button>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={handleGenerateAllPDFs}
            disabled={loading}
            startIcon={<DownloadIcon />}
          >
            Generar todos los PDFs
          </Button>
        </Box>
      </Box>
      <FormControl fullWidth>
        <InputLabel id="school-label">Escuela</InputLabel>
        <Select
          labelId="school-label"
          id="school"
          value={selectedSchool}
          label="Escuela"
          onChange={handleSchoolChange}
        >
          {schools.map((school, index) => (
            <MenuItem key={`school-${index}`} value={school}>
              {school}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedSchool && (
        <Grid container spacing={3} sx={{ mt: 2, mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <GradesPieChart school={selectedSchool} type="docentes" />
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <GradesPieChart school={selectedSchool} type="estudiantes" />
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <GradesPieChart school={selectedSchool} type="acudientes" />
            </Paper>
          </Grid>
        </Grid>
      )}

      {Array.isArray(data) && data.map((section, sectionIndex) => (
        <Box key={sectionIndex} sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 2 }}>
            {section.title}
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ 
                      fontWeight: 'bold', 
                      width: '40%', 
                      borderRight: '2px solid #e0e0e0',
                      padding: '8px',
                      textAlign: 'center'
                    }}
                  >
                    Item de la encuesta
                  </TableCell>
                  {headerGroups.map((group, index) => (
                    <TableCell 
                      key={group}
                      align="center" 
                      colSpan={3} 
                      sx={{ 
                        fontWeight: 'bold', 
                        width: '20%',
                        borderRight: index < headerGroups.length - 1 ? '2px solid #e0e0e0' : 'none',
                        backgroundColor: '#f5f5f5',
                        padding: '8px'
                      }}
                    >
                      {group}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell sx={{ borderRight: '2px solid #e0e0e0', padding: '8px' }} />
                  {headerGroups.map((group, groupIndex) => (
                    <React.Fragment key={group}>
                      {ratings.map((rating, ratingIndex) => (
                        <TableCell 
                          key={`${group}-${rating}`} 
                          align="center" 
                          sx={{ 
                            fontWeight: 'bold',
                            borderRight: ratingIndex === 2 && groupIndex < headerGroups.length - 1 ? '2px solid #e0e0e0' : 'none',
                            padding: '8px'
                          }}
                        >
                          {ratingLabels[rating]}
                        </TableCell>
                      ))}
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {section.questions?.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell 
                      component="th" 
                      scope="row"
                      sx={{ 
                        borderRight: '2px solid #e0e0e0',
                        padding: '8px'
                      }}
                    >
                      {item.displayText}
                    </TableCell>
                    {/* Docentes */}
                    {ratings.map((rating, i) => {
                      const value = item.results?.docentes?.[rating];
                      return (
                        <TableCell 
                          key={`docentes-${rating}`} 
                          align="center"
                          sx={getCellStyle(value, rating, i === 2)}
                        >
                          {renderFrequencyValue(value)}
                        </TableCell>
                      );
                    })}
                    {/* Estudiantes */}
                    {ratings.map((rating, i) => {
                      const value = item.results?.estudiantes?.[rating];
                      return (
                        <TableCell 
                          key={`estudiantes-${rating}`} 
                          align="center"
                          sx={getCellStyle(value, rating, i === 2)}
                        >
                          {renderFrequencyValue(value)}
                        </TableCell>
                      );
                    })}
                    {/* Acudientes */}
                    {ratings.map((rating, i) => {
                      const value = item.results?.acudientes?.[rating];
                      return (
                        <TableCell 
                          key={`acudientes-${rating}`} 
                          align="center"
                          sx={getCellStyle(value, rating, i === 2)}
                        >
                          {renderFrequencyValue(value)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Container>
  );
};