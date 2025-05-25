import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Redis from "ioredis";
import cors from "cors";
import helmet from "helmet";
import postRoutes from "./routes/post-routes.js";
import errorHandler from "./middleware/errorHandler.js";
import logger from "./utils/logger.js";
import { connectRabbitMQ } from "./utils/rabbitmq.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3002;

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

const redisClient = new Redis(process.env.REDIS_URL);

//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body ${req.body}`);
  next();
});

// applye this sensitiveEndpointsLimiter to our routes

//routes-> pass redisclient to route
app.use(
  "/api/posts",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes
);

app.use(errorHandler);

async function startServer() {
  try {
    await connectRabbitMQ();
    app.listen(PORT, () => {
      logger.info(`Post service running on port ${PORT}`);
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
