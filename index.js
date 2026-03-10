const express = require("express");
const path = require("path");
const { createClient } = require("redis");

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "Public")));

const REDIS_KEY = "newspaper:bsd";
const API_SECRET = process.env.API_SECRET;

const redis = createClient({ url: process.env.REDIS_URL });
redis.on("error", (err) => console.error("Redis error:", err));
redis.connect().catch(err => console.error("Redis connect error:", err));

app.get("/api/newspaper", async (req, res) => {
  console.log("GET /api/newspaper, redis.isReady:", redis.isReady);
  try {
    const data = await Promise.race([
      redis.get(REDIS_KEY),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Redis timeout")), 8000))
    ]);
    res.json(data ? JSON.parse(data) : null);
  } catch (err) {
    console.error("GET error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/newspaper", async (req, res) => {
  const secret = req.headers["x-api-secret"];
  if (!API_SECRET || secret !== API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    await redis.set(REDIS_KEY, JSON.stringify(req.body));
    res.json({ ok: true });
  } catch (err) {
    console.error("POST error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/test", (req, res) => {
  res.json({
    redisReady: redis.isReady,
    redisOpen: redis.isOpen,
    redisUrl: process.env.REDIS_URL ? "set" : "NOT SET",
    apiSecret: process.env.API_SECRET ? "set" : "NOT SET"
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
