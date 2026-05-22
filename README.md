# Votyx Poll System

A real-time polling and voting system built with modern web technologies. This monorepo contains both the client and server components for a dynamic poll management platform.

## 📋 Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Development](#development)
- [Building](#building)
- [Database](#database)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

## 🏗️ Architecture

This is a **monorepo** containing two main packages:

- **pb-client** - React + TypeScript frontend with Vite and TailwindCSS
- **pb-server** - Express.js + Node.js backend with WebSocket support via Socket.io

Both services communicate in real-time for live poll updates.

## 💻 Tech Stack

### Frontend (pb-client)

- **Framework**: React 19
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: TanStack Router
- **Styling**: TailwindCSS
- **Linting**: ESLint

### Backend (pb-server)

- **Framework**: Express.js 5
- **Language**: TypeScript
- **Database**: PostgreSQL 17
- **ORM**: Drizzle ORM
- **Real-time**: Socket.io
- **Linting**: ESLint
- **Formatting**: Prettier

### Database

- **PostgreSQL 17** (Docker container)
- **Port**: 5434 (internal: 5432)

## 📦 Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- **Docker** and **Docker Compose**

## 🚀 Quick Start

### One-Command Startup

Start everything (database + server + client) in one go:

```bash
npm run start:db && npm run dev
```

Or if you prefer a custom setup script:

```bash
npm run setup
```

The application will be available at:

- Client: http://localhost:5173
- Server: http://localhost:3000
- Database: localhost:5434

### 📥 Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/Subhrangsu90/pulse-board-poll-system.git
cd pulse-board-poll-system
```

#### 2. Install Root Dependencies

```bash
npm install
```

This automatically installs dependencies for both pb-client and pb-server.

#### 3. Environment Setup

Create a .env file in pb-server:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/pulse_board_db
NODE_ENV=development
PORT=3000
```

#### 4. Initialize Database

```bash
npm run db:migrate
```

### 🔧 Development

Start All Services

```bash
npm run dev
```

This runs:

- PostgreSQL database (Docker)
- Express server with hot reload
- React client with Vite HMR
- Start Individual Services

```bash
# Client only
npm run dev:client

# Server only
npm run dev:server

# Database only
npm run start:db
```

### 🏗️ Building

Build both packages for production:

```bash
npm run build
```

Individual builds:

```bash
# Build server
cd pb-server && npm run build

# Build client
cd pb-client && npm run build
```

### 🗄️ Database

Database Management Commands

```bash
# Start PostgreSQL container
npm run start:db

# Run migrations
npm run db:migrate

# Generate new migrations
npm run db:generate

# Open Drizzle Studio (visual database editor)
npm run db:studio

# Stop database
npm run stop:db
```

### Database Details:

- Host: localhost
- Port: 5434
- User: postgres
- Password: postgres
- Database: pulse_board_db

### 📂 Project Structure

```Code
pulse-board-poll-system/
├── pb-client/                 # React frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── pb-server/                 # Express backend
│   ├── src/
│   ├── dist/
│   ├── package.json
│   ├── tsconfig.json
│   └── docker-compose.yml
├── package.json              # Root monorepo config
├── README.md
└── .gitignore
```

### 📜 Scripts

#### Root Level Scripts

| Command               | Description                          |
| --------------------- | ------------------------------------ |
| `npm run dev`         | Start server and client together     |
| `npm run dev:server`  | Start only Express server            |
| `npm run dev:client`  | Start only React client              |
| `npm run build`       | Build both packages                  |
| `npm run lint`        | Lint both packages                   |
| `npm run format`      | Format server code with Prettier     |
| `npm run install:all` | Install dependencies in all packages |
| `npm run start:db`    | Start PostgreSQL with Docker         |
| `npm run stop:db`     | Stop PostgreSQL container            |
| `npm run db:migrate`  | Run database migrations              |
| `npm run db:generate` | Generate new migrations              |
| `npm run db:studio`   | Open Drizzle Studio                  |
| `npm run setup`       | Full setup (install + db)            |

<style>
table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #080808;
  padding: 10px 14px;
  text-align: left;
}

</style>

#### Server-Only Scripts

```bash
cd pb-server
npm run dev         # Start with hot reload
npm run build       # Build TypeScript
npm run typecheck   # Type check only
npm run lint        # Run ESLint
npm run format      # Format with Prettier
npm run start       # Run production build
```

#### Client-Only Scripts

```bash
cd pb-client
npm run dev         # Start dev server
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint
```

### 🐛 Troubleshooting

#### Port Already in Use

If ports are already in use, modify in:

- Client port: `pb-client/vite.config.ts` (default 5173)
- Server port: `pb-server/.env or code` (default 3000)
- Database port: `pb-server/docker-compose.yml` (default 5434)

### Database Connection Issues

1. Ensure Docker is running:

```bash
docker ps
```

2. Check database logs:

```bash
docker-compose -f pb-server/docker-compose.yml logs postgres
```

3. Verify DATABASE_URL in `.env`:

```env
postgresql://postgres:postgres@localhost:5434/pulse_board_db
```

#### Dependencies Not Installing

Clear cache and reinstall:

```bash
npm run install:all
```

### 📝 Contributing

- Create a feature branch
- Make your changes
- Run linting: npm run lint
- Run formatting: npm run format
- Submit a pull request

### 📄 License

ISC

### 🎯 Next Steps

1. Setup: Run npm run setup
2. Start: Run npm run dev
3. Build: Run npm run build
4. Deploy: Use your preferred hosting platform
