import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  CategoryScale,
  LinearScale,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Box, Typography } from '@mui/material';
import { config } from '../config';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  Title,
  CategoryScale,
  LinearScale
);

interface GradesPieChartProps {
  school: string;
  type?: 'docentes' | 'estudiantes' | 'acudientes';
}

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface ApiResponse {
  school: string;
  data: PieChartData[];
  debug: {
    rawData: any[];
  };
}

export const GradesPieChart: React.FC<GradesPieChartProps> = ({ school, type = 'docentes' }) => {
  const [data, setData] = useState<PieChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Use the correct endpoint for each type
        const endpoint = type === 'estudiantes' ? 'estudiantes-grades' : 'test-grades';
        console.log('Fetching data from endpoint:', endpoint, 'for school:', school, 'type:', type);
        
        const response = await fetch(
          `${config.api.baseUrl}/api/${endpoint}?school=${encodeURIComponent(school)}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }

        const result: ApiResponse = await response.json();
        console.log('Raw API response:', JSON.stringify(result, null, 2));
        
        // Ensure each item has a color and log the color assignment
        const processedData = result.data.map(item => {
          const color = item.color || '#000000';
          console.log(`Processing item:`, {
            label: item.label,
            value: item.value,
            originalColor: item.color,
            finalColor: color
          });
          return {
            ...item,
            color
          };
        });
        
        console.log('Processed data with colors:', JSON.stringify(processedData, null, 2));
        setData(processedData);
      } catch (err) {
        console.error('Error fetching pie chart data:', err);
        setError(err instanceof Error ? err.message : 'Error loading data');
      } finally {
        setLoading(false);
      }
    };

    if (school) {
      fetchData();
    }
  }, [school, type]);

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (!data || data.length === 0) {
    return <Typography>No data available</Typography>;
  }

  console.log('Rendering chart with data:', JSON.stringify(data, null, 2));

  const chartData = {
    labels: data.map(item => item.label),
    datasets: [
      {
        data: data.map(item => item.value),
        backgroundColor: data.map(item => {
          const color = item.color || '#000000';
          console.log(`Setting color for ${item.label}:`, {
            label: item.label,
            value: item.value,
            color: color
          });
          return color;
        }),
        borderColor: Array(data.length).fill('#ffffff'),
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  console.log('Final chart data:', JSON.stringify(chartData, null, 2));

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            size: 12
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw as number;
            const total = (context.chart.data.datasets[0].data as number[]).reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${percentage}%`;
          }
        }
      }
    }
  };

  return (
    <Box>
      <Typography variant="h6" align="center" gutterBottom>
        ¿En qué grados tiene clases?
      </Typography>
      <Box sx={{ 
        maxWidth: 400, 
        margin: '0 auto', 
        height: 400,
        position: 'relative' 
      }}>
        <Pie data={chartData} options={options} />
      </Box>
    </Box>
  );
}; 