import Media from "../models/Media.js";
import { deleteMediaFromCloudinary } from "../utils/cloudinary.js";
import logger from "../utils/logger.js";


export const handlePostDeleted=async(event)=>{
   console.log(event,"Eventeventevent")
   const{postId,mediaIds}=event;
   try {
    
    const mediaToDelete=await Media.find({_id:{$in:mediaIds}})
   
    for(const media of mediaToDelete){
        await deleteMediaFromCloudinary(media.publicId)
        await Media.findByIdAndDelete(media._id)

        logger.info(`Delete media ${media._id} which is associated with deleted post ${postId}`)
    }

    logger.info(`Proccessed deletion of media for post id ${postId}`)

   } catch (error) {
     logger.error(error,"Error occured while media deletion")
   }
}