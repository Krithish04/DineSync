const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const { setTokenCookie, clearTokenCookie } = require('../../utils/jwt.util');
const authService = require('./auth.service');

const registerRestaurant = asyncHandler(async (req, res) => {
  const { user, restaurant, requiresVerification } = await authService.registerRestaurant(
    req.body
  );
  return new ApiResponse(
    201,
    { user, restaurant, requiresVerification },
    'Restaurant created. Please check your email for a verification code.'
  ).send(res);
});

const registerUser = asyncHandler(async (req, res) => {
  const { user, restaurant, requiresVerification } = await authService.registerUser(req.body);
  return new ApiResponse(
    201,
    { user, restaurant, requiresVerification },
    'Account created. Please check your email for a verification code.'
  ).send(res);
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { user, restaurant, token } = await authService.verifyEmail(req.body);
  setTokenCookie(res, token);
  return new ApiResponse(200, { user, restaurant, token }, 'Email verified successfully').send(
    res
  );
});

const resendOtp = asyncHandler(async (req, res) => {
  const { expiresAt } = await authService.resendOtp(req.body);
  return new ApiResponse(200, { expiresAt }, 'Verification code sent').send(res);
});

const login = asyncHandler(async (req, res) => {
  const { user, restaurant, token } = await authService.login(req.body);
  setTokenCookie(res, token);
  return new ApiResponse(200, { user, restaurant, token }, 'Logged in successfully').send(res);
});

const logout = asyncHandler(async (req, res) => {
  clearTokenCookie(res);
  return new ApiResponse(200, null, 'Logged out successfully').send(res);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  return new ApiResponse(200, null, result.message).send(res);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { user, restaurant, token } = await authService.resetPassword(req.body);
  setTokenCookie(res, token);
  return new ApiResponse(200, { user, restaurant, token }, 'Password reset successfully').send(
    res
  );
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user._id);
  return new ApiResponse(200, { user }, 'Current user fetched successfully').send(res);
});

module.exports = {
  registerRestaurant,
  registerUser,
  verifyEmail,
  resendOtp,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
};
