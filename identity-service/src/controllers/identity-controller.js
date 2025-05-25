import { json } from "express";
import RefreshToken from "../models/RefreshToken.js";
import User from "../models/user.js";
import generateTokens from "../utils/generateTokens.js";
import logger from "../utils/logger.js";
import validateRegistration, { validateLogin } from "../utils/validation.js";

//Register User
export const registerUser = async (req, res) => {
  logger.info("Registration endpoint hits");
  try {
    const { error } = validateRegistration(req.body);

    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
      });
    }

    const { email, password, username } = req.body;

    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      logger.warn("User alredy exsists");
      return res.status(400).json({
        success: false,
        message: "User alredy exsists",
      });
    }
    user = new User({ username, email, password });
    await user.save();
    logger.warn("User saved successfully", user._id);

    const { accessToken, refreshToken } = await generateTokens(user);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Registration error occured", e);
    res.status(500).json({
      success: false,
      message: "some internal error",
    });
  }
};

//login controller
export const loginUser = async (req, res) => {
  logger.info("login endpoint hits");

  try {
    const { error } = validateLogin(req.body);

    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
      });
    }

    const { email, password } = req.body;
    const exsistingUser = await User.findOne({ email });

    if (!exsistingUser) {
      logger.warn("Invalid User");
      return res
        .status(400)
        .json({ success: false, message: "Invalid Credentails" });
    }

    //Valid password or not
    const isValidPassword = await exsistingUser.comparePassword(password);
    if (!isValidPassword) {
      logger.warn("Invalid Credentails");
      return res
        .status(400)
        .json({ success: false, message: "Invalid Credentails" });
    }

    const { accessToken, refreshToken } = await generateTokens(exsistingUser);

    res.status(201).json({
      success: true,
      message: "User Logged in successfully",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Login error occured", error);
    res.status(500).json({
      success: false,
      message: "some internal error",
    });
  }
};

//refresh token
export const refreshTokenUser = async (req, res) => {
  logger.info("Refresh token endpoint hits");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("RefreshToken missing");
      return res
        .status(400)
        .json({ success: false, message: "RefreshToken missing" });
    }
    const storeToken = await RefreshToken.findOne({ token: refreshToken });

    if (!storeToken || storeToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token");

      return res
        .status(401)
        .json({ success: false, message: "Inavlid or expired refresh token" });
    }

    const user = await User.findById(storeToken.user);

    if (!user) {
      logger.warn("User not found");
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    const { accessToken: newaccessToken, refreshToken: newrefreshToken } =
      await generateTokens(user);

    //delete the old refreh token
    await RefreshToken.deleteOne({ _id: storeToken._id });

    return json({
      accessToken: newaccessToken,
      refreshToken: newrefreshToken,
    });
  } catch (error) {
    logger.error("Login error occured", error);
    res.status(500).json({
      success: false,
      message: "some internal error",
    });
  }
};

// logout
export const logoutUser = async (req, res) => {
  logger.info("Logout endpoint hits..");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("RefreshToken missing");
      return res
        .status(400)
        .json({ success: false, message: "RefreshToken missing" });
    }

    await RefreshToken.deleteOne({ token: refreshToken });

    logger.info("Refresh token is deleted for logout");

    return res.json({
      success: true,
      message: "logout successfully",
    });
  } catch (error) {
    logger.error("Logout error occured", error);
    res.status(500).json({
      success: false,
      message: "some internal error",
    });
  }
};
