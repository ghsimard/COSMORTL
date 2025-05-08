import React from 'react';
import { Link } from 'react-router-dom';
import { Form } from '../types';
import * as XLSX from 'xlsx';
import { useForms } from '../hooks/useForms';

export default function FormsList() {
  const { forms = [], isLoading, error, deleteForm } = useForms();

  const formatFileName = (title: string): string => {
    return title
      .normalize('NFD') // Normalize special characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase();
  };

  const handlePublish = (form: Form) => {
    // Filter out title fields and get form fields
    const formFields = form.fields.filter(field => field.type !== 'title');

    // Create worksheet data
    const wsData = [
      // Header row with original field labels
      formFields.map(field => field.label)
    ];

    // Create empty row for data input
    const emptyRow = formFields.map(() => '');
    wsData.push(emptyRow);

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Adjust column widths based on header length
    const colWidths: { [key: string]: { wch: number } } = {};
    formFields.forEach((field, idx) => {
      const col = XLSX.utils.encode_col(idx);
      colWidths[col] = { wch: Math.max(field.label.length + 2, 10) }; // minimum width of 10, or label length + 2
    });
    ws['!cols'] = Object.values(colWidths);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Form Data');

    // Generate Excel file
    XLSX.writeFile(wb, `${formatFileName(form.title)}_template.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error</p>
            <p>{error instanceof Error ? error.message : 'Failed to load forms'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!forms.length) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">No forms yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first form.</p>
            <div className="mt-6">
              <Link to="/forms/new" className="btn-primary">
                Create Form
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Forms</h1>
          <Link to="/forms/new" className="btn-primary">
            Create Form
          </Link>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {forms.map((form) => (
              <li key={form.id}>
                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-medium text-primary-600 truncate">
                        {form.title}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {form.fields.length} fields
                        </p>
                      </div>
                    </div>
                    {form.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {form.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      type="button"
                      onClick={() => handlePublish(form)}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      Export
                    </button>
                    <Link
                      to={`/forms/${form.id}/preview`}
                      className="btn-secondary"
                    >
                      Preview
                    </Link>
                    <Link
                      to={`/forms/${form.id}/edit`}
                      className="btn-secondary"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this form?')) {
                          deleteForm.mutate(form.id);
                        }
                      }}
                      className="btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
} 