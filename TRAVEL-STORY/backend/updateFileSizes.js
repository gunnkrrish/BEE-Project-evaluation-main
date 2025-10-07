const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Import JSON config file correctly
const config = require('./config.json');

// Debug the connection string
console.log("MongoDB URI:", config.connectionString);

const TravelStory = require('./models/travelStory.model');
const User = require('./models/user.model');

// Connect to MongoDB
mongoose.connect(config.connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

async function updateFileSizes() {
  try {
    // Get all travel stories
    const stories = await TravelStory.find({ fileSize: { $exists: false } });
    console.log(`Found ${stories.length} stories without fileSize`);
    
    // Update each story
    for (const story of stories) {
      try {
        // Extract filename from imageUrl
        const urlParts = story.imageUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        const filePath = path.join(__dirname, 'uploads', filename);
        
        // Check if file exists
        if (fs.existsSync(filePath)) {
          // Get file stats
          const stats = fs.statSync(filePath);
          const fileSize = stats.size;
          
          // Update story with file size
          story.fileSize = fileSize;
          await story.save();
          
          console.log(`Updated story ${story._id} with file size ${fileSize}`);
        } else {
          console.log(`File not found for story ${story._id}: ${filePath}`);
          // Set a default size or 0
          story.fileSize = 0;
          await story.save();
        }
      } catch (error) {
        console.error(`Error processing story ${story._id}:`, error);
      }
    }
    
    // Update user storage totals
    const users = await User.find();
    for (const user of users) {
      const userStories = await TravelStory.find({ userId: user._id });
      const totalStorage = userStories.reduce((sum, story) => sum + (story.fileSize || 0), 0);
      const storiesCount = userStories.length;
      
      user.storageUsed = totalStorage;
      user.storiesCount = storiesCount;
      await user.save();
      
      console.log(`Updated user ${user._id} with storage ${totalStorage} and ${storiesCount} stories`);
    }
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

updateFileSizes();
