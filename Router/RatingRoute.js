const express = require("express");
const router = express.Router();
const ratingController = require("../Controller/RatingController");
const auth = require("../Auth/auth")

router.post("/add-rating", auth, ratingController.AddRating);
router.get("/view-rating", ratingController.ViewRating);
router.get("/average-rating", ratingController.AverageRating);

module.exports = router;