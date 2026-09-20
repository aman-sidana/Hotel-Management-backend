const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: true
    },
    role: {
        type: String,
        default: "user"
    },
    theme: {
        type: String,
        default: "light"
    },
    otp: {
        type: Number,
    },
    expireTime: {
        type: Number
    }

},
    {
        timestamps: true,
        versionKey: false
    })

module.exports = mongoose.model('user', UserSchema)
