const express = require("express");
const Router = express.Router();
const stateController = require("../Controller/StateController");
const auth = require("../Auth/auth")

Router.post("/addstate", auth,stateController.addState);
Router.patch("/updatestate",auth, stateController.updatestate);
Router.get("/getstates",auth, stateController.getAllState);
Router.delete("/deletestate",auth, stateController.deleteState);
Router.patch("/softdeletestate",auth, stateController.softDeleteState);
Router.patch("/restorestate",auth, stateController.restoreState);
Router.get("/download-pdf",auth, stateController.downloadStatePdf);

module.exports = Router;