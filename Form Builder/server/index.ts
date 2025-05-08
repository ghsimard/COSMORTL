import express, { Request, Response } from 'express';
import type { NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Get directory name for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables first
dotenv.config();

// Initialize Express app
const app = express();

// Initialize Prisma client with error handling
const prisma = new PrismaClient();

const PORT = process.env.PORT || 5173;

// Handle graceful shutdown
let server: any;

const shutdown = async () => {
  console.log('Shutting down server...');
  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
  await prisma.$disconnect();
  process.exit(0);
};

// Handle various shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGUSR2', shutdown); // For nodemon/tsx restart

// Ensure required environment variables are set
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

type JWTExpirationString = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

// Validate JWT expiration time string
function validateJWTExpiresIn(value: string | undefined): JWTExpirationString {
  const defaultExpiration = '7d' as JWTExpirationString;
  if (!value) return defaultExpiration;
  
  // Check if the string matches the pattern: number + unit (s,m,h,d,w,y)
  const validPattern = /^(\d+)([smhdwy])$/;
  const match = value.match(validPattern);
  
  if (!match) return defaultExpiration;
  return value as JWTExpirationString;
}

// Convert JWT expiration string to milliseconds
function getExpirationMs(expiresIn: JWTExpirationString): number {
  const match = expiresIn.match(/^(\d+)([smhdwy])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // Default to 7 days

  const [, value, unit] = match;
  const num = parseInt(value, 10);
  
  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    case 'w': return num * 7 * 24 * 60 * 60 * 1000;
    case 'y': return num * 365 * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000; // Default to 7 days
  }
}

const jwtExpiration = validateJWTExpiresIn(process.env.JWT_EXPIRATION);

const signOptions: SignOptions = {
  expiresIn: jwtExpiration
};

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        isAdmin: boolean;
      };
    }
  }
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Types for form field validation
type FormFieldValidation = {
  minValue?: number;
  maxValue?: number;
  minDigits?: number;
  maxDigits?: number;
  fixedDigits?: number;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
};

interface FormFieldInput {
  label: string;
  type: string;
  required?: boolean;
  order?: number;
  options?: string[];
  validation?: FormFieldValidation;
}

// Authentication middleware
const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as Secret) as { userId: string };
    
    // Check if session exists and is not expired
    const session = await prisma.session.findFirst({
      where: {
        token,
        userId: decoded.userId,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          select: {
            id: true,
            isAdmin: true
          }
        }
      }
    });

    if (!session) {
      // Clean up any expired sessions for this user
      await prisma.session.deleteMany({
        where: {
          OR: [
            { token },
            { userId: decoded.userId, expiresAt: { lt: new Date() } }
          ]
        }
      }).catch(() => {});
      
      res.status(403).json({ message: 'Invalid or expired session' });
      return;
    }

    req.user = { userId: session.user.id, isAdmin: session.user.isAdmin };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(403).json({ message: 'Invalid token' });
    return;
  }
};

// Register endpoint
app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Failed to register user' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Create session
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as Secret,
      signOptions
    );

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + getExpirationMs(jwtExpiration as JWTExpirationString)),
      },
    });

    // Return user data and token
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
      token: session.token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Failed to login' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      await prisma.session.deleteMany({
        where: { token },
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Failed to logout' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user data' });
  }
});

// Form endpoints
app.get('/api/forms', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const forms = await prisma.form.findMany({
      where: req.user!.isAdmin ? undefined : { userId: req.user!.userId },
      include: {
        fields: {
          orderBy: { order: 'asc' }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isAdmin: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(forms);
  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({ message: 'Failed to get forms' });
  }
});

// Get single form
app.get('/api/forms/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    console.log('Fetching form:', id);
    
    const form = await prisma.form.findUnique({
      where: { id },
      include: {
        fields: {
          orderBy: { order: 'asc' }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log('Form found:', form);

    if (!form) {
      res.status(404).json({ message: 'Form not found' });
      return;
    }

    // Allow access if user is admin or form owner
    if (!req.user!.isAdmin && form.userId !== req.user!.userId) {
      res.status(403).json({ message: 'Not authorized to view this form' });
      return;
    }

    // Parse JSON fields and ensure they're in the correct format
    const formWithParsedFields = {
      ...form,
      fields: form.fields.map(field => {
        let options = field.options;
        let validation = field.validation;

        // Only parse if the field is a string
        if (typeof field.options === 'string') {
          try {
            options = JSON.parse(field.options);
          } catch (e) {
            console.error('Error parsing field options:', e);
            options = [];
          }
        }

        if (typeof field.validation === 'string') {
          try {
            validation = JSON.parse(field.validation);
          } catch (e) {
            console.error('Error parsing field validation:', e);
            validation = {};
          }
        }

        return {
          ...field,
          options: options || [],
          validation: validation || {}
        };
      })
    };

    console.log('Sending form with parsed fields:', formWithParsedFields);
    res.json(formWithParsedFields);
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ message: 'Failed to get form' });
  }
});

// Update form creation to handle validation properly
app.post('/api/forms', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, thankYou, fields } = req.body;
    
    if (!title) {
      res.status(400).json({ message: 'Form title is required' });
      return;
    }

    if (!Array.isArray(fields)) {
      res.status(400).json({ message: 'Fields must be an array' });
      return;
    }

    // Create form with fields
    const form = await prisma.form.create({
      data: {
        title,
        description,
        thankYou,
        userId: req.user!.userId,
        fields: {
          create: fields.map((field: FormFieldInput, index: number) => ({
            label: field.label,
            type: field.type,
            required: field.required || false,
            order: field.order ?? index,
            options: field.options as Prisma.JsonValue,
            validation: field.validation as Prisma.JsonValue
          }))
        }
      },
      include: {
        fields: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });
    
    res.status(201).json(form);
  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).json({ message: 'Failed to create form' });
  }
});

app.put('/api/forms/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, thankYou, fields } = req.body;
    
    // Verify form ownership or admin status
    const existingForm = await prisma.form.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!existingForm) {
      res.status(404).json({ message: 'Form not found' });
      return;
    }

    if (!req.user!.isAdmin && existingForm.userId !== req.user!.userId) {
      res.status(403).json({ message: 'Not authorized to update this form' });
      return;
    }

    // Delete existing fields and create new ones
    await prisma.formField.deleteMany({
      where: { formId: id }
    });

    const updatedForm = await prisma.form.update({
      where: { id },
      data: {
        title,
        description,
        thankYou,
        fields: {
          create: fields.map((field: FormFieldInput, index: number) => ({
            label: field.label,
            type: field.type,
            required: field.required || false,
            order: field.order ?? index,
            options: field.options ? JSON.stringify(field.options) : null,
            validation: field.validation ? JSON.stringify(field.validation) : null
          }))
        }
      },
      include: {
        fields: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });
    
    res.json(updatedForm);
  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({ message: 'Failed to update form' });
  }
});

app.delete('/api/forms/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Verify form ownership or admin status
    const form = await prisma.form.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!form) {
      res.status(404).json({ message: 'Form not found' });
      return;
    }

    if (!req.user!.isAdmin && form.userId !== req.user!.userId) {
      res.status(403).json({ message: 'Not authorized to delete this form' });
      return;
    }

    await prisma.form.delete({
      where: { id }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ message: 'Failed to delete form' });
  }
});

// Type for form field
interface FormField {
  id?: string;
  type: string;
  label: string;
  required: boolean;
  options?: any | null;
  validation?: any | null;
}

app.put('/api/forms/:id/fields/:fieldId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id, fieldId } = req.params;
    const field: FormField = req.body;

    const updatedForm = await prisma.form.update({
      where: { id },
      data: {
        fields: {
          update: {
            where: { id: fieldId },
            data: {
              type: field.type,
              label: field.label,
              required: field.required,
              options: field.options,
              validation: field.validation,
            }
          }
        }
      }
    });

    res.json(updatedForm);
  } catch (error) {
    console.error('Update form field error:', error);
    res.status(500).json({ message: 'Failed to update form field' });
  }
});

// Basic error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}/api`);
  console.log(`Database URL: ${process.env.DATABASE_URL}`);
});

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await shutdown();
});

process.on('unhandledRejection', async (error) => {
  console.error('Unhandled Rejection:', error);
  await shutdown();
}); 