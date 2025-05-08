import { useState } from 'react';
import { Form, FormField } from '../types';
import React from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';

interface FormEditorProps {
  initialForm?: Form;
  onSave: (form: Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
}

const FIELD_TYPES = [
  { value: 'title', label: 'Section Title' },
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Select Dropdown' },
] as const;

const DATE_FORMATS = [
  { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
  { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
  { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
] as const;

const TEXT_FORMATS = [
  { value: 'standard', label: 'Standard' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
] as const;

type TextFormat = typeof TEXT_FORMATS[number]['value'];

interface FieldContentProps {
  fields: FormField[];
  onFieldChange: (index: number, updates: Partial<FormField>) => void;
  onRemoveField: (index: number) => void;
  onMoveField: (index: number, direction: 'up' | 'down') => void;
  renderFieldOptions: (field: FormField, index: number) => React.ReactNode;
}

const FieldContent = React.memo(({ 
  fields, 
  onFieldChange, 
  onRemoveField,
  onMoveField,
  renderFieldOptions 
}: FieldContentProps) => (
  <div className="space-y-4">
    {fields.map((field, index) => (
      <div
        key={field.id}
        className="relative flex items-stretch"
      >
        <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 flex flex-col gap-1 pr-2">
          <button
            type="button"
            onClick={() => onMoveField(index, 'up')}
            disabled={index === 0}
            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronUpIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onMoveField(index, 'down')}
            disabled={index === fields.length - 1}
            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronDownIcon className="h-5 w-5" />
          </button>
        </div>
        <div className={`flex-1 bg-white p-4 rounded-lg border border-gray-200 shadow-sm ${field.type === 'title' ? 'bg-gray-50' : ''}`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className={field.type === 'title' ? 'sm:col-span-3' : 'sm:col-span-2'}>
              <label className="form-label">{field.type === 'title' ? 'Section Title' : 'Label'}</label>
              <input
                type="text"
                className={`form-input mt-1 ${field.type === 'title' ? 'text-lg font-medium' : ''}`}
                value={field.label}
                onChange={(e) =>
                  onFieldChange(index, {
                    label: e.target.value,
                  })
                }
                required={field.type !== 'title'}
                placeholder={field.type === 'title' ? 'Enter section title' : 'Enter field label'}
              />
            </div>
            {field.type !== 'title' && (
              <>
                <div>
                  <label className="form-label">Type</label>
                  <select
                    className="form-input mt-1"
                    value={field.type}
                    onChange={(e) =>
                      onFieldChange(index, {
                        type: e.target.value as FormField['type'],
                      })
                    }
                  >
                    {FIELD_TYPES.filter(type => type.value !== 'title').map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      checked={field.required}
                      onChange={(e) =>
                        onFieldChange(index, {
                          required: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Required
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => onRemoveField(index)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
            {field.type === 'title' && (
              <div className="flex justify-end sm:col-span-1">
                <button
                  type="button"
                  onClick={() => onRemoveField(index)}
                  className="text-red-600 hover:text-red-900"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          {renderFieldOptions(field, index)}
        </div>
      </div>
    ))}
  </div>
));

export default function FormEditor({ initialForm, onSave }: FormEditorProps) {
  const [title, setTitle] = useState(initialForm?.title || '');
  const [description, setDescription] = useState(initialForm?.description || '');
  const [thankYou, setThankYou] = useState(initialForm?.thankYou || '');
  const [fields, setFields] = useState<FormField[]>(
    initialForm?.fields || []
  );

  const handleAddField = () => {
    const newField: FormField = {
      id: `temp-${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      order: fields.length,
    };
    setFields([...fields, newField]);
  };

  const handleAddTitle = () => {
    const newField: FormField = {
      id: `temp-${Date.now()}`,
      label: '',
      type: 'title',
      required: false,
      order: fields.length,
    };
    setFields([...fields, newField]);
  };

  const handleFieldChange = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const handleRemoveField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    newFields.forEach((field, i) => {
      field.order = i;
    });
    setFields(newFields);
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newFields.length) return;
    
    // Swap fields
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    
    // Update order
    newFields.forEach((field, i) => {
      field.order = i;
    });
    
    setFields(newFields);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      description,
      thankYou,
      fields: fields.map((field, index) => ({ ...field, order: index })),
    });
  };

  const renderFieldOptions = (field: FormField, index: number) => {
    switch (field.type) {
      case 'title':
        return (
          <div className="mt-2">
            <textarea
              className="form-textarea mt-1 w-full"
              value={field.label}
              onChange={(e) =>
                handleFieldChange(index, {
                  label: e.target.value,
                })
              }
              rows={2}
              placeholder="Enter section description (optional)"
            />
          </div>
        );

      case 'text':
        return (
          <div className="mt-2">
            <label className="form-label">Format</label>
            <select
              className="form-input mt-1"
              value={field.validation?.type || 'standard'}
              onChange={(e) =>
                handleFieldChange(index, {
                  validation: { ...field.validation, type: e.target.value as TextFormat },
                })
              }
            >
              {TEXT_FORMATS.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="form-label">Min Value</label>
                <input
                  type="number"
                  className="form-input mt-1"
                  value={field.validation?.minValue || ''}
                  onChange={(e) =>
                    handleFieldChange(index, {
                      validation: {
                        ...field.validation,
                        minValue: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="form-label">Max Value</label>
                <input
                  type="number"
                  className="form-input mt-1"
                  value={field.validation?.maxValue || ''}
                  onChange={(e) =>
                    handleFieldChange(index, {
                      validation: {
                        ...field.validation,
                        maxValue: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="form-label">Min Digits</label>
                <input
                  type="number"
                  className="form-input mt-1"
                  value={field.validation?.minDigits || ''}
                  onChange={(e) =>
                    handleFieldChange(index, {
                      validation: {
                        ...field.validation,
                        minDigits: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="form-label">Max Digits</label>
                <input
                  type="number"
                  className="form-input mt-1"
                  value={field.validation?.maxDigits || ''}
                  onChange={(e) =>
                    handleFieldChange(index, {
                      validation: {
                        ...field.validation,
                        maxDigits: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="form-label">Fixed Digits</label>
                <input
                  type="number"
                  className="form-input mt-1"
                  value={field.validation?.fixedDigits || ''}
                  onChange={(e) =>
                    handleFieldChange(index, {
                      validation: {
                        ...field.validation,
                        fixedDigits: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>
        );

      case 'date':
        return (
          <div className="mt-2">
            <label className="form-label">Format</label>
            <select
              className="form-input mt-1"
              value={field.validation?.format || 'dd/MM/yyyy'}
              onChange={(e) =>
                handleFieldChange(index, {
                  validation: { ...field.validation, format: e.target.value },
                })
              }
            >
              {DATE_FORMATS.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'radio':
      case 'checkbox':
      case 'select':
        return (
          <div className="mt-2 space-y-4">
            <div className="flex justify-between items-center gap-2">
              <label className="form-label">Options</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const currentOptions = field.options || [];
                    handleFieldChange(index, {
                      options: [...currentOptions, '']
                    });
                  }}
                  className="text-sm px-2 py-1 text-primary-600 hover:text-primary-900 border border-primary-300 rounded-md hover:border-primary-600"
                >
                  Custom Option
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentOptions = field.options || [];
                    handleFieldChange(index, {
                      options: [...currentOptions, `Option ${currentOptions.length + 1}`]
                    });
                  }}
                  className="text-sm px-2 py-1 text-primary-600 hover:text-primary-900 border border-primary-300 rounded-md hover:border-primary-600"
                >
                  Add Option
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {(field.options || []).map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const newOptions = [...(field.options || [])];
                        [newOptions[optionIndex], newOptions[optionIndex - 1]] = 
                        [newOptions[optionIndex - 1], newOptions[optionIndex]];
                        handleFieldChange(index, { options: newOptions });
                      }}
                      disabled={optionIndex === 0}
                      className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newOptions = [...(field.options || [])];
                        [newOptions[optionIndex], newOptions[optionIndex + 1]] = 
                        [newOptions[optionIndex + 1], newOptions[optionIndex]];
                        handleFieldChange(index, { options: newOptions });
                      }}
                      disabled={optionIndex === (field.options || []).length - 1}
                      className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...(field.options || [])];
                      newOptions[optionIndex] = e.target.value;
                      handleFieldChange(index, { options: newOptions });
                    }}
                    className="form-input flex-1"
                    placeholder="Enter option text..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newOptions = [...(field.options || [])];
                      newOptions.splice(optionIndex, 1);
                      handleFieldChange(index, { options: newOptions });
                    }}
                    className="p-1 text-red-600 hover:text-red-900"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
              {(field.options || []).length === 0 && (
                <p className="text-sm text-gray-500 italic">No options added yet. Click "Add Option" for a numbered option or "Custom Option" for a blank option.</p>
              )}
            </div>
          </div>
        );

      case 'textarea':
        return null;

      default:
        return null;
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
      fields.map(field => formatColumnName(field.label))
    ];

    // Create empty row for data input
    const emptyRow = fields.map(() => '');
    wsData.push(emptyRow);

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Form Data');

    // Generate Excel file
    XLSX.writeFile(wb, `${formatColumnName(title)}_template.xlsx`);
  };

  return (
    <div className="relative min-h-screen pb-16">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="form-label">
              Form Title
            </label>
            <input
              type="text"
              id="title"
              className="form-input mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              className="form-input mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label htmlFor="thankYou" className="form-label">
              Thank You Message
            </label>
            <textarea
              id="thankYou"
              className="form-input mt-1"
              value={thankYou}
              onChange={(e) => setThankYou(e.target.value)}
              rows={3}
              placeholder="Message to show after form submission"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Form Fields</h2>

          <FieldContent
            fields={fields}
            onFieldChange={handleFieldChange}
            onRemoveField={handleRemoveField}
            onMoveField={handleMoveField}
            renderFieldOptions={renderFieldOptions}
          />
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={handlePublish}
            className="btn-secondary flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Publish Template
          </button>
          <button type="submit" className="btn-primary">
            Save Form
          </button>
        </div>
      </form>

      {/* Floating Menu */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2">
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleAddTitle}
              className="btn-secondary flex items-center gap-2 whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Add Section Title
            </button>
            <button
              type="button"
              onClick={handleAddField}
              className="btn-secondary flex items-center gap-2 whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Field
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 