const mongoose = require('mongoose')

const DistrictSchema = new mongoose.Schema({
    districtName: {
        type: String,
        required: true
    },
    stateId: {
        type: mongoose.Types.ObjectId,
        ref: "states"
    },
    status: {
        type: Boolean,
        default: true
    }
},
    {
        timestamps: true,
        versionKey: false
    })

module.exports = mongoose.model('districts', DistrictSchema)
