const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    adminname: {
        type: String,
        required: true
    },
    adminphone: {
        type: Number,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    permanentaddress: {
        type: String,
        required: true
    },
    currentaddress: {
        type: String
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
    AdminRequestId: {
        type: String
    },
    ownerimage: {
        type: String,
    },
    role: {
        type: String,
        default: "admin"
    },
    password: {
        type: String,
    }
}, {
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model('admin', AdminSchema);