const mongoose = require('mongoose');

const TemporarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "roomdetails",
      required: true,
    },
    status: {
      type: String,
      default: "temporarybooked",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // 600 seconds = 10 minutes (MongoDB TTL Live Indexing)
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('TemporaryBooking', TemporarySchema);
