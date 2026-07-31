const assert = require('assert');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { mockUser } = require('../fixtures/mockData');
const env = require('../../src/config/env.config');

describe('Backend Auth Unit Tests', () => {
  it('should sign and verify JWT tokens correctly', () => {
    const token = jwt.sign(
      { userId: mockUser._id, role: mockUser.role, restaurantId: mockUser.restaurant },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    assert.ok(token, 'Token should be generated');

    const decoded = jwt.verify(token, env.JWT_SECRET);
    assert.strictEqual(decoded.userId, mockUser._id);
    assert.strictEqual(decoded.role, mockUser.role);
    assert.strictEqual(decoded.restaurantId, mockUser.restaurant);
  });

  it('should hash and compare passwords accurately', async () => {
    const rawPassword = 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(rawPassword, salt);

    const isMatch = await bcrypt.compare(rawPassword, hashed);
    assert.strictEqual(isMatch, true, 'Password match should be true for correct password');

    const isWrongMatch = await bcrypt.compare('WrongPass', hashed);
    assert.strictEqual(isWrongMatch, false, 'Password match should be false for incorrect password');
  });
});
