import express from "express"
import dotenv from 'dotenv';
import mongoose from "mongoose";
import logger from "./utils/logger.js";
import helmet from "helmet"
import cors from "cors"
import {RateLimiterRedis} from "rate-limiter-flexible"
import { Redis } from "ioredis"
import {rateLimit} from "express-rate-limit"
import RedisStore from "rate-limit-redis"
import routes from "./routes/identity-service.js"
import errorHandler from "./middleware/errorHandler.js";

const app=express();
const PORT=process.env.PORT||3001
dotenv.config();

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGODB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        logger.info('Connected to MongoDB Database');
    } catch (error) {
        logger.error('MongoDB Connection error:', error.message);
        process.exit(1);  // Optionally exit if the connection fails
    }
}

startServer();   

const redisClient=new Redis(process.env.REDIS_URL)

//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());


app.use((req,res,next)=>{
    logger.info(`Received ${req.method} request to ${req.url}`)
    logger.info(`Request body ${req.body}`)
    next();
});

//DDos Protection and rate limit
const rateLimiter=new RateLimiterRedis({
    storeClient:redisClient,
    keyPrefix:"middleware",
    points:10,
    duration:1
})

app.use(async(req,res,next)=>{
    try {
        await rateLimiter.consume(req.ip)
        next();
    } catch (error) {
        logger.warn(`Rate linit exceeded for IP${req.ip}`)
        res.status(429).json({success:false,message:"Too many Request"})
    }
})

//IP based rate limiting for endpoints
const sensitiveEndpointsLimiter=rateLimit({
    windowMs:15*60*1000,
    max:50,
    standardHeaders:true,
    legacyHeaders:false,
    handler:(req,res)=>{
        logger.warn(`Sensitive endpoint rate limit exceeded for IP${req.ip}`)
        res.status(429).json({success:false, message:"Too many Request"})
    },
    store:new RedisStore({
        sendCommand:(...args)=>redisClient.call(...args),
    })
});

// applye this sensitiveEndpointsLimiter to our routes
app.use('/api/auth/register',sensitiveEndpointsLimiter)

//routes
app.use('/api/auth',routes)

//error handler
app.use(errorHandler);

app.listen(PORT,()=>{
    logger.info(`Identity Service running on port ${PORT}`)
});

// unhandle promise reject handler
process.on('unhandledRejection',(reason,promise)=>{
    logger.error('Unhandle Rjection at',promise,"reson",reason)
})