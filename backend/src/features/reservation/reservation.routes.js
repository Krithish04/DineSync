const express = require('express');
const reservationController = require('./reservation.controller');
const { validateBody } = require('../../middlewares/validate.middleware');
const { createReservationSchema, updateReservationSchema, updateReservationStatusSchema } = require('./reservation.validation');
const { protect, authorize, enforceTenantIsolation } = require('../../middlewares/auth.middleware');
const { ROLES } = require('../../constants/roles.constant');

const router = express.Router({ mergeParams: true });

const canManage = authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER);

// All routes require authentication and tenant-isolation
router.use(protect, enforceTenantIsolation);

router
  .route('/')
  .post(canManage, validateBody(createReservationSchema), reservationController.createReservation)
  .get(reservationController.listReservations);

router.route('/stats').get(reservationController.getDashboardStats);

router
  .route('/:reservationId')
  .get(reservationController.getReservation)
  .patch(canManage, validateBody(updateReservationSchema), reservationController.updateReservation)
  .delete(canManage, reservationController.deleteReservation);

router
  .route('/:reservationId/status')
  .patch(canManage, validateBody(updateReservationStatusSchema), reservationController.updateReservationStatus);

module.exports = router;
