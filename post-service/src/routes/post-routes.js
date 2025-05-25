import express from "express";
import { createPost, deletePost, getAllPost,getPost } from "../controller/post-controller.js";
import authenticateRequest from "../middleware/authMiddleware.js";


const router=express();


//middleware=> this will tell if the user is in auth user or not
router.use(authenticateRequest)

router.post("/create-post",createPost);
router.get("/posts",getAllPost);
router.get("/:id",getPost);
router.delete("/:id",deletePost)

export default router;