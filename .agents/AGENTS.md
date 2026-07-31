# Workspace Rules

## Private File Protection
- Strictly ignore and refrain from reading, writing, committing, or logging any private environment files (`.env`, `.env.*`), secret keys, certificates, or private credentials.
- Keep all sensitive keys out of version control.
- Docker configuration files (`Dockerfile`, `docker-compose*.yml`, `.dockerignore`, `nginx.conf`) are standard project deployment manifests and should be tracked for CI/CD builds.
