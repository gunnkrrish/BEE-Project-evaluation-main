// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;
// const userSchema = new Schema({
//   fullName: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   createdOn: { type: Date, default: Date.now },
// });
// module.exports = mongoose.model("User", userSchema);


const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const userSchema = new Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false }, // Add admin flag
  storiesCount: { type: Number, default: 0 }, // Track number of stories
  storageUsed: { type: Number, default: 0 }, // Track storage used in bytes
  createdOn: { type: Date, default: Date.now },
});
module.exports = mongoose.model("User", userSchema);
