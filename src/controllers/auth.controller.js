import bcrypt from "bcryptjs";
import { sendTokenViaCookie } from "../lib/utils.js";
import User from "../models/user.model.js";

export const signup = async (req, res) => {
  const { fullName, email, password, username } = req.body;
  try {
    if (!fullName || !email || !password || !username) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: "Email already in use" });
    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ message: "Username already taken" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({ 
      fullName, 
      email, 
      username, 
      password: hashedPassword,
      referralCode: null // Explicitly set to null to avoid index issues
    });
    sendTokenViaCookie(res, newUser._id);
    return res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      username: newUser.username,
      email: newUser.email,
      profilePic: newUser.profilePic,
      createdAt: newUser.createdAt,
    });
  } catch (err) {
    console.error("Error in signup controller", err);
    console.error("Full error details:", {
      message: err.message,
      name: err.name,
      stack: err.stack
    });
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    sendTokenViaCookie(res, user._id);
    return res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("Error in login controller", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = (_req, res) => {
  try {
    const isHttps = process.env.NODE_ENV === "production";
    
    res.cookie("token", "", {
      maxAge: 0,
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? "none" : "lax",
      path: "/",
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Error in logout controller", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    return res.status(200).json(req.user);
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateProfile = async (req, res) => {
  const { fullName, username, email, profilePic } = req.body;
  const userId = req.user._id;
  
  try {
    // Check if email is being changed and if it's already taken
    if (email && email !== req.user.email) {
      const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }
    
    // Check if username is being changed and if it's already taken
    if (username && username !== req.user.username) {
      const existingUsername = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }
    
    // Update user profile
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (profilePic !== undefined) updateData.profilePic = profilePic;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: '-password' }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    return res.status(200).json({
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      username: updatedUser.username,
      email: updatedUser.email,
      profilePic: updatedUser.profilePic,
      createdAt: updatedUser.createdAt,
    });
  } catch (err) {
    console.error("Error in updateProfile controller", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};


