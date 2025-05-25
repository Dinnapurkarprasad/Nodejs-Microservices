import dotenv from "dotenv";
dotenv.config();
import amqp from "amqplib";
import logger from "./logger.js";

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook_event";

export async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to RabbitMQ");
    return channel;
  } catch (error) {
    logger.error("Error connnecting to RabbitMQ", error);
  }
}

export async function publishEvent(routingKey, message) {
  if (!channel) {
    await connectRabbitMQ();
  }
  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message))
  );

  logger.info(`Event is published ${routingKey}`)
}
