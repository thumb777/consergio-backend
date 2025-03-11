const db = require("../models");
const Event = db.event;
const { Op } = require("sequelize");
const sequelize = db.sequelize;
require("dotenv").config();

// exports.getAllEvents = async (req, res) => {
//   try {
//     const events = await Events.findAll();
//     res.json(events);
//   } catch (error) {
//     console.error("Error fetching events:", error);
//     res.status(500).json({ error: "Failed to fetch events" });
//   }
// };

const getAllEvents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const offset = (page - 1) * limit;

    const { count, rows: events } = await Event.findAndCountAll({
      limit: limit,
      offset: offset,
      order: [["start_date", "ASC"]], // Optional: sort by date
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      data: {
        events: events,
        currentPage: page,
        totalPages: totalPages,
        totalEvents: count,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// exports.getEventsByCategories = async (req, res) => {
//   try {
//     const { categories } = req.query;
//     const categoryArray = categories ? categories.split(",") : [];

//     const events = await Events.findAll({
//       where:
//         categoryArray.length > 0
//           ? {
//               categories: {
//                 [Op.overlap]: categoryArray,
//               },
//             }
//           : {},
//     });

//     res.json(events);
//   } catch (error) {
//     console.error("Error fetching events by categories:", error);
//     res.status(500).json({ error: "Failed to fetch events" });
//   }
// };

module.exports = {
  getAllEvents,
};
