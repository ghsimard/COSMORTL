import axios from 'axios';
import { FrequencyData } from '../types';
import { config } from '../config';

export const getFrequencyRatings = async (): Promise<FrequencyData[]> => {
  try {
    const response = await axios.get(`${config.api.baseUrl}/api/frequency-ratings`);
    return response.data;
  } catch (error) {
    console.error('Error fetching frequency ratings:', error);
    throw error;
  }
}; 