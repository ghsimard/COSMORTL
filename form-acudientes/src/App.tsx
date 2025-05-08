import React, { useState, useEffect, useRef } from 'react';
import ThankYouPage from './components/ThankYouPage';
import HighlightedText from './components/HighlightedText';
import { frequencyQuestions5, frequencyQuestions6, frequencyQuestions7, frequencyOptions } from './data/questions';
import { FrequencyRatings } from './types/form';

interface FormData {
  schoolName: string;
  studentGrades: string[];
  frequencyRatings5: FrequencyRatings;
  frequencyRatings6: FrequencyRatings;
  frequencyRatings7: FrequencyRatings;
  [key: string]: string | string[] | FrequencyRatings;
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    schoolName: '',
    studentGrades: [],
    frequencyRatings5: {},
    frequencyRatings6: {},
    frequencyRatings7: {}
  });

  const [schoolSuggestions, setSchoolSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Reset suggestions when component mounts or when input is empty
  useEffect(() => {
    if (!formData.schoolName) {
      setSchoolSuggestions([]);
      setShowSuggestions(false);
    }
  }, [formData.schoolName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      studentGrades: checked 
        ? [...(prev.studentGrades as string[]), value]
        : (prev.studentGrades as string[]).filter((item: string) => item !== value)
    }));
  };

  const handleFrequencyChange = (section: number, question: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [`frequencyRatings${section + 2}`]: {
        ...(prev[`frequencyRatings${section + 2}` as keyof FormData] as FrequencyRatings),
        [question]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    // Validate all required fields
    if (!formData.schoolName.trim()) {
      alert('Por favor, ingrese el nombre de la Institución Educativa.');
      return;
    }

    if (formData.studentGrades.length === 0) {
      alert('Por favor, seleccione al menos un grado en el que se encuentra cursando el o los estudiantes que usted representa.');
      return;
    }
    
    // Check if all frequency rating questions are answered
    const validateFrequencySection = (questions: string[], sectionNumber: number) => {
      return questions.every(question => 
        (formData[`frequencyRatings${sectionNumber + 2}` as keyof FormData] as FrequencyRatings)[question] !== undefined
      );
    };

    const section3Complete = validateFrequencySection(frequencyQuestions5, 3);
    const section4Complete = validateFrequencySection(frequencyQuestions6, 4);
    const section5Complete = validateFrequencySection(frequencyQuestions7, 5);

    if (!section3Complete || !section4Complete || !section5Complete) {
      alert('Por favor, responda todas las preguntas de frecuencia antes de enviar el formulario.');
      return;
    }
    
    try {
      const response = await fetch('/api/submit-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit form');
      }

      if (result.success) {
        setIsSubmitted(true);
        // Reset form data
        setFormData({
          schoolName: '',
          studentGrades: [],
          frequencyRatings5: {},
          frequencyRatings6: {},
          frequencyRatings7: {}
        });
      } else {
        throw new Error(result.error || 'Failed to submit form');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`Error al enviar el formulario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleSchoolNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, schoolName: value }));
    
    // Always reset suggestions when input changes
    setSchoolSuggestions([]);
    setShowSuggestions(false);

    // Only fetch new suggestions if we have 3 or more characters
    if (value.length >= 3) {
      try {
        const response = await fetch(`/api/search-schools?q=${encodeURIComponent(value)}`);
        if (response.ok) {
          const suggestions = await response.json();
          if (suggestions.length > 0) {
            setSchoolSuggestions(suggestions);
            setShowSuggestions(true);
          }
        }
      } catch (error) {
        console.error('Error fetching school suggestions:', error);
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setFormData(prev => ({ ...prev, schoolName: suggestion }));
    setShowSuggestions(false);
    setSchoolSuggestions([]);
  };

  const FrequencyMatrix = ({ questionNumber, questions, title }: { questionNumber: number; questions: string[]; title: string }) => {
    const isAnswered = (question: string) => 
      (formData[`frequencyRatings${questionNumber + 2}` as keyof FormData] as FrequencyRatings)[question] !== undefined;
    
    return (
      <div className="space-y-8 mt-8">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {questionNumber}. {title}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Seleccione con qué frecuencia ocurren las siguientes situaciones
          </p>
          <p className="mt-1 text-sm text-red-500">
            * Todas las preguntas son obligatorias
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="w-1/3 py-3 text-left text-sm font-medium text-gray-500"></th>
                {frequencyOptions.map((option) => (
                  <th key={option} className="px-3 py-3 text-center text-sm font-medium text-gray-500">
                    {option}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {questions.map((question, qIndex) => {
                const showError = hasAttemptedSubmit && !isAnswered(question);
                return (
                  <tr key={qIndex} className={qIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className={`py-4 text-sm align-top ${showError ? 'text-red-600' : 'text-gray-900'}`}>
                      {question}
                      {showError && <span className="text-red-600 ml-1">*</span>}
                    </td>
                    {frequencyOptions.map((option) => (
                      <td key={option} className="px-3 py-4 text-center">
                        <input
                          type="radio"
                          name={`frequency-${questionNumber}-${qIndex}`}
                          value={option}
                          checked={(formData[`frequencyRatings${questionNumber + 2}` as keyof FormData] as FrequencyRatings)[question] === option}
                          onChange={() => handleFrequencyChange(questionNumber, question, option)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          required
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (isSubmitted) {
    return <ThankYouPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <div className="text-center mb-8">
            {/* Logos */}
            <div className="flex justify-between items-center mb-6">
              <img
                src="/rectores.jpeg"
                alt="Rectores Líderes Transformadores"
                className="h-28 w-auto object-contain"
              />
              <img
                src="/coordinadores.jpeg"
                alt="Coordinadores Líderes Transformadores"
                className="h-28 w-auto object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              ENCUESTA DE AMBIENTE ESCOLAR
            </h1>
            <h2 className="text-xl font-semibold text-gray-700 mt-2">
              CUESTIONARIO PARA ACUDIENTES
            </h2>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
            <p className="text-sm text-blue-700">
              Con el propósito de brindar insumos valiosos a los directivos docentes sobre su Institución Educativa y apoyar la identificación de retos y oportunidades de mejora, el Programa Rectores Líderes Transformadores y Coordinadores Líderes Transformadores ha diseñado la "Encuesta de Ambiente Escolar", centrada en tres aspectos clave: la comunicación, la convivencia y las prácticas pedagógicas.
            </p>
            <p className="text-sm text-blue-700 mt-2">
              Las respuestas de los participantes son fundamentales para generar información que permita a rectores y coordinadores fortalecer su gestión institucional y avanzar en procesos de transformación, sustentados en la toma de decisiones basada en datos.
            </p>
            <p className="text-sm text-blue-700 mt-2">
              La información recolectada será tratada de manera confidencial y utilizada exclusivamente con fines estadísticos y de mejoramiento continuo.
            </p>
            <p className="text-sm font-semibold text-blue-700 mt-2">
              Te invitamos a responder con sinceridad y a completar todas las preguntas de la encuesta. ¡Gracias!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* School Name with Autocomplete */}
            <div>
              <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700">
                1. Por favor escriba el nombre de la Institución Educativa <span className="text-red-600">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  id="schoolName"
                  name="schoolName"
                  required
                  value={formData.schoolName}
                  onChange={handleSchoolNameChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Empiece a escribir para ver sugerencias..."
                />
                {showSuggestions && 
                 schoolSuggestions.length > 0 && 
                 formData.schoolName.length >= 3 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm"
                  >
                    {schoolSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="cursor-pointer hover:bg-blue-50 px-4 py-2"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <HighlightedText
                          text={suggestion}
                          highlight={formData.schoolName}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Student Grades */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                2. ¿Qué grado se encuentra cursando el o los estudiantes que usted representa? (puede marcar más de una casilla) <span className="text-red-600">*</span>
              </label>
              <div className="mt-4 space-y-4">
                {[
                  'Primera infancia',
                  'Preescolar',
                  '1°',
                  '2°',
                  '3°',
                  '4°',
                  '5°',
                  '6°',
                  '7°',
                  '8°',
                  '9°',
                  '10°',
                  '11°',
                  '12°'
                ].map((grade) => (
                  <div key={grade} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`grade-${grade}`}
                      value={grade}
                      checked={formData.studentGrades.includes(grade)}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`grade-${grade}`} className="ml-3 block text-sm text-gray-700">
                      {grade}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Frequency Matrix for COMUNICACIÓN */}
            <FrequencyMatrix 
              questionNumber={3} 
              questions={frequencyQuestions5} 
              title="COMUNICACIÓN"
            />

            {/* Frequency Matrix for PRÁCTICAS PEDAGÓGICAS */}
            <FrequencyMatrix 
              questionNumber={4} 
              questions={frequencyQuestions6} 
              title="PRÁCTICAS PEDAGÓGICAS"
            />

            {/* Frequency Matrix for CONVIVENCIA */}
            <FrequencyMatrix 
              questionNumber={5} 
              questions={frequencyQuestions7} 
              title="CONVIVENCIA"
            />

            {/* Submit Button */}
            <div className="pt-5">
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Submit
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
