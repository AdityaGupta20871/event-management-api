-- ============================================================
-- Mini Event Management System - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS event_management;
USE event_management;

-- ------------------------------------------------------------
-- Table: users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100)    NOT NULL,
    email       VARCHAR(150)    NOT NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: events
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    title               VARCHAR(200)    NOT NULL,
    description         TEXT,
    date                DATETIME        NOT NULL,
    total_capacity      INT UNSIGNED    NOT NULL,
    remaining_tickets   INT UNSIGNED    NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT chk_remaining CHECK (remaining_tickets <= total_capacity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: bookings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    user_id         INT UNSIGNED    NOT NULL,
    event_id        INT UNSIGNED    NOT NULL,
    booking_date    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    booking_code    CHAR(36)        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_bookings_code (booking_code),
    UNIQUE KEY uq_bookings_user_event (user_id, event_id),
    CONSTRAINT fk_bookings_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
    CONSTRAINT fk_bookings_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: event_attendance
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_attendance (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED    NOT NULL,
    event_id    INT UNSIGNED    NOT NULL,
    entry_time  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_attendance_user_event (user_id, event_id),
    CONSTRAINT fk_attendance_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
    CONSTRAINT fk_attendance_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Seed data (optional – for testing)
-- ------------------------------------------------------------
INSERT INTO users (name, email) VALUES
    ('Alice Johnson', 'alice@example.com'),
    ('Bob Smith',     'bob@example.com'),
    ('Carol White',   'carol@example.com');

INSERT INTO events (title, description, date, total_capacity, remaining_tickets) VALUES
    ('Tech Conference 2026',    'Annual technology conference covering AI, cloud, and DevOps.',  '2026-06-15 09:00:00', 200, 200),
    ('Node.js Workshop',        'Hands-on workshop for junior and mid-level Node.js developers.', '2026-07-20 10:00:00', 50,  50),
    ('Startup Pitch Night',     'An evening of startup pitches and networking.',                  '2026-08-05 18:00:00', 100, 100);
