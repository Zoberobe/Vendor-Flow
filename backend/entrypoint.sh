#!/bin/sh
set -eu

python manage.py migrate --noinput

if [ -n "${VENDORFLOW_DEMO_PASSWORD:-}" ]; then
    python manage.py seed_demo
fi

exec gunicorn config.wsgi:application \
    --bind "0.0.0.0:${PORT:-10000}" \
    --workers "${WEB_CONCURRENCY:-1}" \
    --access-logfile -
