const express = require("express");
const router = express.Router();

//import post answer
const { postAnswer } = require("../controller/answerController");
//authentication middleware
const authMiddleware = require("../middleware/authMiddleware");
//post answer for a question
router.post("/answer", authMiddleware, postAnswer);

//get all answers for a question
const { getAllAnswers } = require("../controller/answerController");

router.get("/all-answers", authMiddleware, getAllAnswers);

module.exports = router;
