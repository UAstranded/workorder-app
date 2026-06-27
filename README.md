# Work Order Manager

A full-stack web application for managing field service work orders.

## Quick Start

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
   (Edit `.env` to change secrets if desired.)

2. Start all services:
   ```bash
   docker-compose up -d
   ```

3. Seed the admin user and default label suggestions:
   ```bash
   docker-compose run --rm seed
   ```

4. Open [http://localhost](http://localhost) and log in with:
   - **Username:** `admin`
   - **Password:** `admin123`

## Usage

- **Dashboard** — list, search, filter, and sort work orders.
- **Create** — add a new work order with identifiers, site info, schedule, status, tasks, and images.
- **Detail view** — view full record, share link, export to Excel, manage image attachments.
- **Edit** — modify any field.
- **Delete** — remove work orders (admin/dispatcher only).
- **Timezone selector** — switch the display timezone in the header bar.
- **Image labels** — attach labeled photos; labels are suggested from previously used values.
- **Export to Excel** — single record or bulk export of selected orders.

## Volumes & Backups

| Volume | Mount Point | Contents |
|--------|-------------|---------|
| `workorder_pgdata` | `/var/lib/postgresql/data` | PostgreSQL database |
| `workorder_uploads` | `/app/uploads` | Uploaded images |

### Backup

```bash
# Database
docker exec workorder-db-1 pg_dump -U postgres workorders > backup.sql

# Uploads
docker run --rm -v workorder_uploads:/data -v .:/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .
```

## Configuration

See `.env.example` for all configurable settings.

---

## Running Natively on Windows (No Docker)

This path runs the app directly on Windows without Docker, using the same codebase.  
The Docker Compose setup continues to work independently.

### Prerequisites

| Dependency | Version | Installer |
|-----------|---------|-----------|
| **Python** | 3.12+ | [python.org](https://www.python.org/downloads/) — check "Add Python to PATH" |
| **Node.js** | 20+ | [nodejs.org](https://nodejs.org/) — includes `npm` |
| **PostgreSQL** | 16+ | [postgresql.org/download/windows/](https://www.postgresql.org/download/windows/) |
| **Git** (optional) | any | [git-scm.com](https://git-scm.com/) — only if cloning the repo |

### First-Time Setup

#### 1. Install & start PostgreSQL

- Run the PostgreSQL installer. Note the **password** you set for the `postgres` user.
- Open **pgAdmin** (installed with PostgreSQL) or use `psql` to create the database:

  ```powershell
  # Using psql from PowerShell:
  & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE workorders;"
  ```

  (Enter the `postgres` user password when prompted.)

- Verify the PostgreSQL Windows service is running:
  ```powershell
  Get-Service postgresql*   # should show Status = Running
  ```

#### 2. Configure environment variables

Create `backend\.env` from the Windows template:

```powershell
cd workorder-app
copy .env.windows backend\.env
```

Then edit `backend\.env` and change the password if yours differs:

```env
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/workorders
```

#### 3. Install backend dependencies

```powershell
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
```

#### 4. Install frontend dependencies

```powershell
cd ..\frontend
npm install
```

#### 5. Seed the admin user & default labels

```powershell
cd ..\backend
.venv\Scripts\python seed.py
```

You should see:

```
Created admin user: admin / admin123
Added label suggestion: Before
…
Seed complete.
```

### Day-to-Day Run

#### One-command startup (recommended)

Double-click `start-windows.ps1` in File Explorer, or run from PowerShell:

```powershell
.\start-windows.ps1
```

This script will:

1. Verify PostgreSQL is running.
2. Copy `.env.windows` → `backend\.env` if missing.
3. Install/update Python + npm deps as needed.
4. Run the seed script (safe to re-run).
5. Open two terminal windows — one for the backend (port **8000**), one for the frontend (port **4170**).
6. Open **http://localhost:4170** in your default browser.

Login with **`admin`** / **`admin123`**.

To stop, close the two terminal windows, or press `Ctrl+C` in each.

#### Manual start (if you prefer separate commands)

Open **two** PowerShell terminals:

**Terminal 1 — Backend (port 8000):**

```powershell
cd backend
.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend (port 4170):**

```powershell
cd frontend
npx vite --host
```

Then open **http://localhost:4170**.

### Differences from Docker Compose

The following variables **must** differ between the Docker and native run paths:

| Variable | Docker value | Native / `.env.windows` value | Reason |
|----------|-------------|-------------------------------|--------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:…@db:5432/workorders` | `postgresql+asyncpg://postgres:…@localhost:5432/workorders` | Docker uses the container name `db` as hostname; native uses `localhost`. |
| `UPLOAD_DIR` | `/app/uploads` | `./uploads` (resolves to `backend\uploads`) | Docker uses a Linux absolute path inside the container; native uses a relative path under the backend directory. |
| `CORS_ORIGINS` | `http://localhost:4170` | `http://localhost:5173,http://localhost:4170` | Docker nginx on port 4170; native Vite dev on port 4170. |
| `PORT` (compose only) | `4170` | _(not used)_ | Only relevant to the Docker Compose port mapping. |

All other variables (`SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `MAX_UPLOAD_SIZE_MB`) can keep the same value.

### Where files live on disk

| Data | Docker (volume) | Native (Windows path) |
|------|----------------|-----------------------|
| **Database** | `workorder_pgdata` (Docker volume) | `C:\Program Files\PostgreSQL\16\data\` (managed by PostgreSQL service) |
| **Uploaded images** | `workorder_uploads` (Docker volume) | `backend\uploads\` (relative to the repo) |
| **Backend logs** | container stdout | terminal window output (or `backend.log` / `frontend.log` if redirected) |

### Backups

#### Database

```powershell
& "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres workorders > backup.sql
```

#### Uploaded images

```powershell
Compress-Archive -Path backend\uploads\* -DestinationPath uploads-backup.zip
```

### Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `asyncpg` fails to install | Missing C compiler / Python headers | Install Microsoft C++ Build Tools from [visualstudio.microsoft.com/visual-cpp-build-tools/](https://visualstudio.microsoft.com/visual-cpp-build-tools/) or use the pre-built wheel: `pip install asyncpg` (the wheel is available for Windows on Python 3.12+). |
| `pq` / `libpq` not found | `psycopg2` / `asyncpg` needs PostgreSQL libraries | Ensure PostgreSQL's `bin` directory is in your `PATH` (the installer usually does this). Restart your terminal after installing PostgreSQL. |
| Port 8000 or 4170 already in use | Another process is using the port | Change the port: for the backend add `--port 8001`; for the frontend edit `frontend/vite.config.ts` → `server.port: 4171`. |
| `npx` is not recognised | Node.js not installed or not on PATH | Re-run the Node.js installer and make sure "Add to PATH" is checked. |
| Login returns "Invalid credentials" | Seed step not run, or wrong password | Run `.venv\Scripts\python seed.py` from the `backend\` directory to re-create the admin user. |
| `Get-Service postgresql*` returns nothing | PostgreSQL service not installed or named differently | Run `Get-Service *postgres*` to find the exact name, then update `start-windows.ps1` or start it manually. |
| File paths with backslashes fail | Escape issue in `.env` | Use forward slashes in `.env` paths (e.g., `UPLOAD_DIR=./uploads`). The current `.env.windows` already uses forward slashes. |
| Firewall prompt on first run | Windows Defender blocking the Python/node processes | Click **Allow access**. The app only listens on localhost, so it's safe. |

## Architecture

- **Backend:** Python / FastAPI + SQLAlchemy (async) + PostgreSQL
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Proxy:** Nginx serves the frontend and proxies API requests to the backend (Docker); Vite dev server proxies for native dev
