const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("./db");
const auth = require("./auth");
const {
  paymentQueue,
  refundQueue,
  webhookQueue
} = require("./queues");

const router = express.Router();

/* APPLY AUTH TO ALL ROUTES */
router.use(auth);

/* CREATE PAYMENT */
router.post("/api/v1/payments", async (req, res) => {
  const idemKey = req.headers["idempotency-key"];

  if (!idemKey) {
    return res.status(400).json({ error: "Idempotency-Key header required" });
  }

  const existing = await db.query(
    "SELECT response FROM idempotency_keys WHERE idem_key=$1 AND merchant_id=$2 AND expires_at > now()",
    [idemKey, req.merchant.id]
  );

  if (existing.rows.length) {
    return res.json(existing.rows[0].response);
  }

  const id = "pay_" + uuid();

  const response = { id, status: "pending" };

  await db.query(
    "INSERT INTO payments (id, amount, status, merchant_id) VALUES ($1,$2,'pending',$3)",
    [id, req.body.amount, req.merchant.id]
  );

  await db.query(
    "INSERT INTO idempotency_keys (idem_key, merchant_id, response, expires_at) VALUES ($1,$2,$3, now() + interval '24 hours')",
    [idemKey, req.merchant.id, response]
  );

  await paymentQueue.add({ paymentId: id });

  res.status(201).json(response);
});
/* CAPTURE PAYMENT */
router.post("/api/v1/payments/:id/capture", async (req, res) => {
  const payment = await db.query(
    "SELECT * FROM payments WHERE id=$1 AND merchant_id=$2",
    [req.params.id, req.merchant.id]
  );

  if (!payment.rows.length) {
    return res.status(404).json({ error: "Payment not found" });
  }

  if (payment.rows[0].status !== "success") {
    return res.status(400).json({ error: "Payment not successful" });
  }

  if (payment.rows[0].captured) {
    return res.status(400).json({ error: "Payment already captured" });
  }

  await db.query(
    "UPDATE payments SET captured=true WHERE id=$1",
    [req.params.id]
  );

  res.json({ status: "captured" });
});

/* CREATE REFUND */
router.post("/api/v1/payments/:id/refunds", async (req, res) => {
  const refundId = "rfnd_" + uuid();

  const payment = await db.query(
    "SELECT * FROM payments WHERE id=$1 AND merchant_id=$2",
    [req.params.id, req.merchant.id]
  );

  if (!payment.rows.length || payment.rows[0].status !== "success") {
    return res.status(400).json({ error: "Invalid payment" });
  }

  if (req.body.amount > payment.rows[0].amount) {
    return res.status(400).json({ error: "Refund exceeds payment amount" });
  }

  await db.query(
    "INSERT INTO refunds (id, payment_id, amount, status) VALUES ($1,$2,$3,'pending')",
    [refundId, req.params.id, req.body.amount]
  );

  await refundQueue.add({ refundId });

  res.json({ id: refundId, status: "pending" });
});

/* WEBHOOK LOGS */
router.get("/api/v1/webhooks", async (req, res) => {
  const logs = await db.query(
    "SELECT * FROM webhook_logs WHERE merchant_id=$1 ORDER BY created_at DESC",
    [req.merchant.id]
  );
  res.json(logs.rows);
});

/* MANUAL WEBHOOK RETRY */
router.post("/api/v1/webhooks/:id/retry", async (req, res) => {
  const log = await db.query(
    "SELECT * FROM webhook_logs WHERE id=$1 AND merchant_id=$2",
    [req.params.id, req.merchant.id]
  );

  if (!log.rows.length) {
    return res.status(404).json({ error: "Webhook not found" });
  }

  await webhookQueue.add({
    event: log.rows[0].event,
    payload: log.rows[0].payload,
    merchant: req.merchant
  });

  res.json({ message: "Retry scheduled" });
});

/* JOB STATUS */
router.get("/api/v1/test/jobs/status", async (req, res) => {
  res.json({
    payments: await paymentQueue.getJobCounts(),
    refunds: await refundQueue.getJobCounts(),
    webhooks: await webhookQueue.getJobCounts(),
    worker_status: "running"
  });
});

module.exports = router;
