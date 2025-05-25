import express from "express"
import { searchPostController } from "../controller/search-controller.js"
import authenticateRequest from "../middleware/authMiddleware.js"

const router=express.Router();
router.use(authenticateRequest);

router.get("/posts",searchPostController)

export default router;
