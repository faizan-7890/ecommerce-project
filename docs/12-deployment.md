# 12. Deployment Guide

## 12.1 Target Deployment Architecture
- **Option A (Containerized Single-Host / AWS EC2)**: Launch via `docker-compose -f docker-compose.prod.yml up -d --build`.
- **Option B (Serverless Managed Platform)**:
  - **Frontend**: Deployed on Vercel Edge Network.
  - **Backend**: Deployed on Railway / Render / AWS App Runner.
  - **Database**: Managed MySQL (PlanetScale / Aiven / AWS RDS).
