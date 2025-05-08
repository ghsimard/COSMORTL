export interface FrequencyData {
  title: string;
  questions: GridItem[];
}

export interface GridItem {
  displayText: string;
  questionMappings: {
    docentes: string;
    estudiantes: string;
    acudientes: string;
  };
  results: {
    docentes: FrequencyResult;
    estudiantes: FrequencyResult;
    acudientes: FrequencyResult;
  };
}

export interface FrequencyResult {
  S: number; // Siempre + Casi siempre
  A: number; // A veces
  N: number; // Nunca + Casi nunca
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface SectionConfig {
  title: string;
  items: {
    displayText: string;
    questionMappings: {
      docentes: string;
      estudiantes: string;
      acudientes: string;
    };
  }[];
}

export interface PieChartData {
  label: string;
  value: number;
  color: string;
}

export type GroupName = 'docentes' | 'estudiantes' | 'acudientes';
export type SectionName = 'comunicacion' | 'practicas_pedagogicas' | 'convivencia'; 