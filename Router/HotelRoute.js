const express = require('express')
const hotelController = require('../Controller/HotelController')
const router = express.Router()
const auth = require("../Auth/auth")

router.get("/allhotels", hotelController.allhotel)
router.get("/alluserhotels", hotelController.allUserhotel)
router.get("/viewhotel", auth, hotelController.viewHotelDetails);
router.post("/hotelrequest", auth, hotelController.hotelRequest)
router.patch("/approvehotel", auth, hotelController.approveRequest)
router.patch("/rejecthotel", auth, hotelController.rejectRequest)
router.patch("/softdeletehotel", auth, hotelController.softDeleteHotel)
router.patch("/restorehotel", auth, hotelController.restoreHotel)
router.delete("/deletehotel", auth, hotelController.deleteHotel)
router.post('/checkrequestid', hotelController.checkRequestId)
router.patch("/updaterequest", auth, hotelController.updateRequest);
router.post("/sendhotelotp", hotelController.sendhotelOTP);
router.post("/verifyotp", hotelController.verifyOTP);
router.post("/super-admin-add", auth, hotelController.superAdminAddHotel);
router.get("/download-pdf", auth, hotelController.downloadHotelPdf);
router.post("/import-excel", auth, hotelController.importExcelData);

module.exports = router