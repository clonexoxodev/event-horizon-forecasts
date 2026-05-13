# Prediction Platform

A full-stack prediction platform enabling users to make predictions on binary outcome markets with transparent wallet management and social engagement features.

## Project Structure

This is a monorepo containing both frontend and backend applications:

```
prediction-platform/
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── test/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── backend/           # Node.js + Express backend
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   ├── websocket/
│   │   ├── parsers/
│   │   └── types/
│   ├── package.json
│   └── tsconfig.json
└── package.json       # Root workspace configuration
```

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS
- **Routing**: React Router v6
- **State Management**: React Context API + Custom Hooks
- **Real-time**: Socket.io Client
- **HTTP Client**: Axios
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library + fast-check

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express
- **Database**: PostgreSQL
- **Real-time**: Socket.io
- **Authentication**: JWT with httpOnly cookies
- **Password Hashing**: bcrypt
- **File Storage**: AWS S3
- **Validation**: Zod
- **Testing**: Vitest + fast-check

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- AWS account (for S3 file storage)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration
```

4. Set up the database:
```bash
# See backend/QUICK_START.md for detailed instructions

# Quick setup:
cd backend

# Create PostgreSQL database and user
sudo -u postgres psql
# Then run:
# CREATE DATABASE prediction_platform;
# CREATE USER prediction_user WITH PASSWORD 'your_password';
# GRANT ALL PRIVILEGES ON DATABASE prediction_platform TO prediction_user;

# Initialize database tables
npm run db:init
```

### Development

Run both frontend and backend in development mode:
```bash
npm run dev
```

Or run them separately:
```bash
# Frontend only (runs on http://localhost:3000)
npm run dev:frontend

# Backend only (runs on http://localhost:5000)
npm run dev:backend
```

### Building for Production

Build both applications:
```bash
npm run build
```

Or build separately:
```bash
npm run build:frontend
npm run build:backend
```

### Testing

Run tests for all workspaces:
```bash
npm test
```

### Code Quality

Lint all code:
```bash
npm run lint
```

Format all code:
```bash
npm run format
```

## Features

- Zero-balance wallet initialization with multi-currency support (NGN/USD)
- Real-time market updates and position tracking
- Multi-market cart for bulk position entry
- Social features (leaderboards, sharing, activity feeds)
- Profile management with social media integration
- Comprehensive transaction history
- Property-based testing for critical business logic

## Architecture

The platform follows a three-tier architecture:
- **Client Layer**: React components with Context-based state management
- **API Layer**: Express REST API with WebSocket support
- **Database Layer**: PostgreSQL with transactional integrity

## License

Private - All rights reserved
