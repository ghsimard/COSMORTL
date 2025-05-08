import { useNavigate } from 'react-router-dom';
import FormEditor from '../components/FormEditor';
import { useForms } from '../hooks/useForms';
import type { Form } from '../types';

export default function CreateForm() {
  const navigate = useNavigate();
  const { createForm } = useForms();

  const handleSave = async (form: Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    try {
      await createForm.mutateAsync(form);
      navigate('/dashboard/forms');
    } catch (error) {
      console.error('Failed to create form:', error);
      // You might want to show an error message to the user here
    }
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Create New Form
          </h2>
        </div>
      </div>

      <div className="mt-8">
        <FormEditor onSave={handleSave} />
      </div>
    </div>
  );
} 