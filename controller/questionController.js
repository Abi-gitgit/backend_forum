const dbconnection = require("../db/dbConfig");
const { StatusCodes } = require("http-status-codes");
const { stack, search } = require("../routes/userRoute");

async function question(req, res) {
  const { title, description, tag } = req.body; // <-- Add tag here
  const userid = req.user.userid; // comes from authMiddleware

  if (!title || !description) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "Please provide all required information!" });
  }

  try {
    // Generate a unique questionid (for example, using current timestamp and userid)
    const questionid = `q_${userid}_${Date.now()}`;

    await dbconnection.query(
      "INSERT INTO questions (questionid, userid, title, description, tag) VALUES (?, ?, ?, ?, ?)",
      [questionid, userid, title, description, tag || null]
    );

    return res.status(StatusCodes.CREATED).json({
      msg: "Question created successfully!",
      question: { questionid, userid, title, description, tag },
    });
  } catch (error) {
    console.log(error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "Something went wrong, try again later!" });
  }
}

async function getAllQuestions(req, res) {
  // 1. Get page and limit from the query string (e.g., /all-questions?page=2&limit=5)
  const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
  const limit = parseInt(req.query.limit) || 5; // Default to 5 items per page

  // 2. Calculate the OFFSET (which row to start from)
  //    Example: if page = 2, and limit = 5, offset = 5
  const offset = (page - 1) * limit;

  try {
    // 3. Get the total number of questions (for showing total pages on frontend)
    const [totalRows] = await dbconnection.query(
      "SELECT COUNT(*) as total FROM questions"
    );
    const total = totalRows[0].total; // Total number of rows

    // 4. Get the actual page of questions using LIMIT and OFFSET

    const [questions] = await dbconnection.query(
      `SELECT q.*, u.username
         FROM questions q
         JOIN users u ON q.userid = u.userid
         ORDER BY q.userid DESC
         LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // 5. Send back the paginated questions and page info
    res.status(200).json({
      questions, // The questions for this page
      total, // Total number of questions
      page, // Current page number
      totalPages: Math.ceil(total / limit), // Total number of pages
    });
  } catch (error) {
    console.error("Pagination error:", error);
    res.status(500).json({ error: "Server error" });
  }

  // try {
  //   const [questions] = await dbconnection.query(
  //     `SELECT q.*, u.username
  //      FROM questions q
  //      JOIN users u ON q.userid = u.userid`
  //   );
  //   return res.status(StatusCodes.OK).json({ questions });
  // } catch (error) {
  //   console.log(error.message);
  //   return res
  //     .status(StatusCodes.INTERNAL_SERVER_ERROR)
  //     .json({ msg: "Something went wrong, try again later!" });
  // }
}

async function getSingleQuestion(req, res) {
  const { questionId } = req.params; // <-- get from params
  if (!questionId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "Question ID is required!" });
  }

  try {
    const [questions] = await dbconnection.query(
      "SELECT * FROM questions WHERE questionid = ?",
      [questionId]
    );
    if (questions.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ msg: "Question not found!" });
    }
    return res.status(StatusCodes.OK).json({ question: questions[0] });
  } catch (error) {
    console.log(error.message);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "Something went wrong, try again later!" });
  }
}

async function updateQuestion(req, res) {
  const { questionId } = req.params;
  const { title, description } = req.body;
  const { userid } = req.user; //decoded from AuthMiddleware

  try {
    //check if the question exist(with given id)
    const [question] = await dbconnection.execute(
      "SELECT * FROM questions WHERE questionid=?",
      [questionId]
    );

    if (question[0].length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ msg: "Question not found!" });
    }

    //check if the question is belongs to this user to update it!
    if (question[0].userid !== userid) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ msg: "Unauthorized to update this question!" });
    }

    //authorized user <---- (update title and description of the question!)
    const [result] = await dbconnection.execute(
      "UPDATE questions SET title=?, description=? WHERE questionid=?",
      [title, description, questionId]
    );

    // Return updated question (optional)
    const [updated] = await dbconnection.execute(
      "SELECT * FROM questions WHERE questionid = ?",
      [questionId]
    );

    return res.status(StatusCodes.OK).json({
      msg: "Question updated successfully!",
      updatedQuestion: updated[0],
    });
  } catch (error) {
    console.error(
      "question Updating errror-->",
      error.response?.data?.msg || error
    );
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "Internal Server error!" });
  }
}

async function deleteQuestion(req, res) {
  const { questionId } = req.params;
  const { userid } = req.user; //decoded from authMiddleware token

  try {
    //check if the question exist(with given id)
    const [question] = await dbconnection.execute(
      "SELECT * FROM questions WHERE questionid=?",
      [questionId]
    );

    if (question.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ msg: "Question not found!" });
    }

    //check if the question is belongs to this user to delete it!
    if (question[0].userid !== userid) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ msg: "Unauthorized to delete this question!" });
    }

    //authorized user <---- Delete you own question
    const [result] = await dbconnection.execute(
      "DELETE FROM questions WHERE questionid=?",
      [questionId]
    );

    return res
      .status(StatusCodes.OK)
      .json({ msg: "Question deleted successfully!" });
  } catch (error) {
    console.error("Question deleting error--->", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "Internal Server Error!" });
  }
}
async function searchQuestion(req, res) {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: "Search query is required." });
  }

  try {
    const [results] = await dbconnection.execute(
      "SELECT * FROM questions WHERE title LIKE ? OR description LIKE ?",
      [`%${query}%`, `%${query}%`]
    );
    console.log("results--->", results[0]);
    res.status(200).json({ questions: results });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Server error during search." });
  }
}

module.exports = {
  question,
  getAllQuestions,
  getSingleQuestion,
  updateQuestion,
  deleteQuestion,
  searchQuestion,
};
