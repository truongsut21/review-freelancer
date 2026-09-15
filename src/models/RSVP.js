import mongoose from "mongoose";

const rsvpSchema = new mongoose.Schema(
  {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest"
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    phone: {
      type: String,
      trim: true
    },
    attendance: {
      type: String,
      enum: ["ceremony", "reception", "both", "decline"],
      required: true
    },
    dietaryRequirements: {
      type: String,
      default: ""
    },
    message: {
      type: String,
      default: ""
    },
    confirmationSentAt: Date
  },
  { timestamps: true }
);

export const RSVP = mongoose.model("RSVP", rsvpSchema);
