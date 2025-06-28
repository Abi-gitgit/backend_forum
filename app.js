require("dotenv").config();
const express = require("express");
const app = express();
const port = 5000;

const cors = require("cors");
// cors middleware to allow cross-origin requests
app.use(cors({}));

// db connection
const dbconnection = require("./db/dbConfig");

// user routes middleware file
const userRoutes = require("./routes/userRoute");
// question routes middleware file
const questionRoutes = require("./routes/questionRoute");
// auth middleware to protect routes
const authMiddleware = require("./middleware/authMiddleware");

// json middleware to extract data from the request body
app.use(express.json());

// user routes middleware
app.use("/api/users", userRoutes);

// question routes middleware
app.use("/api/questions", authMiddleware, questionRoutes);

// answer routes middleware
const answerRoutes = require("./routes/answerRoute");
app.use("/api/answers", answerRoutes);

async function start() {
  try {
    const result = await dbconnection.execute("select 'test' ");
    await app.listen(port);
    console.log("database connection established successfully");
    console.log(`Server is running on port ${port}`);
  } catch (error) {
    console.log(error.message);
  }
}
start();

app.get("/test", (req, res) => {
  res.send("backend deployed successfully");
});
