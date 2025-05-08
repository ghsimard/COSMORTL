import React, { useState, useEffect } from 'react';
import type { Form, FormField } from '../types';
import * as XLSX from 'xlsx';

interface FormPreviewProps {
  form: Form;
}

export default function FormPreview({ form }: FormPreviewProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('FormPreview: Component mounted with form:', form);

  useEffect(() => {
    try {
      console.log('FormPreview: Form changed:', form);
      if (!form || !form.fields) {
        throw new Error('Invalid form data');
      }

      if (!Array.isArray(form.fields)) {
        throw new Error('Form fields is not an array');
      }

      // Initialize form data with empty values
      const initialData = form.fields.reduce((acc, field) => {
        if (!field || !field.id) {
          console.error('Invalid field:', field);
          return acc;
        }
        acc[field.id] = field.type === 'checkbox' ? [] : '';
        return acc;
      }, {} as Record<string, any>);

      console.log('FormPreview: Setting initial form data:', initialData);
      setFormData(initialData);
      setCustomValues({});
      setError(null);
    } catch (err) {
      console.error('FormPreview: Error initializing form data:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize form');
    }
  }, [form]);

  const handleInputChange = (fieldId: string, value: any) => {
    if (!fieldId) {
      console.error('FormPreview: Invalid field ID');
      return;
    }
    console.log('FormPreview: Field change:', { fieldId, value });
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCustomValueChange = (fieldId: string, value: string) => {
    console.log('FormPreview: Custom value change:', { fieldId, value });
    setCustomValues(prev => ({ ...prev, [fieldId]: value }));
    // For radio buttons, update form data immediately with the custom value
    if (value) {
      handleInputChange(fieldId, value);
    }
  };

  const formatColumnName = (label: string): string => {
    return label
      .normalize('NFD') // Normalize special characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase();
  };

  const handlePublish = () => {
    // Create worksheet data
    const wsData = [
      // Header row with formatted column names
      form.fields
        .filter(field => field.type !== 'title')
        .map(field => formatColumnName(field.label))
    ];

    // Create empty row for data input
    const emptyRow = form.fields
      .filter(field => field.type !== 'title')
      .map(() => '');
    wsData.push(emptyRow);

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Form Data');

    // Generate Excel file
    XLSX.writeFile(wb, `${formatColumnName(form.title)}_template.xlsx`);
  };

  const renderField = (field: FormField) => {
    try {
      console.log('FormPreview: Rendering field:', field);
      if (!field || !field.type || !field.id) {
        console.error('FormPreview: Invalid field:', field);
        return null;
      }

      const value = formData[field.id] ?? '';
      console.log('FormPreview: Field value:', { fieldId: field.id, value, type: field.type });

      switch (field.type) {
        case 'text':
          return (
            <input
              type={field.validation?.type === 'email' ? 'email' : 
                    field.validation?.type === 'url' ? 'url' : 'text'}
              className="form-input mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.required}
            />
          );

        case 'number':
          return (
            <input
              type="number"
              className="form-input mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              min={field.validation?.minValue}
              max={field.validation?.maxValue}
              required={field.required}
            />
          );

        case 'date':
          return (
            <input
              type="date"
              className="form-input mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.required}
            />
          );

        case 'textarea':
          return (
            <textarea
              className="form-textarea mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.required}
              rows={4}
            />
          );

        case 'radio':
          return (
            <div className="mt-2 space-y-2">
              {(field.options || []).map((option, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="radio"
                    id={`${field.id}-${index}`}
                    name={field.id}
                    value={option}
                    checked={option === 'Otro' ? !!customValues[field.id] : value === option}
                    onChange={(e) => {
                      if (e.target.value === 'Otro') {
                        // When "Other" is selected, use the existing custom value if any
                        const customValue = customValues[field.id] || '';
                        handleInputChange(field.id, customValue);
                      } else {
                        handleInputChange(field.id, e.target.value);
                        // Clear custom value when selecting a non-Other option
                        handleCustomValueChange(field.id, '');
                      }
                    }}
                    className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                    required={field.required && !value}
                  />
                  <label
                    htmlFor={`${field.id}-${index}`}
                    className="ml-3 block text-sm font-medium text-gray-700"
                  >
                    {option}
                  </label>
                  {option === 'Otro' && (
                    <input
                      type="text"
                      className="ml-3 form-input text-sm"
                      placeholder="Especifique"
                      value={customValues[field.id] || ''}
                      onChange={(e) => handleCustomValueChange(field.id, e.target.value)}
                      disabled={!customValues[field.id] && value !== ''}
                    />
                  )}
                </div>
              ))}
            </div>
          );

        case 'checkbox':
          const selectedValues = Array.isArray(value) ? value : [];
          return (
            <div className="mt-2 space-y-2">
              {(field.options || []).map((option, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`${field.id}-${index}`}
                    value={option}
                    checked={
                      option === 'Otro' 
                        ? !!customValues[field.id] 
                        : selectedValues.includes(option)
                    }
                    onChange={(e) => {
                      if (option === 'Otro') {
                        if (!e.target.checked) {
                          // Remove custom value when unchecking "Other"
                          const newValues = selectedValues.filter(v => v !== customValues[field.id]);
                          handleInputChange(field.id, newValues);
                          handleCustomValueChange(field.id, '');
                        }
                      } else {
                        const newValues = e.target.checked
                          ? [...selectedValues, option]
                          : selectedValues.filter(v => v !== option);
                        handleInputChange(field.id, newValues);
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    required={field.required && selectedValues.length === 0}
                  />
                  <label
                    htmlFor={`${field.id}-${index}`}
                    className="ml-3 block text-sm font-medium text-gray-700"
                  >
                    {option}
                  </label>
                  {option === 'Otro' && (
                    <input
                      type="text"
                      className="ml-3 form-input text-sm"
                      placeholder="Especifique"
                      value={customValues[field.id] || ''}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        handleCustomValueChange(field.id, newValue);
                        if (newValue) {
                          // Update selected values, replacing old custom value if it exists
                          const oldCustomValue = customValues[field.id];
                          const newValues = oldCustomValue
                            ? selectedValues.filter(v => v !== oldCustomValue)
                            : [...selectedValues];
                          handleInputChange(field.id, [...newValues, newValue]);
                        }
                      }}
                      disabled={!customValues[field.id] && !selectedValues.includes('Otro')}
                    />
                  )}
                </div>
              ))}
            </div>
          );

        case 'select':
          return (
            <select
              className="form-select mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.required}
            >
              <option value="">Select an option</option>
              {(field.options || []).map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );

        default:
          return null;
      }
    } catch (err) {
      console.error('FormPreview: Error rendering field:', err);
      return (
        <div className="text-red-600 text-sm">Error rendering field: {field.label}</div>
      );
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  if (submitted && form.thankYou) {
    return (
      <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h2>
            <p className="text-gray-600">{form.thankYou}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{form.title}</h1>
          {form.description && (
            <p className="text-gray-600">{form.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handlePublish}
          className="btn-secondary flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          Export Template
        </button>
      </div>

      <form onSubmit={(e) => {
        e.preventDefault();
        console.log('FormPreview: Form submitted with data:', formData);
        setSubmitted(true);
      }} className="space-y-6">
        {Array.isArray(form.fields) ? (
          form.fields.map((field) => (
            <div key={field.id} className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(field)}
            </div>
          ))
        ) : (
          <div className="text-red-600">Invalid form fields data</div>
        )}

        <div className="pt-5">
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
} 