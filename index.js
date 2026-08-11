const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const { automaticCanceling } = require("./Utils/Cron-job");

const fileUpload = require("express-fileupload");


const app = express();

mongoose
  .connect(process.env.URL)
  .then(() => {
    console.log("Database is Connected");
  })
  .catch((err) => console.log(err));

app.use(express.json());
app.use(cors());
app.use(fileUpload())

automaticCanceling();

const UserRoute = require("./Router/UserRoute");
app.use("/user", UserRoute);

const StateRotue = require("./Router/StateRoute")
app.use('/state', StateRotue)

const DistrictRotue = require("./Router/DistrictRoute")
app.use('/district', DistrictRotue)

const CityRotue = require("./Router/CityRoute")
app.use('/city', CityRotue)

const HotelRoute = require("./Router/HotelRoute")
app.use('/hotel', HotelRoute)

const AdminRoute = require("./Router/AdminRoute")
app.use('/admin', AdminRoute)

const CouponRoute = require("./Router/CouponRoute")
app.use('/coupon', CouponRoute)

const RoomRoutes = require("./Router/RoomRoute");
app.use("/room", RoomRoutes);

const BookingRoute = require("./Router/BookingRoute")
app.use('/booking', BookingRoute)

const TemporaryRoute = require("./Router/TemporaryRoute")
app.use('/temporary', TemporaryRoute)

const ratingRoutes = require("./Router/RatingRoute");
app.use("/rating", ratingRoutes);


app.listen(process.env.PORT, () => {
  console.log(`Server is Running on Port : ${process.env.PORT}`);
});