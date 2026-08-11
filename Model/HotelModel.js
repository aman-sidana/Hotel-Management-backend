const mongoose = require('mongoose');

const HotelSchema = new mongoose.Schema({
    hotelname: {
        type: String,
        required: true
    },
    hotelphone: {
        type: Number,
        required: true
    },
    hotelemail: {
        type: String,
        required: true
    },
    stateId: {
        type: mongoose.Types.ObjectId,
        ref: "states"
    },
    districtId: {
        type: mongoose.Types.ObjectId,
        ref: "districts"
    },
    cityId: {
        type: mongoose.Types.ObjectId,
        ref: "cities"
    },
    hoteladdress: {
        type: String,
        required: true
    },
    totalrooms: {
        type: Number,
        required: true
    },
    totalstaff: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: "pending",
    },
    isActive: {
        type: Boolean,
        default: true
    },
    description: {
        type: String
    },
    otp: {
        type: String
    },
    expireTime: {
        type: Date
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    hotelRequestId: {
        type: String
    },
    images: {
        type: [String],
        default: []
    },
    adminId:{
        type:mongoose.Types.ObjectId,
        ref:"admin"
    }
},
{
    createdAt: false,
    timestamps: true,
    versionKey: false,
    updatedAt: false
});

module.exports = mongoose.model('HotelDetails', HotelSchema);