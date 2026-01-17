# CloudPay Gateway

A mini payment gateway backend inspired by Stripe/Razorpay.

## Features
- Asynchronous payment processing
- Redis-backed job queues
- Webhook delivery with retries & HMAC signatures
- Refund processing with validation
- Idempotency keys to prevent duplicate charges
- Job status monitoring endpoint
- Dockerized microservices

## Tech Stack
- Node.js (Express)
- PostgreSQL
- Redis
- Bull Queue
- Docker & Docker Compose

## Run Locally
```bash
docker compose up --build
