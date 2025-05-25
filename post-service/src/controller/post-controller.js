import Post from "../models/Post.js";
import logger from "../utils/logger.js";
import { publishEvent } from "../utils/rabbitmq.js";

//function to delete the exsisting cache while creating new post
async function invalidatePostCache(req, input) {
  const cachedKey = `post:${input}`;
  await req.redisClient.del(cachedKey);

  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

// Controller to create a new Post
export const createPost = async (req, res) => {
  try {
    const { content, mediaIds } = req.body;

    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });

    await newlyCreatedPost.save();


   //here i am publishing the evnet form here which is consume by the saerch service
    await publishEvent("post.created", 
      {
      postId: newlyCreatedPost._id.toString(),
      userId:newlyCreatedPost.user.toString(),
      content:newlyCreatedPost.content.toString(),
      createdAt:newlyCreatedPost.createdAt.toString()
    }  
    );
    //to make cache empty
    await invalidatePostCache(req, newlyCreatedPost._id.toString());

    logger.info("Post Created Successfully", newlyCreatedPost);
    res
      .status(201)
      .json({ success: true, message: "Post Created Successfully" });
  } catch (error) {
    logger.error("Error creating post", error);
    res.status(500).json({ success: false, message: "Error creating post" });
  }
};

// Controller to get all posts
export const getAllPost = async (req, res) => {
  try {
    //simple concept for pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const casheKey = `posts:${page}:${limit}`;
    const cashedPosts = await req.redisClient.get(casheKey);

    //this "if" clause will not run 1st time,look at the comment next that is "save your posts.." firts time the posts is beinged fetched form database and in cache
    //next time when there is something store in cache the req not checked in database but insted it will check here in cache.
    if (cashedPosts) {
      return res.json(JSON.parse(cashedPosts));
    }

    //find the posts in database
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalNoOfPosts = await Post.countDocuments();

    const result = {
      posts,
      currentpage: page,
      totalPage: Math.ceil(totalNoOfPosts / limit),
      totalPosts: totalNoOfPosts,
    };

    //save your post in redis cache for 5 min
    await req.redisClient.setex(casheKey, 300, JSON.stringify(result));

    res.json(result);
  } catch (error) {
    logger.error("Error featching posts", error);
    res.status(500).json({ success: false, message: "Error featching posts" });
  }
};

//Controller to get single post by id
export const getPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);

    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }

    const SinglePostbyId = await Post.findById(postId);

    if (!SinglePostbyId) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    await req.redisClient.setex(cacheKey, 3600, JSON.stringify(SinglePostbyId));

    return SinglePostbyId;
  } catch (error) {
    logger.error("Error featching post ID", error);
    res
      .status(500)
      .json({ success: false, message: "Error featching post by ID" });
  }
};

//controller to delete the post
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "post not found" });
    }

    //publish post delete method
    await publishEvent("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    await invalidatePostCache(req, req.params.id);

    return res
      .status(201)
      .json({ success: true, message: "Posts deleted successfully" });
  } catch (error) {
    logger.error("Error deleting post ", error);
    res
      .status(500)
      .json({ success: false, message: "Error deleting post by ID" });
  }
};
