// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;

// const travelStorySchema = new Schema({
//     title: {type:String , required: true},
//     story: {type:String,required:true},
//     visitedLocation: {type: [String],default: []},
//     isFavourite: {type:Boolean , default:false},
//     userId : {type: Schema.Types.ObjectId,ref: "User",required: true},
//     createdOn: {type:Date, default:Date.now},
//     imageUrl: {type: String , required: true},
//     visitedDate: {type: Date, required: true},
// });

// module.exports = mongoose.model("TravelStory",travelStorySchema);



const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const User = require('./user.model');

const travelStorySchema = new Schema({
    title: {type:String, required: true},
    story: {type:String, required:true},
    visitedLocation: {type: [String], default: []},
    isFavourite: {type:Boolean, default:false},
    userId: {type: Schema.Types.ObjectId, ref: "User", required: true},
    createdOn: {type:Date, default:Date.now},
    imageUrl: {type: String, required: true},
    visitedDate: {type: Date, required: true},
    fileSize: {type: Number, default: 0} // Add file size field
});

// Add hooks for tracking user stats
travelStorySchema.post('save', async function() {
  try {
    await User.findByIdAndUpdate(this.userId, {
      $inc: { storiesCount: 1, storageUsed: this.fileSize }
    });
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
});

// This hook works with the .remove() method
travelStorySchema.post('remove', async function() {
  try {
    await User.findByIdAndUpdate(this.userId, {
      $inc: { storiesCount: -1, storageUsed: -this.fileSize }
    });
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
});

module.exports = mongoose.model("TravelStory", travelStorySchema);
