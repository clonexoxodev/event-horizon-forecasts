# Quick Start Guide - Database Setup

This guide will help you quickly set up the PostgreSQL database for the Prediction Platform.

## Step 1: Install PostgreSQL

If you don't have PostgreSQL installed, install it:

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

## Step 2: Create Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Or on Windows/macOS without sudo:
psql -U postgres
```

Then run these SQL commands:
```sql
CREATE DATABASE prediction_platform;
CREATE USER prediction_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE prediction_platform TO prediction_user;
\c prediction_platform
GRANT ALL ON SCHEMA public TO prediction_user;
\q
```

## Step 3: Configure Environment

Create a `.env` file in the backend directory:
```bash
cp .env.example .env
```

Update the database credentials in `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prediction_platform
DB_USER=prediction_user
DB_PASSWORD=your_password
```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Initialize Database

```bash
npm run db:init
```

You should see:
```
Database connected successfully at: [timestamp]
Database initialization completed successfully
Created tables:
  - users
  - wallets
  - markets
  - positions
  - transactions
  - leaderboard_entries
  - notifications
```

## Step 6: Start the Server

```bash
npm run dev
```

You should see:
```
Database connected successfully at: [timestamp]
Server running on port 5000
WebSocket server ready
Database connected and ready
```

## Verify Setup

Test the API:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Prediction Platform API is running"
}
```

## Troubleshooting

### "Connection refused"
- Make sure PostgreSQL is running
- Check the port (default is 5432)

### "Authentication failed"
- Verify username and password in `.env`
- Make sure you granted privileges to the user

### "Database does not exist"
- Run the CREATE DATABASE command again
- Check the database name in `.env`

## Next Steps

- See `DATABASE_SETUP.md` for detailed documentation
- Run tests: `npm test`
- Reset database: `npm run db:reset` (drops and recreates all tables)

## Database Management Commands

```bash
# Initialize database (create tables)
npm run db:init

# Drop all tables
npm run db:drop

# Reset database (drop and recreate)
npm run db:reset

# Run tests
npm test

# Start development server
npm run dev
```
