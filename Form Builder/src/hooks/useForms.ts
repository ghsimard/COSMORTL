import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form } from '../types';
import api from '../lib/axios';

export function useForms() {
  const queryClient = useQueryClient();

  const {
    data: forms,
    isLoading,
    error
  } = useQuery<Form[]>({
    queryKey: ['forms'],
    queryFn: async () => {
      try {
        console.log('Fetching forms...');
        const { data } = await api.get('/forms');
        console.log('Forms data received:', data);
        return data;
      } catch (err: any) {
        console.error('Failed to fetch forms:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          throw new Error('Please log in to view forms');
        }
        if (err.response?.status === 403) {
          throw new Error('You do not have permission to view forms');
        }
        throw new Error(err.response?.data?.message || 'Failed to fetch forms');
      }
    }
  });

  const createForm = useMutation({
    mutationFn: async (formData: Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
      const { data } = await api.post('/forms', formData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    }
  });

  const updateForm = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<Form> & { id: string }) => {
      const { data } = await api.put(`/forms/${id}`, formData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    }
  });

  const deleteForm = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/forms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    }
  });

  return {
    forms,
    isLoading,
    error,
    createForm,
    updateForm,
    deleteForm
  };
} 