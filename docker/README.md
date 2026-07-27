# Docker Setup for Multitenant

This directory contains Docker configuration for running a "batteries included" multitenant application with PostgreSQL, local Convex backend, and all required services.

## Quick Start

```bash
# 1. Copy environment configuration
cp .env.example .env

# 2. Start all services
docker compose up -d

# 3. View logs
docker compose logs -f
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Compose Network                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  PostgreSQL  │  │ Convex Local │  │  Redis (optional)    │  │
│  │    :5432     │  │    :3210     │  │       :6379          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│         │                 │                    │                │
│         └────────────────┼────────────────────┘                │
│                          │                                      │
│         ┌────────────────┼────────────────┐                    │
│         │                │                │                    │
│         ▼                ▼                ▼                    │
│  ┌─────────────────────────────────────────────┐              │
│  │              Application                     │              │
│  │  ┌──────────────┐  ┌──────────────────┐    │              │
│  │  │   Node.js    │  │   Python/Django  │    │              │
│  │  │    :3000     │  │      :8000       │    │              │
│  │  └──────────────┘  └──────────────────┘    │              │
│  └─────────────────────────────────────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Available Profiles

Docker Compose profiles allow you to start different combinations of services:

| Profile | Services | Use Case |
|---------|----------|----------|
| (default) | PostgreSQL, Convex Local | Just the backend services |
| `node` | + Node.js App | Node.js/TypeScript development |
| `python` | + Python/Django App | Django development |
| `cache` | + Redis | When you need caching/sessions |
| `admin` | + Adminer | Database administration UI |
| `full` | All services | Complete development environment |

### Examples

```bash
# Start only backend services (default)
docker compose up -d

# Start with Node.js application
docker compose --profile node up -d

# Start with Python/Django application
docker compose --profile python up -d

# Start everything
docker compose --profile full up -d

# Multiple profiles
docker compose --profile node --profile cache up -d
```

## Services

### PostgreSQL

- **Image**: `postgres:16-alpine`
- **Port**: `5432` (configurable via `POSTGRES_PORT`)
- **Default credentials**:
  - User: `multitenant`
  - Password: `multitenant_secret`
  - Database: `multitenant_db`

The database is automatically initialized with the schema defined in `docker/init-db.sql`.

**Connect with psql**:
```bash
docker compose exec postgres psql -U multitenant -d multitenant_db
```

### Local Convex Backend

A mock Convex server for local development and testing.

- **Port**: `3210` (configurable via `CONVEX_PORT`)
- **API Endpoints**:
  - `POST /api/query` - Execute queries
  - `POST /api/mutation` - Execute mutations
  - `GET /health` - Health check

> **Note**: This is a development mock. For production, use [Convex Cloud](https://convex.dev).

### Node.js Application

The JavaScript/TypeScript multitenant application.

- **Port**: `3000` (configurable via `APP_PORT`)
- **Profile**: `node` or `full`

### Python/Django Application

The Python multitenant application.

- **Port**: `8000` (configurable via `DJANGO_PORT`)
- **Profile**: `python` or `full`

### Redis (Optional)

In-memory cache and session store.

- **Port**: `6379` (configurable via `REDIS_PORT`)
- **Profile**: `cache` or `full`

### Adminer (Optional)

Web-based database administration tool.

- **Port**: `8080` (configurable via `ADMINER_PORT`)
- **Profile**: `admin` or `full`
- **URL**: http://localhost:8080

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `multitenant` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `multitenant_secret` | PostgreSQL password |
| `POSTGRES_DB` | `multitenant_db` | Database name |
| `MULTITENANT_BASE_DOMAIN` | `localhost` | Base domain for tenancy |
| `GITHUB_CLIENT_ID` | - | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | - | GitHub OAuth secret |
| `GOOGLE_CLIENT_ID` | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | - | Google OAuth secret |
| `MULTITENANT_ADMIN_EMAIL` | `admin@example.com` | Platform owner email |
| `MULTITENANT_ADMIN_PASSWORD` | ⚠️ **CHANGE ME** | Platform owner password (must be changed!) |

## Development Workflows

### Building Images

```bash
# Build all images
docker compose build

# Build specific service
docker compose build app-node
docker compose build app-python

# Force rebuild without cache
docker compose build --no-cache
```

### Accessing Containers

```bash
# Shell into Node.js container
docker compose exec app-node sh

# Shell into Python container
docker compose exec app-python bash

# Shell into PostgreSQL
docker compose exec postgres psql -U multitenant -d multitenant_db
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app-node
docker compose logs -f postgres
```

### Database Operations

```bash
# Run migrations (Django)
docker compose exec app-python python manage.py migrate

# Create superuser (Django)
docker compose exec app-python python manage.py createsuperuser

# Reset database
docker compose down -v
docker compose up -d
```

### Stopping Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v

# Stop specific profile
docker compose --profile node down
```

## Volumes

| Volume | Purpose |
|--------|---------|
| `postgres_data` | PostgreSQL database files |
| `convex_data` | Local Convex data persistence |
| `redis_data` | Redis persistence |
| `node_modules` | Node.js dependencies |

## Networking

All services are connected via the `multitenant-network` bridge network. Services can communicate using their service names as hostnames:

- `postgres` - PostgreSQL server
- `convex-local` - Local Convex server
- `redis` - Redis server
- `app-node` - Node.js application
- `app-python` - Python application

## Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
lsof -i :5432

# Use different port
POSTGRES_PORT=5433 docker compose up -d
```

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker compose logs postgres

# Verify container is running
docker compose ps

# Test connection
docker compose exec postgres pg_isready -U multitenant
```

### Permission Issues

```bash
# Fix permissions on volumes
docker compose down
docker volume rm multitenant_postgres_data
docker compose up -d
```

### Rebuild From Scratch

```bash
# Nuclear option - removes everything
docker compose down -v --rmi all
docker compose up -d --build
```

## Production Considerations

⚠️ **SECURITY WARNING**: The default configuration is for development only. Before deploying to production:

### Critical Security Steps

1. **🔐 CHANGE ALL DEFAULT PASSWORDS IMMEDIATELY**
   - The default passwords (`multitenant_secret`, `CHANGE_ME_BEFORE_PRODUCTION`) are **insecure and publicly known**
   - Generate strong, unique passwords for:
     - `POSTGRES_PASSWORD`
     - `MULTITENANT_ADMIN_PASSWORD`
     - Any other secrets

2. **Use Convex Cloud** instead of local mock
   - The local Convex server is a development mock only
   - For production, use [Convex Cloud](https://convex.dev)

3. **Enable SSL/TLS** for database connections
4. **Set up proper backups** for PostgreSQL
5. **Use secrets management** (Docker Secrets, Vault, etc.)
6. **Configure resource limits** for containers
7. **Set up monitoring** (Prometheus, Grafana, etc.)

### Example production compose override:

```yaml
# docker-compose.prod.yml
services:
  postgres:
    deploy:
      resources:
        limits:
          memory: 1G
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    external: true
```

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
