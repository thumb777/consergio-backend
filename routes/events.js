const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");

router.get("/", eventController.getAllEvents);
// router.get("/byCategories", eventController.getEventsByCategories);

module.exports = router;
