import logger from "../utils/logger.js";

const authenticateRequest=(req,res,next)=>{
    const userId=req.headers['x-user-id']


    if(!userId){
        logger.warn("Access attempted without user ID")
        return res.status(400).json({success:false,message:"Authentictaion required! Please login"})
    }

    req.user={userId};
    next();
}

export default authenticateRequest;