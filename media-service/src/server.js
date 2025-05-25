import dotenv from "dotenv";
import express from "express"
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import mediaroutes from "./routes/media-routes.js"
import logger from "./utils/logger.js";
import errorHandler from "./middleware/errorHandler.js";
import { connectRabbitMQ, consumeEvent } from "./utils/rabbitmq.js";
import { handlePostDeleted } from "./eventHandler/media-event-handlers.js";

dotenv.config();
const app=express();
const PORT=process.env.PORT||3004;

//MongoDB coonection
async function startDBServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info("Connected to MongoDB Database");
  } catch (error) {
    logger.error("MongoDB Connection error:", error.message);
    process.exit(1); // Optionally exit if the connection fails
  }
}

startDBServer();

app.use(cors());
app.use(helmet())
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body ${req.body}`);
  next();
});

// applye this sensitiveEndpointsLimiter to our routes

app.use("/api/media",mediaroutes)

app.use(errorHandler)

async function startServer() {
  try {
    await connectRabbitMQ();

    //consume all envent
    await consumeEvent("post.deleted",handlePostDeleted)

    app.listen(PORT, () => {
      logger.info(`Media service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Falied to connect to server", error);
    process.exit(1);
  }
}

startServer();

// unhandle promise reject handler
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandle Rjection at", promise, "reson", reason);
});
