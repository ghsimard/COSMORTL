import React, { useState } from 'react';
import ChartGenerator from './ChartGenerator';
import { Box } from '@mui/material';
import FileUploader from './FileUploader';
import { FileData } from '../types';

type GradesCount = {
  '1°': number;
  '2°': number;
  '3°': number;
  '4°': number;
  '5°': number;
};

const gradeNames = {
  '1°': 'Preescolar',
  '2°': 'Primaria',
  '3°': 'Secundaria',
  '4°': 'Media',
  '5°': 'Ciclo Complementario'
};

const DonutChartDemo: React.FC = () => {
  const [gradesCount, setGradesCount] = useState<GradesCount>({
    '1°': 0,
    '2°': 0,
    '3°': 0,
    '4°': 0,
    '5°': 0
  });

  const handleTeachersData = (fileData: FileData) => {
    console.log('Received file data:', fileData);
    
    const newGradesCount: GradesCount = {
      '1°': 0,
      '2°': 0,
      '3°': 0,
      '4°': 0,
      '5°': 0
    };

    fileData.data.forEach((row: any, index: number) => {
      const gradesColumn = row['¿En qué grados tiene asignación de actividades de docencia en este colegio? (múltiple respuesta)'];
      console.log(`Row ${index + 1} - Raw grades data:`, gradesColumn);
      
      if (typeof gradesColumn === 'string') {
        // Split by semicolon and process each grade
        const grades = gradesColumn.split(';').filter(Boolean);
        console.log(`Row ${index + 1} - Parsed grades:`, grades);
        
        grades.forEach(grade => {
          const cleanGrade = grade.trim();
          console.log(`Processing grade: "${cleanGrade}"`);
          
          // The grade already includes the ° symbol
          if (cleanGrade in newGradesCount) {
            console.log(`Incrementing count for ${cleanGrade}`);
            newGradesCount[cleanGrade as keyof GradesCount]++;
          } else {
            console.log(`Invalid grade: ${cleanGrade}`);
          }
        });
      } else {
        console.log(`Row ${index + 1} - Invalid grades data type:`, typeof gradesColumn);
      }
    });

    console.log('Final grades count:', newGradesCount);
    setGradesCount(newGradesCount);
  };

  const chartData = Object.entries(gradesCount)
    .filter(([_, count]) => count > 0) // Only include counts > 0
    .map(([grade, count]) => ({
      name: gradeNames[grade as keyof typeof gradeNames] || grade,
      value: count
    }));

  console.log('Chart data:', chartData);
  const total = Object.values(gradesCount).reduce((acc, curr) => acc + curr, 0);
  console.log('Total count:', total);

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Box sx={{ mb: 4 }}>
        <FileUploader 
          onDataLoaded={handleTeachersData}
          label="Cargar datos de docentes"
        />
      </Box>

      {total > 0 && (
        <Box sx={{ mb: 4 }}>
          <ChartGenerator
            data={chartData}
            title="Distribución de Docentes por Grado"
            type="horizontal-bar"
          />
        </Box>
      )}
    </Box>
  );
};

export default DonutChartDemo; 