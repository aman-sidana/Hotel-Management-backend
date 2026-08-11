const mongoose = require('mongoose')

const StateSchema = new mongoose.Schema({
    countryName: {
        type: String,
        default:"India"
    },
    stateName: {
        type: String,
        required: true
    },
    status:{
        type:Boolean,
        default:true
    }
},
    {
        timestamps: true,
        versionKey: false
    })

module.exports = mongoose.model('states', StateSchema)
