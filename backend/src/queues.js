const Queue = require("bull");

const redis = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
};

const paymentQueue = new Queue("payments", { redis });
const webhookQueue = new Queue("webhooks", { redis });
const refundQueue = new Queue("refunds", { redis });

module.exports = {
  paymentQueue,
  webhookQueue,
  refundQueue
};
