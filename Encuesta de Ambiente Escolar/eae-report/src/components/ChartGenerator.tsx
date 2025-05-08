import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { Box, Typography } from '@mui/material';
import { ChartData } from '../types';

interface ChartGeneratorProps {
  data: ChartData[];
  title: string;
  type?: 'horizontal-bar' | 'bar';
}

const ChartGenerator: React.FC<ChartGeneratorProps> = ({ data, title, type = 'bar' }) => {
  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Add percentage to each data point
  const dataWithPercentage = data.map(item => ({
    name: item.name,
    value: item.value,
    percentage: ((item.value / total) * 100).toFixed(1)
  }));

  const renderCustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    const itemPercentage = ((value / total) * 100).toFixed(1);
    return (
      <text 
        x={x + width - 10} 
        y={y} 
        dy={14} 
        textAnchor="end" 
        fill="#ffffff"
        fontSize="11px"
        fontWeight="bold"
      >
        {`${value} (${itemPercentage}%)`}
      </text>
    );
  };

  if (type === 'horizontal-bar') {
    return (
      <Box sx={{ width: '100%', height: 250, my: 4, maxWidth: '1600px', mx: 'auto' }}>
        <Typography variant="h6" align="center" gutterBottom>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={dataWithPercentage}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            barSize={20}
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis 
              type="category" 
              dataKey="name"
              width={100}
              tick={{ fontSize: 12 }}
              tickMargin={5}
            />
            <Bar 
              dataKey="value" 
              fill="#000000"
            >
              <LabelList 
                content={renderCustomLabel}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 400, my: 4 }}>
      <Typography variant="h6" align="center" gutterBottom>
        {title}
      </Typography>
      <ResponsiveContainer>
        <BarChart 
          data={dataWithPercentage}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#000000" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ChartGenerator; 