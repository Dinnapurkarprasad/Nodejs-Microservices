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

export async function consumeEvent(routingKey,callback) {

  if(!channel){
    connectRabbitMQ();
  }
  
  const q=await channel.assertQueue("",{exclusive:true})
  await channel.bindQueue(q.queue,EXCHANGE_NAME,routingKey)
  channel.consume(q.queue,(msg)=>{
    if(msg!==null){
      const content=JSON.parse(msg.content.toString())
      callback(content)
      channel.ack(msg)
    }
  })

  logger.info(`Subscribe to event ${routingKey}`)
}
