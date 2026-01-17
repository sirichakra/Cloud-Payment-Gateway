async function pay() {
  const amount = document.getElementById("amount").value;

  const res = await fetch("/api/v1/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": "key_test_abc123",
      "X-Api-Secret": "secret_test_xyz789",
      "Idempotency-Key": "checkout-" + Date.now()
    },
    body: JSON.stringify({ amount })
  });

  const data = await res.json();

  window.parent.postMessage(
    { type: "payment_created", payload: data },
    "*"
  );
}
