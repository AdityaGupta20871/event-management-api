const { validationResult } = require('express-validator');
const db = require('../config/database');

/**
 * POST /events/:id/attendance
 * Marks a user as attended using their booking_code.
 * Body: { booking_code }
 *
 * Returns the updated remaining tickets count for the event.
 */
async function checkIn(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const eventId      = parseInt(req.params.id, 10);
  const { booking_code } = req.body;

  if (isNaN(eventId) || eventId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid event ID.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Verify the event exists
    const [events] = await conn.query(
      'SELECT id, title, remaining_tickets FROM events WHERE id = ? FOR UPDATE',
      [eventId]
    );
    if (events.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // 2. Validate the booking code for this event
    const [bookings] = await conn.query(
      `SELECT b.id, b.user_id, b.event_id
       FROM bookings b
       WHERE b.booking_code = ? AND b.event_id = ?`,
      [booking_code, eventId]
    );
    if (bookings.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Invalid booking code for this event.' });
    }

    const booking = bookings[0];

    // 3. Prevent duplicate check-in
    const [alreadyAttended] = await conn.query(
      'SELECT id FROM event_attendance WHERE user_id = ? AND event_id = ?',
      [booking.user_id, eventId]
    );
    if (alreadyAttended.length > 0) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'User has already checked in to this event.' });
    }

    // 4. Record attendance
    await conn.query(
      'INSERT INTO event_attendance (user_id, event_id) VALUES (?, ?)',
      [booking.user_id, eventId]
    );

    await conn.commit();

    // 5. Return updated remaining tickets
    const [updated] = await conn.query(
      'SELECT remaining_tickets FROM events WHERE id = ?',
      [eventId]
    );

    res.status(201).json({
      success: true,
      message: 'Check-in successful.',
      data: {
        event_id:          eventId,
        event_title:       events[0].title,
        user_id:           booking.user_id,
        remaining_tickets: updated[0].remaining_tickets,
      },
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

module.exports = { checkIn };
