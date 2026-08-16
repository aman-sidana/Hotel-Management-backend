const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HotelDetails",
      required: true,
    },

    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoomDetails",
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "coupon",
      default: null,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "checkIn",
        "checkOut",
        "cancelled",
        "rejected",
      ],
      default: "pending",
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Booking", BookingSchema);