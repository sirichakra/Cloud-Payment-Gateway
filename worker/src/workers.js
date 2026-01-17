const Queue = require("bull");
const db = require("./db");

const redis = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
};

const paymentQueue = new Queue("payments", { redis });
const webhookQueue = new Queue("webhooks", { redis });

paymentQueue.process(async job => {
  // simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 5000));

  const success = Math.random() < 0.9;
  const status = success ? "success" : "failed";

  const result = await db.query(
    "UPDATE payments SET status=$1 WHERE id=$2 RETURNING *",
    [status, job.data.paymentId]
  );

  if (!result.rows.length) return;

  const payment = result.rows[0];

  const merchant = await db.query(
    "SELECT * FROM merchants WHERE id=$1",
    [payment.merchant_id]
  );

  if (!merchant.rows.length) return;

  await webhookQueue.add({
    event: `payment.${status}`,
    payload: payment,
    merchant: merchant.rows[0]
  });
});
