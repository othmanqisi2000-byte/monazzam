# Kanban Board

Full-stack Kanban board: React + Tailwind + @hello-pangea/dnd on the frontend,
Node.js + Express + Prisma on the backend, PostgreSQL hosted on Neon.

## 1. Get a Neon database

1. Create a free project at https://neon.tech.
2. In the Neon dashboard, open **Connection Details** and copy two connection
   strings:
   - The **pooled** connection string (host contains `-pooler`) → this is `DATABASE_URL`.
   - The **direct** connection string (no `-pooler`) → this is `DIRECT_URL`.
   Prisma Migrate needs the direct (non-pooled) connection; the running app
   uses the pooled one.

## 2. Backend setup

```bash
cd backend
cp .env.example .env
# edit .env and paste in your Neon DATABASE_URL and DIRECT_URL
npm install
npx prisma generate
npx prisma migrate dev --name init   # creates the tasks table on Neon
npm run dev                          # starts the API on http://localhost:5000
```

Verify it's running: `curl http://localhost:5000/health` should return `{"status":"ok"}`.

## 3. Frontend setup

Open a second terminal:

```bash
cd frontend
cp .env.example .env
# VITE_API_URL should point at the backend, e.g. http://localhost:5000/api
npm install
npm run dev                          # starts the app on http://localhost:5173
```

Open http://localhost:5173 in your browser.

## 4. Environment variables reference

**backend/.env**
| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon pooled connection string, used by the app at runtime |
| `DIRECT_URL` | Neon direct connection string, used by Prisma Migrate |
| `PORT` | Port the Express server listens on (default 5000) |
| `CLIENT_ORIGIN` | Frontend origin allowed by CORS (default http://localhost:5173) |

**frontend/.env**
| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API (default http://localhost:5000/api) |

## 5. Useful Prisma commands

```bash
npx prisma studio          # visual DB browser
npx prisma migrate dev     # create/apply a new migration in development
npx prisma migrate deploy  # apply pending migrations in production
npx prisma generate        # regenerate the Prisma Client after schema changes
```

## 6. Production build

```bash
# frontend
cd frontend
npm run build     # outputs static files to frontend/dist

# backend
cd backend
npm start          # runs the compiled server (make sure NODE_ENV=production
                    # and `prisma migrate deploy` has been run beforehand)
```

## Project structure

```
kanban-app/
├── backend/
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── index.js
│   │   ├── lib/prisma.js
│   │   ├── controllers/taskController.js
│   │   └── routes/taskRoutes.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── index.css
    │   ├── components/
    │   │   ├── KanbanBoard.jsx
    │   │   ├── Column.jsx
    │   │   ├── TaskCard.jsx
    │   │   └── TaskModal.jsx
    │   └── services/api.js
    ├── index.html
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vite.config.js
    ├── .env.example
    └── package.json
```

## API reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | Fetch all tasks, ordered by status then order |
| POST | `/api/tasks` | Create a task (`{ title, description?, status? }`) |
| PATCH | `/api/tasks/:id` | Update a task's title/description/status |
| PUT | `/api/tasks/reorder` | Batch update `{ tasks: [{ id, status, order }] }` after drag-and-drop |
| DELETE | `/api/tasks/:id` | Delete a task |
