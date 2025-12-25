require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const Message = require("./models/Message");

const app = express();

app.use(cors());
app.use(express.json());

app.delete("/messages/:id", async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);

/* ================== AUTH MIDDLEWARE ================== */
const adminAuth = (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({ message: "No token" });
  }

  const token = auth.split(" ")[1];

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

/* ================== ROUTES ================== */

app.get("/", (req, res) => {
  res.send("Backend is running");
});

/* LOGIN */
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username !== process.env.ADMIN_USER ||
    password !== process.env.ADMIN_PASS
  ) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "5h",
  });

  res.json({ token });
});

/* GET MESSAGES (PROTECTED) */
app.get("/messages", adminAuth, async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 });
  res.json(messages);
});

/* CONTACT */
app.post("/contact", async (req, res) => {
  const newMessage = new Message(req.body);
  await newMessage.save();
  res.json({ success: true });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server started on port " + PORT);
});

app.put("/messages/:id/done", async (req, res) => {
  await Message.findByIdAndUpdate(req.params.id, {
    status: "done",
  });

  res.json({ success: true });
});
app.patch("/messages/:id/review", async (req, res) => {
  const { id } = req.params;

  try {
    const msg = await Message.findByIdAndUpdate(
      id,
      { reviewed: true },
      { new: true }
    );
    if (!msg)
      return res.status(404).json({ success: false, message: "پیام پیدا نشد" });

    res.json({ success: true, message: "پیام بررسی شد" });
  } catch (err) {
    res.status(500).json({ success: false, message: "خطا در سرور" });
  }
});
