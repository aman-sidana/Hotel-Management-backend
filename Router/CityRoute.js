const express = require("express");
const Router = express.Router();
const auth = require("../Auth/auth")
const cityController = require("../Controller/CityController");

Router.get("/getcities", cityController.getAllCity);
Router.post("/addcity", auth, cityController.addCity);
Router.patch("/updatecity", auth, cityController.updateCity);
Router.delete("/deletecity", auth, cityController.deleteCity);
Router.patch("/softdeletecity", auth, cityController.softDeleteCity);
Router.patch("/restorecity", auth, cityController.restoreCity);
Router.get("/download-pdf", auth, cityController.downloadCityPdf);

module.exports = Router;