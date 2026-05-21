require("dotenv").config();
// const config = require("./config.json");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const express = require("express");
const cors = require("cors");

const jwt = require("jsonwebtoken");
const upload = require("./multer");
const fs = require("fs");
const path = require("path");
const {authenticateToken} = require("./utilities");
const User=require("./models/user.model");
const TravelStory= require("./models/travelStory.model");
mongoose.connect(process.env.MONGODB_URI)
const DeletionRequest = require('./models/deletionRequest.model');


const app = express();
app.use(express.json());

// Enable CORS for all requests including static files
app.use(cors({ 
  origin: "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static files from uploads and assets directories
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: '1d',
  etag: false
}));
app.use("/assets", express.static(path.join(__dirname, "assets"), {
  maxAge: '7d',
  etag: false
}));

app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
});

const adminRoutes = require("./routes/admin.routes");

app.use("/admin", adminRoutes);

//*create account****************************
app.post("/create-account",async(req,res)=>{
const {fullName,email,password} = req.body;
if (!fullName || !email || !password){
  return res
  .status(400)
  .json({error : true,message: "All fields are required"});
}
const isUser = await User.findOne({email});
if(isUser){
  return res
  .status(400)
  .json({error: true , message: "User already exist"})
}
const hashedPassword = await bcrypt.hash(password,10);

const user = new User({
  fullName,
  email,
  password : hashedPassword,
});

await user.save();

const accessToken = jwt.sign(
  {userId: user._id},
  process.env.ACCESS_TOKEN_SECRET,{
    expiresIn: "72h",
  }
);
return res.status(201).json({
  error: false,
  users: {fullName: user.fullName,email: user.email},
  accessToken,
  message: "Registration Successful",
});

});


//*********************************************************************************** */
//**Login account */
app.post("/login",async(req,res) =>{
const {email,password} = req.body;

if(!email || !password){
  return res.status(400).json({ message : "Email and Password are required"});
}

const user = await User.findOne({ email});
if(!user){
  return res.status(400).json({message : "User not found"});
}

const isPasswordValid = await bcrypt.compare(password,user.password);
if(!isPasswordValid){
  return res.status(400).json({message : "Ïnvalid Credentials"});
}

const accessToken = jwt.sign(
  {userId : user._id},
  process.env.ACCESS_TOKEN_SECRET,
  {
    expiresIn: "72h",
  }
);

return res.json({
  error : false,
  message: "Login Successful",
  user: {fullName: user.fullName,email:user.email,isAdmin: user.isAdmin},
  accessToken,
});

});




// Route to handle user deletion requests
// In your index.js or routes file where you handle deletion requests
app.post("/api/request-account-deletion", authenticateToken, async (req, res) => {
  try {
    console.log("Processing deletion request for user:", req.user.userId);
    
    // Check if user already has a pending request
    const existingRequest = await DeletionRequest.findOne({ 
      userId: req.user.userId,
      status: 'pending'
    });
    
    if (existingRequest) {
      console.log("Duplicate request detected for user:", req.user.userId);
      return res.status(400).json({ 
        error: true, 
        message: 'You already have a pending account deletion request' 
      });
    }
    
    console.log("Creating new deletion request for user:", req.user.userId);
    // Create new deletion request
    const deletionRequest = new DeletionRequest({
      userId: req.user.userId
    });
    
    await deletionRequest.save();
    console.log("Deletion request saved successfully for user:", req.user.userId);
    
    res.status(201).json({ 
      success: true, 
      message: 'Account deletion request submitted successfully' 
    });
  } catch (error) {
    console.error("Deletion request error:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});


// // ***********************GET USER**************
app.get("/get-user", authenticateToken ,async (req,res)=>{
  const {userId} = req.user
  const isUser = await User.findOne({_id: userId});

  //token invalid
  if(!isUser){
    return res.sendStatus(401);
  }

  return res.json({
    user: isUser,
    message : "",
  });
})



app.post("/add-travel-story", authenticateToken, async (req, res) => {
  const { title, story, visitedLocation, imageUrl, visitedDate, fileSize } = req.body;
  const { userId } = req.user;

  // Validate required fields
  if (!title || !story || !visitedLocation || !imageUrl || !visitedDate) {
    return res.status(400).json({ error: true, message: "All fields are required" });
  }
if (req.user.isGuest) {
    return res.status(200).json({ 
      story: {
        id: `guest-${Date.now()}`,
        userId: req.user.userId,
        title,
        story,
        visitedLocation,
        imageUrl,
        visitedDate: new Date(parseInt(visitedDate)),
        isFavourite: false,
        public: true,
        isGuestStory: true
      }, 
      message: "Guest story created (not saved permanently)" 
    });
  }
  

  // Convert visiteddate from milliseconds to date object
  const parsedVisitedDate = new Date(parseInt(visitedDate));
  try {
    const travelStory = new TravelStory({
      title,
      story,
      visitedLocation,
      userId,
      imageUrl,
      visitedDate: parsedVisitedDate,
      fileSize: fileSize || 0 // Store the file size, default to 0 if not provided
    });
    
    await travelStory.save();
    
    // The post-save hook will update the user's storage usage
    
    res.status(201).json({ story: travelStory, message: 'Added Successfully' });
  } catch (error) {
    res.status(400).json({ error: true, message: error.message });
  }
});



// //*Get all travel story
app.get("/get-all-stories", authenticateToken ,async (req,res)=>{
  const { userId } = req.user;

  try{
    const travelStories = await TravelStory.find({userId: userId}).sort({
      isFavourite: -1,
    });
    res.status(200).json({stories: travelStories});
  }
  catch(error){
    res.status(500).json({error: true,message: error.message});
  }
});




app.post("/image-upload", upload.single("image"), async (req, res) => {
  try {
    console.log("Image upload request received");
    console.log("File details:", req.file ? {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    } : "No file");

    if (!req.file) {
      console.error("No file in request");
      return res
        .status(400)
        .json({ error: true, message: "No image uploaded" });
    }

    // Verify file actually exists and has content
    if (req.file.size === 0) {
      console.error("Uploaded file is empty");
      return res
        .status(400)
        .json({ error: true, message: "Uploaded file is empty" });
    }

    const imageUrl = `uploads/${req.file.filename}`;
    const fileSize = req.file.size;

    console.log("Image uploaded successfully:", imageUrl);
    res.status(200).json({ imageUrl, fileSize });
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});


//Delete an image from uploads folder

app.delete("/delete-image",async (req, res) => {
  const { imageUrl } = req.query;

  if( !imageUrl) {
    return res
    .status(400)
    .json({error: true,message: "imageUrl parameter is required"});
  }

  try{
    const filename = path.basename(imageUrl);
    const filePath = path.join(__dirname,'uploads',filename);

    if(fs.existsSync(filePath)){
      fs.unlinkSync(filePath);
      res.status(200).json({message: "Image deleted successfully"});
    }else{
      res.status(200).json({error: true,message: "Image not found"});
    }
  }
    catch(error){
      res.status(500).json({ error: true,message: error.message});
    }
  
});


// Static file serving moved to top of file with express.static configuration

 //Edit travel story
 app.post("/edit-story/:id",authenticateToken,async(req,res)=>{
  const { id } = req.params;
  const { title , story,visitedLocation,imageUrl,visitedDate } = req.body;
  const { userId } = req.user;

  if (!title || !story || !visitedLocation || !visitedDate){
    return res.status(400).json({error : true,message: "All fields are required"});
  }
  
  
  //Convert visiteddate from milliseconds to date object
  const parsedVisitedDate = new Date(parseInt(visitedDate));

  try{
    const travelStory = await TravelStory.findOne({ _id: id,userId: userId});

    if(!travelStory){
      return res.status(404).json({error: true,message: "Travel story not found"});
    }
    const placeholderImgUrl = `assets/placeholder.png`;

    travelStory.title = title;
    travelStory.story = story;
    travelStory.visitedLocation = visitedLocation;
    travelStory.imageUrl = imageUrl || placeholderImgUrl;
    travelStory.visitedDate = parsedVisitedDate;

    await travelStory.save();
    res.status(200).json({ story : travelStory,message: "Update Successfull"});
  }
  catch(error){
    res.status(500).json({error: true,message: error.message });
  }

 });


// //DELETE A TRAVEL STORY  ************************888acc to databse
app.delete("/delete-story/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  try{
    const travelStory = await TravelStory.findOne({ _id: id,userId: userId});

    if(!travelStory){
      return res
      .status(404)
      .json({error: true,message: "travel story not found"});
    }
    //delete the travel story from the database
    await travelStory.deleteOne({ _id: id,userId: userId});

    //extract the filename from the imageurl
    const imageUrl = travelStory.imageUrl;
    const filename = path.basename(imageUrl);

    //define the file path
    const filePath = path.join(__dirname,'uploads',filename);

    //delete the image file from uploads folder
    fs.unlink(filePath,(err) =>{
      if (err){
        console.error("Failed to delete image file:",err);
        
      }
    });
    res.status(200).json({ message : "Travel story deleted successfully"});

  }
  catch(error){
    res.status(500).json({error: true,message: error.message});
  }
})


//*********************************************************update is favourite in databse
app.put("/update-is-favourite/:id", authenticateToken, async(req, res) => {
  const { id } = req.params;
  const { isFavourite } = req.body;
  const { userId } = req.user;

  try{
    const travelStory = await TravelStory.findOne({_id: id,userId: userId});

    if(!travelStory){
      return res.status(400).json({error: true,message: "Travel story not found"});

    }
    travelStory.isFavourite = isFavourite;

    await travelStory.save();
    res.status(200).json({ stor:travelStory,message: 'Update Successfull'});

  }catch(error){
  res.status(500).json({ error: true,message: error.message});
  }

})

//***************************Search travel stories */
app.get("/search",authenticateToken,async(req,res)=>{
  const { query } = req.query;
  const { userId } = req.user;

  if(!query){
    return res.status(404).json({error: true,message: "query is required"});

  }
  try{
    const searchResults = await TravelStory.find({
      userId : userId,
      $or: [
        { title: { $regex: query,$options: "i"}}, 
        // i means here that the case is insensitive
        { story: { $regex: query,$options: "i"}},
        { visitedLocation: { $regex: query,$options: "i"}},
      ],
    }).sort({ isFavourite: -1});
    res.status(200).json({ stories: searchResults});
  }
  catch(error){
    res.status(500).json({ error: true,message: error.message});
    }
});

//filter travel stories by data range
app.get("/travel-stories/filter",authenticateToken,async(req,res)=>{
  const { startDate, endDate } = req.query;
  const  { userId } = req.user;
  
  try{
  const start = new Date(parseInt(startDate));
  const end = new Date(parseInt(endDate));

  const filteredStories = await TravelStory.find({
    userId: userId,
    visitedDate : { $gte: start,$lte: end},

  }).sort({ isFavourite: -1});

  res.status(200).json({stories: filteredStories});
}catch(error){
  res.status(500).json({ error: true,message: error.message});
}
});

app.listen(8000);
console.log("Server has started at 8000....");
module.exports = app;


//vite
//axios
// moongoose
//npm install



// admin pass: and username   ->   admin@gmail.com -> pass: admin@123