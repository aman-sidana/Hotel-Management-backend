const mongoose = require("mongoose");

const CitySchema = new mongoose.Schema(
    {
        cityName: {
            type: String,
            required: true,
        },
        districtId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "districts",
        },
        status: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model("cities", CitySchema);