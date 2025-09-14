# Chrono Meister - Local Development Setup

This guide will help you set up a local Supabase database for development.

## Prerequisites

- ✅ Node.js and npm (installed)
- ✅ Supabase CLI (installed)
- ⚠️ Docker Desktop (installed but needs to be running)

## Quick Start

### 1. Start Docker Desktop

Docker Desktop is required for local Supabase development. 

**Option A: Manual Start (Recommended)**
1. Click the Start menu and search for "Docker Desktop"
2. Click on Docker Desktop to launch it
3. Wait for the Docker icon in the system tray to turn green
4. This may take 2-3 minutes on first startup

**Option B: Command Line Start**
```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

**Verify Docker is Running:**
- Look for a green Docker whale icon in your system tray
- Or open PowerShell and run: `& "C:\Program Files\Docker\Docker\resources\bin\docker.exe" version`

### 2. Start Local Supabase
```bash
npm run supabase:start
```

This command will:
- Start local Supabase services (PostgreSQL, API, Auth, Storage, etc.)
- Apply database migrations
- Seed the database with sample data

### 3. Update Environment Variables
The project is already configured to use local Supabase when the `.env.local` file is present with the local configuration.

### 4. Generate TypeScript Types
After starting Supabase, generate the latest TypeScript types:
```bash
npm run db:types
```

### 5. Start Your Frontend
```bash
npm run dev
```

## Local Supabase Services

When running locally, you'll have access to:

- **API**: http://127.0.0.1:54321
- **Database**: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- **Studio**: http://127.0.0.1:54323 (Database management UI)
- **Inbucket**: http://127.0.0.1:54324 (Email testing)

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run supabase:start` | Start local Supabase |
| `npm run supabase:stop` | Stop local Supabase |
| `npm run supabase:status` | Check service status |
| `npm run supabase:reset` | Reset database (will re-run migrations and seed) |
| `npm run supabase:logs` | View service logs |
| `npm run db:types` | Generate TypeScript types from database schema |

## Database Schema

The local database includes the following tables:

### Core Tables
- **employees**: Store employee information
- **groups**: Team/department organization
- **employee_groups**: Many-to-many relationship between employees and groups

### Time Tracking
- **time_entries**: Clock in/out records with project tracking
- **schedules**: Planned work schedules

### Leave Management
- **vacation_requests**: PTO, sick leave, and other time-off requests

### Sample Data
The database is pre-populated with sample employees, time entries, and schedules for testing.

## Switching Between Local and Remote

### For Local Development
Ensure `.env.local` exists with local configuration (already set up).

### For Production/Remote
Comment out the local variables in `.env.local` or delete the file to use the remote Supabase instance.

## Troubleshooting

### Docker Issues
- Ensure Docker Desktop is running
- Try restarting Docker Desktop if you get connection errors
- Run `docker ps` to verify containers are running

### Port Conflicts
If you get port conflicts, you can modify the ports in `supabase/config.toml`:
- API: `port = 54321`
- DB: `port = 54322`
- Studio: `port = 54323`

### Database Reset
If you need to start fresh:
```bash
npm run supabase:reset
```

This will drop all data and re-run migrations and seed data.

## Development Workflow

1. **Start services**: `npm run supabase:start`
2. **Develop**: Make changes to your React components
3. **Database changes**: Edit migration files in `supabase/migrations/`
4. **Reset if needed**: `npm run supabase:reset`
5. **Update types**: `npm run db:types` (after schema changes)
6. **Stop services**: `npm run supabase:stop` (when done)

## Next Steps

- Customize the database schema in `supabase/migrations/`
- Update Row Level Security policies as needed
- Add more seed data in `supabase/seed/seed.sql`
- Connect your React components to the local database
