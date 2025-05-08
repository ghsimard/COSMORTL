import React, { useState, useEffect, useRef } from 'react';
import ThankYouPage from './components/ThankYouPage';
import HighlightedText from './components/HighlightedText';
import { frequencyQuestions7, frequencyQuestions8, frequencyQuestions9, frequencyOptions } from './data/questions';
import { FrequencyRatings } from './types/form';
import { config } from './config';
import { handleSuggestionKeyDown, handleOptionKeyDown, handleFrequencyMatrixKeyDown } from './utils/keyboardNavigation';

interface FormData {
  schoolName: string;
  yearsOfExperience: string;
  teachingGradesEarly: string[];
  teachingGradesLate: string[];
  schedule: string[];
  feedbackSources: string[];
  comunicacion: FrequencyRatings;
  practicas_pedagogicas: FrequencyRatings;
  convivencia: FrequencyRatings;
  [key: string]: string | string[] | FrequencyRatings;
}

type FrequencySection = 'comunicacion' | 'practicas_pedagogicas' | 'convivencia';

function App() {
  const [formData, setFormData] = useState<FormData>({
    schoolName: '',
    yearsOfExperience: '',
    teachingGradesEarly: [],
    teachingGradesLate: [],
    schedule: [],
    feedbackSources: [],
    comunicacion: {},
    practicas_pedagogicas: {},
    convivencia: {},
  });

  const [schoolSuggestions, setSchoolSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  // Reset suggestions when component mounts or when input is empty
  useEffect(() => {
    if (!formData.schoolName) {
      setSchoolSuggestions([]);
      setShowSuggestions(false);
    }
  }, [formData.schoolName]);

  // Hide dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, section: 'teachingGradesEarly' | 'teachingGradesLate' | 'feedbackSources' | 'schedule') => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [section]: checked 
        ? [...prev[section], value]
        : prev[section].filter(item => item !== value)
    }));
  };

  const handleFrequencyChange = (section: FrequencySection, question: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
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

    if (!formData.yearsOfExperience) {
      alert('Por favor, seleccione sus años de experiencia.');
      return;
    }

    if (formData.teachingGradesEarly.length === 0 && formData.teachingGradesLate.length === 0) {
      alert('Por favor, seleccione al menos un grado en el que tiene asignación de actividades de docencia.');
      return;
    }

    if (formData.schedule.length === 0) {
      alert('Por favor, seleccione al menos una jornada de trabajo.');
      return;
    }

    if (formData.feedbackSources.length === 0) {
      alert('Por favor, seleccione al menos una fuente de retroalimentación.');
      return;
    }
    
    // Check if all frequency rating questions are answered
    const validateFrequencySection = (questions: string[], section: FrequencySection) => {
      return questions.every(question => 
        formData[section][question] !== undefined
      );
    };

    const comunicacionComplete = validateFrequencySection(frequencyQuestions7, 'comunicacion');
    const practicasComplete = validateFrequencySection(frequencyQuestions8, 'practicas_pedagogicas');
    const convivenciaComplete = validateFrequencySection(frequencyQuestions9, 'convivencia');

    if (!comunicacionComplete || !practicasComplete || !convivenciaComplete) {
      alert('Por favor, responda todas las preguntas de frecuencia antes de enviar el formulario.');
      return;
    }

    // Prepare the form data for submission
    const userFormData = {
      schoolName: formData.schoolName,
      yearsOfExperience: formData.yearsOfExperience,
      teachingGradesEarly: formData.teachingGradesEarly,
      teachingGradesLate: formData.teachingGradesLate,
      schedule: formData.schedule,
      feedbackSources: formData.feedbackSources,
      comunicacion: formData.comunicacion,
      practicas_pedagogicas: formData.practicas_pedagogicas,
      convivencia: formData.convivencia
    };
    
    try {
      // Use a hardcoded absolute URL that will definitely work
      const serverUrl = 'http://localhost:3000';
      console.log("Submitting form to:", `${serverUrl}/api/submit-form`);
      
      const response = await fetch(`${serverUrl}/api/submit-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'http://localhost:3000/docentes/DocToken123'
        },
        body: JSON.stringify(userFormData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to submit form');
      }

      const result = await response.json();
      
      if (result.success) {
        setIsSubmitted(true);
        // Reset form data
        setFormData({
          schoolName: '',
          yearsOfExperience: '',
          teachingGradesEarly: [],
          teachingGradesLate: [],
          schedule: [],
          feedbackSources: [],
          comunicacion: {},
          practicas_pedagogicas: {},
          convivencia: {},
        });
      } else {
        throw new Error(result.error || 'Failed to submit form');
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      alert('Error al enviar el formulario. Por favor, intente nuevamente.');
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
        // Use the same hardcoded URL for consistency with form submission
        const serverUrl = 'http://localhost:3000';
        console.log("Searching schools at:", `${serverUrl}/api/search-schools?q=${encodeURIComponent(value)}`);
        
        const response = await fetch(`${serverUrl}/api/search-schools?q=${encodeURIComponent(value)}`);
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

  const handleSuggestionClick = (suggestion: string, index?: number) => {
    setFormData(prev => ({ ...prev, schoolName: suggestion }));
    setShowSuggestions(false);
    setSchoolSuggestions([]);
    setActiveSuggestionIndex(-1);
    
    // Focus the next form section after selection
    setTimeout(() => {
      const yearsSection = document.getElementById('section-years');
      if (yearsSection) {
        const firstInput = yearsSection.querySelector('input');
        if (firstInput) firstInput.focus();
      }
    }, 100);
  };

  const handleSchoolNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && schoolSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const newIndex = activeSuggestionIndex < schoolSuggestions.length - 1
          ? activeSuggestionIndex + 1
          : 0;
        setActiveSuggestionIndex(newIndex);
        
        // Scroll the suggestion into view if needed
        const suggestionElement = document.getElementById(`suggestion-${newIndex}`);
        if (suggestionElement) {
          suggestionElement.scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newIndex = activeSuggestionIndex > 0
          ? activeSuggestionIndex - 1
          : schoolSuggestions.length - 1;
        setActiveSuggestionIndex(newIndex);
        
        // Scroll the suggestion into view if needed
        const suggestionElement = document.getElementById(`suggestion-${newIndex}`);
        if (suggestionElement) {
          suggestionElement.scrollIntoView({ block: 'nearest' });
        }
      } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
        e.preventDefault();
        handleSuggestionClick(schoolSuggestions[activeSuggestionIndex], activeSuggestionIndex);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
    }
  };

  // Inner component with enhanced keyboard navigation for frequency matrices
  function FrequencyMatrixWithKeyboardNav({ 
    questionNumber, 
    questions, 
    title, 
    section 
  }: { 
    questionNumber: number; 
    questions: string[]; 
    title: string; 
    section: FrequencySection 
  }) {
    // Generate a unique ID for each frequency input
    const getFrequencyInputId = (rowIndex: number, colIndex: number) => 
      `frequency-${section}-${rowIndex}-${colIndex}`;

    return (
      <div className="space-y-8 mt-8">
        <div>
          <h3 className="text-lg font-medium text-gray-900" id={`${section}-label`}>
            {questionNumber}. {title}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Seleccione con qué frecuencia ocurren las siguientes situaciones
          </p>
          <p className="mt-1 text-sm text-red-500">
            * Todas las preguntas son obligatorias
          </p>
          <p className="mt-1 text-sm text-gray-500">
            <i>Utilice las teclas de flecha izquierda/derecha para navegar y seleccionar opciones, y las teclas de flecha arriba/abajo para moverse entre preguntas</i>
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200" aria-labelledby={`${section}-label`}>
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
              {questions.map((question, rowIndex) => {
                const isAnswered = formData[section][question] !== undefined;
                const showError = hasAttemptedSubmit && !isAnswered;
                return (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className={`py-4 text-sm align-top ${showError ? 'text-red-600' : 'text-gray-900'}`}>
                      {question}
                      {showError && <span className="text-red-600 ml-1">*</span>}
                    </td>
                    {frequencyOptions.map((option, colIndex) => {
                      // Create a handler that both selects the option and handles keyboard navigation
                      const handleKeyDown = (e: React.KeyboardEvent) => {
                        handleFrequencyMatrixKeyDown(
                          e,
                          rowIndex,
                          colIndex,
                          questions.length,
                          frequencyOptions.length,
                          getFrequencyInputId,
                          // Pass a function to select the option when using arrow keys
                          (option) => handleFrequencyChange(section, question, option),
                          option
                        );
                      };
                      
                      return (
                        <td key={option} className="px-3 py-4 text-center">
                          <input
                            type="radio"
                            id={getFrequencyInputId(rowIndex, colIndex)}
                            name={`frequency-${section}-${rowIndex}`}
                            value={option}
                            checked={formData[section][question] === option}
                            onChange={() => handleFrequencyChange(section, question, option)}
                            onKeyDown={handleKeyDown}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            required
                            aria-label={`${question} - ${option}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

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
              CUESTIONARIO PARA DOCENTES
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
            <div id="section-school-name" tabIndex={-1}>
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
                  placeholder="Escriba al menos 3 letras para ver sugerencias"
                  autoComplete="off"
                  title="Escriba al menos 3 letras para ver sugerencias de nombres de instituciones educativas"
                  onKeyDown={handleSchoolNameKeyDown}
                />
                {showSuggestions && 
                 schoolSuggestions.length > 0 && 
                 formData.schoolName.length >= 3 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-80 rounded-md py-1 text-base overflow-auto focus:outline-none"
                  >
                    {schoolSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="cursor-pointer hover:bg-blue-50 px-4 py-3 text-base"
                        onClick={() => handleSuggestionClick(suggestion, index)}
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

            {/* Years of Experience */}
            <div id="section-years" tabIndex={-1}>
              <label id="years-label" className="block text-sm font-medium text-gray-700">
                2. Incluyendo este año escolar, ¿cuántos años se ha desempeñado como docente en este colegio? <span className="text-red-600">*</span>
              </label>
              <div className="mt-4 space-y-4">
                {['Menos de 1', '1', '2', '3', '4', '5', 'Más de 5'].map((year) => (
                  <div key={year} className="flex items-center">
                    <input
                      type="radio"
                      id={`year-${year}`}
                      name="yearsOfExperience"
                      value={year}
                      required
                      checked={formData.yearsOfExperience === year}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor={`year-${year}`} className="ml-3 block text-sm text-gray-700">
                      {year}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Teaching Grades Combined */}
            <div id="section-grades" tabIndex={-1}>
              <label id="grades-label" className="block text-sm font-medium text-gray-700">
                3. ¿En qué grados tiene asignación de actividades de docencia en este colegio? (múltiple respuesta) <span className="text-red-600">*</span>
              </label>
              <div className="mt-4 space-y-4">
                {[
                  'Primera infancia', 'Preescolar', 
                  '1°', '2°', '3°', '4°', '5°',
                  '6°', '7°', '8°', '9°', '10°', '11°', '12°'
                ].map((grade) => (
                  <div key={grade} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`grade-${grade}`}
                      value={grade}
                      checked={formData.teachingGradesEarly.includes(grade) || formData.teachingGradesLate.includes(grade)}
                      onChange={(e) => {
                        const isEarlyGrade = ['Primera infancia', 'Preescolar', '1°', '2°', '3°', '4°', '5°'].includes(grade);
                        handleCheckboxChange(e, isEarlyGrade ? 'teachingGradesEarly' : 'teachingGradesLate');
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`grade-${grade}`} className="ml-3 block text-sm text-gray-700">
                      {grade}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule - now question 4 */}
            <div id="section-schedule" tabIndex={-1}>
              <label id="schedule-label" className="block text-sm font-medium text-gray-700">
                4. ¿En qué jornada desarrolla sus clases? (múltiple respuesta) <span className="text-red-600">*</span>
              </label>
              <div className="mt-4 space-y-4">
                {['Mañana', 'Tarde', 'Noche', 'Única'].map((schedule) => (
                  <div key={schedule} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`schedule-${schedule}`}
                      value={schedule}
                      checked={formData.schedule.includes(schedule)}
                      onChange={(e) => {
                        const isSelected = formData.schedule.includes(schedule);
                        handleCheckboxChange(e, 'schedule');
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`schedule-${schedule}`} className="ml-3 block text-sm text-gray-700">
                      {schedule}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback Sources */}
            <div id="section-feedback-sources" tabIndex={-1}>
              <label id="feedback-sources-label" className="block text-sm font-medium text-gray-700">
                5. ¿De qué fuentes de retroalimentación recibe información sobre su desempeño docente? (múltiple respuesta) <span className="text-red-600">*</span>
              </label>
              <div className="mt-4 space-y-4">
                {['Padres de familia', 'Alumnos', 'Colegas de trabajo', 'Directivos'].map((source) => (
                  <div key={source} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`source-${source}`}
                      value={source}
                      checked={formData.feedbackSources.includes(source)}
                      onChange={(e) => {
                        const isSelected = formData.feedbackSources.includes(source);
                        handleCheckboxChange(e, 'feedbackSources');
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`source-${source}`} className="ml-3 block text-sm text-gray-700">
                      {source}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Frequency Matrices */}
            <FrequencyMatrixWithKeyboardNav questionNumber={1} questions={frequencyQuestions7} title="Comunicación" section="comunicacion" />
            <FrequencyMatrixWithKeyboardNav questionNumber={2} questions={frequencyQuestions8} title="Prácticas Pedagógicas" section="practicas_pedagogicas" />
            <FrequencyMatrixWithKeyboardNav questionNumber={3} questions={frequencyQuestions9} title="Convivencia" section="convivencia" />

            <button type="submit" className="mt-8 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;