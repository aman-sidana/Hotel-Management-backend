const express = require("express");
const couponController = require("../Controller/CouponController");
const router = express.Router();
const auth = require("../Auth/auth")

router.get("/getallcoupon", auth, couponController.getCoupon);
router.post("/addcoupon", auth, couponController.couponAdd);
router.delete("/deletecoupon", auth, couponController.couponDelete);
router.put("/updatecoupon", auth, couponController.updateCoupon);
router.patch("/soft-delete", auth, couponController.softDeleteCoupon);
router.patch("/restore", auth, couponController.restoreCoupon);
router.get("/download-pdf", auth, couponController.downloadCouponPdf);
router.post("/import-excel", auth, couponController.importExcelCoupons);

module.exports = router;