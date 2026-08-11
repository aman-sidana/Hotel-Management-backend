const TemporaryController = require("../Controller/TemeporaryController");
const express = require("express");
const router = express.Router();
const auth = require("../Auth/auth")

router.post("/create",auth, TemporaryController.temporarydata);
router.get("/getdate",auth, TemporaryController.temporaryget);
router.post("/release",auth, TemporaryController.temporaryrelease);
router.get("/active-holds",auth, TemporaryController.getAllActiveHolds);

module.exports = router;
