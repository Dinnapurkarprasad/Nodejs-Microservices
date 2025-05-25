import Media from "../models/Media.js";
import { uploadMediaToCloudinary } from "../utils/cloudinary.js";
import logger from "../utils/logger.js";

export const uploadMedia = async (req, res) => {
  logger.info("Strating media upload");

  try {
    if (!req.file) {
      logger.error("No file found,please try after adding file");
      return res.status(400).json({
        success: true,
        message: "No file found,please try after adding file",
      });
    }

    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;
    logger.info(`File Details:name=${originalname},Type:${mimetype}`);

    logger.info("uploading to cloudinary started");

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);

    logger.info(
      `Cloudinary upload successfully. Public Id:${cloudinaryUploadResult.public_id}`
    );

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult.secure_url,
      userId,
    });

    await newlyCreatedMedia.save();

    res.status(201).json({
      success: true,
      message: "Media upload is successfull",
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
    });
  } catch (error) {
    logger.error("Error in creating media", error);
    res.status(500).json({ success: false, message: "error" });
  }
};

export const getAllMedia=async(req,res)=>{
  try {

    const result=await Media.find({})
    res.json({result})
    
  } catch (error) {
    logger.error("Error in fetching media", error);
    res.status(500).json({ success: false, message: "Error in fetching media" });
  }
}
