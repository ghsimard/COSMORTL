export type User = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

export type FormField = {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'radio' | 'checkbox' | 'textarea' | 'select' | 'title';
  required: boolean;
  order: number;
  options?: string[];
  validation?: {
    minValue?: number;
    maxValue?: number;
    minDigits?: number;
    maxDigits?: number;
    fixedDigits?: number;
    format?: string;
    type?: 'email' | 'url' | 'standard';
  };
};

export type Form = {
  id: string;
  title: string;
  description?: string;
  thankYou?: string;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
};

export type Session = {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
}; 