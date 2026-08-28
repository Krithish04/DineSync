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

  it('should generate, hash, and compare OTP codes safely', () => {
    const { generateOtpCode, hashOtpCode, compareOtpCode } = require('../../src/utils/otp.util');
    const { normalizePhone } = require('../../src/features/auth/otp.service');

    const code = generateOtpCode(6);
    assert.strictEqual(code.length, 6, 'Generated OTP should be 6 digits');

    const hash = hashOtpCode(code);
    assert.ok(hash, 'OTP hash should be created');

    // Test string and number inputs for candidate OTP code
    assert.strictEqual(compareOtpCode(code, hash), true, 'String candidate should match hash');
    assert.strictEqual(compareOtpCode(parseInt(code, 10), hash), true, 'Numeric candidate should match hash');
    assert.strictEqual(compareOtpCode('000000', hash), false, 'Incorrect code should return false');
    assert.strictEqual(compareOtpCode(null, hash), false, 'Null code should return false');

    // Test phone normalization
    assert.strictEqual(normalizePhone('+919876543210'), '+919876543210');
    assert.strictEqual(normalizePhone(' (987) 654-3210 '), '9876543210');
  });
});
