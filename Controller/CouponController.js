const CouponModel = require("../Model/CouponModel")
const HotelModel = require("../Model/HotelModel")
const { uploadImage } = require("../Utils/Cloudinary")
const { generatePdfTable } = require("../Utils/Pdf");
const XLSX = require("xlsx");

exports.softDeleteCoupon = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Coupon ID is required"
            });
        }

        const coupon = await CouponModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Coupon deactivated successfully",
            result: coupon
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

exports.restoreCoupon = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Coupon ID is required"
            });
        }

        const coupon = await CouponModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Coupon restored successfully",
            result: coupon
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

exports.couponDelete = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Coupon ID is required"
            });
        }

        const result = await CouponModel.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Coupon deleted successfully",
            result
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

exports.getCoupon = async (req, res) => {
    try {
        const result = await CouponModel.find().populate("hotelId", "hotelname hotelemail hotelphone");
        if (!result || result.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No coupons found"
            });
        }

        return res.status(200).json({
            success: true,
            result
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

exports.updateCoupon = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Coupon ID is required"
            });
        }

        let updateData = { ...req.body };

        if (req.files && req.files.images) {
            const filesToUpload = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
            const uploadResults = await uploadImage(filesToUpload);
            if (uploadResults.length > 0) {
                updateData.couponImages = uploadResults[0].secure_url;
            }
        }

        const updatedCoupon = await CouponModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Coupon updated successfully",
            result: updatedCoupon
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

exports.couponAdd = async (req, res) => {
    try {
        const {
            hotelId,
            couponCode,
            couponType,
            discount,
            minPriceAvail,
            startingDate,
            dateUpTo
        } = req.body;

        if (
            !hotelId ||
            !couponCode ||
            !couponType ||
            !discount ||
            !startingDate ||
            !dateUpTo
        ) {
            return res.status(400).json({
                message: "All mandatory fields are required"
            });
        }

        const hotelExists = await HotelModel.findById(hotelId);
        if (!hotelExists) {
            return res.status(404).json({
                message: "Hotel not found"
            });
        }

        const existingCoupon = await CouponModel.findOne({ couponCode });
        if (existingCoupon) {
            return res.status(400).json({
                message: "Coupon code already exists"
            });
        }

        let singleImageUrl = "";
        if (req.files && req.files.images) {
            const filesToUpload = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
            const uploadResults = await uploadImage(filesToUpload);
            if (uploadResults.length > 0) {
                singleImageUrl = uploadResults[0].secure_url;
            }
        }

        const result = await CouponModel.create({
            hotelId,
            couponCode,
            couponType,
            discount,
            minPriceAvail: minPriceAvail || 0,
            startingDate,
            dateUpTo,
            couponImages: singleImageUrl,
            isActive: true
        });

        return res.status(201).json({
            message: "Coupon added successfully",
            result
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};


exports.downloadCouponPdf = async (req, res) => {
    try {
        const { search = "", sort = "codeAsc", status } = req.query;
        let filter = {};

        if (status === "active") filter.isActive = true;
        else if (status === "inactive") filter.isActive = false;

        let coupons = await CouponModel.find(filter).populate("hotelId", "hotelname");

        if (search) {
            coupons = coupons.filter((c) =>
                c.couponCode.toLowerCase().includes(search.toLowerCase()) ||
                c.hotelId?.hotelname?.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (sort === "codeAsc") coupons.sort((a, b) => a.couponCode.localeCompare(b.couponCode));
        else if (sort === "codeDesc") coupons.sort((a, b) => b.couponCode.localeCompare(a.couponCode));

        const headers = ["#", "Coupon Code", "Hotel", "Discount", "Valid Till", "Status"];
        const colWidths = [15, 45, 55, 30, 32, 23];

        const formatDate = (dateStr) => {
            if (!dateStr) return "-";
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString("en-IN");
        };

        const rows = coupons.map((item, idx) => [
            idx + 1,
            item.couponCode,
            item.hotelId?.hotelname || "Global",
            item.couponType === "percentage" ? `${item.discount}%` : `₹${item.discount}`,
            formatDate(item.dateUpTo),
            item.isActive ? "Active" : "Inactive"
        ]);

        const pdfBuffer = generatePdfTable("Coupon Management Report", headers, colWidths, rows);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=Coupons_Report.pdf");
        res.send(pdfBuffer);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Unable to generate PDF" });
    }
};

exports.importExcelCoupons = async (req, res) => {
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
    const firstSheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);

    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];

    const allHotels = await HotelModel.find();
    const hotelMap = new Map();
    allHotels.forEach((h) => {
      if (h.hotelname) hotelMap.set(h.hotelname.toLowerCase().trim(), h._id);
      if (h.hotelemail) hotelMap.set(h.hotelemail.toLowerCase().trim(), h._id);
    });

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const couponCode = (r["Coupon Code"] || r["couponCode"] || r["Code"] || "").toString().trim();
      const hotelNameOrEmail = (r["Hotel Name"] || r["Hotel Email"] || r["hotelname"] || r["hotelemail"] || "").toString().trim().toLowerCase();
      const couponTypeRaw = (r["Coupon Type"] || r["couponType"] || "flat").toString().trim().toLowerCase();
      const discount = parseFloat(r["Discount"] || r["discount"]) || 0;
      const minPriceAvail = parseFloat(r["Min Price"] || r["minPriceAvail"]) || 0;

      let startingDate = r["Starting Date"] || r["startingDate"] || r["Start Date"] || new Date();
      let dateUpTo = r["Date Up To"] || r["dateUpTo"] || r["Valid Till"] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      if (!couponCode) {
        errors.push(`Row ${i + 1}: Missing Coupon Code`);
        continue;
      }

      let targetHotelId = hotelMap.get(hotelNameOrEmail);
      if (!targetHotelId && allHotels.length > 0) {
        targetHotelId = allHotels[0]._id;
      }

      if (!targetHotelId) {
        errors.push(`Row ${i + 1} (${couponCode}): No matching hotel found`);
        continue;
      }

      const couponType = couponTypeRaw.includes("percent") || couponTypeRaw === "%" ? "percentage" : "flat";

      const couponData = {
        hotelId: targetHotelId,
        couponCode: couponCode.toUpperCase(),
        couponType,
        discount,
        minPriceAvail,
        startingDate: new Date(startingDate),
        dateUpTo: new Date(dateUpTo),
        isActive: true,
      };

      try {
        const existing = await CouponModel.findOne({ couponCode: couponCode.toUpperCase() });
        if (existing) {
          await CouponModel.findByIdAndUpdate(existing._id, couponData, { new: true });
          updatedCount++;
        } else {
          await CouponModel.create(couponData);
          createdCount++;
        }
      } catch (err) {
        console.error(`Error processing coupon '${couponCode}':`, err);
        errors.push(`Coupon '${couponCode}': ${err.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk coupon import completed successfully! ${createdCount} created, ${updatedCount} updated.`,
      createdCount,
      updatedCount,
      errors,
    });
  } catch (error) {
    console.error("Error in importExcelCoupons:", error);
    return res.status(500).json({
      success: false,
      message: "Bulk import failed: " + error.message,
    });
  }
};
