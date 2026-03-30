const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

/**
 * POST /bookings
 * Books a ticket for a user on an event.
 * Body: { user_id, event_id }
 *
 * Uses a DB transaction to:
 *   1. Lock the event row (SELECT ... FOR UPDATE)
 *   2. Verify remaining_tickets > 0
 *   3. Decrement remaining_tickets
 *   4. Insert the booking with a UUID booking_code
 */
async function createBooking(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const { user_id, event_id } = req.body;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Verify user exists
    const [users] = await conn.query('SELECT id FROM users WHERE id = ?', [user_id]);
    if (users.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // 2. Lock event row to prevent race conditions
    const [events] = await conn.query(
      'SELECT id, title, date, remaining_tickets FROM events WHERE id = ? FOR UPDATE',
      [event_id]
    );
    if (events.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const event = events[0];

    // 3. Ensure the event hasn't already passed
    if (new Date(event.date) < new Date()) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Cannot book a ticket for a past event.' });
    }

    // 4. Check ticket availability
    if (event.remaining_tickets <= 0) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'No tickets available for this event.' });
    }

    // 5. Check for duplicate booking
    const [existing] = await conn.query(
      'SELECT id FROM bookings WHERE user_id = ? AND event_id = ?',
      [user_id, event_id]
    );
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'User has already booked this event.' });
    }

    // 6. Decrement remaining tickets
    await conn.query(
      'UPDATE events SET remaining_tickets = remaining_tickets - 1 WHERE id = ?',
      [event_id]
    );

    // 7. Create booking with unique code
    const booking_code = uuidv4();
    const [result] = await conn.query(
      'INSERT INTO bookings (user_id, event_id, booking_code) VALUES (?, ?, ?)',
      [user_id, event_id, booking_code]
    );

    await conn.commit();

    const [bookings] = await conn.query(
      `SELECT b.id, b.user_id, b.event_id, b.booking_date, b.booking_code,
              e.title AS event_title, e.date AS event_date
       FROM bookings b
       JOIN events e ON e.id = b.event_id
       WHERE b.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ success: true, data: bookings[0] });
  } catch (err) {
    await conn.rollback();
    // Duplicate entry (race condition after lock – safety net)
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'User has already booked this event.' });
    }
    next(err);
  } finally {
    conn.release();
  }
}

module.exports = { createBooking };
