const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema(
    {
        hotelId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HotelDetails",
            required: true,
        },
        roomNumber: {
            type: Number,
            required: true,
        },
        floor: {
            type: Number,
            default: 1,
        },
        roomType: {
            type: String,
            enum: ["Single", "Double", "Twin", "Deluxe", "Suite", "Family"],
            default: "Single",
        },
        pricePerNight: {
            type: Number,
            required: true,
        },
        capacity: {
            type: Number,
            default: 2,
        },
        images: {
            type: [String],
            default: [],
        },

        beds: [{ type: String, enum: ["king", "queen", "single", "double"] }],
        amenities: [{ type: String }],

        isAvailable: { type: Boolean, default: true },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model("RoomDetails", RoomSchema);