const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema({
    hotelId: {
        type: mongoose.Types.ObjectId,
        ref: "HotelDetails",
        required: true
    },
    couponCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    couponType: {
        type: String,
        enum: ["percentage", "flat"],
        default: "flat"
    },
    discount: {
        type: Number,
        required: true
    },
    minPriceAvail: {
        type: Number,
    },
    startingDate: {
        type: Date,
        required: true
    },
    dateUpTo: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    couponImages:{
        type:String
    }
}, {
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model("coupon", CouponSchema);