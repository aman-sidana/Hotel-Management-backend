const Booking = require("../Model/BookingModel");
const Hotel = require("../Model/HotelModel");
const RoomModel = require("../Model/RoomModel");
const TemporaryModel = require("../Model/TemporaryModel");
const { generatePdfTable } = require("../Utils/Pdf");

exports.createBooking = async (req, res) => {
  try {
    const { userId, hotelId, roomId, price, startDate, endDate, couponId } = req.body;

    if (!userId || !hotelId || !roomId || !price || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const room = await RoomModel.findById(roomId);
    if (!room || !room.isAvailable) {
      return res.status(400).json({
        success: false,
        message: !room ? "Room not found." : "Room is already booked.",
      });
    }

    const booking = await Booking.create({
      userId,
      hotelId,
      roomId,
      price,
      startDate,
      endDate,
      couponId: couponId || null,
      status: "pending",
    });

    await TemporaryModel.deleteMany({ roomId });

    return res.status(201).json({
      success: true,
      message: "Booking created successfully.",
      booking,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const { userId } = req.query;
    const bookings = await Booking.find({ userId })
      .populate("hotelId")
      .populate("roomId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getHotelBookings = async (req, res) => {
  try {
    const { hotelId } = req.query;
    const bookings = await Booking.find({ hotelId })
      .populate("userId", "name email phone")
      .populate("roomId");

    return res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAdminBookings = async (req, res) => {
  try {
    const { adminId, hotelId, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (hotelId && hotelId !== "all") {
      filter.hotelId = hotelId;
    } else if (adminId) {
      const adminHotelIds = await Hotel.find({ adminId }).distinct("_id");
      filter.hotelId = { $in: adminHotelIds };
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const [totalBookings, bookings] = await Promise.all([
      Booking.countDocuments(filter),
      Booking.find(filter)
        .populate("userId", "name email phone")
        .populate("hotelId", "hotelname hoteladdress")
        .populate("roomId", "roomNumber roomType pricePerNight")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    return res.status(200).json({
      success: true,
      bookings,
      totalBookings,
      totalPages: Math.ceil(totalBookings / limitNum) || 1,
      currentPage: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error("Error in getAdminBookings:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.checkIn = async (req, res) => {
  try {
    const { id } = req.query;
    const booking = await Booking.findByIdAndUpdate(
      id,
      { status: "checkIn" },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Customer Checked In",
      booking,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const { id } = req.query;
    const booking = await Booking.findByIdAndUpdate(
      id,
      { status: "checkOut" },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    await RoomModel.findByIdAndUpdate(booking.roomId, { isAvailable: true });

    return res.status(200).json({
      success: true,
      message: "Customer Checked Out",
      booking,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBookingsByRoom = async (req, res) => {
  try {
    const { roomId } = req.query;
    if (!roomId) {
      return res.status(400).json({ success: false, message: "roomId is required" });
    }

    const bookings = await Booking.find({ roomId })
      .select("startDate endDate status")
      .sort({ startDate: 1 });

    return res.status(200).json({ success: true, bookings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.downloadAdminBookingsPdf = async (req, res) => {
  try {
    const { adminId, hotelId, status } = req.query;
    const filter = {};

    if (hotelId && hotelId !== "all") {
      filter.hotelId = hotelId;
    } else if (adminId) {
      const adminHotelIds = await Hotel.find({ adminId }).distinct("_id");
      filter.hotelId = { $in: adminHotelIds };
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate("userId", "name email phone")
      .populate("hotelId", "hotelname")
      .populate("roomId", "roomNumber roomType")
      .sort({ createdAt: -1 });

    const headers = ["#", "Guest Name", "Hotel Name", "Room", "Price", "Status"];
    const colWidths = [15, 45, 50, 30, 25, 23];

    const rows = bookings.map((b, idx) => [
      idx + 1,
      b.userId?.name || "Guest",
      b.hotelId?.hotelname || "-",
      b.roomId ? `${b.roomId.roomType || ""} #${b.roomId.roomNumber || ""}` : "-",
      `₹${b.price || 0}`,
      b.status,
    ]);

    const pdfBuffer = generatePdfTable("Booking Management Report", headers, colWidths, rows);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=Bookings_Report.pdf");
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("Error in downloadAdminBookingsPdf:", error);
    return res.status(500).json({ message: "Unable to generate PDF" });
  }
};
