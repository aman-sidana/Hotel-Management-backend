require("dotenv").config();

exports.otp = () => {
  return Math.floor(Math.random() * 9000) + 1000;
};

exports.info = async (to, subject, html) => {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": process.env.BREVO_API,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: "THE Guest's",
          email: process.env.EMAIL_USER
        },
        to: [
          {
            email: to
          }
        ],
        subject: subject,
        htmlContent: html
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Brevo Email Error:", errorData);
      throw new Error(`Failed to send email via Brevo: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
