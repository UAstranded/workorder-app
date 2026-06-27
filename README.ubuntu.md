# Work Order Manager — Ubuntu Server Deployment

Deploy on Ubuntu Server using **Docker** (standalone) or **CasaOS**.

---

## Option A — Standalone Docker (any Ubuntu Server)

### Prerequisites

```bash
sudo apt update && sudo apt install docker.io docker-compose-v2 -y
sudo systemctl enable --now docker
```

### Deploy

```bash
# Clone or upload the project
git clone <your-repo-url> /opt/workorder-app
cd /opt/workorder-app

# Configure secrets
cp .env.example .env
nano .env   # change SECRET_KEY to a long random string

# Start all services
sudo docker compose up -d

# Seed admin user & default labels
sudo docker compose run --rm seed
```

App is now at **`http://<your-server-ip>:4170`**  
Login: **`admin`** / **`admin123`**

### Manage

```bash
sudo docker compose logs -f        # tail logs
sudo docker compose restart        # restart all services
sudo docker compose down           # stop everything
sudo docker compose pull           # update images (after git pull)
```

### Backup

```bash
# Database
sudo docker compose exec db pg_dump -U postgres workorders > backup-$(date +%F).sql

# Uploads
sudo docker run --rm -v workorder_uploads:/data -v .:/backup alpine tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

### Upgrade

```bash
cd /opt/workorder-app
git pull
sudo docker compose build --no-cache
sudo docker compose up -d
sudo docker compose run --rm seed
```

---

## Option B — CasaOS

CasaOS can run this app via its built-in Docker Compose support.

### Method 1 — App Store (if published)

Search the CasaOS App Store for "Work Order Manager" and install with one click.

### Method 2 — Custom Docker Compose (recommended)

1. Open the **CasaOS dashboard** (`http://<your-server-ip>`).
2. Go to **Settings** → **App Management** → **Add Custom App**.
3. Paste the contents of `docker-compose.casaos.yml` (see below) and click **Submit**.

Alternatively, place the compose file at:

```
/DATA/AppData/workorder/docker-compose.yml
```

CasaOS auto-detects apps in `/DATA/AppData/<name>/docker-compose.yml` and shows them on the dashboard.

### CasaOS-Specific docker-compose.yml

Create **`docker-compose.casaos.yml`** (next to this README) with CasaOS-friendly paths:

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    container_name: workorder-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: workorders
    volumes:
      - ./data/db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - workorder-net

  backend:
    image: workorder-backend
    build: ./backend
    container_name: workorder-backend
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:${DB_PASSWORD:-postgres}@db:5432/workorders
      SECRET_KEY: ${SECRET_KEY:-change-me-to-a-random-secret}
      ACCESS_TOKEN_EXPIRE_MINUTES: "480"
      UPLOAD_DIR: /app/uploads
      CORS_ORIGINS: http://localhost:4170
    volumes:
      - ./data/uploads:/app/uploads
    restart: unless-stopped
    networks:
      - workorder-net

  frontend:
    image: workorder-frontend
    build: ./frontend
    container_name: workorder-frontend
    ports:
      - "${PORT:-4170}:80"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - workorder-net

  seed:
    image: workorder-backend
    build: ./backend
    container_name: workorder-seed
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:${DB_PASSWORD:-postgres}@db:5432/workorders
      SECRET_KEY: ${SECRET_KEY:-change-me-to-a-random-secret}
    command: python seed.py
    restart: "no"
    networks:
      - workorder-net

networks:
  workorder-net:
    driver: bridge
```

> **Note:** This uses bind mounts (`./data/db`, `./data/uploads`) instead of named volumes so CasaOS can manage the data from its UI. Adjust the port via the `PORT` environment variable in CasaOS app settings.

### CasaOS First-Run Setup

After the app appears on your CasaOS dashboard:

1. Click the app icon to open it.
2. If the backend starts before the DB is ready (502 error), wait 30 seconds and refresh.
3. The **seed** service runs once during startup. If the admin user wasn't created, run in CasaOS terminal:
   ```bash
   docker exec workorder-backend python seed.py
   ```

### Data Location (CasaOS)

| Data | Path on disk |
|------|-------------|
| Database | `/DATA/AppData/workorder/data/db/` |
| Uploaded images | `/DATA/AppData/workorder/data/uploads/` |

### Backup (CasaOS)

```bash
# Database
docker exec workorder-db pg_dump -U postgres workorders > /DATA/AppData/workorder/backup-$(date +%F).sql

# Uploads
tar czf /DATA/AppData/workorder/uploads-$(date +%F).tar.gz -C /DATA/AppData/workorder/data/uploads .
```

---

## Firewall

```bash
sudo ufw allow 4170/tcp
```

If you changed `PORT` in `.env`, open that port instead.

## Reverse Proxy (optional)

For a domain name with SSL, put **Caddy** or **Nginx Proxy Manager** (available as a CasaOS app) in front:

```
your-domain.com {
    reverse_proxy localhost:4170
}
```

CasaOS users: install **Nginx Proxy Manager** from the CasaOS App Store for a web UI.
