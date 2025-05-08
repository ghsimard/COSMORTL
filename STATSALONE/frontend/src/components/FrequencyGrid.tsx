import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FrequencyData, GridItem, FrequencyResult } from '../types';
import Spinner from './Spinner';
import { config } from '../config';

interface FrequencyGridProps {
  className?: string;
}

const FrequencyGrid: React.FC<FrequencyGridProps> = ({ className }) => {
  const [data, setData] = useState<FrequencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${config.api.baseUrl}/api/frequency-ratings`);
        setData(response.data);
        setError(null);
      } catch (err) {
        setError('Error fetching data. Please try again later.');
        console.error('Error fetching frequency ratings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const renderFrequencyCell = (result: FrequencyResult) => {
    if (result.S === -1) {
      return <td className="text-center p-2">N/A</td>;
    }
    return (
      <td className="p-2">
        <div className="flex flex-col items-center justify-center space-y-1">
          <div className="text-sm font-semibold">S: {result.S}%</div>
          <div className="text-sm font-semibold">A: {result.A}%</div>
          <div className="text-sm font-semibold">N: {result.N}%</div>
        </div>
      </td>
    );
  };

  const renderGridItem = (item: GridItem) => (
    <tr key={item.displayText} className="border-b border-gray-200">
      <td className="p-2 max-w-md">{item.displayText}</td>
      {renderFrequencyCell(item.results.docentes)}
      {renderFrequencyCell(item.results.estudiantes)}
      {renderFrequencyCell(item.results.acudientes)}
    </tr>
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      {data.map((section) => (
        <div key={section.title} className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{section.title}</h2>
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Pregunta</th>
                <th className="p-2 text-center">Docentes</th>
                <th className="p-2 text-center">Estudiantes</th>
                <th className="p-2 text-center">Acudientes</th>
              </tr>
            </thead>
            <tbody>
              {section.questions.map(renderGridItem)}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default FrequencyGrid; 