require("dotenv").config();
const express = require("express");
const routes = require("./routes");

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use(routes);

app.listen(8080, () =>
  console.log("CloudPay API running on 8080")
);
