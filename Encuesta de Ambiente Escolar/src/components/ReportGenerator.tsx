import React, { useState } from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import FileUploader from './FileUploader';
import ChartGenerator from './ChartGenerator';
import { ExcelData, FileData, ChartData } from '../types';

const ReportGenerator: React.FC = () => {
  const [data, setData] = useState<ExcelData>({
    teachers: [],
    parents: [],
    students: []
  });

  const handleTeachersData = (fileData: FileData) => {
    setData(prev => ({ ...prev, teachers: fileData.data }));
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
    // Here we'll implement the PDF generation logic
    console.log('Generating report with data:', data);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          EAE Report Generator
        </Typography>
        
        <FileUploader
          label="Upload Teachers Data"
          onDataLoaded={handleTeachersData}
        />
        <FileUploader
          label="Upload Parents Data"
          onDataLoaded={handleParentsData}
        />
        <FileUploader
          label="Upload Students Data"
          onDataLoaded={handleStudentsData}
        />

        {data.teachers.length > 0 && (
          <ChartGenerator
            data={transformDataForChart(data.teachers)}
            title="Teachers Data Analysis"
          />
        )}
        {data.parents.length > 0 && (
          <ChartGenerator
            data={transformDataForChart(data.parents)}
            title="Parents Data Analysis"
          />
        )}
        {data.students.length > 0 && (
          <ChartGenerator
            data={transformDataForChart(data.students)}
            title="Students Data Analysis"
          />
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={generateReport}
          disabled={!data.teachers.length || !data.parents.length || !data.students.length}
          sx={{ mt: 4, display: 'block', mx: 'auto' }}
        >
          Generate Report
        </Button>
      </Box>
    </Container>
  );
};

export default ReportGenerator; 