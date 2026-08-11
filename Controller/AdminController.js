const express = require("express");
const AdminModel = require("../Model/AdminModel");
const UserModel = require("../Model/UserModel");
const { info, otp } = require('../Utils/transporter');
const { v4: uuidv4 } = require("uuid");
const { uploadImage } = require("../Utils/Cloudinary");
const bcrypt = require("bcrypt")
const { generatePdfTable } = require("../Utils/Pdf");


exports.superAdminAdd = async (req, res) => {
    try {
        const {
            adminname,
            adminphone,
            email,
            permanentaddress,
            currentaddress,
        } = req.body;

        if (
            !adminname ||
            !adminphone ||
            !email ||
            !permanentaddress ||
            !currentaddress
        ) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }

        const adminExists = await AdminModel.findOne({ email });

        if (adminExists) {
            return res.status(400).json({
                message: "Admin already exists",
            });
        }

        const userExists = await UserModel.findOne({ email });

        if (userExists) {
            return res.status(400).json({
                message: "User already exists",
            });
        }


        const randomPassword = uuidv4().substring(0, 10);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        const AdminRequestId = uuidv4().substring(0, 10);

        const admin = await AdminModel.create({
            adminname,
            adminphone,
            email,
            permanentaddress,
            currentaddress,
            password: hashedPassword,
            AdminRequestId,
            status: "approved",
            emailVerified: true,
            isActive: true,
            role: "admin",
        });

        await UserModel.create({
            name: adminname,
            phone: adminphone,
            email,
            password: hashedPassword,
            role: "admin",
        });

        await info(
            email,
            "Admin Account Created Successfully",
            `
            <div style="font-family:Arial">

                <h2>Welcome ${adminname}</h2>

                <p>Your Admin account has been created successfully by the Super Admin.</p>

                <table border="1" cellpadding="10" cellspacing="0">

                    <tr>
                        <td><b>Email</b></td>
                        <td>${email}</td>
                    </tr>

                    <tr>
                        <td><b>Password</b></td>
                        <td>${randomPassword}</td>
                    </tr>

                </table>

                <br>

                <p>
                    Please login using these credentials and change your password after your first login.
                </p>

                <br>

                <b>Regards</b><br>
                Hotel Management Team

            </div>
            `
        );

        return res.status(201).json({
            message: "Admin created successfully.",
            admin,
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

exports.allADmin = async (req, res) => {
    try {
        const {
            search = "",
            sort = "nameAsc",
            status,
            page,
            limit
        } = req.query;

        let filter = {};

        if (status === "approved" || status === "pending" || status === "rejected") {
            filter.status = status;
        }

        if (search) {
            filter.$or = [
                {
                    adminname: {
                        $regex: search,
                        $options: "i"
                    }
                },
                {
                    email: {
                        $regex: search,
                        $options: "i"
                    }
                },
            ];
        }

        let sorting = {};

        if (sort === "nameAsc") {
            sorting = { adminname: 1 };
        }
        else if (sort === "nameDesc") {
            sorting = { adminname: -1 };
        }
        else if (sort === "emailAsc") {
            sorting = { email: 1 };
        }
        else if (sort === "emailDesc") {
            sorting = { email: -1 };
        }

        if (page && limit) {
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.max(1, parseInt(limit) || 5);
            const skip = (pageNum - 1) * limitNum;

            const totalAdmins = await AdminModel.countDocuments(filter);
            const totalPages = Math.ceil(totalAdmins / limitNum) || 1;
            const admins = await AdminModel.find(filter).sort(sorting).skip(skip).limit(limitNum);

            return res.status(200).json({
                success: true,
                admins,
                totalAdmins,
                totalPages,
                currentPage: pageNum,
                limit: limitNum
            });
        }

        const result = await AdminModel.find(filter).sort(sorting);

        return res.status(200).json(result);

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};


exports.approveAdminRequest = async (req, res) => {
    try {
        const { id } = req.query;
        console.log("id", id)
        if (!id) {
            return res.status(400).json({
                message: "Admin ID not found"
            });
        }

        const result = await AdminModel.findByIdAndUpdate(
            id, { status: "approved" }, { new: true }
        );
        console.log("result", result)

        if (!result) {
            return res.status(404).json({
                message: "Admin entry not found"
            });
        }

        const existsUser = await UserModel.findOne({ email: result.email });
        console.log(existsUser)
        if (existsUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const randomPassword = uuidv4().substring(0, 10);
        console.log(randomPassword)

        const AdminAdd = await UserModel.create({
            name: result.adminname,
            email: result.email,
            password: randomPassword,
            phone: result.adminphone,
            role: "admin"
        });

        await info(
            result.email,
            "Admin Registration Approved",
            `
            <div style="font-family: Arial, sans-serif;">
                <h2>Congratulations! 🎉</h2>
                <p>Dear Partners,</p>
                <p>Your admin registration request has been <span style="color:green;"><strong>APPROVED</strong></span>.</p>
                <hr>
                <h3>Login Credentials</h3>
                <p><strong>Admin Name:</strong> ${result.adminname}</p>
                <p><strong>Email:</strong> ${result.email}</p>
                <p><strong>Password:</strong> ${randomPassword}</p>
                <br>
                <p>Please login using the above credentials and change your password after your first login.</p>
                <br>
                <p>Regards,</p>
                <h4>Management Team</h4>
            </div>
            `
        );

        return res.status(200).json({
            message: "Admin Approved Successfully",
            result,
            user: AdminAdd
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

exports.rejectRequest = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({
                message: "Admin ID is required",
            });
        }
        const { description } = req.body;
        if (!description) {
            return res.status(400).json({
                message: "Description is required"
            });
        }

        const result = await AdminModel.findByIdAndUpdate(
            id,
            {
                status: "rejected",
                description: description || "No reason provided."
            },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({
                message: "Admin not found",
            });
        }

        await info(
            result.email,
            "Admin Registration Rejected",
            `
            <div style="font-family: Arial, sans-serif;">
                <h2>Registration Update</h2>
                <p>Dear Partners,</p>
                <p>We regret to inform you that your registration request has been <span style="color:red;"><b>REJECTED</b></span>.</p>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <h3>Reason for Rejection:</h3>
                <blockquote style="background: #fdf2f2; border-left: 5px solid #e74c3c; padding: 15px; margin: 0; border-radius: 4px;">
                    ${result.description}
                </blockquote>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p>If you wish to update your details and resubmit, you can use your Request ID: <strong>${result.AdminRequestId || "N/A"}</strong></p>
                <br>
                <p>Regards,</p>
                <h4>Management Team</h4>
            </div>
            `
        );

        return res.status(200).json(result);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

exports.deleteAdmin = async (req, res) => {
    try {
        const { id } = req.query;
        console.log(id)
        if (!id) {
            return res.status(400).json({
                message: "Admin ID not Found"
            });
        }

        const result = await AdminModel.findByIdAndDelete(id);
        console.log(result)
        if (!result) {
            return res.status(404).json({
                message: "Admin not found",
            });
        }
        return res.status(200).json(result);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

exports.softDeleteHotel = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({
                message: "Admin ID is required",
            });
        }

        const Admin = await AdminModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
        if (!Admin) {
            return res.status(404).json({
                message: "Admin not found",
            });
        }

        return res.status(200).json(Admin);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

exports.restoreAdmin = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({
                message: "Admin ID is required",
            });
        }

        const Admin = await AdminModel.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );

        if (!Admin) {
            return res.status(404).json({
                message: "Admin not found",
            });
        }

        return res.status(200).json(Admin);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

exports.viewAdminDetails = async (req, res) => {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({
                message: "Admin ID is required",
            });
        }

        const admin = await AdminModel.findById(id);

        if (!admin) {
            return res.status(404).json({
                message: "Admin not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: admin,
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

exports.sendAdminOTP = async (req, res) => {
    try {
        const { email } = req.body;
        console.log(email)
        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const existing = await AdminModel.findOne({ email });

        if (existing && existing.emailVerified) {
            return res.status(400).json({
                message: "Email already verified"
            });
        }
        const generatedOTP = otp();
        console.log(generatedOTP)
        let admin = await AdminModel.findOne({ email });
        console.log(admin)

        if (!admin) {
            admin = new AdminModel({ email });
        }

        admin.otp = generatedOTP;
        admin.expireTime = Date.now() + 5 * 60 * 1000;

        await admin.save({
            validateBeforeSave: false,
        });

        await info(
            email,
            "OTP Verification",
            `<h2>Your OTP is ${generatedOTP}</h2>
             <p>OTP expires in 5 minutes.</p>`
        );

        return res.json({
            message: "OTP sent successfully"
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const Admin = await AdminModel.findOne({ email });
        if (!Admin) {
            return res.status(404).json({
                message: "Email not found"
            });
        }

        if (Admin.otp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP"
            });
        }

        if (Admin.expireTime < Date.now()) {
            return res.status(400).json({
                message: "OTP Expired"
            });
        }

        Admin.emailVerified = true;
        Admin.otp = null;
        Admin.expireTime = null;

        await Admin.save({ validateBeforeSave: false });

        return res.json({
            message: "Email Verified"
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

exports.AdminRequest = async (req, res) => {
    try {
        const {
            adminname,
            adminphone,
            email,
            permanentaddress,
            currentaddress
        } = req.body;

        if (!adminname || !adminphone || !email || !permanentaddress || !currentaddress) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const existingRecord = await AdminModel.findOne({ email });
        if (!existingRecord || !existingRecord.emailVerified) {
            return res.status(400).json({
                message: "Please verify your email before submitting details."
            });
        }

        let imageUrls = [];
        if (req.files && req.files.images) {
            const filesToUpload = Array.isArray(req.files.images) ? req.files.images : [req.files.images];

            const uploadResults = await uploadImage(filesToUpload);
            imageUrls = uploadResults.map(res => res.secure_url);
        }

        const AdminRequestId = uuidv4().substring(0, 10);

        const result = await AdminModel.findOneAndUpdate(
            { email },
            {
                adminname,
                adminphone,
                permanentaddress,
                currentaddress,
                AdminRequestId,
                ownerimage: imageUrls[0] || "",
                status: "pending",
                isActive: true
            },
            { new: true }
        );

        if (!result) {
            return res.status(400).json({
                message: "Admin request configuration error"
            });
        }

        await info(
            result.email,
            "Admin Request Submitted Successfully",
            `
            <div style="font-family: Arial, sans-serif;">
                <h2>Admin Registration Request Submitted</h2>
                <p>Dear Partners,</p>
                <p>Thank you for submitting your profile registration request.</p>
                <h3>Your Request ID</h3>
                <div style="background:#f5f5f5; padding:15px; font-size:24px; font-weight:bold; color:#0d6efd; border-radius:8px; width:fit-content;">
                    ${result.AdminRequestId}
                </div>
                <br>
                <p>You can use this Request ID to check registration tracking configurations.</p>
                <hr>
                <p><strong>Name:</strong> ${result.adminname}</p>
                <p><strong>Email:</strong> ${result.email}</p>
            </div>
            `
        );

        return res.status(201).json({
            message: "Admin request submitted successfully",
            result
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

exports.checkRequestId = async (req, res) => {
    try {

        const { AdminRequestId } = req.body;

        if (!AdminRequestId) {
            return res.status(400).json({
                message: "Admin Request ID is required",
            });
        }

        const admin = await AdminModel.findOne({
            AdminRequestId: AdminRequestId.trim(),
        });

        if (!admin) {
            return res.status(404).json({
                message: "No Request Found",
            });
        }

        return res.status(200).json({
            message: "Request Found",
            data: admin,
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};

exports.updateRequest = async (req, res) => {
    try {
        const { id } = req.query;
        console.log(id)
        if (!id) {
            return res.status(400).json({
                message: "Admin ID is required"
            });
        }

        const updateData = { ...req.body };

        if (req.files && req.files.images) {
            const filesToUpload = Array.isArray(req.files.images)
                ? req.files.images
                : [req.files.images];

            const uploadResults = await uploadImage(filesToUpload);

            updateData.images = uploadResults.map(file => file.secure_url);
        }

        const updatedAdmin = await AdminModel.findByIdAndUpdate(
            id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedAdmin) {
            return res.status(404).json({
                message: "Admin not found"
            });
        }

        return res.status(200).json({
            message: "Admin updated successfully",
            data: updatedAdmin
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

exports.downloadAdminPdf = async (req, res) => {
    try {
        const { search = "", sort = "nameAsc", status } = req.query;

        let filter = {};

        if (status === "approved" || status === "pending" || status === "rejected") {
            filter.status = status;
        } else if (status === "active") {
            filter.isActive = true;
        } else if (status === "inactive") {
            filter.isActive = false;
        }

        if (search) {
            filter.$or = [
                { adminname: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        let sorting = {};
        if (sort === "nameAsc") sorting = { adminname: 1 };
        else if (sort === "nameDesc") sorting = { adminname: -1 };
        else if (sort === "emailAsc") sorting = { email: 1 };
        else if (sort === "emailDesc") sorting = { email: -1 };

        const admins = await AdminModel.find(filter).sort(sorting);

        const headers = ["#", "Owner Name", "Email", "Phone", "Status"];
        const colWidths = [15, 55, 60, 35, 25];
        const rows = admins.map((item, idx) => [
            idx + 1,
            item.adminname || "-",
            item.email || "-",
            item.adminphone || "-",
            item.status || (item.isActive ? "Active" : "Inactive")
        ]);

        const pdfBuffer = generatePdfTable("Admin Management Report", headers, colWidths, rows);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=Admins_Report.pdf");
        res.send(pdfBuffer);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Unable to generate PDF" });
    }
};


