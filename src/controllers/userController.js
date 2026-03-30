const db = require('../config/database');

/**
 * GET /users/:id/bookings
 * Returns all bookings for a specific user, including event details.
 */
async function getUserBookings(req, res, next) {
  const userId = parseInt(req.params.id, 10);

  if (isNaN(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid user ID.' });
  }

  try {
    // Verify user exists
    const [users] = await db.query('SELECT id, name, email FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const [bookings] = await db.query(
      `SELECT
         b.id,
         b.booking_code,
         b.booking_date,
         e.id          AS event_id,
         e.title       AS event_title,
         e.description AS event_description,
         e.date        AS event_date,
         CASE
           WHEN ea.id IS NOT NULL THEN TRUE
           ELSE FALSE
         END AS attended
       FROM bookings b
       JOIN events e  ON e.id  = b.event_id
       LEFT JOIN event_attendance ea
              ON ea.user_id  = b.user_id
             AND ea.event_id = b.event_id
       WHERE b.user_id = ?
       ORDER BY e.date ASC`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        user: users[0],
        bookings,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getUserBookings };
