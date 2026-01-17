const db = require("./db");

module.exports = async (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  const apiSecret = req.headers["x-api-secret"];

  if (!apiKey || !apiSecret) {
    return res.status(401).json({ error: "Missing API credentials" });
  }

  const result = await db.query(
    "SELECT * FROM merchants WHERE api_key=$1 AND api_secret=$2",
    [apiKey, apiSecret]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: "Invalid API credentials" });
  }

  req.merchant = result.rows[0];
  next();
};
