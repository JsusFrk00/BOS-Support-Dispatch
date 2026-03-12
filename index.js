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

function statsKey(edition) {
  return "newspaper:bsd:stats:" + (edition || "default").replace(/[^a-zA-Z0-9]/g, "-");
}

app.get("/api/newspaper", async (req, res) => {
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
  if (!API_SECRET || secret !== API_SECRET) return res.status(401).json({ error: "Unauthorized" });
  try {
    await redis.set(REDIS_KEY, JSON.stringify(req.body));
    res.json({ ok: true });
  } catch (err) {
    console.error("POST error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats?edition=xxx
app.get("/api/stats", async (req, res) => {
  try {
    const key = statsKey(req.query.edition);
    const data = await redis.get(key);
    res.json(data ? JSON.parse(data) : { views: 0, wordle: 0, trivia: 0, crossword: 0 });
  } catch (err) {
    res.json({ views: 0, wordle: 0, trivia: 0, crossword: 0 });
  }
});

// POST /api/stats/increment { edition, field }
app.post("/api/stats/increment", async (req, res) => {
  try {
    const key = statsKey(req.body.edition);
    const data = await redis.get(key);
    const s = data ? JSON.parse(data) : { views: 0, wordle: 0, trivia: 0, crossword: 0 };
    const field = req.body.field;
    if (field in s) s[field] = (s[field] || 0) + 1;
    await redis.set(key, JSON.stringify(s));
    res.json(s);
  } catch (err) {
    console.error("Stats increment error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stats/reset { edition } - requires auth
app.post("/api/stats/reset", async (req, res) => {
  const secret = req.headers["x-api-secret"];
  if (!API_SECRET || secret !== API_SECRET) return res.status(401).json({ error: "Unauthorized" });
  try {
    const key = statsKey(req.body.edition);
    const fresh = { views: 0, wordle: 0, trivia: 0, crossword: 0 };
    await redis.set(key, JSON.stringify(fresh));
    res.json(fresh);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/test", (req, res) => {
  res.json({ redisReady: redis.isReady, redisUrl: process.env.REDIS_URL ? "set" : "NOT SET", apiSecret: process.env.API_SECRET ? "set" : "NOT SET" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
