const StateModel = require("../Model/StateModel");
const { generatePdfTable } = require("../Utils/Pdf");

exports.addState = async (req, res) => {
  try {
    const { countryName = "India", stateName } = req.body;
    if (!stateName) {
      return res.status(400).json({ message: "State Name is required" });
    }

    const existState = await StateModel.findOne({ stateName, countryName });
    if (existState) {
      return res.status(400).json({ message: "State already exists" });
    }

    const state = await StateModel.create({ countryName, stateName });
    return res.status(201).json({ message: "State added successfully", state });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.deleteState = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(404).json({ message: "Id not found" });
    }

    const result = await StateModel.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ message: "State not found" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getAllState = async (req, res) => {
  try {
    const { search = "", sort = "asc", status, page, limit } = req.query;
    const filter = {};

    if (status === "active") filter.status = true;
    else if (status === "inactive") filter.status = false;

    if (search) {
      filter.$or = [
        { stateName: { $regex: search, $options: "i" } },
        { countryName: { $regex: search, $options: "i" } },
      ];
    }

    const sorting = { stateName: sort === "desc" ? -1 : 1 };

    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, parseInt(limit) || 5);
      const skip = (pageNum - 1) * limitNum;

      const [totalStates, states] = await Promise.all([
        StateModel.countDocuments(filter),
        StateModel.find(filter).sort(sorting).skip(skip).limit(limitNum),
      ]);

      return res.status(200).json({
        success: true,
        states,
        totalStates,
        totalPages: Math.ceil(totalStates / limitNum) || 1,
        currentPage: pageNum,
        limit: limitNum,
      });
    }

    const states = await StateModel.find(filter).sort(sorting);
    return res.status(200).json(states);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.updatestate = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(404).json({ message: "Id not found of state" });
    }
    const { stateName } = req.body;
    if (!stateName) {
      return res.status(404).json({ message: "Fill StateName fields to update" });
    }

    const result = await StateModel.findByIdAndUpdate(id, { stateName }, { new: true });
    if (!result) {
      return res.status(404).json({ message: "State not found" });
    }

    return res.status(200).json({ message: "State updated successfully", state: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.softDeleteState = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "ID is required" });

    const state = await StateModel.findByIdAndUpdate(id, { status: false }, { new: true });
    if (!state) return res.status(404).json({ message: "State not found" });

    return res.status(200).json({ message: "State soft deleted successfully", state });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.restoreState = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "ID is required" });

    const state = await StateModel.findByIdAndUpdate(id, { status: true }, { new: true });
    if (!state) return res.status(404).json({ message: "State not found" });

    return res.status(200).json({ message: "State restored successfully", state });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.downloadStatePdf = async (req, res) => {
  try {
    const { search = "", sort = "asc", status } = req.query;
    const filter = {};

    if (status === "active") filter.status = true;
    else if (status === "inactive") filter.status = false;

    if (search) {
      filter.$or = [
        { stateName: { $regex: search, $options: "i" } },
        { countryName: { $regex: search, $options: "i" } },
      ];
    }

    const sorting = { stateName: sort === "desc" ? -1 : 1 };
    const states = await StateModel.find(filter).sort(sorting);

    const headers = ["#", "Country", "State Name", "Status"];
    const colWidths = [20, 50, 70, 42];
    const rows = states.map((item, idx) => [
      idx + 1,
      item.countryName || "India",
      item.stateName,
      item.status ? "Active" : "Inactive",
    ]);

    const pdfBuffer = generatePdfTable("State Management Report", headers, colWidths, rows);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=States_Report.pdf");
    return res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to generate PDF" });
  }
};
