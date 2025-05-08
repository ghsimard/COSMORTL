import React, { useState, useEffect } from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import FileUploader from './FileUploader';
import ChartGenerator from './ChartGenerator';
import { ExcelData, FileData, ChartData } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const transformTeachingGradesData = (data: any[]) => {
  console.log('Processing teaching grades data...'); // Debug log
  const gradesCount = {
    'Preescolar': 0,
    'Primaria': 0,
    'Secundaria': 0,
    'Media': 0
  };

  data.forEach((row: any) => {
    const gradesColumn = row['¿En qué grados tiene asignación de actividades de docencia en este colegio? (múltiple respuesta)'];
    console.log('Processing row:', gradesColumn); // Debug log
    
    if (typeof gradesColumn === 'string') {
      if (gradesColumn.includes('Preescolar')) gradesCount['Preescolar']++;
      if (gradesColumn.includes('Primaria')) gradesCount['Primaria']++;
      if (gradesColumn.includes('Secundaria')) gradesCount['Secundaria']++;
      if (gradesColumn.includes('Media')) gradesCount['Media']++;
    }
  });

  const total = Object.values(gradesCount).reduce((acc, curr) => acc + curr, 0);
  
  const result = Object.entries(gradesCount)
    .filter(([_, count]) => count > 0) // Only include grades with data
    .map(([name, count]) => ({
      name,
      value: total > 0 ? Math.round((count / total) * 100) : 0
    }));

  console.log('Transformed data:', result); // Debug log
  return result;
};

const ReportGenerator: React.FC = () => {
  const [data, setData] = useState<ExcelData>({
    teachers: [],
    parents: [],
    students: []
  });
  const [teachingGradesData, setTeachingGradesData] = useState<ChartData[]>([]);

  const handleTeachersData = (fileData: FileData) => {
    console.log('Received teachers data:', fileData); // Debug log
    setData(prev => ({ ...prev, teachers: fileData.data }));
    
    const gradesData = transformTeachingGradesData(fileData.data);
    setTeachingGradesData(gradesData);
  };

  const handleParentsData = (fileData: FileData) => {
    setData(prev => ({ ...prev, parents: fileData.data }));
  };

  const handleStudentsData = (fileData: FileData) => {
    setData(prev => ({ ...prev, students: fileData.data }));
  };

  const transformDataForChart = (data: any[]): ChartData[] => {
    // This transformation will need to be customized based on your Excel data structure
    return data.map(item => ({
      name: item.question || '',
      value: parseFloat(item.value) || 0
    }));
  };

  const generateReport = async () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const chartsContainer = document.getElementById('charts-container');
      
      if (chartsContainer) {
        // Add title
        doc.setFontSize(20);
        doc.text('Informe de Ambiente Escolar', 105, 15, { align: 'center' });
        
        // Add date
        doc.setFontSize(12);
        doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 20, 25);

        let currentY = 40; // Starting Y position for charts
        const margin = 20; // Left margin
        const pageWidth = doc.internal.pageSize.getWidth();
        const usableWidth = pageWidth - (2 * margin); // Available width for charts

        // Process each chart section individually
        const chartSections = Array.from(chartsContainer.children);
        for (const section of chartSections) {
          try {
            // Wait for chart animations to complete
            await new Promise(resolve => setTimeout(resolve, 500));

            // Convert section to canvas with better quality settings
            const canvas = await html2canvas(section as HTMLElement, {
              scale: 2, // Increase quality
              useCORS: true,
              logging: true,
              backgroundColor: '#ffffff',
              windowWidth: section.scrollWidth,
              windowHeight: section.scrollHeight
            });
            
            const imgData = canvas.toDataURL('image/png', 1.0);
            
            // Calculate dimensions while maintaining aspect ratio
            const aspectRatio = canvas.height / canvas.width;
            const imgWidth = usableWidth;
            const imgHeight = imgWidth * aspectRatio;

            // Check if we need to add a new page
            if (currentY + imgHeight > doc.internal.pageSize.getHeight() - margin) {
              doc.addPage();
              currentY = margin;
            }

            // Add section title if it exists
            const title = section.querySelector('h6');
            if (title) {
              doc.setFontSize(14);
              doc.text(title.textContent || '', margin, currentY);
              currentY += 10;
            }

            // Add the chart image
            doc.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 20; // Add spacing between charts
            
            console.log('Successfully added chart to PDF:', title?.textContent);
          } catch (sectionError) {
            console.error('Error processing chart section:', sectionError);
          }
        }

        // Save the PDF
        doc.save('Informe_Ambiente_Escolar.pdf');
      }
    } catch (error) {
      console.error('Error al generar el informe:', error);
      alert('Error al generar el informe. Por favor intente nuevamente.');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Generador de Informes EAE
        </Typography>
        
        <FileUploader onDataLoaded={handleTeachersData} label="Cargar datos de docentes" />
        <FileUploader onDataLoaded={handleParentsData} label="Cargar datos de padres" />
        <FileUploader onDataLoaded={handleStudentsData} label="Cargar datos de estudiantes" />

        <Box 
          id="charts-container" 
          sx={{ 
            my: 4,
            '& > div': {
              marginBottom: 4,
              padding: 2,
              backgroundColor: '#ffffff',
              borderRadius: 1,
              boxShadow: 1
            }
          }}
        >
          {teachingGradesData.length > 0 && (
            <Box>
              <ChartGenerator
                data={teachingGradesData}
                title="Distribución de Docentes por Grado"
                type="donut"
              />
            </Box>
          )}

          {data.teachers.length > 0 && (
            <Box>
              <ChartGenerator
                data={transformDataForChart(data.teachers)}
                title="Teachers Data Analysis"
              />
            </Box>
          )}
          {data.parents.length > 0 && (
            <Box>
              <ChartGenerator
                data={transformDataForChart(data.parents)}
                title="Parents Data Analysis"
              />
            </Box>
          )}
          {data.students.length > 0 && (
            <Box>
              <ChartGenerator
                data={transformDataForChart(data.students)}
                title="Students Data Analysis"
              />
            </Box>
          )}
        </Box>

        <Button
          variant="contained"
          color="primary"
          onClick={generateReport}
          disabled={!data.teachers.length || !data.parents.length || !data.students.length}
          sx={{ mt: 2 }}
        >
          Generar Informe
        </Button>
      </Box>
    </Container>
  );
};

export default ReportGenerator; 