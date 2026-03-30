# Event Management API

A RESTful API built with **Node.js**, **Express**, and **MySQL** for managing events, ticket bookings, and attendee check-ins.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Option A – Docker (recommended)](#option-a--docker-recommended)
  - [Option B – Local Setup](#option-b--local-setup)
- [API Endpoints](#api-endpoints)
- [Swagger Docs](#swagger-docs)
- [Postman Collection](#postman-collection)
- [Design Decisions](#design-decisions)

---

## Features

- List upcoming events
- Create new events
- Book tickets with **atomic transactions** and **unique UUID booking codes**
- Retrieve a user's booking history with attendance status
- Check-in attendees using their booking code
- Input validation via `express-validator`
- Full **OpenAPI 3.0** documentation (Swagger UI)
- **Docker** support for zero-config local setup

---

## Tech Stack

| Layer      | Technology                  |
|------------|-----------------------------|
| Runtime    | Node.js 20                  |
| Framework  | Express 4                   |
| Database   | MySQL 8                     |
| DB Driver  | mysql2 (promise API)        |
| Validation | express-validator           |
| Unique IDs | uuid v4                     |
| Docs       | swagger-ui-express, js-yaml |
| Container  | Docker / docker-compose     |

---

## Database Schema

```
┌─────────────┐       ┌───────────────────┐       ┌─────────────────┐
│    users    │       │      events       │       │    bookings     │
├─────────────┤       ├───────────────────┤       ├─────────────────┤
│ id (PK)     │──┐    │ id (PK)           │──┐    │ id (PK)         │
│ name        │  │    │ title             │  │    │ user_id (FK)    │
│ email       │  │    │ description       │  │    │ event_id (FK)   │
│ created_at  │  │    │ date              │  │    │ booking_date    │
└─────────────┘  │    │ total_capacity    │  │    │ booking_code    │
                 │    │ remaining_tickets │  │    └─────────────────┘
                 │    │ created_at        │  │
                 │    └───────────────────┘  │
                 │                           │
                 │    ┌───────────────────┐  │
                 │    │ event_attendance  │  │
                 │    ├───────────────────┤  │
                 └───>│ user_id (FK)      │  │
                      │ event_id (FK)     │<─┘
                      │ entry_time        │
                      └───────────────────┘
```

**Key constraints:**
- `bookings.booking_code` — `UNIQUE` (UUID v4)
- `bookings(user_id, event_id)` — `UNIQUE` (no double-booking)
- `event_attendance(user_id, event_id)` — `UNIQUE` (no double check-in)
- `events.remaining_tickets <= total_capacity` — `CHECK` constraint

---

## Project Structure

```
.
├── src/
│   ├── app.js                      # Express entry point
│   ├── config/
│   │   └── database.js             # MySQL connection pool
│   ├── controllers/
│   │   ├── eventController.js      # GET /events, POST /events
│   │   ├── bookingController.js    # POST /bookings
│   │   ├── userController.js       # GET /users/:id/bookings
│   │   └── attendanceController.js # POST /events/:id/attendance
│   ├── routes/
│   │   ├── events.js
│   │   ├── bookings.js
│   │   └── users.js
│   └── middleware/
│       └── errorHandler.js
├── schema.sql                      # DDL + seed data
├── swagger.yaml                    # OpenAPI 3.0 spec
├── postman_collection.json         # Importable Postman collection
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Getting Started

### Option A – Docker (recommended)

> Requires Docker and Docker Compose installed.

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd event-management-api

# 2. Start all services (MySQL + API)
docker compose up --build

# 3. API is available at http://localhost:3000
# 4. Swagger docs at   http://localhost:3000/api-docs
```

The `schema.sql` file is automatically executed by MySQL on first run via `docker-entrypoint-initdb.d/`.

---

### Option B – Local Setup

**Prerequisites:** Node.js 18+, MySQL 8

```bash
# 1. Install dependencies
npm install

# 2. Create your .env file
cp .env.example .env
# Edit .env with your DB credentials

# 3. Create the database and run the schema
mysql -u root -p < schema.sql

# 4. Start the server
npm run dev        # development (nodemon)
# or
npm start          # production
```

---

## API Endpoints

| Method | Path                       | Description                                  |
|--------|----------------------------|----------------------------------------------|
| GET    | `/events`                  | List all upcoming events                     |
| POST   | `/events`                  | Create a new event                           |
| POST   | `/bookings`                | Book a ticket (transaction + UUID code)      |
| GET    | `/users/:id/bookings`      | Get a user's bookings + attendance status    |
| POST   | `/events/:id/attendance`   | Check in using a booking code                |
| GET    | `/health`                  | Liveness check                               |
| GET    | `/api-docs`                | Interactive Swagger UI                       |

### POST /events – Request Body

```json
{
  "title": "Tech Conference 2026",
  "description": "Optional description",
  "date": "2026-06-15T09:00:00.000Z",
  "total_capacity": 200
}
```

### POST /bookings – Request Body

```json
{
  "user_id": 1,
  "event_id": 1
}
```

### POST /events/:id/attendance – Request Body

```json
{
  "booking_code": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Swagger Docs

Once the server is running, visit:

```
http://localhost:3000/api-docs
```

The full OpenAPI 3.0 spec is in [`swagger.yaml`](./swagger.yaml).

---

## Postman Collection

Import [`postman_collection.json`](./postman_collection.json) into Postman.

The collection includes:
- Pre-configured requests for all endpoints
- Example request bodies and responses
- A test script on **Create booking** that automatically saves the `booking_code` to a collection variable, ready for use in the **Check-in** request

---

## Design Decisions

### Atomic Booking with `SELECT ... FOR UPDATE`

To prevent race conditions (two users simultaneously booking the last ticket), the booking flow uses a database transaction with a pessimistic lock:

```
BEGIN
  SELECT ... FROM events WHERE id = ? FOR UPDATE   -- lock the row
  Check remaining_tickets > 0
  UPDATE events SET remaining_tickets = remaining_tickets - 1
  INSERT INTO bookings ...
COMMIT
```

### UUID Booking Codes

Each booking receives a `UUID v4` as its `booking_code`. This is:
- **Globally unique** – no sequential ID guessing
- **Suitable for QR codes** at event check-in gates

### Input Validation Layer

All user-supplied data is validated with `express-validator` at the route level before reaching the controller. Validation errors return `422 Unprocessable Entity` with a structured error array.

### Centralised Error Handler

All unhandled errors bubble up to `errorHandler.js` middleware, ensuring a consistent JSON error format regardless of where in the stack an exception is thrown.
