import Search from "../models/Search.js";
import logger from "../utils/logger.js";

export async function handlePostCreated(event) {
  try {
    const newSearchPost = new Search({
      postId: event.postId,
      userId: event.userId,
      content: event.content,
      createdAt: event.createdAt,
    });

    await newSearchPost.save();
    logger.info(
      `SearchPost created ${event.postId},${newSearchPost._id.toString()}`
    );
  } catch (error) {
    logger.error("Error in handling post created event", error);
  }
}

export async function handlePostDeleted(event) {
  try {
    await Search.findOneAndDelete({ postId: event.postId });
    logger.info(`SearchPost deleted ${event.postId}`);
  } catch (error) {
    logger.error("Error in handling post deletion event", error);
  }
}
