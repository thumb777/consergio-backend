const db = require("../models");
const Waitlist = db.waitlist;

const registerWaitlists = async (req, res) => {
  try {
    const { email, firstName, lastName, country, state, city } = req.body;

    console.log("---------------E_____M--------", email);

    // Check if the email already exists in the waitlist
    const existingEmail = await Waitlist.findOne({
      where: { email_address: email },
    });

    if (existingEmail) {
      console.log("-------------Email is already registered-------", email);

      return res.status(400).json({ message: "Email is already registered" });
    }

    // Save the email to the waitlist with created_at
    await Waitlist.create({
      first_name: firstName,
      last_name: lastName,
      email_address: email,
      country: country,
      state: state,
      city: city,
      status: true,
      created_at: new Date(), // Provide the current timestamp
      updated_at: new Date()
    });

    res.status(200).json({ message: "Email registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  registerWaitlists,
};