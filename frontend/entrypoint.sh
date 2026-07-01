#!/bin/sh
set -e

echo "Waiting for backend at http://backend:8000/api/health ..."

for i in $(seq 1 90); do
  if wget -q -O /dev/null -T 2 http://backend:8000/api/health 2>/dev/null; then
    echo "Backend is healthy, starting nginx..."
    break
  fi
  if [ "$i" -eq 90 ]; then
    echo "Backend not ready after 180s, starting nginx anyway..."
  else
    sleep 2
  fi
done

exec nginx -g "daemon off;"
