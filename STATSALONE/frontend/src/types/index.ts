export interface FrequencyResult {
  S: number;
  A: number;
  N: number;
}

export interface QuestionMappings {
  docentes: string;
  estudiantes: string;
  acudientes: string;
}

export interface GridItem {
  displayText: string;
  questionMappings: QuestionMappings;
  results: {
    docentes: FrequencyResult;
    estudiantes: FrequencyResult;
    acudientes: FrequencyResult;
  };
}

export interface FrequencyData {
  title: string;
  questions: GridItem[];
} 