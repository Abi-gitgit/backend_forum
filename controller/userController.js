// db connection
const dbconnection = require("../db/dbConfig");
const bcrypt = require("bcrypt");
const { StatusCodes } = require("http-status-codes");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

async function register(req, res) {
  const { username, firstname, lastname, email, password } = req.body;
  if (!username || !firstname || !lastname || !email || !password) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "please provide all required information!" });
  }
  try {
    const [user] = await dbconnection.query(
      "SELECT username,userid from users WHERE username = ? or email =? ",
      [username, email]
    );
    if (user.length > 0) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "username or email already exists!" });
    }
    if (password.length < 6) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "password must be at least 6 characters long!" });
    }

    //encrypting the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //inserting the user into the database
    await dbconnection.query(
      "INSERT INTO users (username, firstname, lastname, email, password) VALUES (?, ?, ?, ?, ?)",
      [username, firstname, lastname, email, hashedPassword]
    );
    return res
      .status(StatusCodes.CREATED)
      .json({ msg: "user registered successfully!" });
  } catch (error) {
    console.log(error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "something went wrong ,try again later!" });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "please provide all required information!" });
  }
  try {
    const [user] = await dbconnection.query(
      "SELECT username,userid,password FROM users WHERE email = ?",
      [email]
    );

    if (user.length === 0) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ msg: "invalid credentials!" });
    }
    // Check if the password matches
    const isPasswordValid = await bcrypt.compare(password, user[0].password);
    if (!isPasswordValid) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ msg: "invalid credentials!" });
    }
    // Here you would typically generate a token and send it back to the client
    const token = jwt.sign(
      { userid: user[0].userid, username: user[0].username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(StatusCodes.OK).json({
      msg: "user login successful!",
      token,
      username: user[0].username,
    });
  } catch (error) {
    console.log(error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "something went wrong ,try again later!" });
  }
}

async function forgot_password(req, res) {
  const { email } = req.body;

  try {
    //get a user
    const [user] = await dbconnection.query(
      "SELECT userid, username,email from users WHERE email=? ",
      [email]
    );
    //check if the user exist
    if (user.length === 0) {
      return res.status(StatusCodes.OK).json({
        msg: "If account exists, reset link sent!",
      });
    }
    //create a jwt token that lasts for 15min
    const token = jwt.sign({ userid: user[0].userid }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    // Create a reset link to send to the user
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    // Set up nodemailer transporter using Gmail credentials from .env
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS,
      },
    });
    // Send the reset email to the user
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user[0].email,
      subject: "[✨ Evangadi-forum]- Password Reset",
      html: `<p style="fontSize="50px">Click <a style="color: red;" href='${resetLink}'>here</a> to reset your password.</p>`,
    });
    // Respond with a success message
    res.status(200).json({ message: "If account exists, reset link sent." });
  } catch (error) {
    console.log("forgot password error-->", error);
    // Log internal errors without exposing details
    res.status(500).json({ error: "Server error!" });
  }
}

async function reset_password(req, res) {
  const { token } = req.query;
  const { newPassword } = req.body;
  if (!newPassword) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "Please provide the new password!",
    });
  }
  try {
    //verify token and extract payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userid;

    //hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    //update new password
    await dbconnection.execute("UPDATE users SET password=? WHERE userid=?", [
      hashedPassword,
      userId,
    ]);
    return res
      .status(StatusCodes.OK)
      .json({ msg: "password updated successfully!" });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(400)
        .json({ err: "Token expired. Please request a new reset link." });
    }
    return res.status(400).json({ err: "Invalid or expired token." });

    // console.log("password reset error-->", error);
    // return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    //   msg: "Internal server error!",
    // });
  }
}

async function validate_reset_token(req, res) {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({ valid: true, userid: decoded.userid });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ valid: false, error: "Token expired" });
    }
    return res.status(400).json({ valid: false, error: "Invalid token" });
  }
}

async function checkUser(req, res) {
  const username = req.user.username;
  const userid = req.user.userid;

  res.status(StatusCodes.OK).json({
    msg: "valid user",
    username,
    userid,
  });
}

module.exports = {
  register,
  login,
  reset_password,
  forgot_password,
  validate_reset_token,
  checkUser,
};
