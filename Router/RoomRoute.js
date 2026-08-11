const express = require("express");
const router = express.Router();
const roomController = require("../Controller/RoomController");
const auth = require("../Auth/auth")

router.get("/getallrooms", auth, roomController.getAllRooms);
router.get("/getalluserrooms", roomController.getAllUserRooms);

router.get("/viewbyone", roomController.viewdetails);
router.post("/addroom",auth, roomController.addRoom);
router.patch("/updateroom",auth, roomController.updateRoom);
router.patch("/softdelete",auth, roomController.softDeleteRoom);
router.patch("/restore",auth, roomController.restoreRoom);
router.delete("/delete",auth, roomController.deleteRoom);

router.post("/admin-add-room",auth, roomController.adminAddRoom);
router.get("/download-pdf",auth, roomController.downloadRoomPdf);

module.exports = router;