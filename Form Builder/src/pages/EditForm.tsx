import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import FormEditor from '../components/FormEditor';
import { useForms } from '../hooks/useForms';
import type { Form } from '../types';

export default function EditForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateForm } = useForms();

  const { data: form, isLoading } = useQuery<Form>({
    queryKey: ['form', id],
    queryFn: async () => {
      const { data } = await api.get(`/forms/${id}`);
      return data;
    },
  });

  const handleSave = async (formData: Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    try {
      await updateForm.mutateAsync({ id: id!, ...formData });
      navigate('/dashboard/forms');
    } catch (error) {
      console.error('Failed to update form:', error);
      // You might want to show an error message to the user here
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Form not found</h3>
      </div>
    );
  }

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Edit Form
          </h2>
        </div>
      </div>

      <div className="mt-8">
        <FormEditor initialForm={form} onSave={handleSave} />
      </div>
    </div>
  );
} 