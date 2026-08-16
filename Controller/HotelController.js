const Hotelmodel = require("../Model/HotelModel");
const RoomDetails = require("../Model/RoomModel");
const { info, otp } = require("../Utils/transporter");
const UserModel = require('../Model/UserModel');
const StateModel = require("../Model/StateModel");
const DistrictModel = require("../Model/DistrictModel");
const CityModel = require("../Model/CityModel");
const AdminModel = require("../Model/AdminModel");
const XLSX = require("xlsx");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require('bcrypt');
const { uploadImage } = require("../Utils/Cloudinary");
const { generatePdfTable } = require("../Utils/Pdf");

exports.superAdminAddHotel = async (req, res) => {
    try {
        const {
            hotelname,
            hotelphone,
            hotelemail,
            cityId,
            hoteladdress,
            totalrooms,
            totalstaff,
            adminId
        } = req.body;

        if (
            !hotelname ||
            !hotelphone ||
            !hotelemail ||
            !hoteladdress ||
            !totalrooms ||
            !totalstaff
        ) {
            return res.status(400).json({
                success: false,
                message: "All required hotel fields are missing details.",
            });
        }

        const hotelExists = await Hotelmodel.findOne({ hotelemail });
        if (hotelExists) {
            return res.status(400).json({
                success: false,
                message: "A hotel with this email already exists.",
            });
        }

        const userExists = await UserModel.findOne({ email: hotelemail });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: "User account credentials using this email already exist.",
            });
        }

        const randomPassword = uuidv4().substring(0, 10);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        const hotelRequestId = uuidv4().substring(0, 10);

        const hotel = await Hotelmodel.create({
            hotelname,
            hotelphone,
            hotelemail,
            cityId: cityId || null,
            hoteladdress,
            totalrooms,
            totalstaff,
            hotelRequestId,
            adminId: adminId || null,
            status: "approved",
            emailVerified: true,
            isActive: true
        });


        await UserModel.create({
            name: hotelname,
            phone: hotelphone,
            email: hotelemail,
            password: hashedPassword,
            role: "hotel"
        });

        await info(
            hotelemail,
            "Hotel Account Activated Successfully",
            `
            <div style="font-family: Arial, sans-serif;">
                <h2>Welcome ${hotelname}! 🎉</h2>
                <p>Your hotel profile account has been directly registered and approved by the Super Admin.</p>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <h3>Dashboard Access Credentials</h3>
                <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; border-color: #eee;">
                    <tr>
                        <td><b>Login Email</b></td>
                        <td>${hotelemail}</td>
                    </tr>
                    <tr>
                        <td><b>Temporary Password</b></td>
                        <td><code>${randomPassword}</code></td>
                    </tr>
                    <tr>
                        <td><b>Hotel Request ID</b></td>
                        <td>${hotelRequestId}</td>
                    </tr>
                </table>
                <br>
                <p>Please log in using these credentials and promptly change your password configuration on your first login profile view.</p>
                <br>
                <p>Regards,</p>
                <h4>Management Team</h4>
            </div>
            `
        );

        return res.status(201).json({
            success: true,
            message: "Hotel profile configuration created successfully.",
            hotel,
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

exports.allhotel = async (req, res) => {
    try {
        const { search = "", sort = "hotelAsc", status, page, limit } = req.query;

        const filter = {};

        if (status === "pending" || status === "approved" || status === "rejected") {
            filter.status = status;
        } else if (status === "active") {
            filter.isActive = true;
        } else if (status === "inactive") {
            filter.isActive = false;
        }

        if (search) {
            filter.$or = [
                {
                    hotelname: {
                        $regex: search,
                        $options: "i"
                    }
                },
                {
                    ownername: {
                        $regex: search,
                        $options: "i"
                    }
                },
                {
                    hotelemail: {
                        $regex: search,
                        $options: "i"
                    }
                },
                {
                    hotelphone: {
                        $regex: search,
                        $options: "i"
                    }
                }
            ];
        }

        let sorting = {};

        if (sort === "hotelAsc") {
            sorting = { hotelname: 1 };
        }
        else if (sort === "hotelDesc") {
            sorting = { hotelname: -1 };
        }
        else if (sort === "ownerAsc") {
            sorting = { ownername: 1 };
        }
        else if (sort === "ownerDesc") {
            sorting = { ownername: -1 };
        }

        if (page && limit) {
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, parseInt(limit) || 5);
            const skip = (pageNum - 1) * limitNum;

            const totalHotels = await Hotelmodel.countDocuments(filter);
            const totalPages = Math.ceil(totalHotels / limitNum) || 1;

            const hotels = await Hotelmodel.find(filter)
                .populate({
                    path: "cityId",
                    populate: {
                        path: "districtId",
                        populate: {
                            path: "stateId"
                        }
                    }
                })
                .populate("adminId", "adminname email")
                .sort(sorting)
                .skip(skip)
                .limit(limitNum);

            const updatedHotels = await Promise.all(
                hotels.map(async (h) => {
                    const addedRoomsCount = await RoomDetails.countDocuments({ hotelId: h._id, isActive: true });
                    return { ...h.toObject(), addedRoomsCount };
                })
            );

            return res.status(200).json({
                success: true,
                hotels: updatedHotels,
                totalHotels,
                totalPages,
                currentPage: pageNum,
                limit: limitNum
            });
        }

        const rawResult = await Hotelmodel.find(filter)
            .populate({
                path: "cityId",
                populate: {
                    path: "districtId",
                    populate: {
                        path: "stateId"
                    }
                }
            })
            .populate("adminId", "adminname email")
            .sort(sorting);

        const result = await Promise.all(
            rawResult.map(async (h) => {
                const addedRoomsCount = await RoomDetails.countDocuments({ hotelId: h._id, isActive: true });
                return { ...h.toObject(), addedRoomsCount };
            })
        );

        return res.status(200).json(result);

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

exports.allUserhotel = async (req, res) => {
    try {
        const { search = "", sort = "default", page = 1, limit = 8 } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, parseInt(limit) || 8);
        const skip = (pageNum - 1) * limitNum;

        const booleanFields = [
            "kingSizeBed", "queenSizeBed", "singleBed", "doubleBed",
            "ac", "wifi", "tv", "geyser", "miniFridge", "bathtub", "balcony", "sofa", "locker",
            "roomService", "laundryService", "housekeeping"
        ];

        const roomFilterCriteria = {
            isActive: true,
            isAvailable: true
        };
        let hasRoomFilters = false;

        booleanFields.forEach((field) => {
            if (req.query[field] === "true") {
                roomFilterCriteria[field] = true;
                hasRoomFilters = true;
            }
        });

        const pipeline = [
            {
                $match: {
                    status: "approved",
                    isActive: true
                }
            },

            {
                $lookup: {
                    from: "cities",
                    localField: "cityId",
                    foreignField: "_id",
                    as: "cityId"
                }
            },
            {
                $unwind: {
                    path: "$cityId",
                    preserveNullAndEmptyArrays: true
                }
            },

            {
                $lookup: {
                    from: "districts",
                    localField: "cityId.districtId",
                    foreignField: "_id",
                    as: "districtId"
                }
            },
            {
                $unwind: {
                    path: "$districtId",
                    preserveNullAndEmptyArrays: true
                }
            },

            {
                $lookup: {
                    from: "states",
                    localField: "districtId.stateId",
                    foreignField: "_id",
                    as: "stateId"
                }
            },
            {
                $unwind: {
                    path: "$stateId",
                    preserveNullAndEmptyArrays: true
                }
            },

            {
                $lookup: {
                    from: "admins",
                    localField: "adminId",
                    foreignField: "_id",
                    as: "adminId"
                }
            },
            {
                $unwind: {
                    path: "$adminId",
                    preserveNullAndEmptyArrays: true
                }
            }
        ];

        if (hasRoomFilters) {
            pipeline.push({
                $lookup: {
                    from: "roomdetails",
                    localField: "_id",
                    foreignField: "hotelId",
                    as: "matchingRooms"
                }
            });
            pipeline.push({
                $match: {
                    matchingRooms: {
                        $elemMatch: roomFilterCriteria
                    }
                }
            });
        }

        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        {
                            hotelname: {
                                $regex: search,
                                $options: "i"
                            }
                        },
                        {
                            hoteladdress: {
                                $regex: search,
                                $options: "i"
                            }
                        },
                        {
                            ownername: {
                                $regex: search,
                                $options: "i"
                            }
                        },
                        {
                            hotelemail: {
                                $regex: search,
                                $options: "i"
                            }
                        },
                        {
                            hotelphone: {
                                $regex: search,
                                $options: "i"
                            }
                        },
                        {
                            "cityId.cityName": {
                                $regex: search,
                                $options: "i"
                            }
                        },
                        {
                            "stateId.stateName": {
                                $regex: search,
                                $options: "i"
                            }
                        },
                        {
                            "districtId.districtName": {
                                $regex: search,
                                $options: "i"
                            }
                        }
                    ]
                }
            });
        }

        let sorting = {};

        switch (sort) {
            case "nameAsc":
                sorting = { hotelname: 1 };
                break;

            case "nameDesc":
                sorting = { hotelname: -1 };
                break;

            case "roomsHigh":
                sorting = { totalrooms: -1 };
                break;

            case "roomsLow":
                sorting = { totalrooms: 1 };
                break;

            case "cityAsc":
                sorting = { "cityId.cityName": 1 };
                break;

            case "cityDesc":
                sorting = { "cityId.cityName": -1 };
                break;

            default:
                sorting = { createdAt: -1 };
        }

        pipeline.push({
            $sort: sorting
        });

        pipeline.push({
            $facet: {
                totalData: [{ $count: "count" }],
                hotels: [
                    { $skip: skip },
                    { $limit: limitNum }
                ]
            }
        });

        const result = await Hotelmodel.aggregate(pipeline);

        const totalHotels = result[0]?.totalData[0]?.count || 0;
        const rawHotels = result[0]?.hotels || [];
        const totalPages = Math.ceil(totalHotels / limitNum) || 1;

        const hotels = await Promise.all(
            rawHotels.map(async (hotel) => {
                const addedRoomsCount = await RoomDetails.countDocuments({ hotelId: hotel._id, isActive: true });
                return { ...hotel, addedRoomsCount };
            })
        );

        return res.status(200).json({
            success: true,
            hotels,
            totalHotels,
            totalPages,
            currentPage: pageNum,
            limit: limitNum
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

exports.deleteHotel = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({
                message: "Hotel ID not Found"
            });
        }

        const result = await Hotelmodel.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({
                message: "Hotel not found",
            });
        }
        return res.status(200).json(result);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

exports.softDeleteHotel = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({
                message: "Hotel ID is required",
            });
        }

        const hotel = await Hotelmodel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
        if (!hotel) {
            return res.status(404).json({
                message: "Hotel not found",
            });
        }

        return res.status(200).json(hotel);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

exports.restoreHotel = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({
                message: "Hotel ID is required",
            });
        }

        const hotel = await Hotelmodel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );

        if (!hotel) {
            return res.status(404).json({
                message: "Hotel not found",
            });
        }

        return res.status(200).json(hotel);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

exports.viewHotelDetails = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({
                message: "Hotel ID is required",
            });
        }

        const hotel = await Hotelmodel.findById(id)
            .populate({
                path: "cityId",
                populate: {
                    path: "districtId",
                    populate: {
                        path: "stateId"
                    }
                }
            })
            .populate("adminId", "adminname email");

        if (!hotel) {
            return res.status(404).json({
                message: "Hotel not found",
            });
        }

        return res.status(200).json({
            message: "Hotel details fetched successfully",
            hotel,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

exports.sendhotelOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const existing = await Hotelmodel.findOne({ hotelemail: email });
        if (existing && existing.emailVerified) {
            return res.status(400).json({
                message: "Email already registered"
            });
        }

        const generatedOTP = otp();
        let hotel = await Hotelmodel.findOne({ hotelemail: email });

        if (!hotel) {
            hotel = new Hotelmodel({
                hotelemail: email
            });
        }

        hotel.otp = generatedOTP;
        hotel.expireTime = Date.now() + 5 * 60 * 1000;

        await hotel.save({ validateBeforeSave: false });

        await info(
            email,
            "OTP Verification",
            `<h2>Your OTP is ${generatedOTP}</h2>
             <p>OTP expires in 5 minutes.</p>`
        );

        return res.json({
            message: "OTP sent successfully"
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const hotel = await Hotelmodel.findOne({ hotelemail: email });
        if (!hotel) {
            return res.status(404).json({
                message: "Email not found"
            });
        }

        if (hotel.otp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP"
            });
        }

        if (hotel.expireTime < Date.now()) {
            return res.status(400).json({
                message: "OTP Expired"
            });
        }

        hotel.emailVerified = true;
        hotel.otp = null;
        hotel.expireTime = null;

        await hotel.save({ validateBeforeSave: false });

        return res.json({
            message: "Email Verified"
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

exports.hotelRequest = async (req, res) => {
    try {
        const {
            hotelname,
            hotelphone,
            hotelemail,
            email,
            cityId,
            hoteladdress,
            totalrooms,
            totalstaff,
            adminId
        } = req.body;

        const targetEmail = hotelemail || email;

        if (
            !hotelname ||
            !hotelphone ||
            !targetEmail ||
            !cityId ||
            !hoteladdress ||
            !totalrooms ||
            !totalstaff
        ) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const existingRecord = await Hotelmodel.findOne({ hotelemail: targetEmail });
        if (!existingRecord || !existingRecord.emailVerified) {
            return res.status(400).json({
                message: "Please verify your email address via OTP before submitting."
            });
        }

        let imageUrls = [];
        if (req.files && req.files.images) {
            const filesToUpload = Array.isArray(req.files.images)
                ? req.files.images
                : [req.files.images];

            const uploadResults = await uploadImage(filesToUpload);
            imageUrls = uploadResults.map(result => result.secure_url);
        }

        const hotelRequestId = uuidv4().substring(0, 10);

        const result = await Hotelmodel.findOneAndUpdate(
            { hotelemail: targetEmail },
            {
                hotelname,
                hotelphone,
                hotelemail: targetEmail,
                cityId,
                hoteladdress,
                totalrooms,
                totalstaff,
                hotelRequestId,
                adminId: adminId || null,
                images: imageUrls,
                status: "pending",
                isActive: true
            },
            { new: true }
        );

        if (!result) {
            return res.status(400).json({ message: "Hotel requesting error" });
        }
        await info(
            result.hotelemail,
            "Hotel Request Submitted Successfully",
            `
            <div style="font-family: Arial, sans-serif;">
                <h2>Hotel Registration Request Submitted</h2>
                <p>Dear Partners,</p>
                <p>Thank you for submitting your hotel registration request.</p>
                <h3>Your Request ID: ${result.hotelRequestId}</h3>
            </div>
            `
        );

        return res.status(201).json({
            message: "Hotel request submitted successfully",
            result
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

exports.checkRequestId = async (req, res) => {
    try {
        const { requestId } = req.body;
        if (!requestId) {
            return res.status(400).json({
                message: "Request ID is required"
            });
        }

        const existsRequest = await Hotelmodel.findOne({ hotelRequestId: requestId });
        if (!existsRequest) {
            return res.status(404).json({
                message: "NO Request Found"
            });
        }

        return res.status(200).json(existsRequest);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

exports.updateRequest = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ message: "Hotel ID is required" });
        }

        const {
            hotelname,
            hotelphone,
            hotelemail,
            cityId,
            hoteladdress,
            totalrooms,
            totalstaff,
            adminId,
        } = req.body;

        const updateData = {
            ...(hotelname && { hotelname }),
            ...(hotelphone && { hotelphone }),
            ...(hotelemail && { hotelemail }),
            ...(cityId && { cityId }),
            ...(hoteladdress && { hoteladdress }),
            ...(totalrooms && { totalrooms }),
            ...(totalstaff && { totalstaff }),
            ...(adminId && { adminId }),
        };

        if (req.files && req.files.images) {
            const filesToUpload = Array.isArray(req.files.images)
                ? req.files.images
                : [req.files.images];

            const uploadResults = await uploadImage(filesToUpload);
            updateData.images = uploadResults.map(result => result.secure_url);
        }

        const updatedHotel = await Hotelmodel.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updatedHotel) {
            return res.status(404).json({ message: "Hotel not found" });
        }

        return res.status(200).json(updatedHotel);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};


exports.downloadHotelPdf = async (req, res) => {
    try {
        const { search = "", sort = "hotelAsc", status } = req.query;

        const filter = {};
        if (status === "pending" || status === "approved" || status === "rejected") {
            filter.status = status;
        } else if (status === "active") {
            filter.isActive = true;
        } else if (status === "inactive") {
            filter.isActive = false;
        }

        if (search) {
            filter.$or = [
                { hotelname: { $regex: search, $options: "i" } },
                { ownername: { $regex: search, $options: "i" } },
                { hotelemail: { $regex: search, $options: "i" } },
                { hotelphone: { $regex: search, $options: "i" } }
            ];
        }

        let sorting = {};
        if (sort === "hotelAsc") sorting = { hotelname: 1 };
        else if (sort === "hotelDesc") sorting = { hotelname: -1 };
        else if (sort === "ownerAsc") sorting = { ownername: 1 };
        else if (sort === "ownerDesc") sorting = { ownername: -1 };

        const hotels = await Hotelmodel.find(filter)
            .populate("adminId", "adminname email")
            .sort(sorting);

        const headers = ["#", "Hotel Name", "Owner / Admin", "Phone", "Status"];
        const colWidths = [15, 60, 50, 35, 22];
        const rows = hotels.map((item, idx) => [
            idx + 1,
            item.hotelname,
            item.adminId?.adminname || item.ownername || "-",
            item.hotelphone || item.ownerphone || "-",
            item.status || (item.isActive ? "Active" : "Inactive")
        ]);

        const pdfBuffer = generatePdfTable("Hotel Management Report", headers, colWidths, rows);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=Hotels_Report.pdf");
        res.send(pdfBuffer);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Unable to generate PDF" });
    }
};

const parseBooleanValue = (val) => {
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val === 1;
    if (typeof val === "string") {
        const s = val.trim().toLowerCase();
        return s === "yes" || s === "true" || s === "1" || s === "y";
    }
    return false;
};

exports.importExcelData = async (req, res) => {
    try {
        const fileObj = req.files?.file || req.files?.excelFile;
        if (!fileObj) {
            return res.status(400).json({
                success: false,
                message: "Please upload an Excel file (.xlsx or .xls)",
            });
        }

        const fileName = (fileObj.name || "").toLowerCase();
        if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
            return res.status(400).json({
                success: false,
                message: "Invalid file type! Only Excel files (.xlsx or .xls) are allowed.",
            });
        }

        const workbook = XLSX.read(fileObj.data, { type: "buffer" });
        const sheetNames = workbook.SheetNames;

        let hotelsRows = [];
        let roomsRows = [];

        sheetNames.forEach((sName) => {
            const lower = sName.toLowerCase();
            const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sName]);
            if (lower.includes("hotel")) {
                hotelsRows = sheetData;
            } else if (lower.includes("room")) {
                roomsRows = sheetData;
            }
        });

        if (hotelsRows.length === 0 && sheetNames.length > 0) {
            hotelsRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]]);
        }
        if (roomsRows.length === 0 && sheetNames.length > 1) {
            roomsRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[1]]);
        }

        const hotelIdMap = new Map();
        let hotelsCreated = 0;
        let hotelsUpdated = 0;
        let roomsCreated = 0;
        let roomsUpdated = 0;
        const errors = [];

        for (let i = 0; i < hotelsRows.length; i++) {
            const row = hotelsRows[i];
            const hotelname = (row["Hotel Name"] || row["hotelname"] || "").toString().trim();
            const hotelemail = (row["Email"] || row["hotelemail"] || "").toString().trim();
            const hotelphone = (row["Phone"] || row["hotelphone"] || "").toString().trim();
            const hoteladdress = (row["Address"] || row["hoteladdress"] || "Address Not Specified").toString().trim();
            const totalrooms = parseInt(row["Total Rooms"] || row["totalrooms"]) || 10;
            const totalstaff = (row["Total Staff"] || row["totalstaff"] || "5").toString();
            const description = (row["Description"] || row["description"] || "").toString();

            const stateName = (row["State"] || row["stateName"] || "Gujarat").toString().trim();
            const districtName = (row["District"] || row["districtName"] || "Surat").toString().trim();
            const cityName = (row["City"] || row["cityName"] || "Surat").toString().trim();
            const adminEmail = (row["Admin Email"] || row["adminEmail"] || "").toString().trim();

            if (!hotelname) {
                errors.push(`Hotel Row ${i + 1}: Missing Hotel Name`);
                continue;
            }

            try {
                let stateDoc = await StateModel.findOne({
                    stateName: { $regex: new RegExp(`^${stateName}$`, "i") },
                });
                if (!stateDoc) {
                    stateDoc = await StateModel.create({ stateName, countryName: "India", status: true });
                }

                let districtDoc = await DistrictModel.findOne({
                    districtName: { $regex: new RegExp(`^${districtName}$`, "i") },
                    stateId: stateDoc._id,
                });
                if (!districtDoc) {
                    districtDoc = await DistrictModel.create({ districtName, stateId: stateDoc._id, status: true });
                }

                let cityDoc = await CityModel.findOne({
                    cityName: { $regex: new RegExp(`^${cityName}$`, "i") },
                    districtId: districtDoc._id,
                });
                if (!cityDoc) {
                    cityDoc = await CityModel.create({ cityName, districtId: districtDoc._id, status: true });
                }

                let adminDoc = null;
                if (adminEmail) {
                    adminDoc = await AdminModel.findOne({ email: { $regex: new RegExp(`^${adminEmail}$`, "i") } });
                }
                if (!adminDoc) {
                    adminDoc = await AdminModel.findOne({ isActive: true });
                }

                let hotelDoc = null;
                if (hotelemail) {
                    hotelDoc = await Hotelmodel.findOne({ hotelemail: hotelemail.toLowerCase() });
                }
                if (!hotelDoc) {
                    hotelDoc = await Hotelmodel.findOne({
                        hotelname: { $regex: new RegExp(`^${hotelname}$`, "i") },
                        cityId: cityDoc._id,
                    });
                }

                const hotelData = {
                    hotelname,
                    hotelphone: Number(hotelphone) || 9876543210,
                    hotelemail: hotelemail ? hotelemail.toLowerCase() : `hotel_${Date.now()}@guestshotel.com`,
                    cityId: cityDoc._id,
                    hoteladdress,
                    totalrooms,
                    totalstaff,
                    description,
                    status: "approved",
                    isActive: true,
                    emailVerified: true,
                    adminId: adminDoc ? adminDoc._id : null,
                };

                if (hotelDoc) {
                    hotelDoc = await Hotelmodel.findByIdAndUpdate(hotelDoc._id, hotelData, { new: true });
                    hotelsUpdated++;
                } else {
                    hotelData.hotelRequestId = `HTL-${Math.floor(100000 + Math.random() * 900000)}`;
                    hotelDoc = await Hotelmodel.create(hotelData);
                    hotelsCreated++;
                }

                if (hotelDoc) {
                    hotelIdMap.set(hotelname.toLowerCase(), hotelDoc._id);
                    if (hotelemail) hotelIdMap.set(hotelemail.toLowerCase(), hotelDoc._id);
                }
            } catch (err) {
                console.error(`Error processing hotel '${hotelname}':`, err);
                errors.push(`Hotel '${hotelname}': ${err.message}`);
            }
        }

        for (let j = 0; j < roomsRows.length; j++) {
            const rRow = roomsRows[j];
            const rHotelName = (rRow["Hotel Name"] || rRow["hotelname"] || "").toString().trim().toLowerCase();
            const rHotelEmail = (rRow["Hotel Email"] || rRow["hotelemail"] || "").toString().trim().toLowerCase();
            const roomNumber = parseInt(rRow["Room Number"] || rRow["roomNumber"]);
            const roomTypeRaw = (rRow["Room Type"] || rRow["roomType"] || "Single").toString().trim();
            const pricePerNight = parseFloat(rRow["Price Per Night"] || rRow["pricePerNight"] || rRow["price"]) || 2000;
            const floor = parseInt(rRow["Floor"] || rRow["floor"]) || 1;
            const capacity = parseInt(rRow["Capacity"] || rRow["capacity"]) || 2;

            if (!roomNumber) {
                errors.push(`Room Row ${j + 1}: Missing Room Number`);
                continue;
            }

            let targetHotelId = hotelIdMap.get(rHotelEmail) || hotelIdMap.get(rHotelName);

            if (!targetHotelId) {
                let hDoc = null;
                if (rHotelEmail) hDoc = await Hotelmodel.findOne({ hotelemail: rHotelEmail });
                if (!hDoc && rHotelName) hDoc = await Hotelmodel.findOne({ hotelname: { $regex: new RegExp(`^${rHotelName}$`, "i") } });
                if (hDoc) targetHotelId = hDoc._id;
            }

            if (!targetHotelId) {
                errors.push(`Room #${roomNumber}: Target Hotel '${rHotelName || rHotelEmail}' not found`);
                continue;
            }

            const validTypes = ["Single", "Double", "Twin", "Deluxe", "Suite", "Family"];
            const matchedType = validTypes.find((t) => t.toLowerCase() === roomTypeRaw.toLowerCase()) || "Single";

            const beds = [];
            if (parseBooleanValue(rRow["King Size Bed"] ?? rRow["kingSizeBed"])) beds.push("king");
            if (parseBooleanValue(rRow["Queen Size Bed"] ?? rRow["queenSizeBed"])) beds.push("queen");
            if (parseBooleanValue(rRow["Single Bed"] ?? rRow["singleBed"])) beds.push("single");
            if (parseBooleanValue(rRow["Double Bed"] ?? rRow["doubleBed"])) beds.push("double");

            const amenityMap = [
                { key: "ac", col: ["AC", "ac"] },
                { key: "cooler", col: ["Cooler", "cooler"] },
                { key: "attachedBathroom", col: ["Attached Bathroom", "attachedBathroom"] },
                { key: "bathtub", col: ["Bathtub", "bathtub"] },
                { key: "geyser", col: ["Geyser", "geyser"] },
                { key: "tv", col: ["TV", "tv"] },
                { key: "wifi", col: ["WiFi", "wifi"] },
                { key: "telephone", col: ["Telephone", "telephone"] },
                { key: "miniFridge", col: ["Mini Fridge", "miniFridge"] },
                { key: "microwave", col: ["Microwave", "microwave"] },
                { key: "electricKettle", col: ["Electric Kettle", "electricKettle"] },
                { key: "sofa", col: ["Sofa", "sofa"] },
                { key: "diningTable", col: ["Dining Table", "diningTable"] },
                { key: "wardrobe", col: ["Wardrobe", "wardrobe"] },
                { key: "balcony", col: ["Balcony", "balcony"] },
                { key: "locker", col: ["Locker", "locker"] },
                { key: "smokeDetector", col: ["Smoke Detector", "smokeDetector"] },
                { key: "fireExtinguisher", col: ["Fire Extinguisher", "fireExtinguisher"] },
                { key: "roomService", col: ["Room Service", "roomService"] },
                { key: "laundryService", col: ["Laundry Service", "laundryService"] },
                { key: "housekeeping", col: ["Housekeeping", "housekeeping"] },
            ];

            const amenities = [];
            amenityMap.forEach(({ key, col }) => {
                if (parseBooleanValue(rRow[col[0]] ?? rRow[col[1]])) {
                    amenities.push(key);
                }
            });

            const roomData = {
                hotelId: targetHotelId,
                roomNumber,
                floor,
                roomType: matchedType,
                pricePerNight,
                capacity,

                beds,
                amenities,

                isAvailable: true,
                isActive: true,
            };

            try {
                let existingRoom = await RoomDetails.findOne({ hotelId: targetHotelId, roomNumber });
                if (existingRoom) {
                    await RoomDetails.findByIdAndUpdate(existingRoom._id, roomData, { new: true });
                    roomsUpdated++;
                } else {
                    await RoomDetails.create(roomData);
                    roomsCreated++;
                }
            } catch (rErr) {
                console.error(`Error importing room #${roomNumber}:`, rErr);
                errors.push(`Room #${roomNumber}: ${rErr.message}`);
            }
        }

        return res.status(200).json({
            success: true,
            message: `Excel bulk import completed successfully! ${hotelsCreated} hotels created, ${roomsCreated} rooms created.`,
            summary: {
                totalHotelsParsed: hotelsRows.length,
                hotelsCreated,
                hotelsUpdated,
                totalRoomsParsed: roomsRows.length,
                roomsCreated,
                roomsUpdated,
                errors,
            },
        });
    } catch (error) {
        console.error("Error in importExcelData:", error);
        return res.status(500).json({
            success: false,
            message: "Bulk import failed: " + error.message,
        });
    }
};