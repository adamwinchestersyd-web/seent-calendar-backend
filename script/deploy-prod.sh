#!/bin/bash
# Production deploy: pushes the workspace to the PRODUCTION GitHub repo only.
# Hard-coded so production code can never accidentally be pushed to the test repo.
set -e
exec bash "$(dirname "$0")/deploy-github.sh" "adamwinchestersyd-web/seent-calendar-backend" "main"
