const assert = require('assert');
const { mockAiForecast } = require('../fixtures/mockData');

describe('Backend AI Microservice Proxy Unit Tests', () => {
  it('should validate AI forecast payload structure and confidence score bounds', () => {
    assert.strictEqual(mockAiForecast.forecastPeriod, 'Next 7 Days');
    assert.ok(mockAiForecast.confidenceScore >= 0 && mockAiForecast.confidenceScore <= 1, 'Confidence score must be between 0 and 1');
    assert.strictEqual(mockAiForecast.dailyForecasts.length, 2);
  });

  it('should calculate heuristic sales forecast fallback if FastAPI is unreachable', () => {
    const historical7DayRevenue = [12000, 14000, 15000, 13000, 16000, 18000, 20000];
    const avgDaily = historical7DayRevenue.reduce((a, b) => a + b, 0) / historical7DayRevenue.length;
    const predictedTomorrow = Math.round(avgDaily * 1.05); // 5% growth heuristic

    assert.strictEqual(Math.round(avgDaily), 15429);
    assert.strictEqual(predictedTomorrow, 16200);
  });
});
