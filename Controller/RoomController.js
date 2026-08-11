const RoomModel = require("../Model/RoomModel");
const { uploadImage } = require("../Utils/Cloudinary");

const { generatePdfTable } = require("../Utils/Pdf");

exports.addRoom = async (req, res) => {
  try {
    const {
      hotelId,
      roomNumber,
      floor,
      roomType,
      pricePerNight,
      capacity,
      kingSizeBed,
      queenSizeBed,
      singleBed,
      doubleBed,
      ac,
      cooler,
      attachedBathroom,
      bathtub,
      geyser,
      tv,
      wifi,
      telephone,
      miniFridge,
      microwave,
      electricKettle,
      sofa,
      diningTable,
      wardrobe,
      balcony,
      locker,
      smokeDetector,
      fireExtinguisher,
      roomService,
      laundryService,
      housekeeping,
    } = req.body;

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
      const filesToUpload = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];
      const uploadResults = await uploadImage(filesToUpload);
      imageUrls = uploadResults.map((result) => result.secure_url);
    }

    const toBool = (val) => String(val) === "true";

    const newRoom = await RoomModel.create({
      hotelId,
      roomNumber: Number(roomNumber),
      floor: floor ? Number(floor) : 1,
      roomType: roomType || "Single",
      pricePerNight: Number(pricePerNight),
      capacity: capacity ? Number(capacity) : 2,
      images: imageUrls,

      kingSizeBed: toBool(kingSizeBed),
      queenSizeBed: toBool(queenSizeBed),
      singleBed: toBool(singleBed),
      doubleBed: toBool(doubleBed),

      ac: toBool(ac),
      cooler: toBool(cooler),
      attachedBathroom: toBool(attachedBathroom),
      bathtub: toBool(bathtub),
      geyser: toBool(geyser),
      tv: toBool(tv),
      wifi: toBool(wifi),
      telephone: toBool(telephone),
      miniFridge: toBool(miniFridge),
      microwave: toBool(microwave),
      electricKettle: toBool(electricKettle),
      sofa: toBool(sofa),
      diningTable: toBool(diningTable),
      wardrobe: toBool(wardrobe),
      balcony: toBool(balcony),
      locker: toBool(locker),
      smokeDetector: toBool(smokeDetector),
      fireExtinguisher: toBool(fireExtinguisher),

      roomService: toBool(roomService),
      laundryService: toBool(laundryService),
      housekeeping: toBool(housekeeping),

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

exports.getAllUserRooms = async (req, res) => {
  try {
    const {
      hotelId,
      search = "",
      sort = "default",
      page = 1,
      limit = 6,

      // Bed Type
      kingSizeBed,
      queenSizeBed,
      singleBed,
      doubleBed,

      // Amenities
      ac,
      wifi,
      tv,
      geyser,
      miniFridge,
      bathtub,
      balcony,
      sofa,
      locker,

      // Services
      roomService,
      laundryService,
      housekeeping,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 6);
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      isActive: true,
      isAvailable: true,
    };

    if (hotelId) {
      filter.hotelId = hotelId;
    }

    // Search
    if (search) {
      const searchConditions = [
        {
          roomType: {
            $regex: search,
            $options: "i",
          },
        },
      ];
      const searchNum = parseInt(search, 10);
      if (!isNaN(searchNum)) {
        searchConditions.push({ roomNumber: searchNum });
      }
      filter.$or = searchConditions;
    }

    // Boolean Filters
    const booleanFields = [
      "kingSizeBed",
      "queenSizeBed",
      "singleBed",
      "doubleBed",
      "ac",
      "wifi",
      "tv",
      "geyser",
      "miniFridge",
      "bathtub",
      "balcony",
      "sofa",
      "locker",
      "roomService",
      "laundryService",
      "housekeeping",
    ];

    booleanFields.forEach((field) => {
      if (req.query[field] === "true") {
        filter[field] = true;
      }
    });

    // Sorting
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
      .populate(
        "hotelId",
        "hotelname hotelemail hotelphone ownername"
      )
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

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ message: "Room ID is required." });
    }

    let updateData = { ...req.body };

    const booleanFields = [
      "kingSizeBed", "queenSizeBed", "singleBed", "doubleBed",
      "ac", "cooler", "attachedBathroom", "bathtub", "geyser", "tv",
      "wifi", "telephone", "miniFridge", "microwave", "electricKettle",
      "sofa", "diningTable", "wardrobe", "balcony", "locker",
      "smokeDetector", "fireExtinguisher", "roomService",
      "laundryService", "housekeeping", "isAvailable", "isActive"
    ];

    booleanFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        updateData[field] = String(updateData[field]) === "true";
      }
    });

    if (req.files && req.files.images) {
      const filesToUpload = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];
      const uploadResults = await uploadImage(filesToUpload);
      updateData.images = uploadResults.map((result) => result.secure_url);
    }

    const updatedRoom = await RoomModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });

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

exports.softDeleteRoom = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "Room ID is required." });

    const room = await RoomModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    return res.status(200).json({ message: "Room deactivated successfully.", room });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.restoreRoom = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "Room ID is required." });

    const room = await RoomModel.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    );
    return res.status(200).json({ message: "Room activated successfully.", room });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

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
exports.adminAddRoom = async (req, res) => {
  try {
    const {
      hotelId,
      roomNumber,
      floor,
      roomType,
      pricePerNight,
      capacity,
      kingSizeBed,
      queenSizeBed,
      singleBed,
      doubleBed,
      ac,
      cooler,
      attachedBathroom,
      bathtub,
      geyser,
      tv,
      wifi,
      telephone,
      miniFridge,
      microwave,
      electricKettle,
      sofa,
      diningTable,
      wardrobe,
      balcony,
      locker,
      smokeDetector,
      fireExtinguisher,
      roomService,
      laundryService,
      housekeeping,
    } = req.body;

    if (!hotelId || !roomNumber || !pricePerNight) {
      return res.status(400).json({

        message: "Hotel ID, Room Number, and Price Per Night are mandatory.",
      });
    }

    const roomExists = await RoomModel.findOne({
      hotelId,
      roomNumber: Number(roomNumber),
    });

    if (roomExists) {
      return res.status(400).json({
        message: `Room number ${roomNumber} already exists in this hotel.`,
      });
    }

    let imageUrls = [];
    if (req.files && req.files.images) {
      const filesToUpload = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];
      const uploadResults = await uploadImage(filesToUpload);
      imageUrls = uploadResults.map((result) => result.secure_url);
    }

    const toBool = (val) => String(val) === "true";

    const room = await RoomModel.create({
      hotelId,
      roomNumber: Number(roomNumber),
      floor: floor ? Number(floor) : 1,
      roomType: roomType || "Single",
      pricePerNight: Number(pricePerNight),
      capacity: capacity ? Number(capacity) : 2,
      images: imageUrls,
      kingSizeBed: toBool(kingSizeBed),
      queenSizeBed: toBool(queenSizeBed),
      singleBed: toBool(singleBed),
      doubleBed: toBool(doubleBed),
      ac: toBool(ac),
      cooler: toBool(cooler),
      attachedBathroom: toBool(attachedBathroom),
      bathtub: toBool(bathtub),
      geyser: toBool(geyser),
      tv: toBool(tv),
      wifi: toBool(wifi),
      telephone: toBool(telephone),
      miniFridge: toBool(miniFridge),
      microwave: toBool(microwave),
      electricKettle: toBool(electricKettle),
      sofa: toBool(sofa),
      diningTable: toBool(diningTable),
      wardrobe: toBool(wardrobe),
      balcony: toBool(balcony),
      locker: toBool(locker),
      smokeDetector: toBool(smokeDetector),
      fireExtinguisher: toBool(fireExtinguisher),

      roomService: toBool(roomService),
      laundryService: toBool(laundryService),
      housekeeping: toBool(housekeeping),

      isActive: true,
      isAvailable: true,
    });

    return res.status(201).json({

      message: "Room created and added to hotel configuration successfully!",
      room,
    });
  } catch (error) {
    console.error("Admin Add Room Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

exports.viewdetails = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        message: "Room ID is required.",
      });
    }

    const room = await RoomModel.findById(id).populate(
      "hotelId",
      "hotelname hotelemail hotelphone ownername"
    );

    if (!room) {
      return res.status(404).json({
        message: "Room not found.",
      });
    }

    return res.status(200).json(room);
  } catch (error) {
    console.error("View Room Details Error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};


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