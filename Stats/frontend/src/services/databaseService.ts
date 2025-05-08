import axios from 'axios';
import { FrequencyData } from '../types';
import { config } from '../config';

export const getFrequencyRatings = async (school?: string): Promise<FrequencyData[]> => {
  try {
    const url = school 
      ? `/api/frequency-ratings?school=${encodeURIComponent(school)}`
      : `/api/frequency-ratings`;
    
    console.log('Fetching frequency ratings from:', url);
    
    // Add headers to ensure JSON response
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    // Check if response is HTML (indicating server error)
    if (typeof response.data === 'string' && response.data.trim().toLowerCase().startsWith('<!doctype')) {
      console.error('Received HTML instead of JSON. Server might be down or returning an error page.');
      throw new Error('Server returned HTML instead of JSON. Please check if the server is running.');
    }
    
    // Validate response data
    if (!response.data) {
      console.error('No data received from server');
      throw new Error('No data received from server');
    }
    
    if (!Array.isArray(response.data)) {
      console.error('Expected array but received:', typeof response.data);
      console.error('Response data:', response.data);
      throw new Error('Invalid data format received from server');
    }
    
    // Validate each item in the array
    const isValidData = response.data.every(item => 
      item && 
      typeof item === 'object' && 
      'title' in item && 
      'questions' in item &&
      Array.isArray(item.questions)
    );
    
    if (!isValidData) {
      console.error('Invalid data structure received:', response.data);
      throw new Error('Invalid data structure received from server');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching frequency ratings:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Server response:', error.response.data);
        throw new Error(`Server error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        throw new Error('No response received from server. Please check if the server is running.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', error.message);
        throw new Error(`Request error: ${error.message}`);
      }
    }
    throw error;
  }
}; 