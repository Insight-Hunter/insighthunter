import { Hono } from 'hono';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

interface Transaction {
  date: string;
  amount: number;
}

app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT date, amount FROM transactions ORDER BY date ASC'
  ).all<Transaction>();

  if (!results || results.length === 0) {
    return c.json([]);
  }

  // Process data for linear regression
  const dailyFlows: { [key: string]: number } = {};
  results.forEach(tx => {
    const day = tx.date.split('T')[0];
    dailyFlows[day] = (dailyFlows[day] || 0) + tx.amount;
  });

  const sortedDays = Object.keys(dailyFlows).sort();
  let cumulativeAmount = 0;
  const dataPoints = sortedDays.map((day, index) => {
    cumulativeAmount += dailyFlows[day];
    return { x: index, y: cumulativeAmount };
  });

  // Simple linear regression
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  const n = dataPoints.length;
  for (const p of dataPoints) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Generate forecast
  const lastDayIndex = dataPoints.length - 1;
  const lastDate = new Date(sortedDays[lastDayIndex]);
  const forecast = [];
  for (let i = 1; i <= 180; i++) { // 6 months forecast
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + i);
    const forecastValue = slope * (lastDayIndex + i) + intercept;
    forecast.push({
      date: nextDate.toISOString().split('T')[0],
      amount: forecastValue,
    });
  }

  return c.json(forecast);
});

export default app;
