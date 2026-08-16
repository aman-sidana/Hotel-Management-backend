const express = require('express');
const AdminController = require('../Controller/AdminController');
const router = express.Router();
const auth = require("../Auth/auth")

router.post("/send-otp", AdminController.sendAdminOTP);
router.post("/verify-otp", AdminController.verifyOTP);
router.post("/submit-request", AdminController.AdminRequest);
router.post("/check-request-id", AdminController.checkRequestId);
router.post("/super-admin-add", auth, AdminController.superAdminAdd);
router.get("/alladmin", auth, AdminController.allADmin);
router.get("/details", auth, AdminController.viewAdminDetails);
router.patch("/update", auth, AdminController.updateRequest);
router.patch("/soft-delete", auth, AdminController.softDeleteHotel);
router.patch("/restore", auth, AdminController.restoreAdmin);
router.delete("/delete", auth, AdminController.deleteAdmin);
router.get("/download-admin-pdf", auth, AdminController.downloadAdminPdf);

module.exports = router;