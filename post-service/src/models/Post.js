import mongoose from "mongoose";

const postSechma = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  mediaIds: [{ type: String }],

  createdAt: {
    type: Date,
    default: Date.now(),
  },
},{timestamps:true});


postSechma.index({content:"text"});

const Post=mongoose.model("Post",postSechma);
export default Post;
