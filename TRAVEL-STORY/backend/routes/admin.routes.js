const express = require("express");
const router = express.Router();
const User = require("../models/user.model");
const TravelStory = require("../models/travelStory.model");
const { authenticateToken, adminMiddleware } = require("../utilities");
const DeletionRequest = require("../models/deletionRequest.model");

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: true, message: "Admin access required" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

// Get all users (admin only)

router.get("/get-all-users", authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    
    // For each user, get their story count and storage used if not already in the user document
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();
        
        // Ensure date field is properly formatted
        // Convert createdOn to createdAt for frontend consistency
        userObj.createdAt = user.createdOn ? user.createdOn.toISOString() : null;
        
        // If storiesCount is not already tracked in the user document
        if (userObj.storiesCount === undefined) {
          const storiesCount = await TravelStory.countDocuments({ userId: user._id });
          userObj.storiesCount = storiesCount;
        }
        
        // If storageUsed is not already tracked in the user document
        if (userObj.storageUsed === undefined) {
          userObj.storageUsed = 0;
          const stories = await TravelStory.find({ userId: user._id });
          stories.forEach(story => {
            userObj.storageUsed += story.fileSize || 0;
          });
        }
        
        return userObj;
      })
    );
    
    res.status(200).json({ users: usersWithStats });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});




// router.get("/get-all-users", authenticateToken, isAdmin, async (req, res) => {
//   try {
//     const users = await User.find().select("-password");
    
//     // For each user, get their story count and storage used if not already in the user document
//     const usersWithStats = await Promise.all(
//       users.map(async (user) => {
//         const userObj = user.toObject();
        
//         // If storiesCount is not already tracked in the user document
//         if (userObj.storiesCount === undefined) {
//           const storiesCount = await TravelStory.countDocuments({ userId: user._id });
//           userObj.storiesCount = storiesCount;
//         }
        
//         // If storageUsed is not already tracked in the user document
//         if (userObj.storageUsed === undefined) {
//           userObj.storageUsed = 0;
//           const stories = await TravelStory.find({ userId: user._id });
//           stories.forEach(story => {
//             userObj.storageUsed += story.fileSize || 0;
//           });
//         }
        
//         return userObj;
//       })
//     );
    
//     res.status(200).json({ users: usersWithStats });
//   } catch (error) {
//     console.error("Error fetching users:", error);
//     res.status(500).json({ error: true, message: error.message });
//   }
// });

// Delete user (admin only)
router.delete("/delete-user/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: true, message: "User not found" });
    }
    
    // Don't allow deletion of admin users
    if (user.isAdmin) {
      return res.status(400).json({ error: true, message: "Cannot delete admin users" });
    }
    
    // Delete user's travel stories
    await TravelStory.deleteMany({ userId });
    
    // Delete the user
    await User.findByIdAndDelete(userId);
    
    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

router.get('/deletion-requests', authenticateToken, isAdmin, async (req, res) => {
  try {
    const requests = await DeletionRequest.find({ status: 'pending' })
      .populate('userId', 'fullName email createdOn')
      .sort({ requestDate: -1 });
    
    res.status(200).json({ requests });
  } catch (error) {
    console.error('Error fetching deletion requests:', error);
    res.status(500).json({ error: true, message: error.message });
  }
});


// Admin route to approve/reject deletion requests
router.put('/deletion-requests/:id', authenticateToken, adminMiddleware, async (req, res) => {
  try {
    // First verify the user is an admin
    const admin = await User.findById(req.user.userId);
    if (!admin || !admin.isAdmin) {
      return res.status(403).json({ error: true, message: "Admin access required" });
    }
    
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: true, message: 'Invalid status' });
    }
    
    const request = await DeletionRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: true, message: 'Request not found' });
    }
    
    request.status = status;
    await request.save();
    
    // If approved, delete the user account
    if (status === 'approved') {
      // Delete user's travel stories
      await TravelStory.deleteMany({ userId: request.userId });
      
      // Delete the user
      await User.findByIdAndDelete(request.userId);
    }
    
    res.status(200).json({ success: true, message: `Request ${status}` });
  } catch (error) {
    console.error('Error updating deletion request:', error);
    res.status(500).json({ error: true, message: error.message });
  }
});


module.exports = router;
