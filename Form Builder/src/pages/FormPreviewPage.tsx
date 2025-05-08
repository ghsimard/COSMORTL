import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import FormPreview from '../components/FormPreview';
import type { Form } from '../types';

export default function FormPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  console.log('FormPreviewPage: Rendering with id:', id);
  const token = localStorage.getItem('token');
  console.log('FormPreviewPage: Current token:', token ? 'present' : 'not found');

  const { data: form, isLoading, error } = useQuery<Form, Error>({
    queryKey: ['form', id],
    queryFn: async () => {
      console.log('FormPreviewPage: Fetching form data');
      try {
        const { data } = await api.get(`/forms/${id}`);
        console.log('FormPreviewPage: Form data received:', data);
        return data;
      } catch (err) {
        console.error('FormPreviewPage: Error in queryFn:', err);
        throw err;
      }
    }
  });

  if (isLoading) {
    console.log('FormPreviewPage: Loading...');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    console.error('FormPreviewPage: Error state:', error);
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-red-600">Error loading form</h3>
        <p className="mt-2 text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  if (!form) {
    console.log('FormPreviewPage: No form data');
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Form not found</h3>
      </div>
    );
  }

  console.log('FormPreviewPage: Rendering form:', form);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Form Preview</h2>
            <p className="mt-1 text-sm text-gray-600">
              This is how users will see your form
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate(`/dashboard/forms/${id}/edit`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Edit Form
            </button>
            <button
              onClick={() => navigate('/dashboard/forms')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Back to Forms
            </button>
          </div>
        </div>

        <FormPreview form={form} />
      </div>
    </div>
  );
} 