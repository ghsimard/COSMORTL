import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { read, utils } from 'xlsx';
import { FileData } from '../types';

interface FileUploaderProps {
  onDataLoaded: (data: FileData) => void;
  label: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onDataLoaded, label }) => {
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Reading file:', file.name);
      const data = await file.arrayBuffer();
      const workbook = read(data);
      console.log('Workbook sheets:', workbook.SheetNames);
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      console.log('Worksheet:', worksheet);
      
      const jsonData = utils.sheet_to_json(worksheet);
      console.log('Parsed JSON data:', jsonData);
      
      onDataLoaded({ fileName: file.name, data: jsonData });
    }
  };

  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="subtitle1">{label}</Typography>
      <Button
        variant="contained"
        component="label"
        sx={{ mt: 1 }}
      >
        Upload File
        <input
          type="file"
          hidden
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
        />
      </Button>
    </Box>
  );
};

export default FileUploader; 