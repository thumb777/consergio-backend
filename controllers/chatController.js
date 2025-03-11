const OpenAI = require("openai");
const dotenv = require("dotenv");
const db = require("../models");
const { QueryTypes } = require("sequelize");

// Ensure environment variables are loaded
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.chatCompletion = async (req, res) => {
  try {
    const { message, chatHistory, pageSize, pageNum, orderbyField } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    const queryGeneration = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: process.env.SQL_QUERY_PROMPT,
        },
        { role: "user", content: message },
      ],
    });

    let events = [];
    let allEvents = []; // New array for all events
    let totalCount = 0;
    let sortedSubcategories = ["Music", "Sports", "Dance"];
    const uniqueSubcategories = new Set();

    try {
      const cleanedContent = queryGeneration.choices[0].message.content
        .trim()
        .replace(/```json|```/g, "");

      const queryResponse = JSON.parse(cleanedContent);

      if (queryResponse.query) {
        // Log the initial query
        console.log("--------------", queryResponse.query);

        // Replace 'ANY' queries and handle array conditions
        queryResponse.query = queryResponse.query.replace(
          /'([^']+)' = ANY\((\w+)\)/g,
          (fullMatch, value, column) => {
            if (column === "categories") {
              console.log("***********", column, value);
              return `EXISTS (SELECT 1 FROM UNNEST(${column}) cat WHERE LOWER(cat) ILIKE LOWER('%${value}%'))`;
            } else {
              return `${column} ILIKE '%${value}%'`;
            }
          }
        );

        // Replace queries using `LIKE` directly on the array
        queryResponse.query = queryResponse.query.replace(
          /(\w+)\s+LIKE\s+'%([^%]+)%'/g,
          (fullMatch, column, value) => {
            if (column === "categories") {
              return `EXISTS (SELECT 1 FROM UNNEST(${column}) cat WHERE LOWER(cat) ILIKE LOWER('%${value}%'))`;
            } else {
              return `${column} ILIKE '%${value}%'`;
            }
          }
        );

        // Get count of all events
        const countQuery = `SELECT COUNT(*) as total FROM (${queryResponse.query}) AS subquery`;
        const [{ total }] = await db.sequelize.query(countQuery, {
          type: QueryTypes.SELECT,
        });
        totalCount = parseInt(total);

        // Get all events without pagination
        allEvents = await db.sequelize.query(queryResponse.query, {
          type: QueryTypes.SELECT,
        });

        // Extract the search category from the query (if it exists)
        let searchCategory = "";
        if (queryResponse.query.toLowerCase().includes("categories")) {
          const categoryMatch = queryResponse.query.match(/LOWER\('%([^%]+)%'\)/i);
          if (categoryMatch) {
            searchCategory = categoryMatch[1].toLowerCase();
          }
        }

        // Create a map to store subcategory frequencies
        const subcategoryFrequency = new Map();

        // Extract subcategories and count their frequencies
        allEvents.forEach((event) => {
          if (Array.isArray(event.categories) && event.categories.length > 1) {
            // Skip first category (main category) and filter out "Other" and search category
            event.categories.slice(1).forEach((subcat) => {
              const subcatLower = subcat.toLowerCase();
              if (subcatLower !== "other" && !subcatLower.includes(searchCategory)) {
                // Increment frequency count
                subcategoryFrequency.set(
                  subcat,
                  (subcategoryFrequency.get(subcat) || 0) + 1
                );
              }
            });
          }
        });

        // Convert to array, sort by frequency, and extract just the subcategory names
        sortedSubcategories = Array.from(subcategoryFrequency.entries())
          .sort((a, b) => b[1] - a[1]) // Sort by frequency (descending)
          .map((entry) => entry[0]); // Get just the subcategory name

        // If no subcategories are found, fall back to default options
        if (sortedSubcategories.length <= 1) {
          sortedSubcategories = ["Music", "Sports", "Dance"];
        }

        console.log("Sorted subcategories by frequency:", sortedSubcategories);

        // Get paginated events for response
        const paginatedQuery =
          queryResponse.query +
          ` LIMIT ${pageSize} OFFSET ${(pageNum - 1) * pageSize}`;
        events = await db.sequelize.query(paginatedQuery, {
          type: QueryTypes.SELECT,
        });
      }
    } catch (parseError) {
      console.log(
        "Query generation response was not in JSON format:",
        parseError
      );
    }

    // Generate response for the chat
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 1,
      messages: [
        {
          role: "system",
          content: process.env.CHAT_SYSTEM_PROMPT,
        },
        ...chatHistory,
        { role: "user", content: message },
      ],
    });

    res.json({
      message: completion.choices[0].message.content,
      events: events,
      totalPages: Math.ceil(totalCount / pageSize),
      currentPage: pageNum,
      totalEvents: totalCount,
      role: "assistant",
      subcategories: sortedSubcategories, // Now sending sorted subcategories
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};