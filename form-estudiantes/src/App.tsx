import React, { useState, useEffect, useRef } from 'react';
import ThankYouPage from './components/ThankYouPage';
import HighlightedText from './components/HighlightedText';
import { frequencyQuestions5, frequencyQuestions6, frequencyQuestions7, frequencyOptions } from './data/questions';
import { FrequencyRatings } from './types/form';

interface FormData {
  schoolName: string;
  yearsOfExperience: string;
  teachingGradesEarly: string[];
  teachingGradesLate: string[];
  schedule: string;
  comunicacion: FrequencyRatings;
  practicas_pedagogicas: FrequencyRatings;
  convivencia: FrequencyRatings;
  [key: string]: string | string[] | FrequencyRatings;
}

type SectionKey = 'Comunicacion' | 'Practicas_Pedagogicas' | 'Convivencia';
type FrequencyKey = 'comunicacion' | 'practicas_pedagogicas' | 'convivencia';

const SECTION_TO_FREQUENCY: Record<SectionKey, FrequencyKey> = {
  'Comunicacion': 'comunicacion',
  'Practicas_Pedagogicas': 'practicas_pedagogicas',
  'Convivencia': 'convivencia'
};

function App() {
  const [formData, setFormData] = useState<FormData>({
    schoolName: '',
    yearsOfExperience: '',
    teachingGradesEarly: [],
    teachingGradesLate: [],
    schedule: '',
    comunicacion: {},
    practicas_pedagogicas: {},
    convivencia: {}
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

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, section: 'teachingGradesEarly' | 'teachingGradesLate') => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [section]: checked 
        ? [...prev[section], value]
        : prev[section].filter(item => item !== value)
    }));
  };

  const handleFrequencyChange = (section: SectionKey, question: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [SECTION_TO_FREQUENCY[section]]: {
        ...(prev[SECTION_TO_FREQUENCY[section]] as FrequencyRatings),
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

    if (!formData.schedule) {
      alert('Por favor, seleccione su jornada de trabajo.');
      return;
    }
    
    // Check if all frequency rating questions are answered
    const validateFrequencySection = (questions: string[], section: SectionKey) => {
      return questions.every(question => 
        (formData[SECTION_TO_FREQUENCY[section]] as FrequencyRatings)[question] !== undefined
      );
    };

    const section5Complete = validateFrequencySection(frequencyQuestions5, 'Comunicacion');
    const section6Complete = validateFrequencySection(frequencyQuestions6, 'Practicas_Pedagogicas');
    const section7Complete = validateFrequencySection(frequencyQuestions7, 'Convivencia');

    if (!section5Complete || !section6Complete || !section7Complete) {
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

      if (!response.ok) {
        throw new Error('Failed to submit form');
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
          schedule: '',
          comunicacion: {},
          practicas_pedagogicas: {},
          convivencia: {}
        });
      } else {
        throw new Error(result.error || 'Failed to submit form');
      }
    } catch (error) {
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

    // Only fetch new suggestions if we have 3 or more characters and less than 100
    if (value.length >= 3 && value.length < 100) {
      try {
        const response = await fetch('/api/search-schools', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q: value.substring(0, 100) })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
          const suggestions = await response.json();
          if (suggestions.length > 0) {
            setSchoolSuggestions(suggestions);
            setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error fetching school suggestions:', error);
        setSchoolSuggestions([]);
        setShowSuggestions(false);
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setFormData(prev => ({ ...prev, schoolName: suggestion }));
    setShowSuggestions(false);
    setSchoolSuggestions([]);
  };

  const FrequencyMatrix = ({ section, questions, title }: { section: SectionKey; questions: string[]; title: string }) => {
    const isAnswered = (question: string) => 
      (formData[SECTION_TO_FREQUENCY[section]] as FrequencyRatings)[question] !== undefined;
    
    return (
    <div className="space-y-8 mt-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
            {title}
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
                          name={`frequency-${section}-${qIndex}`}
                        value={option}
                          checked={(formData[SECTION_TO_FREQUENCY[section]] as FrequencyRatings)[question] === option}
                          onChange={() => handleFrequencyChange(section, question, option)}
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
              CUESTIONARIO PARA ESTUDIANTES
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
                  value={formData.schoolName}
                  onChange={handleSchoolNameChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Empiece a escribir para ver sugerencias..."
                  required
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

            {/* Years of Experience - now Years of Study */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                2. ¿Cuántos años llevas estudiando en el colegio? <span className="text-red-600">*</span>
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

            {/* Teaching Grades Combined - now Current Grade */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                3. ¿En qué grado estás actualmente? <span className="text-red-600">*</span>
              </label>
              <div className="mt-4 space-y-4">
                {[
                  '5°', '8°', '9°', '10°', '11°'
                ].map((grade) => (
                  <div key={grade} className="flex items-center">
                    <input
                      type="radio"
                      id={`grade-${grade}`}
                      name="currentGrade"
                      value={grade}
                      required
                      checked={formData.teachingGradesEarly.includes(grade) || formData.teachingGradesLate.includes(grade)}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          teachingGradesEarly: [],
                          teachingGradesLate: [],
                          [e.target.checked ? 'teachingGradesLate' : 'teachingGradesEarly']: e.target.checked ? [grade] : []
                        }));
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor={`grade-${grade}`} className="ml-3 block text-sm text-gray-700">
                      {grade}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule - now question 4 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                4. ¿En qué jornada tienes clases? <span className="text-red-600">*</span>
              </label>
              <div className="mt-4 space-y-4">
                {['Mañana', 'Tarde', 'Noche', 'Única'].map((schedule) => (
                  <div key={schedule} className="flex items-center">
                    <input
                      type="radio"
                      id={`schedule-${schedule}`}
                      name="schedule"
                      value={schedule}
                      required
                      checked={formData.schedule === schedule}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor={`schedule-${schedule}`} className="ml-3 block text-sm text-gray-700">
                      {schedule}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Frequency Matrix for COMUNICACIÓN */}
            <FrequencyMatrix 
              section="Comunicacion" 
              questions={frequencyQuestions5} 
              title="COMUNICACIÓN"
            />

            {/* Frequency Matrix for PRÁCTICAS PEDAGÓGICAS */}
            <FrequencyMatrix 
              section="Practicas_Pedagogicas" 
              questions={frequencyQuestions6} 
              title="PRÁCTICAS PEDAGÓGICAS"
            />

            {/* Frequency Matrix for CONVIVENCIA */}
            <FrequencyMatrix 
              section="Convivencia" 
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
