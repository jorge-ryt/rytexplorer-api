# 🧭 RYT Explorer API

A **Node.js + TypeScript** backend built with **NestJS**, **GraphQL**, and **Prisma ORM**, serving as the data API for the RYT Explorer platform.  
It provides efficient querying, pagination, and relationships between **blocks**, **transactions**, and other blockchain entities stored in a **PostgreSQL** database.

---

## 🚀 Technologies Used

| Layer               | Technology                                             | Purpose                                    |
| ------------------- | ------------------------------------------------------ | ------------------------------------------ |
| **Runtime**         | [Node.js](https://nodejs.org/)                         | JavaScript runtime environment             |
| **Framework**       | [NestJS](https://nestjs.com/)                          | Modular backend framework                  |
| **API**             | [GraphQL](https://graphql.org/) with `@nestjs/graphql` | Flexible query language for APIs           |
| **ORM**             | [Prisma](https://www.prisma.io/)                       | Type-safe database access                  |
| **Database**        | [PostgreSQL](https://www.postgresql.org/)              | Relational database                        |
| **Migrations**      | [Knex](https://knexjs.org/)                            | Migration and schema version control       |
| **Environment**     | [dotenv](https://www.npmjs.com/package/dotenv)         | Loads environment variables                |
| **WebSockets**      | `@nestjs/websockets`, `@nestjs/platform-ws`            | Real-time communication support            |
| **Package Manager** | [pnpm](https://pnpm.io/)                               | Fast and disk-efficient dependency manager |
| **Language**        | TypeScript                                             | Strongly typed superset of JavaScript      |

---

## 🧱 Installation

# Clone repository

git clone [https://github.com/<your-org>/rytexplorer-api.git](https://github.com/jorge-ryt/rytexplorer-api.git)
cd rytexplorer-api

# Install dependencies

pnpm install

## 📁 Project Structure

```bash
src/
│
├── modules/
│   ├── blocks/
│   │   ├── blocks.module.ts
│   │   ├── blocks.resolver.ts
│   │   ├── blocks.service.ts
│   │   └── entities/
│   │       └── block.entity.ts
│   │
│   ├── transactions/
│   │   ├── transactions.module.ts
│   │   ├── transactions.resolver.ts
│   │   ├── transactions.service.ts
│   │   └── entities/
│   │       ├── transaction.entity.ts
│   │       └── transactions-with-count.entity.ts
│   ├── indexer/
│   │   ├── indexer.module.ts
│   │   ├── indexer.gateway.ts
│   │   ├── indexer.service.ts
│   │   └── queues/
│   │       ├── block.queue.ts
│   │       └── mempool-queue.ts
│   │       └── transaction-queue.ts
│   │
│   └── (other modules...)
│
├── prisma/
│   ├── prima.module.ts
│   └── prisma.service.ts
|
├── redis/
│   ├── redis.module.ts
│   └── redis.service.ts
│
├── main.ts                # Application entry point
├── app.module.ts          # Root module
├── schema.graphql         # (optional) Generated schema
└── prisma/
    └── schema.prisma      # Prisma schema definition
```

## ⚙️ Requirements

- Node.js v20+
- pnpm v9+
- PostgreSQL v14+

## 🧩 Environment Variables

- make a new file at the project root and name it .env
- copy paste the env.example file content into .env file
- make sure env variables are set properly

## 🧪 Running the App

### Generate prima client files

pnpm run gd:generate

### Start in development mode

pnpm run start:dev

### Build and run in production

- pnpm run build
- pnpm run start:prod

### 🐋 Docker Automatization

```bash
# First time setup
pnpm run setup

# After, just restart everything (faster)
pnpm run start
```
