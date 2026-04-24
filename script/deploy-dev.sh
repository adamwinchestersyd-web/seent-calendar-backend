#!/bin/bash
# Dev deploy: pushes the workspace to the TEST GitHub repo only.
# Hard-coded so dev code can never be pushed to the production repo.
set -e
exec bash "$(dirname "$0")/deploy-github.sh" "adamwinchestersyd-web/seent-dev" "main"
