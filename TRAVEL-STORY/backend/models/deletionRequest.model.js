const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const deletionRequestSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  requestDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
});

module.exports = mongoose.model("DeletionRequest", deletionRequestSchema);
