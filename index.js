const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const chatRoutes = require("./routes/chat");
const eventRoutes = require("./routes/events");
const waitlistRoutes = require("./routes/waitlist");

// Load env variables early
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

const db = require("./models");
db.sequelize
  .sync()
  .then(() => {
    console.log("Synced db.");
  })
  .catch((err) => {
    console.log("Failed to sync db: " + err.message);
  });

// Configure CORS
app.use(
  cors({
    origin: ["https://www.conserg.io/", "https://letsgo.events/"], // Update this to match your frontend URL
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// Routes
app.use("/api/chat", chatRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/waitlist", waitlistRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
