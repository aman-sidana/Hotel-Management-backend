const jwt = require("jsonwebtoken");
const UserModel = require("../Model/UserModel");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization header not found",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Authorization token missing",
      });
    }

    const decode = jwt.verify(token, process.env.SECRETKEY);


    const { email } = decode

    const userdetail = await UserModel.findOne({ email });

    if (!userdetail) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    req.user = userdetail;

    next();
  } catch (error) {
    console.log(error);

    return res.status(401).json({
      message: "Invalid or Expired Token",
    });
  }
};