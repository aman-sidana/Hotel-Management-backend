const express = require("express");
const Router = express.Router();
const districtController = require("../Controller/DistrictController");
const auth = require("../Auth/auth")

Router.get("/getdistricts", districtController.getAllDistrict);
Router.post("/adddistrict", auth, districtController.addDistrict);
Router.patch("/updatedistrict", auth, districtController.updateDistrict);
Router.delete("/deletedistrict", auth, districtController.deleteDistrict);
Router.patch("/softdeletedistrict", auth, districtController.softDeleteDistrict);
Router.patch("/restoredistrict", auth, districtController.restoreDistrict);
Router.get("/download-pdf", auth, districtController.downloadDistrictPdf);

module.exports = Router;