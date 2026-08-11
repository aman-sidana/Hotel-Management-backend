const RatingModel = require("../Model/RatingModel");
const BookingModel = require("../Model/BookingModel");
const HotelModel = require("../Model/HotelModel");

exports.AddRating = async (req, res) => {
    try {
        const { bookingId, hotelId, userId, rating, description } = req.body;

        if (!bookingId || !hotelId || !userId || !rating) {
            return res.status(400).json({
                message: "bookingId, hotelId, userId, and rating are required fields.",
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                message: "Rating value must be between 1 and 5.",
            });
        }

        const booking = await BookingModel.findById(bookingId);
        if (!booking) {
            return res.status(404).json({
                message: "Booking not found.",
            });
        }

        if (booking.userId.toString() !== userId) {
            return res.status(403).json({

                message: "You are not authorized to rate this booking.",
            });
        }

        if (booking.status !== "checkOut") {
            return res.status(400).json({
                message: "You can only rate a hotel after checking out.",
            });
        }

        const existingRating = await RatingModel.findOne({ bookingId });
        if (existingRating) {
            return res.status(400).json({
                message: "A rating for this booking has already been submitted.",
            });
        }

        const newRating = await RatingModel.create({
            bookingId,
            hotelId,
            userId,
            rating,
            description: description || "",
            isRated: true,
        });

        return res.status(201).json({
            success: true,
            message: "Rating submitted successfully.",
            data: newRating,
        });
    } catch (error) {
        console.error( error);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

exports.ViewRating = async (req, res) => {
    try {
        const { hotelId, userId, bookingId } = req.query;

        let filter = {};

        if (hotelId) filter.hotelId = hotelId;
        if (userId) filter.userId = userId;
        if (bookingId) filter.bookingId = bookingId;

        const ratings = await RatingModel.find(filter)
            .populate("userId", "name email")
            .populate("hotelId", "hotelname hotelemail hoteladdress")
            .populate("bookingId", "startDate endDate roomType")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            count: ratings.length,
            ratings,
        });
    } catch (error) {
        console.error(error)
        return res.status(500).json({

            message:"Internal Server Error",
        });
    }
};

exports.AverageRating = async (req, res) => {
    try {
        const { hotelId } = req.query;

        if (!hotelId) {
            return res.status(400).json({
                success: false,
                message: "hotelId query parameter is required.",
            });
        }

        const mongoose = require("mongoose");

        const stats = await RatingModel.aggregate([
            {
                $match: {
                    hotelId: new mongoose.Types.ObjectId(hotelId),
                    isRated: true,
                },
            },
            {
                $group: {
                    _id: "$hotelId",
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 },
                },
            },
        ]);

        if (stats.length === 0) {
            return res.status(200).json({
                message: "No ratings found for this hotel.",
                averageRating: 0,
                totalReviews: 0,
            });
        }

        return res.status(200).json({
            success: true,
            hotelId,
            averageRating: parseFloat(stats[0].averageRating.toFixed(1)),
            totalReviews: stats[0].totalReviews,
        });
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};