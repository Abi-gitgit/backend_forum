const dbConnection = require("../db/dbConfig");
const { StatusCodes } = require("http-status-codes");

const postAnswer = async (req, res) => {
    const { questionid, answer } = req.body;
    const userid = req.user?.userid; // Get userid from auth middleware

  // Validate input
    if (!questionid || !answer || !userid) {
    return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Bad Request", msg: "Please provide answer" });
    }

    try {
    // Check if question exists
    const [question] = await dbConnection.query(
       "SELECT * FROM questions WHERE questionid = ?",
        [questionid]
    );

    if (question.length === 0) {
        return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Bad Request", msg: "Invalid question ID" });
    }
    // Insert answer
    await dbConnection.query("INSERT INTO answers (questionid, userid, answer) VALUES (?, ?, ?)",
        [questionid, userid, answer]
    );
    return res
        .status(StatusCodes.CREATED)
        .json({ msg: "Answer posted successfully" });
    } catch (error) {
    console.error("Error posting answer:", error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: "Internal Server Error",
        msg: "An unexpected error occurred.",
    });
    }
};

    const getAllAnswers = async (req, res) => {
        const { questionId } = req.query;

    if (!questionId) {
    return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Bad Request", msg: "questionId is required" });
    }

    try {
    const [answers] = await dbConnection.query(`SELECT a.*, u.username FROM answers a JOIN users u ON a.userid = u.userid WHERE a.questionid = ? ORDER BY a.answerid ASC`,[questionId]);
    return res.status(StatusCodes.OK).json(answers);
    } catch (error) {
    console.error("Error fetching answers:", error.message);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({error: "Internal Server Error", msg: "An unexpected error occurred.",});
    }
    };

module.exports = { postAnswer, getAllAnswers };
