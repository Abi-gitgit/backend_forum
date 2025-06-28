const express = require("express");
const router = express.Router();
// Importing user controller functions
const {
  register,
  login,
  forgot_password,
  reset_password,
  validate_reset_token,
  checkUser,
} = require("../controller/userController");
// authMiddleware to protect routes
const authMiddleware = require("../middleware/authMiddleware");

// register route
router.post("/register", register);

// login route
router.post("/login", login);

//forgot-password route
router.post("/forgot-password", forgot_password);

//reset-password route
router.post("/reset-password", reset_password);

//validate-token route
router.get("/validate-reset-token", validate_reset_token);

// check user route
router.get("/check", authMiddleware, checkUser);

module.exports = router;
