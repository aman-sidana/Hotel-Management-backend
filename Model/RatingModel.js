const mongoose = require("mongoose");

const RatingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HotelDetails",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    description: {
      type: String,
      default: "",
    },

    isRated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Rating", RatingSchema);