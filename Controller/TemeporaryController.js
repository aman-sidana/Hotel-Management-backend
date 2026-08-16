const TemporaryModel = require("../Model/TemporaryModel");
const RoomModel = require("../Model/RoomModel");

exports.temporarydata = async (req, res) => {
  try {
    const { roomId, userId } = req.body;

    if (!roomId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Room ID and User ID are required.",
      });
    }

    const existroom = await RoomModel.findById(roomId);
    if (!existroom) {
      return res.status(404).json({
        success: false,
        message: "Room not found.",
      });
    }

    const existingHold = await TemporaryModel.findOne({
      roomId,
      userId: { $ne: userId },
    });

    if (existingHold) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(existingHold.createdAt).getTime()) / 1000);
      const remainingSeconds = 600 - elapsedSeconds;

      if (remainingSeconds > 0) {
        const remainingMinutes = Math.ceil(remainingSeconds / 60);
        return res.status(409).json({
          success: false,
          isLocked: true,
          message: `This room is currently being viewed/held by another user for 10 minutes. Please try again in ${remainingMinutes} minute(s) or choose another room.`,
          remainingSeconds,
        });
      }
    }

    await TemporaryModel.deleteMany({ roomId, userId });

    const result = await TemporaryModel.create({
      roomId,
      userId,
      createdAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Room held for 10 minutes.",
      hold: result,
      expiresInSeconds: 600,
    });
  } catch (error) {
    console.error("Error creating temporary hold:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.temporaryget = async (req, res) => {
  try {
    const { roomId } = req.query;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required.",
      });
    }

    const result = await TemporaryModel.find({ roomId }).populate("userId", "name email");
    return res.status(200).json({
      success: true,
      holds: result,
    });
  } catch (error) {
    console.error("Error fetching temporary hold:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.temporaryrelease = async (req, res) => {
  try {
    const { roomId, userId } = req.body;

    if (!roomId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Room ID and User ID are required.",
      });
    }

    await TemporaryModel.deleteMany({ roomId, userId });

    return res.status(200).json({
      success: true,
      message: "Temporary hold released successfully.",
    });
  } catch (error) {
    console.error("Error releasing temporary hold:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getAllActiveHolds = async (req, res) => {
  try {
    const holds = await TemporaryModel.find({}).select("roomId userId createdAt");
    return res.status(200).json({
      success: true,
      holds,
    });
  } catch (error) {
    console.error("Error fetching all active holds:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};