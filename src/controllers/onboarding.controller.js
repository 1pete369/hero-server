import User from "../models/user.model.js";

export const completeOnboarding = async (req, res) => {
  try {
    const userId = req.user._id;
    const { primaryGoal, biggestChallenge, workStyle, focusArea, firstGoal, wantsBuddy, buddyEmail } = req.body;

    // Validate required fields
    if (!primaryGoal || !biggestChallenge || !workStyle || !focusArea) {
      return res.status(400).json({ message: "Missing required onboarding fields" });
    }

    // Update user with onboarding data
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        onboardingCompleted: true,
        onboardingData: {
          primaryGoal,
          biggestChallenge,
          workStyle,
          focusArea,
          firstGoal: firstGoal || null,
          wantsBuddy: wantsBuddy || false,
          buddyEmail: buddyEmail || null,
          completedAt: new Date()
        }
      },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Onboarding completed successfully",
      user: {
        _id: updatedUser._id,
        onboardingCompleted: updatedUser.onboardingCompleted,
        onboardingData: updatedUser.onboardingData
      }
    });
  } catch (err) {
    console.error("Error in completeOnboarding controller", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getOnboardingStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId).select('onboardingCompleted onboardingData');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      onboardingCompleted: user.onboardingCompleted,
      onboardingData: user.onboardingData
    });
  } catch (err) {
    console.error("Error in getOnboardingStatus controller", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

