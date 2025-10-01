import jwt from "jsonwebtoken";

export const sendTokenViaCookie = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
  
  // iOS Safari compatible cookie settings
  const isProduction = process.env.NODE_ENV === "production";
  const isHttps = process.env.NODE_ENV === "production"; // Assuming production uses HTTPS
  
  res.cookie("token", token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
    // Additional iOS Safari compatibility
    domain: process.env.COOKIE_DOMAIN || undefined, // Set if using subdomain
  });
};


