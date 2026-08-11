const express = require("express");
const Router = express.Router();
const auth = require('../Auth/auth');
const UserController = require("../Controller/UserController");

Router.post("/signup", UserController.SignUp);
Router.post("/login", UserController.login);
Router.post("/sendotp", UserController.sendOTP);
Router.post("/forgetpassword", UserController.forgetpassword);

Router.post("/resetpassword", auth ,UserController.resetpassword);
Router.patch("/theme", UserController.changeTheme);

module.exports = Router;