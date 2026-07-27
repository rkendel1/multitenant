#!/bin/bash
# =============================================================================
# Python/Django Entrypoint Script
# =============================================================================
# This script handles database migrations and initial setup before starting
# the Django application.
# =============================================================================

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Multitenant Django Application                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"

# Wait for database to be ready
echo "→ Waiting for database to be ready..."
while ! python -c "
import os
import psycopg2
try:
    conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
    conn.close()
    exit(0)
except Exception:
    exit(1)
" 2>/dev/null; do
    echo "  Database not ready, waiting..."
    sleep 2
done
echo "✓ Database is ready"

# Run migrations
echo "→ Running database migrations..."
python manage.py migrate --noinput || echo "  (No migrations to apply or migrations failed)"

# Collect static files (if STATIC_ROOT is set)
if [ -n "$STATIC_ROOT" ]; then
    echo "→ Collecting static files..."
    python manage.py collectstatic --noinput --clear || echo "  (Static collection skipped)"
fi

# Create platform owner if configured
if [ -n "$MULTITENANT_ADMIN_EMAIL" ] && [ -n "$MULTITENANT_ADMIN_PASSWORD" ]; then
    echo "→ Setting up platform owner..."
    python manage.py setup_platform 2>/dev/null || echo "  (Platform already configured)"
fi

echo ""
echo "✓ Application ready"
echo ""

# Execute the main command
exec "$@"
