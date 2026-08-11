const Booking = require("../Model/BookingModel");
const Hotel = require("../Model/HotelModel");
const admin = require("../Model/AdminModel")
const UserModel = require("../Model/UserModel");
const RoomModel = require("../Model/RoomModel");
const TemporaryModel = require("../Model/TemporaryModel");

const { generatePdfTable } = require("../Utils/Pdf");

exports.createBooking = async (req, res) => {
  try {
    const {
      userId,
      hotelId,
      roomId,
      price,
      startDate,
      endDate,
      couponId,
    } = req.body;

    if (
      !userId ||
      !hotelId ||
      !roomId ||
      !price ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const hotel = await Hotel.findById(hotelId);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found.",
      });
    }

    const room = await RoomModel.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    if (!room.isAvailable) {
      return res.status(400).json({
        success: false,
        message: "Room is already booked.",
      });
    }

    const booking = await Booking.create({
      userId,
      adminId: hotel.adminId,
      hotelId,
      roomId,
      price,
      startDate,
      endDate,
      couponId: couponId || null,
      status: "pending",
    });

    await TemporaryModel.deleteMany({ roomId });

    res.status(201).json({
      success: true,
      message: "Booking created successfully.",
      booking,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
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

    res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    res.status(500).json({
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

    res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAdminBookings = async (req, res) => {
  try {
    const { adminId, hotelId, page, limit } = req.query;

    let adminDoc = null;
    if (adminId) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(adminId);
      if (isObjectId) {
        adminDoc = await admin.findById(adminId);
        if (!adminDoc) {
          const userDoc = await UserModel.findById(adminId);
          if (userDoc?.email) {
            adminDoc = await admin.findOne({ email: userDoc.email.toLowerCase() });
          }
        }
      }
    }

    const actualAdminId = adminDoc ? adminDoc._id : adminId;

    const adminHotels = actualAdminId
      ? await Hotel.find({ adminId: actualAdminId }).select("_id")
      : [];
    const hotelIds = adminHotels.map((h) => h._id);

    const filter = {};
    if (hotelId && hotelId !== "all") {
      filter.hotelId = hotelId;
    } else if (actualAdminId || adminId) {
      filter.$or = [];
      if (actualAdminId) {
        filter.$or.push({ adminId: actualAdminId });
        if (hotelIds.length > 0) {
          filter.$or.push({ hotelId: { $in: hotelIds } });
        }
      }
      if (adminId && adminId !== String(actualAdminId)) {
        filter.$or.push({ adminId: adminId });
      }
      if (filter.$or.length === 0) {
        delete filter.$or;
      }
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const totalBookings = await Booking.countDocuments(filter);
    const totalPages = Math.ceil(totalBookings / limitNum) || 1;

    const bookings = await Booking.find(filter)
      .populate("userId", "name email phone")
      .populate("hotelId", "hotelname hoteladdress")
      .populate("roomId", "roomNumber roomType pricePerNight")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      bookings,
      totalBookings,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
    });

  } catch (error) {
    console.log("Error in getAdminBookings:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



exports.checkIn = async (req, res) => {
  try {
    const { id } = req.query;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    booking.status = "checkIn";
    await booking.save();

    res.status(200).json({
      success: true,
      message: "Customer Checked In",
      booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const { id } = req.query;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    booking.status = "checkOut";
    await booking.save();

    await RoomModel.findByIdAndUpdate(booking.roomId, {
      isAvailable: true,
    });

    res.status(200).json({
      success: true,
      message: "Customer Checked Out",
      booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getBookingsByRoom = async (req, res) => {
  try {
    const { roomId } = req.query;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "roomId is required",
      });
    }

    // Fetch bookings that are NOT cancelled/rejected/checked out — these are the active/pending ones to highlight yellow
    const bookings = await Booking.find({ roomId })
      .select("startDate endDate status")
      .sort({ startDate: 1 });

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


exports.downloadAdminBookingsPdf = async (req, res) => {
  try {
    const { adminId, hotelId, status } = req.query;
    const filter = {};
    if (adminId) filter.adminId = adminId;
    if (hotelId) filter.hotelId = hotelId;
    if (status && status !== "all") filter.status = status;

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
      b.status
    ]);

    const pdfBuffer = generatePdfTable("Booking Management Report", headers, colWidths, rows);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=Bookings_Report.pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Unable to generate PDF" });
  }
};

