const UserModel = require("../Model/UserModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { info, otp } = require("../Utils/transporter");


exports.SignUp = async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;

        if (!name || !email || !password || !phone) {
            return res.status(404).json({
                message: "All fields are required",
            });
        }

        const existUser = await UserModel.findOne({ email });

        if (existUser) {
            return res.status(400).json({
                message: "User already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await UserModel.create({
            name,
            email,
            password: hashedPassword,
            phone,
            role,
        });
        await info(
            email,
            "Welcome to Hotel Management System",
            `
            <div style="font-family:Arial,sans-serif;">
                <h2>Welcome ${name} 👋</h2>

                <p>Your account has been created successfully.</p>

                <h3>Account Details</h3>

                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone}</p>
                <p><strong>Role:</strong> ${role || "User"}</p>

                <br>

                <p>Thank you for registering with our Hotel Management System.</p>

                <p>Regards,<br>Hotel Management Team</p>
            </div>
            `
        );

        res.status(201).json({
            message: "Signup Successful",
            user,
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // console.log(`<<<<<<signup>>>>>>>>>>>>`, req.body)

        if (!(email && password)) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).json({
                message: "Invalid Password",
            });
        }

        const token = jwt.sign({ email },
            process.env.SECRETKEY,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Login Successful",
            token,
            user,
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

exports.sendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        const generatedOTP = otp();

        user.otp = generatedOTP;
        user.expireTime = Date.now() + 5 * 60 * 1000;

        await user.save();

        await info(
            email,
            "Password Reset OTP",
            `
            <h2>Password Reset OTP</h2>

            <p>Your OTP is:</p>

            <h1>${generatedOTP}</h1>

            <p>This OTP is valid for 5 minutes.</p>

            <p>Do not share this OTP with anyone.</p>
            `
        );

        return res.status(200).json({
            message: "OTP sent successfully",
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

exports.forgetpassword = async (req, res) => {
    try {
        const { email, otp, newpassword, confirmpassword } = req.body;

        if (!(email && otp && newpassword && confirmpassword)) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }

        const user = await UserModel.findOne({ email });
        // console.log(`>>>>>>user`, user)

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        if (user.otp != otp) {
            return res.status(400).json({
                message: "Invalid OTP",
            });
        }

        if (user.expireTime < Date.now()) {
            return res.status(400).json({
                message: "OTP Expired",
            });
        }

        if (newpassword !== confirmpassword) {
            return res.status(400).json({
                message: "Passwords do not match",
            });
        }

        user.password = await bcrypt.hash(newpassword, 10);
        user.otp = null;
        user.expireTime = null;

        await user.save();

        res.status(200).json({
            message: "Password Changed Successfully",
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

exports.resetpassword = async (req, res) => {
    try {
        const { email, password, newpassword, confirmpassword } = req.body;

        if (!(email && password && newpassword && confirmpassword)) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).json({
                message: "Current Password is incorrect",
            });
        }

        if (password === newpassword) {
            return res.status(400).json({
                message: "New password cannot be same as old password",
            });
        }

        if (newpassword !== confirmpassword) {
            return res.status(400).json({
                message: "Passwords do not match",
            });
        }

        user.password = await bcrypt.hash(newpassword, 10);

        await user.save();

        res.status(200).json({
            message: "Password Updated Successfully",
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

exports.changeTheme = async (req, res) => {
    try {
        const { id } = req.query;
        const { theme } = req.body;

        if (!id) {
            return res.status(400).json({
                message: "User Id is required",
            });
        }

        if (!theme) {
            return res.status(400).json({
                message: "Theme is required",
            });
        }

        const user = await UserModel.findByIdAndUpdate(
            id,
            { theme },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        return res.status(200).json({
            message: "Theme Updated",
            user,
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};