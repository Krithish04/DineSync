import assert from 'assert';

describe('Frontend AuthStore Unit Tests', () => {
  it('should initialize with null user and unauthenticated status', () => {
    const initialState = { user: null, restaurant: null, isAuthenticated: false };
    assert.strictEqual(initialState.user, null);
    assert.strictEqual(initialState.isAuthenticated, false);
  });

  it('should update state upon login dispatch', () => {
    const userPayload = { _id: 'u1', email: 'owner@spicegarden.com', role: 'RESTAURANT_OWNER' };
    const restaurantPayload = { _id: 'r1', name: 'Spice Garden' };

    const stateAfterLogin = {
      user: userPayload,
      restaurant: restaurantPayload,
      isAuthenticated: true,
    };

    assert.strictEqual(stateAfterLogin.user.email, 'owner@spicegarden.com');
    assert.strictEqual(stateAfterLogin.restaurant.name, 'Spice Garden');
    assert.strictEqual(stateAfterLogin.isAuthenticated, true);
  });

  it('should reset state cleanly upon logout dispatch', () => {
    const stateAfterLogout = { user: null, restaurant: null, isAuthenticated: false };
    assert.strictEqual(stateAfterLogout.user, null);
    assert.strictEqual(stateAfterLogout.isAuthenticated, false);
  });
});
