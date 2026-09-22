const assert = require('assert');
const aiReservationService = require('../../src/features/reservation/aiReservation.service');
const Reservation = require('../../src/features/reservation/reservation.model');
const Table = require('../../src/features/table/table.model');
const TableSession = require('../../src/features/table/tableSession.model');
const { getNotificationProvider, resetNotificationProvider } = require('../../src/features/notification/providers/notificationProviderFactory');

describe('Reservation Lock Timeline & Swappable Notification Provider Unit Tests', () => {
  it('should initialize DevConsoleNotificationProvider by default or when set to dev', () => {
    resetNotificationProvider();
    process.env.NOTIFICATION_PROVIDER = 'dev';
    const provider = getNotificationProvider();
    assert.strictEqual(provider.constructor.name, 'DevConsoleNotificationProvider');
    resetNotificationProvider();
  });

  it('should initialize FirebaseNotificationProvider when set to firebase', () => {
    resetNotificationProvider();
    process.env.NOTIFICATION_PROVIDER = 'firebase';
    const provider = getNotificationProvider();
    assert.strictEqual(provider.constructor.name, 'FirebaseNotificationProvider');
    resetNotificationProvider();
  });

  it('should initialize SmsGatewayNotificationProvider when set to gateway or custom', () => {
    resetNotificationProvider();
    process.env.NOTIFICATION_PROVIDER = 'gateway';
    const provider = getNotificationProvider();
    assert.strictEqual(provider.constructor.name, 'SmsGatewayNotificationProvider');
    resetNotificationProvider();
  });

  it('should initialize Fast2SmsNotificationProvider when set to fast2sms', () => {
    resetNotificationProvider();
    process.env.NOTIFICATION_PROVIDER = 'fast2sms';
    const provider = getNotificationProvider();
    assert.strictEqual(provider.constructor.name, 'Fast2SmsNotificationProvider');
    resetNotificationProvider();
  });

  it('should fallback gracefully in DevConsoleNotificationProvider without throwing errors', async () => {
    const provider = getNotificationProvider();
    const otpRes = await provider.sendOtp({ phone: '+919876543210', code: '123456', purpose: 'CUSTOMER_LOGIN' });
    assert.strictEqual(otpRes.success, true);
    assert.strictEqual(otpRes.provider, 'dev');

    const msgRes = await provider.sendMessage({ phone: '+919876543210', message: 'Test check-in nudge' });
    assert.strictEqual(msgRes.success, true);
    assert.strictEqual(msgRes.provider, 'dev');
  });

  it('should calculate pre-arrival walk-in availability correctly via isTableAvailableForWalkIn', async () => {
    const origResvFind = Reservation.find;
    const validRestId = '507f1f77bcf86cd799439000';
    const validTableId = '507f1f77bcf86cd799439011';

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const upcomingTimeMins = currentMins < 1425 ? currentMins + 10 : currentMins - 10; // Stay within same day bounds
    const upcomingHH = String(Math.floor(upcomingTimeMins / 60)).padStart(2, '0');
    const upcomingMM = String(upcomingTimeMins % 60).padStart(2, '0');

    Reservation.find = async () => [
      {
        _id: '507f1f77bcf86cd799439055',
        restaurant: validRestId,
        table: validTableId,
        reservationDate: now.toISOString().slice(0, 10),
        reservationTime: `${upcomingHH}:${upcomingMM}`,
        customerName: 'Upcoming Guest',
        reservationStatus: 'Confirmed',
      },
    ];

    try {
      // Seating walk-in for 60 mins will overlap with upcoming 40-min reservation
      const result = await aiReservationService.isTableAvailableForWalkIn(validRestId, validTableId, 60);
      assert.strictEqual(result.available, false);
      assert.ok(result.reason.includes('overlaps with upcoming'));
    } finally {
      Reservation.find = origResvFind;
    }
  });

  it('should dispatch check-in nudge SMS during mid-grace period in runAiReservationMonitorCycle', async () => {
    const origResvFind = Reservation.find;
    const origTableSessionFindOne = TableSession.findOne;
    const origTableUpdateOne = Table.updateOne;

    const validRestId = '507f1f77bcf86cd799439000';
    const validTableId = '507f1f77bcf86cd799439011';
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    // Set reservationTime 10 mins ago to trigger mid-grace nudge (10m >= midGraceNudgeMins 8m)
    const resvMins = currentMins - 10;
    const resvHH = String(Math.floor((resvMins + 1440) / 60) % 24).padStart(2, '0');
    const resvMM = String((resvMins + 1440) % 60).padStart(2, '0');

    let nudgedAtSet = false;

    Reservation.find = () => ({
      populate: async () => [
        {
          _id: '507f1f77bcf86cd799439055',
          restaurant: validRestId,
          table: { _id: validTableId, tableNumber: 'T01', status: 'Reserved' },
          reservationDate: now.toISOString().slice(0, 10),
          reservationTime: `${resvHH}:${resvMM}`,
          customerName: 'Late Diner',
          customerPhone: '+919876543210',
          reservationStatus: 'Confirmed',
          nudgedAt: null,
          save: async function () {
            if (this.nudgedAt) nudgedAtSet = true;
          },
        },
      ],
    });

    TableSession.findOne = async () => null;
    Table.updateOne = async () => ({ modifiedCount: 1 });

    try {
      await aiReservationService.runAiReservationMonitorCycle();
      assert.strictEqual(nudgedAtSet, true, 'runAiReservationMonitorCycle must set nudgedAt timestamp during mid-grace period');
    } finally {
      Reservation.find = origResvFind;
      TableSession.findOne = origTableSessionFindOne;
      Table.updateOne = origTableUpdateOne;
    }
  });

  it('should extend hold time via extendReservationHold manual staff override', async () => {
    const origResvFindOne = Reservation.findOne;
    const origTableUpdateOne = Table.updateOne;

    const validRestId = '507f1f77bcf86cd799439000';
    const validResvId = '507f1f77bcf86cd799439055';
    let extendedUntilVal = null;

    Reservation.findOne = () => ({
      populate: async () => ({
        _id: validResvId,
        restaurant: validRestId,
        table: { _id: '507f1f77bcf86cd799439011' },
        save: async function () {
          extendedUntilVal = this.holdExtendedUntil;
        },
      }),
    });

    Table.updateOne = async () => ({ modifiedCount: 1 });

    try {
      const res = await aiReservationService.extendReservationHold(validRestId, validResvId, 20);
      assert.strictEqual(res.success, true);
      assert.ok(extendedUntilVal);
      assert.ok(new Date(extendedUntilVal) > new Date());
    } finally {
      Reservation.findOne = origResvFindOne;
      Table.updateOne = origTableUpdateOne;
    }
  });

  it('should track repeat no-show history count via getNoShowHistoryForPhone', async () => {
    const origResvCount = Reservation.countDocuments;
    const validRestId = '507f1f77bcf86cd799439000';

    Reservation.countDocuments = async () => 3;

    try {
      const res = await aiReservationService.getNoShowHistoryForPhone(validRestId, '+919876543210');
      assert.strictEqual(res.noShowCount, 3);
      assert.strictEqual(res.isRepeatNoShow, true);
    } finally {
      Reservation.countDocuments = origResvCount;
    }
  });
});
