const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { listRentals, getActiveRental, serializeRental } = require('../services/rental.service');

router.get('/', requireAuth, (req, res) => {
  res.json({ rentals: listRentals(req.user.id) });
});

router.get('/:movieId/access', requireAuth, (req, res) => {
  res.json(serializeRental(getActiveRental(req.user.id, Number(req.params.movieId))));
});

module.exports = router;
