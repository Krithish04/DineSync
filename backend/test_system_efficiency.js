const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dinesync_test';
process.env.JWT_SECRET = 'test_secret';

const env = require('./src/config/env.config');
const aiService = require('./src/features/ai/ai.service');
const Restaurant = require('./src/features/tenant/tenant.model');

async function runBenchmark() {
  console.log('=== DINESYNC EFFICIENCY & CACHING AUDIT SUITE ===');

  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('Connected to MongoDB');

    let rest = await Restaurant.findOne();
    if (!rest) {
      rest = await Restaurant.create({ name: 'Benchmark Resto', ownerName: 'Test Owner' });
    }
    const restId = rest._id.toString();

    console.log('\n--- 1. Testing AI Microservice Caching ---');

    // First call (Uncached)
    const t0 = Date.now();
    const sales1 = await aiService.getSalesForecast(restId);
    const ms1 = Date.now() - t0;
    console.log(`[Sales Forecast] Call 1 (Uncached): ${ms1}ms, Result Tomorrow: ${sales1.tomorrow?.predicted_revenue}`);

    // Second call (Cached)
    const t1 = Date.now();
    const sales2 = await aiService.getSalesForecast(restId);
    const ms2 = Date.now() - t1;
    console.log(`[Sales Forecast] Call 2 (Cached): ${ms2}ms, Result Tomorrow: ${sales2.tomorrow?.predicted_revenue}`);

    // Test Demand Forecast
    const d1_start = Date.now();
    await aiService.getDemandForecast(restId);
    const d1_ms = Date.now() - d1_start;

    const d2_start = Date.now();
    await aiService.getDemandForecast(restId);
    const d2_ms = Date.now() - d2_start;
    console.log(`[Demand Forecast] Call 1: ${d1_ms}ms | Call 2 (Cached): ${d2_ms}ms`);

    // Test Inventory Forecast
    const i1_start = Date.now();
    await aiService.getInventoryForecast(restId);
    const i1_ms = Date.now() - i1_start;

    const i2_start = Date.now();
    await aiService.getInventoryForecast(restId);
    const i2_ms = Date.now() - i2_start;
    console.log(`[Inventory Forecast] Call 1: ${i1_ms}ms | Call 2 (Cached): ${i2_ms}ms`);

    // Test Dashboard Overview
    const dashStart = Date.now();
    await aiService.getAiDashboardOverview(restId);
    const dashMs = Date.now() - dashStart;
    console.log(`[AI Dashboard Overview] Execution Time (with warm cache): ${dashMs}ms`);

    console.log('\n--- 2. Testing AI Agent Status Health Check ---');
    const status = await aiService.getAiAgentStatus(restId);
    console.log(`Agents Count: ${status.total_agents}, Active: ${status.active_agents}, Accuracy Rate: ${status.overall_accuracy_rate}%`);

    console.log('\nSUCCESS: Efficiency benchmarks executed without error.');
  } catch (err) {
    console.error('Benchmark Error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runBenchmark();
