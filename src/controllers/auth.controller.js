import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
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

    // Generate a unique referral code
    const generateReferralCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let referralCode;
    let isUnique = false;
    while (!isUnique) {
      referralCode = generateReferralCode();
      const existing = await User.findOne({ referralCode });
      if (!existing) isUnique = true;
    }

    const newUser = await User.create({ 
      fullName, 
      email, 
      username, 
      password: hashedPassword,
      referralCode
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
    const provider = req.user?.googleId ? "google" : "email";
    const user = req.user?.toObject ? req.user.toObject() : req.user;
    return res.status(200).json({ ...user, provider });
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


// ---- Google Sign-In ----
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Missing Google credential" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const fullName = payload.name || "Google User";
    const profilePic = payload.picture || "";

    if (!email) {
      return res.status(400).json({ error: "Google account missing email" });
    }

    // Find user by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    // Helper to generate a unique username based on email prefix
    const generateUsername = async (base) => {
      let candidate = base;
      let i = 0;
      while (await User.findOne({ username: candidate })) {
        i += 1;
        candidate = `${base}${i}`;
      }
      return candidate;
    };

    if (!user) {
      const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");
      const username = await generateUsername(baseUsername || "user");

      // Some fields are required by the schema; use a sentinel password and a referral code
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("google-oauth", salt);

      const generateReferralCode = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        return result;
      };
      let referralCode = generateReferralCode();
      // collision avoidance (best-effort)
      while (await User.findOne({ referralCode })) {
        referralCode = generateReferralCode();
      }

      user = await User.create({
        email,
        username,
        fullName,
        password: hashedPassword,
        profilePic,
        referralCode,
        googleId,
      });
    } else {
      // Link Google if not already & backfill fields
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (profilePic && !user.profilePic) user.profilePic = profilePic;
      if (fullName && !user.fullName) user.fullName = fullName;
      if (!user.username) {
        const baseUsername = (email || "user").split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");
        user.username = await generateUsername(baseUsername || "user");
      }
      await user.save();
    }

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
    console.error("Error in googleLogin controller", err?.message || err);
    return res.status(500).json({ error: "Google sign-in failed" });
  }
};

// ---- Google OAuth Redirect Flow (stylable button) ----
const getOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL;
  if (!clientId || !redirectUri) {
    throw new Error("Missing GOOGLE_CLIENT_ID/GOOGLE_CALLBACK_URL env vars");
  }
  return new OAuth2Client({ clientId, clientSecret, redirectUri });
};

export const googleOAuthStart = async (_req, res) => {
  try {
    const client = getOAuthClient();
    const authUrl = client.generateAuthUrl({
      access_type: "offline",
      prompt: "select_account",
      scope: ["openid", "email", "profile"],
    });
    return res.redirect(authUrl);
  } catch (err) {
    console.error("googleOAuthStart error", err?.message || err);
    return res.status(500).send("OAuth init failed");
  }
};

export const googleOAuthCallback = async (req, res) => {
  try {
    const code = req.query.code;
    if (!code || typeof code !== "string") return res.status(400).send("Missing code");

    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens?.id_token) return res.status(401).send("No id_token returned");

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) return res.status(401).send("Invalid id_token");

    const googleId = payload.sub;
    const email = payload.email;
    const fullName = payload.name || "Google User";
    const profilePic = payload.picture || "";

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    const generateUsername = async (base) => {
      let candidate = base;
      let i = 0;
      while (await User.findOne({ username: candidate })) {
        i += 1;
        candidate = `${base}${i}`;
      }
      return candidate;
    };

    if (!user) {
      const baseUsername = (email || "user").split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");
      const username = await generateUsername(baseUsername || "user");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("google-oauth", salt);
      const genCode = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        return result;
      };
      let referralCode = genCode();
      while (await User.findOne({ referralCode })) referralCode = genCode();

      user = await User.create({
        email,
        username,
        fullName,
        password: hashedPassword,
        profilePic,
        referralCode,
        googleId,
      });
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (profilePic && !user.profilePic) user.profilePic = profilePic;
      if (fullName && !user.fullName) user.fullName = fullName;
      if (!user.username) {
        const baseUsername = (email || "user").split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");
        user.username = await generateUsername(baseUsername || "user");
      }
      await user.save();
    }

    sendTokenViaCookie(res, user._id);
    const redirect = process.env.CLIENT_APP_URL || "/";
    return res.redirect(302, redirect);
  } catch (err) {
    console.error("googleOAuthCallback error", err?.message || err);
    return res.status(500).send("OAuth callback failed");
  }
};


