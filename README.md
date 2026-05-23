# 📊 Pulse Board Poll System (Votyx)

A state-of-the-art, high-concurrency, real-time polling and voting platform. This monorepo is engineered with **React 19** on the frontend and a **Node.js/Express 5** backend. It uses **PostgreSQL** and **Drizzle ORM** for persistent storage, **Redis/Valkey** for fast-path caching & Pub/Sub, and **BullMQ** for robust background job processing.

---

## 🎯 What We Are Doing Here (Project Overview)

The Pulse Board Poll System is designed to handle high-frequency, concurrent voting with low latency. Rather than loading the primary relational database with synchronous writes during surges of public traffic, the system separates concerns into a **Redis Fast-Path** for immediate updates and a **BullMQ Background Queue** for durable storage persistence.

### Key Architectural Concepts
1. **Redis Fast-Path Deduplication & Counter Increments**: When a vote is received, the server checks duplicate status and increments counters instantly in Redis (using Valkey). This keeps request response times extremely low.
2. **Asynchronous Durability Queue (BullMQ)**: Votes are pushed to a Redis-backed BullMQ queue (`poll-votes`). The HTTP request completes immediately, freeing the API thread pool.
3. **Background Worker Batch Persistence**: A dedicated BullMQ worker pulls jobs from the queue, aggregates them using a `BatchVotePersistenceService`, and writes them to PostgreSQL in bulk transactions once size thresholds or time flushes are met.
4. **WebSocket Live Sync (Socket.io)**: Vote events are published via Redis Pub/Sub, where Socket.io processes broadcast live counts to creator dashboards in real-time.

---

## 🏗️ System Architecture

```mermaid
graph TD
    %% Styling Definitions
    classDef client fill:#e1f5fe,stroke:#039be5,stroke-width:2px,color:#01579b;
    classDef server fill:#efebe9,stroke:#8d6e63,stroke-width:2px,color:#3e2723;
    classDef redis fill:#ffebee,stroke:#e53935,stroke-width:2px,color:#b71c1c;
    classDef db fill:#efe8e0,stroke:#f57c00,stroke-width:2px,color:#e65100;
    classDef ws fill:#e8f5e9,stroke:#4caf50,stroke-width:2px,color:#1b5e20;

    subgraph Frontend [pb-client React App]
        UI[React 19 & Tailwind UI]:::client
        Router[TanStack Router]:::client
        Store[Zustand Store & Sonner]:::client
        UI --> Router
        UI --> Store
    end

    subgraph Backend [pb-server Express App]
        API[Express 5 API Gateway]:::server
        Auth[Auth Module]:::server
        PollMod[Poll Service]:::server
        API --> Auth
        API --> PollMod
    end

    subgraph Queue_Cache [Redis / Valkey Cache & Queue]
        DupeCheck[(Redis: Vote Deduplication Locks)]:::redis
        LiveMetrics[(Redis: Live Vote Option Counters)]:::redis
        RedisPubSub[(Redis: Pub/Sub Broadcasts)]:::redis
        BullMQ[BullMQ: 'poll-votes' Queue]:::redis
    end

    subgraph Background_Workers [BullMQ Workers]
        Worker[BullMQ Vote Worker]:::server
        BatchService[Batch Vote Persistence Service]:::server
        Worker --> BatchService
    end

    subgraph Database [PostgreSQL Storage]
        Drizzle[Drizzle ORM Mapping]:::db
        PG[(PostgreSQL DB)]:::db
        Drizzle --> PG
    end

    subgraph WebSockets [Socket.IO Server]
        SocketServer[Socket.IO WS server]:::ws
    end

    %% Communications
    UI -->|REST API Calls| API
    PollMod -->|1. Deduplicate & Counter Lock| DupeCheck
    PollMod -->|2. Increment Counts| LiveMetrics
    PollMod -->|3. Publish updates| RedisPubSub
    PollMod -->|4. Push Vote Payload| BullMQ
    
    BullMQ -->|Pulls Jobs| Worker
    BatchService -->|5. Bulk Batch Insert| Drizzle

    RedisPubSub -.->|Notify state changes| SocketServer
    SocketServer -.->|Broadcast Live Counts| Store
    Store <-->|Active websocket connection| SocketServer
```

---

## 🔄 Core Application Flows

Here is how the components interact under the hood during the lifecycle.

### 1. Creator Poll Creation Flow
```mermaid
sequenceDiagram
    autonumber
    actor Creator as Poll Creator
    participant FE as React Frontend (pb-client)
    participant BE as Express Backend (pb-server)
    participant DB as PostgreSQL Database

    Creator->>FE: Log in & open 'Create Poll'
    FE->>BE: GET /current-user (Verify session)
    BE-->>FE: User validated
    Creator->>FE: Configure title, questions, and choices
    Creator->>FE: Click "Create Poll"
    FE->>BE: POST /polls (Payload: title, questions, options)
    Note over BE: Validates request format & permissions
    BE->>DB: Insert Poll, Questions, Options
    DB-->>BE: Return generated IDs
    BE-->>FE: Return created poll and Shareable Slug
    FE-->>Creator: Display Shareable Link & Success Toast
```

### 2. Poll Submission & Real-time Persistence Flow (Redis + BullMQ)
```mermaid
sequenceDiagram
    autonumber
    actor Voter as Public Voter
    participant FE_Voter as Voter UI (React)
    participant BE as Express Backend (pb-server)
    participant Redis as Redis / Valkey Cache
    participant MQ as BullMQ Queue
    participant Worker as BullMQ Vote Worker
    participant DB as PostgreSQL Database
    participant WS as Socket.IO Hub
    participant FE_Creator as Creator Dashboard (React)

    Voter->>FE_Voter: Selects options and clicks "Submit"
    FE_Voter->>BE: POST /public/poll/:slug/respond
    
    rect rgb(240, 248, 255)
        note over BE, Redis: Redis Fast-Path (Deduplication & Counter Increment)
        BE->>Redis: Set voter lock (NX mode with TTL)
        Redis-->>BE: Lock acquired successfully
        BE->>Redis: Increment option counters & total counts (Pipeline)
        Redis-->>BE: Return current live counts
        BE->>Redis: recordVoteAnalytics (Minute buckets)
    end

    rect rgb(230, 242, 230)
        note over BE, WS: Real-time Pub/Sub Broadcast
        BE->>Redis: Publish vote details to channel
        Redis-->>WS: Deliver event to WS adaptor
        WS->>FE_Creator: Broadcast live counts via WebSocket
        Note over FE_Creator: Creator charts update immediately
    end

    rect rgb(255, 240, 245)
        note over BE, MQ: Asynchronous Queueing
        BE->>MQ: Enqueue vote payload (add job)
        BE-->>FE_Voter: Return HTTP 200 (Success, vote queued)
        FE_Voter-->>Voter: Show completion state
    end

    rect rgb(255, 248, 220)
        note over Worker, DB: Background Worker Batch Processing
        Worker->>MQ: Pull pending vote jobs
        Worker->>Worker: Accumulate in BatchVotePersistenceService
        note over Worker: Once batch size met or timeout triggers
        Worker->>DB: Bulk Insert: Sessions, Responses & Answers (Transaction)
        DB-->>Worker: Confirm Transaction Write
        Worker->>MQ: Complete/Clean Job
    end
```

---

## 📂 Project Directory Structure

```
pulse-board-poll-system/
├── pb-client/                 # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI elements (layouts, charts, skeletons)
│   │   ├── context/           # React context providers
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Page components (createPoll, results, dashboard, etc.)
│   │   ├── routes/            # TanStack Routing system
│   │   ├── store/             # Zustand state management (global actions & stores)
│   │   ├── services/          # API & Socket.io client connectors
│   │   ├── types/             # Frontend type definitions
│   │   ├── utils/             # Utility and helper functions
│   │   ├── main.tsx           # Entry file mounting the React app
│   │   └── index.css          # Styling declarations
│   ├── package.json           # Frontend scripts & packages
│   └── vite.config.ts         # Vite server configuration
│
├── pb-server/                 # Express Backend
│   ├── src/
│   │   ├── modules/           # Module-based architecture splits
│   │   │   ├── auth/          # OIDC controllers, middlewares, & services
│   │   │   └── poll/          # Poll lifecycle, responses, live aggregation
│   │   │       ├── model/     # Drizzle schemas (polls, questions, answers, etc.)
│   │   │       ├── realtime/  # BullMQ queues, workers, Redis counters, and pub/sub
│   │   │       │   ├── vote.queue.ts                 # BullMQ queues definitions
│   │   │       │   ├── vote.worker.ts                # BullMQ worker initiation
│   │   │       │   ├── batch-vote-persistence.service.ts # Aggregated inserts
│   │   │       │   ├── redis-counter.service.ts      # Live Redis counters
│   │   │       │   └── duplicate-vote.service.ts     # Redis deduplication lock
│   │   │       └── ...
│   │   ├── config/            # Server configuration (environment variables)
│   │   ├── routes/            # Global API Router mappings
│   │   ├── common/            # Shared errors, constants, helpers
│   │   ├── workers/           # Entry scripts for standalone process workers
│   │   │   └── vote.worker.ts # Run background worker individually
│   │   ├── index.ts           # Runs server and in-process worker listener
│   │   └── app.ts             # Express & middleware initialization
│   ├── drizzle/               # Drizzle generated migration sql scripts
│   ├── docker-compose.yml     # PostgreSQL & Redis service definitions
│   ├── drizzle.config.js      # DB schema registration config
│   └── package.json           # Backend scripts & packages
│
├── package.json              # Monorepo workspaces definition & runner scripts
└── README.md                  # Comprehensive Documentation
```

---

## 🛠️ Technical Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React 19, TailwindCSS | User interfaces & responsive page layouts |
| **Routing** | TanStack Router | Type-safe declarative client-side routes |
| **Client State** | Zustand | State management & web-socket synchronization states |
| **Backend Framework** | Express 5 | RESTful controllers, APIs and middleware pipelines |
| **Server Language** | TypeScript | Strong typing across both server and client |
| **Asynchronous Jobs** | BullMQ | Redis-backed queues for votes persistence |
| **Caching & Pub/Sub** | Redis (Valkey) | Instant duplicate checks, live metrics, and message broker |
| **WebSockets** | Socket.io | Bi-directional streaming for live dashboard updates |
| **Database** | PostgreSQL 17 | Relational database engine |
| **ORM** | Drizzle ORM | Database schemas, type-safe queries, & migrations |

---

## 📦 Prerequisites

Ensure you have the following installed on your local environment:
- **Node.js** v18 or higher
- **npm** v9 or higher
- **Docker** & **Docker Compose** (for running the PostgreSQL & Redis containers)

---

## 🚀 Quick Start

### One-Command Startup

Start the PostgreSQL & Redis database containers, the Express API, and the React dev server simultaneously using a single command run from the project root:

```bash
npm run start:db && npm run dev
```

Alternatively, run the complete automated workspace setup script:

```bash
npm run setup
```

The application will be accessible at:
- **Client**: [http://localhost:5173](http://localhost:5173)
- **Server**: [http://localhost:3000](http://localhost:3000)
- **Database**: `localhost:5434`
- **Redis Cache**: `localhost:6379`

---

### Step-by-Step Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/Subhrangsu90/pulse-board-poll-system.git
cd pulse-board-poll-system
```

#### 2. Install Root Dependencies
```bash
npm install
```
> [!NOTE]  
> The root `package.json` is set up with npm workspaces. Running `npm install` at the root automatically installs dependencies for both `pb-client` and `pb-server`.

#### 3. Setup Environment Variables
Create a `.env` file in the `pb-server/` directory:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/pulse_board_db
REDIS_URL=redis://localhost:6379
NODE_ENV=development
PORT=3000
```

#### 4. Run DB Migrations
To set up database tables according to current models, execute:
```bash
npm run db:migrate
```

---

## 📜 Monorepo Scripts Reference

All commands listed below must be run from the **monorepo root folder** unless specified.

| Command | Action |
| :--- | :--- |
| `npm run setup` | Automatically installs dependencies and boots the database/cache containers |
| `npm run dev` | Spins up backend API, frontend client, and PostgreSQL/Redis concurrently |
| `npm run dev:server` | Starts the Express backend server (and runs the in-process BullMQ worker) |
| `npm run dev:client` | Starts the React frontend development server only |
| `npm run build` | Builds client and server packages for production |
| `npm run lint` | Runs ESLint analysis across client and server packages |
| `npm run format` | Standardizes codebase files format |
| `npm run start:db` | Starts the PostgreSQL & Redis containers via Docker Compose |
| `npm run stop:db` | Shuts down the PostgreSQL & Redis Docker containers |
| `npm run db:migrate` | Executes all pending migrations on the database |
| `npm run db:generate` | Generates a new migration SQL file after schema changes |
| `npm run db:studio` | Launches Drizzle Studio GUI for graphical table views |

### Run Background Worker Separately
To scale background processing, you can run the BullMQ worker in a standalone process:
```bash
# In the pb-server/ folder:
npm run dev:worker   # Development (using tsx)
npm run worker:vote  # Production (compiled js)
```

---

## 🐛 Troubleshooting

### Port Conflicts
If you receive standard port-in-use errors, adjust configurations:
- **Client Port (5173)**: Modify `pb-client/vite.config.ts`
- **Server Port (3000)**: Update the `PORT` key in `pb-server/.env`
- **Database Port (5434)**: Modify `pb-server/docker-compose.yml`
- **Redis Port (6379)**: Modify `pb-server/docker-compose.yml`

### DB or Redis Connection Failure
1. Confirm Docker is up and running:
   ```bash
   docker ps
   ```
2. Inspect logs:
   ```bash
   docker-compose -f pb-server/docker-compose.yml logs
   ```
3. Ensure the `DATABASE_URL` and `REDIS_URL` match host, port, and credentials in your `.env`.

---

## 📄 License

ISC License
