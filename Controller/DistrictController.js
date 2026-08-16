const DistrictModel = require("../Model/DistrictModel");
const StateModel = require("../Model/StateModel");
const { generatePdfTable } = require("../Utils/Pdf");

exports.addDistrict = async (req, res) => {
  try {
    const { districtName, stateId } = req.body;
    if (!districtName || !stateId) {
      return res.status(400).json({ message: "District Name and State are required" });
    }

    const state = await StateModel.findById(stateId);
    if (!state) {
      return res.status(404).json({ message: "State not found" });
    }

    const existDistrict = await DistrictModel.findOne({ districtName, stateId });
    if (existDistrict) {
      return res.status(400).json({ message: "District already exists in this state" });
    }

    const district = await DistrictModel.create({ districtName, stateId });
    return res.status(201).json({ message: "District added successfully", district });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getAllDistrict = async (req, res) => {
  try {
    const { search = "", sort = "districtAsc", status, page, limit } = req.query;
    const filter = {};

    if (status === "active") filter.status = true;
    else if (status === "inactive") filter.status = false;

    let sorting = { districtName: 1 };
    if (sort === "districtDesc") sorting = { districtName: -1 };

    let districts = await DistrictModel.find(filter)
      .populate({ path: "stateId", select: "stateName" })
      .sort(sorting);

    if (search) {
      const searchLower = search.toLowerCase();
      districts = districts.filter(
        (a) =>
          a.districtName.toLowerCase().includes(searchLower) ||
          a.stateId?.stateName?.toLowerCase().includes(searchLower)
      );
    }

    if (sort === "stateAsc") {
      districts.sort((a, b) => (a.stateId?.stateName || "").localeCompare(b.stateId?.stateName || ""));
    } else if (sort === "stateDesc") {
      districts.sort((a, b) => (b.stateId?.stateName || "").localeCompare(a.stateId?.stateName || ""));
    }

    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, parseInt(limit) || 5);
      const totalDistricts = districts.length;
      const paginatedDistricts = districts.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      return res.status(200).json({
        success: true,
        districts: paginatedDistricts,
        totalDistricts,
        totalPages: Math.ceil(totalDistricts / limitNum) || 1,
        currentPage: pageNum,
        limit: limitNum,
      });
    }

    return res.status(200).json(districts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.updateDistrict = async (req, res) => {
  try {
    const { id } = req.query;
    const { districtName, stateId } = req.body;

    const district = await DistrictModel.findByIdAndUpdate(
      id,
      { districtName, stateId },
      { new: true }
    );

    if (!district) return res.status(404).json({ message: "District not found" });

    return res.status(200).json({ message: "District updated successfully", district });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.deleteDistrict = async (req, res) => {
  try {
    const { id } = req.query;
    const district = await DistrictModel.findByIdAndDelete(id);

    if (!district) return res.status(404).json({ message: "District not found" });
    return res.status(200).json({ message: "District deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.softDeleteDistrict = async (req, res) => {
  try {
    const { id } = req.query;
    const district = await DistrictModel.findByIdAndUpdate(id, { status: false }, { new: true });

    if (!district) return res.status(404).json({ message: "District not found" });
    return res.status(200).json({ message: "District soft deleted", district });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.restoreDistrict = async (req, res) => {
  try {
    const { id } = req.query;
    const district = await DistrictModel.findByIdAndUpdate(id, { status: true }, { new: true });

    if (!district) return res.status(404).json({ message: "District not found" });
    return res.status(200).json({ message: "District restored", district });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.downloadDistrictPdf = async (req, res) => {
  try {
    const { search = "", sort = "districtAsc", status } = req.query;
    const filter = {};

    if (status === "active") filter.status = true;
    else if (status === "inactive") filter.status = false;

    let sorting = { districtName: sort === "districtDesc" ? -1 : 1 };

    let districts = await DistrictModel.find(filter)
      .populate({ path: "stateId", select: "stateName" })
      .sort(sorting);

    if (search) {
      const searchLower = search.toLowerCase();
      districts = districts.filter(
        (a) =>
          a.districtName.toLowerCase().includes(searchLower) ||
          a.stateId?.stateName?.toLowerCase().includes(searchLower)
      );
    }

    const headers = ["#", "District Name", "State Name", "Status"];
    const colWidths = [20, 60, 60, 42];
    const rows = districts.map((item, idx) => [
      idx + 1,
      item.districtName,
      item.stateId?.stateName || "-",
      item.status ? "Active" : "Inactive",
    ]);

    const pdfBuffer = generatePdfTable("District Management Report", headers, colWidths, rows);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=Districts_Report.pdf");
    return res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to generate PDF" });
  }
};