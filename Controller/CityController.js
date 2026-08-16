const CityModel = require("../Model/CityModel");
const DistrictModel = require("../Model/DistrictModel");
const { generatePdfTable } = require("../Utils/Pdf");

exports.addCity = async (req, res) => {
  try {
    const { cityName, districtId } = req.body;
    if (!cityName || !districtId) {
      return res.status(400).json({ message: "City Name and District are required" });
    }

    const district = await DistrictModel.findById(districtId);
    if (!district) {
      return res.status(404).json({ message: "District not found" });
    }

    const existCity = await CityModel.findOne({ cityName, districtId });
    if (existCity) {
      return res.status(400).json({ message: "City already exists in this district" });
    }

    const city = await CityModel.create({ cityName, districtId });
    return res.status(201).json({ message: "City added successfully", city });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getAllCity = async (req, res) => {
  try {
    const { search = "", sort = "cityAsc", status, page, limit } = req.query;
    const filter = {};

    if (status === "active") filter.status = true;
    else if (status === "inactive") filter.status = false;

    let cities = await CityModel.find(filter).populate({
      path: "districtId",
      select: "districtName",
    });

    if (search) {
      const searchLower = search.toLowerCase();
      cities = cities.filter(
        (c) =>
          c.cityName.toLowerCase().includes(searchLower) ||
          c.districtId?.districtName?.toLowerCase().includes(searchLower)
      );
    }

    if (sort === "cityAsc") cities.sort((a, b) => a.cityName.localeCompare(b.cityName));
    else if (sort === "cityDesc") cities.sort((a, b) => b.cityName.localeCompare(a.cityName));
    else if (sort === "districtAsc") cities.sort((a, b) => (a.districtId?.districtName || "").localeCompare(b.districtId?.districtName || ""));
    else if (sort === "districtDesc") cities.sort((a, b) => (b.districtId?.districtName || "").localeCompare(a.districtId?.districtName || ""));

    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, parseInt(limit) || 5);
      const totalCities = cities.length;
      const paginatedCities = cities.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      return res.status(200).json({
        success: true,
        cities: paginatedCities,
        totalCities,
        totalPages: Math.ceil(totalCities / limitNum) || 1,
        currentPage: pageNum,
        limit: limitNum,
      });
    }

    return res.status(200).json(cities);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.updateCity = async (req, res) => {
  try {
    const { id } = req.query;
    const { cityName, districtId } = req.body;

    const city = await CityModel.findByIdAndUpdate(
      id,
      { cityName, districtId },
      { new: true }
    );

    if (!city) return res.status(404).json({ message: "City not found" });
    return res.status(200).json({ message: "City updated successfully", city });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.deleteCity = async (req, res) => {
  try {
    const { id } = req.query;
    const city = await CityModel.findByIdAndDelete(id);

    if (!city) return res.status(404).json({ message: "City not found" });
    return res.status(200).json({ message: "City deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.softDeleteCity = async (req, res) => {
  try {
    const { id } = req.query;
    const city = await CityModel.findByIdAndUpdate(id, { status: false }, { new: true });

    if (!city) return res.status(404).json({ message: "City not found" });
    return res.status(200).json({ message: "City soft deleted", city });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.restoreCity = async (req, res) => {
  try {
    const { id } = req.query;
    const city = await CityModel.findByIdAndUpdate(id, { status: true }, { new: true });

    if (!city) return res.status(404).json({ message: "City not found" });
    return res.status(200).json({ message: "City restored", city });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.downloadCityPdf = async (req, res) => {
  try {
    const { search = "", sort = "cityAsc", status } = req.query;
    const filter = {};

    if (status === "active") filter.status = true;
    else if (status === "inactive") filter.status = false;

    let cities = await CityModel.find(filter).populate({
      path: "districtId",
      select: "districtName",
    });

    if (search) {
      const searchLower = search.toLowerCase();
      cities = cities.filter(
        (c) =>
          c.cityName.toLowerCase().includes(searchLower) ||
          c.districtId?.districtName?.toLowerCase().includes(searchLower)
      );
    }

    if (sort === "cityAsc") cities.sort((a, b) => a.cityName.localeCompare(b.cityName));
    else if (sort === "cityDesc") cities.sort((a, b) => b.cityName.localeCompare(a.cityName));
    else if (sort === "districtAsc") cities.sort((a, b) => (a.districtId?.districtName || "").localeCompare(b.districtId?.districtName || ""));
    else if (sort === "districtDesc") cities.sort((a, b) => (b.districtId?.districtName || "").localeCompare(a.districtId?.districtName || ""));

    const headers = ["#", "City Name", "District Name", "Status"];
    const colWidths = [20, 60, 60, 42];
    const rows = cities.map((item, idx) => [
      idx + 1,
      item.cityName,
      item.districtId?.districtName || "-",
      item.status ? "Active" : "Inactive",
    ]);

    const pdfBuffer = generatePdfTable("City Management Report", headers, colWidths, rows);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=Cities_Report.pdf");
    return res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to generate PDF" });
  }
};