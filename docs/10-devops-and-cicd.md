# 10. DevOps & CI/CD

## 10.1 Production Docker Orchestration
The project includes a multi-stage `docker-compose.prod.yml` configuration:

```yaml
version: '3.8'

services:
  db:
    image: mysql:8.0
    container_name: veloce-db-prod
    restart: always
    volumes:
      - veloce_mysql_prod_data:/var/lib/mysql

  backend:
    build: ./backend-fastapi
    container_name: veloce-backend-prod
    command: gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build: ./frontend
    container_name: veloce-frontend-prod
    ports:
      - "3000:3000"
    depends_on:
      - backend
```
