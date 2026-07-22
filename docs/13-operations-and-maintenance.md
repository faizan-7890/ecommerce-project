# 13. Operations & Maintenance

## 13.1 Health Monitoring & Telemetry
- Endpoint `GET /api/health` reports real-time database connectivity and application status.
- Telemetry header `X-Process-Time` is injected into every HTTP response for latency monitoring.

## 13.2 Database Backup Policy
- Automated daily `mysqldump` backups of `veloce_db` with 30-day point-in-time recovery retention.
