require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.otp = () => {
  return Math.floor(Math.random() * 9000) + 1000;
};

exports.info = async (to, subject, html) => {
  return await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
};