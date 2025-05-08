# Form Builder

A modern, accessible form builder application built with React, TypeScript, and TailwindCSS.

## Features

- 🔒 Secure authentication system
- 📝 Create, edit, and delete forms
- 🎯 Multiple field types (text, number, date, radio, checkbox, textarea, select)
- 🔄 Drag and drop field reordering
- 📱 Fully responsive design
- ♿ Accessibility support
- 🌓 Light/dark mode support
- 📊 Form analytics and user session logging

## Tech Stack

- React 18
- TypeScript
- TailwindCSS
- Prisma (PostgreSQL)
- React Query
- React Router
- HeadlessUI
- DaisyUI

## Prerequisites

- Node.js 18+
- PostgreSQL

## Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd form-builder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your database connection string and other configuration.

4. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
  ├── components/     # Reusable components
  ├── context/       # React context providers
  ├── hooks/         # Custom hooks
  ├── layouts/       # Layout components
  ├── pages/         # Page components
  ├── services/      # API services
  ├── types/         # TypeScript types
  └── utils/         # Utility functions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
