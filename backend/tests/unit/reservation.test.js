const assert = require('assert');
const reservationService = require('../../src/features/reservation/reservation.service');
const aiReservationService = require('../../src/features/reservation/aiReservation.service');
const Reservation = require('../../src/features/reservation/reservation.model');
const Table = require('../../src/features/table/table.model');

describe('Reservation System Unit & Business Rules Tests', () => {
  it('should reject booking when guest count exceeds table capacity', async () => {
    const validId = '507f1f77bcf86cd799439011';
    const origFindOne = Table.findOne;
    Table.findOne = async () => ({
      _id: validId,
      capacity: 4,
      isActive: true,
    });

    let thrownError = null;
    try {
      await reservationService.createReservation('rest_1', {
        table: validId,
        numberOfGuests: 6, // Exceeds capacity of 4
        reservationDate: '2026-09-10',
        reservationTime: '19:00',
      });
    } catch (err) {
      thrownError = err;
    } finally {
      Table.findOne = origFindOne;
    }

    assert.ok(thrownError, 'Should have thrown error when guest count exceeds capacity');
    assert.strictEqual(thrownError.statusCode, 400);
    assert.ok(thrownError.message.includes('Table capacity is 4 guests'));
  });

  it('should reject double booking for overlapping time slots on same table', async () => {
    const validId = '507f1f77bcf86cd799439011';
    const origTableFindOne = Table.findOne;
    const origResvFind = Reservation.find;
    const origResvCreate = Reservation.create;

    Table.findOne = async () => ({
      _id: validId,
      capacity: 4,
      isActive: true,
    });

    Reservation.find = async () => [
      {
        _id: '507f1f77bcf86cd799439022',
        table: validId,
        reservationDate: '2026-09-10',
        reservationTime: '19:00',
        duration: 90,
        reservationStatus: 'Confirmed',
      },
    ];

    Reservation.create = async () => ({ _id: 'dummy' });

    let thrownError = null;
    try {
      await reservationService.createReservation('rest_1', {
        table: validId,
        numberOfGuests: 2,
        reservationDate: '2026-09-10',
        reservationTime: '19:30', // Overlaps with 19:00 - 20:30 slot!
        duration: 90,
      });
    } catch (err) {
      thrownError = err;
    } finally {
      Table.findOne = origTableFindOne;
      Reservation.find = origResvFind;
      Reservation.create = origResvCreate;
    }

    assert.ok(thrownError, 'Should have thrown error on double booking overlap');
    assert.strictEqual(thrownError.statusCode, 409);
    assert.ok(thrownError.message.includes('Double booking error'));
  });

  it('should auto-lock table 15 minutes before reservation time', async () => {
    const validId = '507f1f77bcf86cd799439011';
    const origFind = Reservation.find;
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const targetMins = currentMins + 5;
    const h = String(Math.floor(targetMins / 60)).padStart(2, '0');
    const m = String(targetMins % 60).padStart(2, '0');
    const mockTime = `${h}:${m}`;

    Reservation.find = () => ({
      populate: async () => [
        {
          _id: '507f1f77bcf86cd799439033',
          table: { tableNumber: 5, tableName: 'VIP Table', status: 'Available' },
          reservationDate: todayStr,
          reservationTime: mockTime,
          customerName: 'Alice Smith',
          customerPhone: '9876543210',
          reservationStatus: 'Confirmed',
        },
      ],
    });

    try {
      const status = await aiReservationService.checkTableLockStatus('rest_1', validId);
      assert.strictEqual(status.isLocked, true);
      assert.strictEqual(status.tableNumber, 5);
      assert.strictEqual(status.customerName, 'Alice Smith');
    } finally {
      Reservation.find = origFind;
    }
  });

  it('should verify guest phone number and seat reservation', async () => {
    const validId = '507f1f77bcf86cd799439011';
    const origResvFindOne = Reservation.findOne;
    const origResvFind = Reservation.find;
    const origTableUpdateOne = Table.updateOne;

    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const h = String(Math.floor(currentMins / 60)).padStart(2, '0');
    const m = String(currentMins % 60).padStart(2, '0');
    const mockTime = `${h}:${m}`;

    let updatedTableStatus = null;
    let updatedResvStatus = null;

    Reservation.find = () => ({
      populate: async () => [
        {
          _id: '507f1f77bcf86cd799439044',
          table: { tableNumber: 3, tableName: 'Main Table', status: 'Available' },
          reservationDate: todayStr,
          reservationTime: mockTime,
          customerName: 'Alice Smith',
          customerPhone: '+919876543210',
          reservationStatus: 'Confirmed',
        },
      ],
    });

    Reservation.findOne = async () => ({
      _id: '507f1f77bcf86cd799439044',
      customerPhone: '+919876543210',
      reservationStatus: 'Confirmed',
      save: async function() { updatedResvStatus = this.reservationStatus; },
    });

    Table.updateOne = async (query, update) => {
      updatedTableStatus = update.status;
      return { modifiedCount: 1 };
    };

    try {
      const res = await aiReservationService.verifyGuestPhoneToUnlock('rest_1', {
        tableId: validId,
        phoneNumber: '9876543210',
      });
      assert.strictEqual(res.success, true);
      assert.strictEqual(updatedResvStatus, 'Seated');
      assert.strictEqual(updatedTableStatus, 'Occupied');
    } finally {
      Reservation.findOne = origResvFindOne;
      Reservation.find = origResvFind;
      Table.updateOne = origTableUpdateOne;
    }
  });
});
