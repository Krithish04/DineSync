const assert = require('assert');
const aiReservationService = require('../../src/features/reservation/aiReservation.service');
const customerExperienceService = require('../../src/features/customerExperience/customerExperience.service');
const Reservation = require('../../src/features/reservation/reservation.model');
const Table = require('../../src/features/table/table.model');
const TableSession = require('../../src/features/table/tableSession.model');
const Customer = require('../../src/features/customer/customer.model');
const redisConfig = require('../../src/config/redis.config');

describe('Reservation & TableSession Reconciliation Unit Tests', () => {
  it('should preserve Occupied table status during AI no-show cycle if an active TableSession exists', async () => {
    const origResvFind = Reservation.find;
    const origTableUpdateOne = Table.updateOne;
    const origTableSessionFindOne = TableSession.findOne;

    const todayStr = new Date().toISOString().slice(0, 10);
    let tableStatusUpdateCallCount = 0;
    let resvSavedStatus = null;

    Reservation.find = () => ({
      populate: async () => [
        {
          _id: '507f1f77bcf86cd799439099',
          restaurant: '507f1f77bcf86cd799439000',
          table: { _id: '507f1f77bcf86cd799439011', tableNumber: 1, status: 'Occupied' },
          reservationDate: todayStr,
          reservationTime: '00:01', // Far in past to trigger autoCancelTime check
          customerName: 'NoShow Guest',
          customerPhone: '+919999900000',
          reservationNumber: 'RES-TEST-001',
          reservationStatus: 'Confirmed',
          save: async function () {
            resvSavedStatus = this.reservationStatus;
          },
        },
      ],
    });

    // Mock active TableSession existing on the table
    TableSession.findOne = async () => ({
      _id: '507f1f77bcf86cd799439088',
      table: '507f1f77bcf86cd799439011',
      status: 'active',
      hostName: 'Live Seated Diner',
    });

    Table.updateOne = async () => {
      tableStatusUpdateCallCount += 1;
      return { modifiedCount: 1 };
    };

    try {
      await aiReservationService.runAiReservationMonitorCycle();
      assert.strictEqual(resvSavedStatus, 'No Show', 'Reservation status must be marked No Show');
      assert.strictEqual(
        tableStatusUpdateCallCount,
        0,
        'Table.updateOne must NOT be called to reset table status to Available because active session exists'
      );
    } finally {
      Reservation.find = origResvFind;
      Table.updateOne = origTableUpdateOne;
      TableSession.findOne = origTableSessionFindOne;
    }
  });

  it('should auto-link advance booking to Seated status when guest claims table via claimTableHost', async () => {
    const origTableFindOne = Table.findOne;
    const origTableSessionFindOne = TableSession.findOne;
    const origTableSessionCreate = TableSession.create;
    const origCustomerFindById = Customer.findById;
    const origCustomerFindOne = Customer.findOne;
    const origAcquireLock = redisConfig.acquireTableLock;
    const origResvFind = Reservation.find;

    const validRestId = '507f1f77bcf86cd799439000';
    const validTableId = '507f1f77bcf86cd799439011';
    let autoLinkedStatus = null;

    Table.findOne = async () => ({
      _id: validTableId,
      restaurant: validRestId,
      tableNumber: 4,
      isActive: true,
      status: 'Available',
      save: async () => {},
    });

    TableSession.findOne = async () => null; // No active session yet

    TableSession.create = async (doc) => ({
      _id: '507f1f77bcf86cd799439077',
      ...doc,
    });

    Customer.findById = async () => ({
      _id: '507f1f77bcf86cd799439066',
      fullName: 'John Reserved',
      phoneNumber: '+919876543210',
    });
    Customer.findOne = async () => null;

    redisConfig.acquireTableLock = async () => true;

    Reservation.find = async () => [
      {
        _id: '507f1f77bcf86cd799439055',
        restaurant: validRestId,
        table: validTableId,
        customerPhone: '+919876543210',
        reservationStatus: 'Confirmed',
        save: async function () {
          autoLinkedStatus = this.reservationStatus;
        },
      },
    ];

    try {
      const res = await customerExperienceService.claimTableHost(
        validRestId,
        { tableId: validTableId, hostName: 'John Reserved', hostPhone: '+919876543210' },
        { id: '507f1f77bcf86cd799439066' }
      );

      assert.ok(res.session);
      assert.strictEqual(autoLinkedStatus, 'Seated', 'claimTableHost must auto-link and update reservation status to Seated');
    } finally {
      Table.findOne = origTableFindOne;
      TableSession.findOne = origTableSessionFindOne;
      TableSession.create = origTableSessionCreate;
      Customer.findById = origCustomerFindById;
      Customer.findOne = origCustomerFindOne;
      redisConfig.acquireTableLock = origAcquireLock;
      Reservation.find = origResvFind;
    }
  });
});
