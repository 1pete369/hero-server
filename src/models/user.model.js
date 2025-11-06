import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    username: { type: String, unique: true, required: true },
    fullName: { type: String, required: true },
    password: { type: String, required: true, minlength: 6 },
    profilePic: { type: String, default: "" },
    referralCode: { type: String, unique: true, required: true },
    googleId: { type: String, index: true },
    googleAccessToken: { type: String, default: null },
    googleRefreshToken: { type: String, default: null },
    googleTokenExpiry: { type: Date, default: null },
    calendarSyncEnabled: { type: Boolean, default: false },

    // Subscription / billing fields
    // Allow current pricing tiers and legacy alias 'premium'
    plan: { type: String, enum: ["free", "starter", "pro", "elite", "premium"], default: "free", index: true },
    planSince: { type: Date, default: null },
    planRenewsAt: { type: Date, default: null },
    trialEndsAt: { type: Date, default: null },
    billingProvider: { type: String, enum: ["stripe", "paddle", null], default: null },
    providerCustomerId: { type: String, default: null },

    // Onboarding fields
    onboardingCompleted: { type: Boolean, default: false },
    onboardingData: {
      primaryGoal: { type: String, default: null }, // build_habits, achieve_goals, get_organized, stay_accountable, level_up
      biggestChallenge: { type: String, default: null }, // lack_clarity, time_management, no_motivation, no_accountability, cant_track
      workStyle: { type: String, default: null }, // solo, team, planner, flexible, streak_lover
      focusArea: { type: String, default: null }, // career, health, learning, finance, personal, creative
      firstGoal: { type: String, default: null }, // User's first goal text
      wantsBuddy: { type: Boolean, default: false },
      buddyEmail: { type: String, default: null },
      completedAt: { type: Date, default: null }
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;


