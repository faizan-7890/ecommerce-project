# How to Run Veloce E-Commerce

This guide provides step-by-step instructions to set up and run the Veloce E-Commerce platform either locally for development or using Docker for a production-like environment.

## Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **Docker** & **Docker Compose** (for containerized deployment)
- **PostgreSQL** (if running the database locally without Docker)

---

## 1. Environment Setup

Before starting the application, you need to configure the environment variables.

1. Navigate to the `backend` directory.
2. Copy the example configuration file:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and ensure the variables are set correctly. For local development, the default values should work, but you may need to update:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `JWT_SECRET`: A secure, high-entropy string for sessions.
   - `RAZORPAY_*`: Your Razorpay test API keys (if testing real payments).

If you plan to use Docker, also create the production env file:
```bash
cp .env.example .env.production
```

---

## 2. Running Locally (Development Mode)

### Step 1: Database Setup
Make sure you have a running PostgreSQL instance matching your `DATABASE_URL`. Then, apply migrations and seed the database with initial data:
```bash
cd backend
npx prisma db push
npx prisma generate
node prisma/seed.js
```

### Step 2: Start the Backend Server
Start the Express API in development mode (with hot-reloading):
```bash
cd backend
npm run dev
```
*The backend API will run on `http://localhost:5000`.*

### Step 3: Start the Frontend
*(Assuming your frontend is in a `frontend` folder. Adjust accordingly)*
```bash
cd frontend
npm install
npm start
```
*The frontend will run on `http://localhost:3000`.*

---

## 3. Running with Docker Compose (Production Simulation)

This project includes a multi-stage Docker build and a `docker-compose.yml` file to easily spin up the database and backend services together.

1. Ensure your `.env.production` file is correctly set up in the `backend` directory.
2. From the root of the project, run:
   ```bash
   docker-compose up --build -d
   ```
   *This command will:*
   - Start a PostgreSQL database container.
   - Wait for the database to be healthy.
   - Build the backend Node.js container.
   - Automatically run Prisma migrations (`docker-entrypoint.sh`).
   - Start the backend server on port `5000`.

3. To view logs:
   ```bash
   docker-compose logs -f
   ```

4. To shut down the services:
   ```bash
   docker-compose down
   ```

---

## 4. Running the Test Suite

The backend comes with a comprehensive suite of integration tests (Auth, Concurrency, Payments, etc.).

To run the tests:
```bash
cd backend
npm test
```
*Note: Ensure your `DATABASE_URL` in your testing environment is set to a safe test database, as tests will modify and reset data.*

---

## Default Seed Accounts
When you run `node prisma/seed.js`, the following test accounts are created:
- **Customer Account**: `john@example.com` / Password: `password123`
- **Admin Account**: `admin@veloce.com` / Password: `admin123`

You can use these credentials to log in and test the platform's features.
