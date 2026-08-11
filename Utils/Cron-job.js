const cron = require("node-cron");
const BookingModel = require("../Model/BookingModel");

exports.automaticCanceling = () => {
 
  cron.schedule("0 0 * * *", async () => {
    try {
      const now = new Date();

      const result = await BookingModel.updateMany(
        {
          status: { $in: ["approved", "pending"] },
          startDate: { $lt: now }, 
        },
        {
          $set: {
            status: "cancelled",
          },
        }
      );

    } catch (error) {
      console.error("Auto cancellation error:", error);
    }
  });
};