const { validationResult } = require('express-validator');
const db = require('../config/database');

/**
 * GET /events
 * Returns all upcoming events (date >= now), ordered by date ascending.
 */
async function listEvents(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT id, title, description, date, total_capacity, remaining_tickets, created_at
       FROM events
       WHERE date >= NOW()
       ORDER BY date ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /events
 * Creates a new event.
 * Body: { title, description?, date, total_capacity }
 */
async function createEvent(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const { title, description = null, date, total_capacity } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO events (title, description, date, total_capacity, remaining_tickets)
       VALUES (?, ?, ?, ?, ?)`,
      [title, description, date, total_capacity, total_capacity]
    );

    const [rows] = await db.query(
      'SELECT * FROM events WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { listEvents, createEvent };
