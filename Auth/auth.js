const jwt = require("jsonwebtoken");
const UserModel = require("../Model/UserModel");

module.exports = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (authHeader) {
      token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

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