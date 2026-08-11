const express = require("express");
const router = express.Router();
const BookingController = require("../Controller/BookingController");
const auth = require("../Auth/auth")

router.post("/create", auth, BookingController.createBooking);
router.get("/user-bookings", auth, BookingController.getUserBookings);
router.get("/hotel-bookings", auth, BookingController.getHotelBookings);
router.get("/all-bookings", auth, BookingController.getAdminBookings);


router.patch("/checkin", auth, BookingController.checkIn);
router.patch("/checkout", auth, BookingController.checkOut);


router.get("/room-bookings", auth, BookingController.getBookingsByRoom);
router.get("/download-pdf", auth, BookingController.downloadAdminBookingsPdf);

module.exports = router;