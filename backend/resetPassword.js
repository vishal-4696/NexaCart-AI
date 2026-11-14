require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = "customer1@example.com";
    const newPassword = "NexaAdmin123!";

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const user = await User.findOneAndUpdate(
      { email },
      { $set: { passwordHash, role: "admin" } },
      { new: true },
    );

    if (!user) {
      console.log("User not found.");
      return;
    }

    console.log("Account updated successfully.");
    console.log("Email:", user.email);
    console.log("New password:", newPassword);
    console.log("Role:", user.role);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

resetPassword();
