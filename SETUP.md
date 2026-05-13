# Project Setup Instructions

## Initial Setup Complete ✓

The monorepo structure has been initialized with all necessary configuration files. Follow these steps to complete the setup:

## Step 1: Install Dependencies

Run the following command from the project root to install all dependencies for both frontend and backend:

```bash
npm install
```

This will install:
- Root workspace dependencies (concurrently, prettier)
- Frontend dependencies (React, Vite, TailwindCSS, TypeScript, etc.)
- Backend dependencies (Express, Socket.io, PostgreSQL client, etc.)

## Step 2: Environment Configuration

### Backend Environment
1. Copy the example environment file:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Edit `backend/.env` and configure:
   - Database connection details (PostgreSQL)
   - JWT secret key
   - AWS S3 credentials (for file uploads)
   - Currency conversion API key

### Frontend Environment
1. Copy the example environment file:
   ```bash
   cp frontend/.env.example frontend/.env
   ```

2. The default values should work for local development

## Step 3: Database Setup

1. Create a PostgreSQL database:
   ```bash
   createdb prediction_platform
   ```

2. Database migrations will be implemented in future tasks

## Step 4: Start Development Servers

Run both frontend and backend:
```bash
npm run dev
```

Or run them separately:
```bash
# Terminal 1 - Frontend (http://localhost:3000)
npm run dev:frontend

# Terminal 2 - Backend (http://localhost:5000)
npm run dev:backend
```

## Project Structure Created

```
prediction-platform/
├── frontend/                    # React + TypeScript frontend
│   ├── src/
│   │   ├── components/         # React components (to be implemented)
│   │   ├── contexts/           # React Context providers (to be implemented)
│   │   ├── hooks/              # Custom React hooks (to be implemented)
│   │   ├── services/           # API services (to be implemented)
│   │   ├── types/              # TypeScript type definitions (to be implemented)
│   │   ├── test/               # Test utilities
│   │   ├── App.tsx             # Main App component
│   │   ├── main.tsx            # Entry point
│   │   └── index.css           # Global styles with Tailwind
│   ├── package.json            # Frontend dependencies
│   ├── tsconfig.json           # TypeScript configuration
│   ├── vite.config.ts          # Vite build configuration
│   ├── vitest.config.ts        # Vitest test configuration
│   ├── tailwind.config.js      # TailwindCSS configuration
│   ├── postcss.config.js       # PostCSS configuration
│   ├── .eslintrc.cjs           # ESLint configuration
│   └── index.html              # HTML template
│
├── backend/                     # Node.js + Express backend
│   ├── src/
│   │   ├── routes/             # API route handlers (to be implemented)
│   │   ├── services/           # Business logic services (to be implemented)
│   │   ├── repositories/       # Database access layer (to be implemented)
│   │   ├── middleware/         # Express middleware (to be implemented)
│   │   ├── websocket/          # WebSocket handlers (to be implemented)
│   │   ├── parsers/            # Data parsers (to be implemented)
│   │   ├── types/              # TypeScript type definitions (to be implemented)
│   │   └── index.ts            # Server entry point with basic setup
│   ├── package.json            # Backend dependencies
│   ├── tsconfig.json           # TypeScript configuration
│   ├── vitest.config.ts        # Vitest test configuration
│   └── .eslintrc.cjs           # ESLint configuration
│
├── package.json                 # Root workspace configuration
├── .prettierrc                  # Prettier code formatting config
├── .prettierignore              # Prettier ignore patterns
├── .gitignore                   # Git ignore patterns
├── README.md                    # Project documentation
└── SETUP.md                     # This file

```

## Configuration Files Created

### TypeScript
- ✓ Frontend TypeScript configuration with React JSX support
- ✓ Backend TypeScript configuration for Node.js
- ✓ Strict type checking enabled
- ✓ Path aliases configured (@/* for src/*)

### TailwindCSS
- ✓ Tailwind configuration with custom color palette (avoiding blue)
- ✓ Custom animations (fade-in, slide-up, slide-down)
- ✓ Extended border radius values
- ✓ PostCSS configuration with autoprefixer

### ESLint & Prettier
- ✓ ESLint configured for TypeScript
- ✓ React-specific linting rules
- ✓ Prettier for consistent code formatting
- ✓ Workspace-wide formatting scripts

### Build Tools
- ✓ Vite for fast frontend development and building
- ✓ Vitest for testing (both frontend and backend)
- ✓ tsx for TypeScript execution in backend
- ✓ Concurrent script execution for dev mode

### Testing
- ✓ Vitest configured for both workspaces
- ✓ React Testing Library for frontend component tests
- ✓ fast-check for property-based testing
- ✓ jsdom for DOM testing environment

## Available Scripts

### Root Level
- `npm run dev` - Run both frontend and backend
- `npm run build` - Build both applications
- `npm test` - Run all tests
- `npm run lint` - Lint all code
- `npm run format` - Format all code with Prettier

### Frontend
- `npm run dev:frontend` - Start frontend dev server
- `npm run build:frontend` - Build frontend for production
- `npm run preview` - Preview production build

### Backend
- `npm run dev:backend` - Start backend dev server with hot reload
- `npm run build:backend` - Build backend for production
- `npm run start` - Start production backend server

## Next Steps

After completing the setup above, you can proceed with:
1. Task 1.2: Database schema implementation
2. Task 1.3: Authentication system
3. Task 1.4: Wallet system
4. And subsequent tasks as defined in the spec

## Verification

To verify the setup is working:

1. After running `npm install`, check for any errors
2. Start the dev servers with `npm run dev`
3. Frontend should be accessible at http://localhost:3000
4. Backend health check should respond at http://localhost:5000/api/health
5. You should see "Prediction Platform" displayed in the browser

## Dependencies Installed

### Frontend
- React 18.2.0 with TypeScript
- React Router v6 for routing
- Socket.io Client for real-time updates
- Axios for HTTP requests
- TailwindCSS for styling
- Vite for building
- Vitest + React Testing Library for testing
- fast-check for property-based testing

### Backend
- Express for API server
- Socket.io for WebSocket support
- PostgreSQL client (pg)
- bcrypt for password hashing
- JWT for authentication
- AWS SDK for S3 file uploads
- Zod for validation
- Vitest for testing
- fast-check for property-based testing

## Troubleshooting

### Port Already in Use
If ports 3000 or 5000 are already in use, you can change them:
- Frontend: Edit `frontend/vite.config.ts` and change the `server.port` value
- Backend: Edit `backend/.env` and change the `PORT` value

### Database Connection Issues
Ensure PostgreSQL is running and the connection details in `backend/.env` are correct.

### Module Not Found Errors
Run `npm install` again to ensure all dependencies are installed.

## Support

For issues or questions, refer to:
- README.md for project overview
- Design document in .kiro/specs/prediction-platform-overhaul/design.md
- Requirements document in .kiro/specs/prediction-platform-overhaul/requirements.md
