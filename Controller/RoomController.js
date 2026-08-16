const RoomModel = require("../Model/RoomModel");
const { uploadImage } = require("../Utils/Cloudinary");
const { generatePdfTable } = require("../Utils/Pdf");

// Add Room
exports.addRoom = async (req, res) => {
  try {
    const { hotelId, roomNumber, floor, roomType, pricePerNight, capacity, beds, amenities } = req.body;

    if (!hotelId || !roomNumber || !pricePerNight) {
      return res.status(400).json({
        message: "Hotel ID, Room Number, and Price Per Night are required.",
      });
    }

    const existingRoom = await RoomModel.findOne({ hotelId, roomNumber });
    if (existingRoom) {
      return res.status(400).json({
        message: "Room number already exists in this hotel.",
      });
    }

    let imageUrls = [];
    if (req.files && req.files.images) {
      const filesToUpload = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      const uploadResults = await uploadImage(filesToUpload);
      imageUrls = uploadResults.map((result) => result.secure_url);
    }

    // Parse array if sent as JSON string from FormData
    const parsedBeds = typeof beds === "string" ? JSON.parse(beds) : beds || [];
    const parsedAmenities = typeof amenities === "string" ? JSON.parse(amenities) : amenities || [];

    const newRoom = await RoomModel.create({
      hotelId,
      roomNumber: Number(roomNumber),
      floor: Number(floor || 1),
      roomType: roomType || "Single",
      pricePerNight: Number(pricePerNight),
      capacity: Number(capacity || 2),
      images: imageUrls,
      beds: parsedBeds,
      amenities: parsedAmenities,
      isActive: true,
      isAvailable: true,
    });

    return res.status(201).json({
      message: "Room created successfully!",
      room: newRoom,
    });
  } catch (error) {
    console.error("Add Room Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Admin Add Room
exports.adminAddRoom = async (req, res) => {
  try {
    const { hotelId, roomNumber, floor, roomType, pricePerNight, capacity, beds, amenities } = req.body;

    if (!hotelId || !roomNumber || !pricePerNight) {
      return res.status(400).json({
        message: "Hotel ID, Room Number, and Price Per Night are mandatory.",
      });
    }

    const roomExists = await RoomModel.findOne({ hotelId, roomNumber: Number(roomNumber) });
    if (roomExists) {
      return res.status(400).json({
        message: `Room number ${roomNumber} already exists in this hotel.`,
      });
    }

    let imageUrls = [];
    if (req.files && req.files.images) {
      const filesToUpload = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      const uploadResults = await uploadImage(filesToUpload);
      imageUrls = uploadResults.map((result) => result.secure_url);
    }

    const parsedBeds = typeof beds === "string" ? JSON.parse(beds) : beds || [];
    const parsedAmenities = typeof amenities === "string" ? JSON.parse(amenities) : amenities || [];

    const room = await RoomModel.create({
      hotelId,
      roomNumber: Number(roomNumber),
      floor: Number(floor || 1),
      roomType: roomType || "Single",
      pricePerNight: Number(pricePerNight),
      capacity: Number(capacity || 2),
      images: imageUrls,
      beds: parsedBeds,
      amenities: parsedAmenities,
      isActive: true,
      isAvailable: true,
    });

    return res.status(201).json({
      message: "Room created and added to hotel configuration successfully!",
      room,
    });
  } catch (error) {
    console.error("Admin Add Room Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get All Rooms (Admin / General)
exports.getAllRooms = async (req, res) => {
  try {
    const rooms = await RoomModel.find().populate(
      "hotelId",
      "hotelname hotelemail hotelphone ownername"
    );
    return res.status(200).json(rooms);
  } catch (error) {
    console.error("Get All Rooms Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get All User Rooms with Filter & Search & Pagination
exports.getAllUserRooms = async (req, res) => {
  try {
    const { hotelId, search = "", sort = "default", page = 1, limit = 6, beds, amenities } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 6);
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      isActive: true,
      isAvailable: true,
    };

    if (hotelId) filter.hotelId = hotelId;

    if (search) {
      const searchNum = parseInt(search, 10);
      filter.$or = [
        { roomType: { $regex: search, $options: "i" } },
        ...(!isNaN(searchNum) ? [{ roomNumber: searchNum }] : []),
      ];
    }

    if (beds) {
      const bedsList = typeof beds === "string" ? beds.split(",") : beds;
      filter.beds = { $in: bedsList };
    }

    if (amenities) {
      const amenitiesList = typeof amenities === "string" ? amenities.split(",") : amenities;
      filter.amenities = { $in: amenitiesList };
    }

    const sortOptions = {
      default: { createdAt: -1 },
      priceLowHigh: { pricePerNight: 1 },
      priceHighLow: { pricePerNight: -1 },
      roomAsc: { roomNumber: 1 },
      roomDesc: { roomNumber: -1 },
    };

    const totalRooms = await RoomModel.countDocuments(filter);
    const totalPages = Math.ceil(totalRooms / limitNum) || 1;

    const rooms = await RoomModel.find(filter)
      .populate("hotelId", "hotelname hotelemail hotelphone ownername")
      .sort(sortOptions[sort] || sortOptions.default)
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      rooms,
      totalRooms,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Update Room Details
exports.updateRoom = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ message: "Room ID is required." });
    }

    let updateData = { ...req.body };

    if (typeof updateData.beds === "string") {
      updateData.beds = JSON.parse(updateData.beds);
    }
    if (typeof updateData.amenities === "string") {
      updateData.amenities = JSON.parse(updateData.amenities);
    }

    if (req.files && req.files.images) {
      const filesToUpload = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      const uploadResults = await uploadImage(filesToUpload);
      updateData.images = uploadResults.map((result) => result.secure_url);
    }

    const updatedRoom = await RoomModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedRoom) {
      return res.status(404).json({ message: "Room not found." });
    }

    return res.status(200).json({
      message: "Room updated successfully!",
      room: updatedRoom,
    });
  } catch (error) {
    console.error("Update Room Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Soft Delete Room
exports.softDeleteRoom = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "Room ID is required." });

    const room = await RoomModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
    return res.status(200).json({ message: "Room deactivated successfully.", room });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Restore Room
exports.restoreRoom = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "Room ID is required." });

    const room = await RoomModel.findByIdAndUpdate(id, { isActive: true }, { new: true });
    return res.status(200).json({ message: "Room activated successfully.", room });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Permanently Delete Room
exports.deleteRoom = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "Room ID is required." });

    await RoomModel.findByIdAndDelete(id);
    return res.status(200).json({ message: "Room deleted permanently." });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// View Details of Single Room
exports.viewdetails = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "Room ID is required." });

    const room = await RoomModel.findById(id).populate(
      "hotelId",
      "hotelname hotelemail hotelphone ownername"
    );

    if (!room) return res.status(404).json({ message: "Room not found." });

    return res.status(200).json(room);
  } catch (error) {
    console.error("View Room Details Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Download Room Inventory Report PDF
exports.downloadRoomPdf = async (req, res) => {
  try {
    const { hotelId, search = "", status } = req.query;
    const filter = {};
    if (hotelId) filter.hotelId = hotelId;
    if (status === "available") filter.isAvailable = true;
    else if (status === "booked") filter.isAvailable = false;

    let rooms = await RoomModel.find(filter).populate("hotelId", "hotelname");

    if (search) {
      rooms = rooms.filter((r) =>
        (r.roomNumber && String(r.roomNumber).toLowerCase().includes(search.toLowerCase())) ||
        (r.roomType && r.roomType.toLowerCase().includes(search.toLowerCase())) ||
        (r.hotelId?.hotelname && r.hotelId.hotelname.toLowerCase().includes(search.toLowerCase()))
      );
    }

    const headers = ["#", "Room No", "Type", "Floor", "Price/Night", "Status"];
    const colWidths = [15, 30, 45, 25, 35, 25];

    const rows = rooms.map((r, idx) => [
      idx + 1,
      `#${r.roomNumber}`,
      r.roomType || "Standard",
      r.floor || "1",
      `₹${r.pricePerNight}`,
      r.isAvailable ? "Available" : "Occupied"
    ]);

    const pdfBuffer = generatePdfTable("Hotel Room Inventory Report", headers, colWidths, rows);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=Rooms_Report.pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Unable to generate PDF" });
  }
};