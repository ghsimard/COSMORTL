import React, { useState, ChangeEvent } from 'react';
import { Combobox } from '@headlessui/react';

interface SchoolSearchProps {
  onSelect: (school: string) => void;
}

export const SchoolSearch: React.FC<SchoolSearchProps> = ({ onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [schools, setSchools] = useState<string[]>([]);

  const handleSearch = async (value: string) => {
    if (value.length >= 3) {
      setSearchTerm(value);
      try {
        const response = await fetch(`/api/search-schools?q=${encodeURIComponent(value)}`);
        if (!response.ok) throw new Error('Failed to fetch schools');
        const data = await response.json();
        setSchools(data);
      } catch (error) {
        console.error('Error searching schools:', error);
        setSchools([]);
      }
    } else {
      setSearchTerm(value);
      setSchools([]);
    }
  };

  return (
    <div className="relative">
      <Combobox value={searchTerm} onChange={onSelect}>
        <div className="relative">
          <Combobox.Input
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
            onChange={(event: ChangeEvent<HTMLInputElement>) => handleSearch(event.target.value)}
            placeholder="Buscar institución educativa..."
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Combobox.Button>
        </div>
        {schools.length > 0 && (
          <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {schools.map((school) => (
              <Combobox.Option
                key={school}
                value={school}
                className={({ active }: { active: boolean }) =>
                  `relative cursor-default select-none py-2 pl-3 pr-9 ${
                    active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                  }`
                }
              >
                {school}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        )}
      </Combobox>
    </div>
  );
}; 