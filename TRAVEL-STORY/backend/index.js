require("dotenv").config();
const config = require("./config.json");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const express = require("express");
const cors = require("cors");

const jwt = require("jsonwebtoken");
const upload = require("./multer");
const fs = require("fs");
const path = require("path");
const {authenticateToken} = require("./utilities");
const User=require("./models/user.model");
const TravelStory= require("./models/travelStory.model");
mongoose.connect(config.connectionString);
const DeletionRequest = require('./models/deletionRequest.model');


const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
});


// Add this near the top of your index.js file
const adminRoutes = require("./routes/admin.routes");

// Add this with your other app.use statements
app.use("/admin", adminRoutes);


// app.get("/hello", async (req, res) => {
//   return res.status(200).json({ message: "Hello World" });
// });

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
const {email,password } = req.body;

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

// // **********************************ADD TRAVEL STORY
// app.post("/add-travel-story", authenticateToken ,async (req,res)=>{
// const {title , story,visitedLocation,imageUrl,visitedDate} = req.body;
// const {userId} = req.user

// //Vaildate required fields
// if (!title || !story || !visitedLocation || !imageUrl || !visitedDate){
//   return res.status(400).json({error : true,message: "All fields are required"});
// }


// //Convert visiteddate from milliseconds to date object
// const parsedVisitedDate = new Date(parseInt(visitedDate));
// try{
//   const travelStory = new TravelStory({
//     title,
//     story,
//     visitedLocation,
//     userId,
//     imageUrl,
//     visitedDate: parsedVisitedDate,
//   });
//   await travelStory.save();
//   res.status(201).json({story: travelStory,message : 'Added Successfully'});

// }
// catch(error){
//   res.status(400).json({error:true,message:error.message});
// }
// })

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


// //*Route to handle image upload
// app.post("/image-upload", upload.single("image"),async (req,res)=>{
//   try{
//     if(!req.file){
//       return res
//       .status(400)
//       .json({error : true,message : "No image uploaded"});
//     }

//     const imageUrl = `http://localhost:8000/uploads/${req.file.filename}`;

//     res.status(200).json({imageUrl});
//   }
//   catch(error){
//     res.status(500).json({error: true,message:error.message});
//   }
// });


app.post("/image-upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: true, message: "No image uploaded" });
    }

    const imageUrl = `http://localhost:8000/uploads/${req.file.filename}`;
    const fileSize = req.file.size; // Get the file size

    res.status(200).json({ imageUrl, fileSize }); // Return both URL and size
  } catch (error) {
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





// //*Serve static files from the uploads and assests directory
app.use("/uploads",express.static(path.join(__dirname,"uploads")));
 app.use("/assets",express.static(path.join(__dirname, "assets")));

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
    const placeholderImgUrl = `http://localhost:8000/assets/placeholder.png`;

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
    //delete th travel story from the database
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
        //optionally ou could still respond with a success status here
        //if u dont want to treat this as a critical error.
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



// //57:37






































// require("dotenv").config();
// const fs = require("fs");
// const path = require("path");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const express = require("express");
// const cors = require("cors");
// const upload = require("./multer");
// const { authenticateToken, readData, writeData } = require("./utilities");

// const app = express();
// app.use(express.json());
// app.use(cors({ origin: "*" }));

// const usersFile = path.join(__dirname, "users.json");
// const STORIES_FILE = "stories.json";

// // Function to read users.json
// const readUsers = () => {
//   if (!fs.existsSync(usersFile)) return [];
//   const data = fs.readFileSync(usersFile);
//   return JSON.parse(data);
// };

// // Function to write to users.json
// const writeUsers = (users) => {
//   fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
// };

// // Admin middleware to check if a user is an admin
// const adminMiddleware = (req, res, next) => {
//   const users = readData(usersFile);
//   const user = users.find(user => user.id === req.user.userId);
  
//   if (!user && req.user.userId !== "admin-001") {
//     return res.status(403).json({ 
//       error: true, 
//       message: "Access denied. Admin privileges required." 
//     });
//   }
  
//   if ((user && !user.isAdmin) && req.user.userId !== "admin-001") {
//     return res.status(403).json({ 
//       error: true, 
//       message: "Access denied. Admin privileges required." 
//     });
//   }
  
//   next();
// };

// // **SIGNUP API**
// app.post("/create-account", async (req, res) => {
//   const { fullName, email, password } = req.body;

//   if (!fullName || !email || !password) {
//     return res.status(400).json({ message: "All fields are required" });
//   }

//   const users = readUsers();
//   const existingUser = users.find((u) => u.email === email);

//   if (existingUser) {
//     return res.status(400).json({ message: "User already exists" });
//   }

//   const nextId = users.length > 0 
//   ? Math.max(...users.map(user => parseInt(user.id))) + 1 
//   : 1;

//   const hashedPassword = await bcrypt.hash(password, 10);
//   const newUser = { 
//     id: nextId, 
//     fullName, 
//     email, 
//     password: hashedPassword,
//     createdAt: new Date().toISOString()
//   };

//   users.push(newUser);
//   writeUsers(users);

//   const accessToken = jwt.sign(
//     { userId: newUser.id },
//     process.env.ACCESS_TOKEN_SECRET,
//     { expiresIn: "72h" }
//   );

//   return res.json({
//     error: false,
//     message: "Account created successfully",
//     user: { id: newUser.id, fullName, email },
//     accessToken,
//   });
// });

// // **LOGIN API**
// app.post("/login", async (req, res) => {
//   const { email, password } = req.body;
  
//   // Check for admin login
//   if (email === "admin@travelmanager.com" && password === "admin123") {
//     const adminUser = {
//       id: "admin-001",
//       fullName: "Admin",
//       email: "admin@travelmanager.com",
//       isAdmin: true
//     };
    
//     const accessToken = jwt.sign(
//       { userId: adminUser.id },
//       process.env.ACCESS_TOKEN_SECRET,
//       { expiresIn: "72h" }
//     );
    
//     return res.json({ accessToken, user: adminUser });
//   }
  
//   // Regular user login logic
//   const users = readUsers();
//   const user = users.find((u) => u.email === email);

//   if (!user) {
//     return res.status(401).json({ message: "Invalid email or password" });
//   }

//   const isPasswordValid = await bcrypt.compare(password, user.password);
  
//   if (!isPasswordValid) {
//     return res.status(401).json({ message: "Invalid email or password" });
//   }

//   const accessToken = jwt.sign(
//     { userId: user.id },
//     process.env.ACCESS_TOKEN_SECRET,
//     { expiresIn: "72h" }
//   );

//   // Don't send password to client
//   const { password: _, ...userWithoutPassword } = user;
//   res.json({ accessToken, user: userWithoutPassword });
// });

// // **LOGOUT API** (Logout is handled on frontend)
// app.post("/logout", (req, res) => {
//   return res.json({ message: "Logged out successfully" });
// });

// // Add this endpoint to get public stories for guest users
// app.get("/get-public-stories", (req, res) => {
//   try {
//     // Read all stories
//     const stories = readData(STORIES_FILE);
    
//     // Filter to only include stories marked as public
//     const publicStories = stories.filter(story => story.public === true);
    
//     res.status(200).json({ stories: publicStories });
//   } catch (error) {
//     console.error("Error fetching public stories:", error);
//     res.status(500).json({ error: true, message: "Internal Server Error" });
//   }
// });

// //* GET USER ****************************
// app.get("/get-user", authenticateToken, (req, res) => {
//   const users = readData(usersFile);
  
//   // Special case for admin user
//   if (req.user.userId === "admin-001") {
//     return res.json({ 
//       user: {
//         id: "admin-001",
//         fullName: "Admin",
//         email: "admin@travelmanager.com",
//         isAdmin: true
//       }, 
//       message: "" 
//     });
//   }
  
//   const user = users.find(user => user.id === req.user.userId);
//   if (!user) return res.sendStatus(401);
  
//   // Don't send password to client
//   const { password: _, ...userWithoutPassword } = user;
//   res.json({ user: userWithoutPassword, message: "" });
// });

// //* ADD TRAVEL STORY ****************************
// app.post("/add-travel-story", authenticateToken, (req, res) => {
//   const { title, story, visitedLocation, imageUrl, visitedDate, public } = req.body;
//   if (!title || !story || !visitedLocation || !imageUrl || !visitedDate) {
//     return res.status(400).json({ error: true, message: "All fields are required" });
//   }
  
//   // Check if user is a guest (don't save guest stories)
//   if (req.user.isGuest) {
//     return res.status(200).json({ 
//       story: {
//         id: `guest-${Date.now()}`,
//         userId: req.user.userId,
//         title,
//         story,
//         visitedLocation,
//         imageUrl,
//         visitedDate: new Date(parseInt(visitedDate)),
//         isFavourite: false,
//         public: true,
//         isGuestStory: true
//       }, 
//       message: "Guest story created (not saved permanently)" 
//     });
//   }
  
//   let stories = readData(STORIES_FILE);
//   const newStory = {
//     id: Date.now().toString(),
//     userId: req.user.userId,
//     title,
//     story,
//     visitedLocation,
//     imageUrl,
//     visitedDate: new Date(parseInt(visitedDate)), 
//     isFavourite: false,
//     public: public || false // Default to private if not specified
//   };
//   stories.push(newStory);
//   writeData(STORIES_FILE, stories);
  
//   res.status(201).json({ story: newStory, message: "Added Successfully" });
// });

// //* GET ALL TRAVEL STORIES ****************************
// app.get("/get-all-stories", authenticateToken, (req, res) => {
//   const stories = readData(STORIES_FILE).filter(story => story.userId === req.user.userId);
//   res.status(200).json({ stories });
// });

// //* IMAGE UPLOAD ****************************
// app.post("/image-upload", upload.single("image"), async (req, res) => {
//   if (!req.file) return res.status(400).json({ error: true, message: "No image uploaded" });
//   const imageUrl = `http://localhost:8000/uploads/${req.file.filename}`;
//   res.status(201).json({ imageUrl });
// });

// //***************DELETE AN IMAGE FROM UPLOADS FOLDER*/
// app.delete("/delete-image", async (req, res) => {
//   const { imageUrl } = req.query;

//   if (!imageUrl) {
//     return res
//     .status(400)
//     .json({error: true, message: "imageUrl parameter is required"});
//   }

//   try {
//     // Extract filename from the url
//     const filename = path.basename(imageUrl);

//     // Define the file path
//     const filePath = path.join(__dirname, 'uploads', filename);

//     // Check if file exists
//     if (fs.existsSync(filePath)) {
//       fs.unlinkSync(filePath);
//       res.status(200).json({message: "Image deleted successfully"});
//     }
//     else {
//       res.status(200).json({error: true, message: "Image not found"});
//     }
//   }
//   catch (error) {
//     res.status(500).json({error: true, message: error.message});
//   }
// });

// //* EDIT TRAVEL STORY ****************************
// app.post("/edit-story/:id", authenticateToken, async (req, res) => {
//   const { id } = req.params;
//   const { title, story, visitedLocation, imageUrl, visitedDate, public } = req.body;
//   const { userId } = req.user;

//   if (!title || !story || !visitedLocation || !imageUrl || !visitedDate) {
//     return res
//       .status(400)
//       .json({ error: true, message: "All fields are required" });
//   }

//   const parsedVisitedDate = new Date(parseInt(visitedDate));
//   const stories = readData(STORIES_FILE);

//   // Find index of the story
//   const storyIndex = stories.findIndex(
//     (s) => s.id === id && s.userId === userId
//   );

//   if (storyIndex === -1) {
//     return res
//       .status(404)
//       .json({ error: true, message: "Travel Story not found" });
//   }

//   const placeholderImgUrl = `http://localhost:8000/assets/placeholder.jpeg`;

//   // Update the story
//   stories[storyIndex] = {
//     ...stories[storyIndex],
//     title,
//     story,
//     visitedLocation,
//     imageUrl: imageUrl || placeholderImgUrl,
//     visitedDate: parsedVisitedDate,
//     public: public || stories[storyIndex].public || false
//   };

//   writeData(STORIES_FILE, stories);

//   res
//     .status(200)
//     .json({ story: stories[storyIndex], message: "Update Successful" });
// });

// // DELETE A TRAVEL STORY
// app.delete("/delete-story/:id", authenticateToken, (req, res) => {
//   const { id } = req.params;
//   const { userId } = req.user;

//   try {
//     let stories = readData(STORIES_FILE);

//     // Find the index of the story
//     const storyIndex = stories.findIndex(
//       (story) => story.id === id && story.userId === userId
//     );

//     if (storyIndex === -1) {
//       return res.status(404).json({ error: true, message: "Travel story not found" });
//     }

//     // Extract image file path from the story
//     const imageUrl = stories[storyIndex].imageUrl;
//     const filename = path.basename(imageUrl);
//     const filePath = path.join(__dirname, "uploads", filename);

//     // Remove the image file if it exists
//     if (fs.existsSync(filePath)) {
//       fs.unlinkSync(filePath);
//     }

//     // Remove story from array and save
//     stories.splice(storyIndex, 1);
//     writeData(STORIES_FILE, stories);

//     res.status(200).json({ message: "Travel story deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting travel story:", error.message);
//     res.status(500).json({ error: true, message: "Internal Server Error" });
//   }
// });

// //update isFavourite
// app.put("/update-is-favourite/:id", authenticateToken, (req, res) => {
//   const { id } = req.params;
//   const { isFavourite } = req.body;
//   const { userId } = req.user;

//   try {
//     let stories = readData(STORIES_FILE);

//     // Find index of the story
//     const storyIndex = stories.findIndex(
//       (story) => story.id === id && story.userId === userId
//     );

//     if (storyIndex === -1) {
//       return res
//         .status(404)
//         .json({ error: true, message: "Travel story not found" });
//     }

//     // Update the isFavourite field
//     stories[storyIndex].isFavourite = isFavourite;

//     // Write back updated stories
//     writeData(STORIES_FILE, stories);

//     res.status(200).json({
//       story: stories[storyIndex],
//       message: "isFavourite status updated successfully",
//     });
//   } catch (error) {
//     console.error("Error updating isFavourite:", error.message);
//     res.status(500).json({ error: true, message: "Internal Server Error" });
//   }
// });

// // Admin endpoints
// app.get("/admin/get-all-users", authenticateToken, adminMiddleware, (req, res) => {
//   try {
//     const users = readUsers();
//     const stories = readData(STORIES_FILE);
    
//     // Calculate storage used by each user
//     const usersWithStats = users.map(user => {
//       const userStories = stories.filter(story => story.userId === user.id);
//       const storiesCount = userStories.length;
      
//       // Calculate storage (assuming each story takes up some space)
//       // In a real app, you'd calculate based on actual image sizes
//       const storageUsed = userStories.reduce((total, story) => {
//         // Rough estimate: 1KB for text + image size (if we had it)
//         return total + 1024;
//       }, 0);
      
//       return {
//         ...user,
//         password: undefined, // Don't send password hash
//         storiesCount,
//         storageUsed,
//         createdAt: user.createdAt || new Date().toISOString()
//       };
//     });
    
//     res.json({ success: true, users: usersWithStats });
//   } catch (error) {
//     console.error("Error fetching users:", error);
//     res.status(500).json({ success: false, message: "Failed to fetch users" });
//   }
// });

// app.delete("/admin/delete-user/:userId", authenticateToken, adminMiddleware, (req, res) => {
//   try {
//     const { userId } = req.params;
//     const userIdNum = parseInt(userId);
    
//     // Get users and stories
//     let users = readUsers();
//     let stories = readData(STORIES_FILE);
    
//     // Find user
//     const userIndex = users.findIndex(u => u.id === userIdNum);
//     if (userIndex === -1) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }
    
//     // Delete user's stories and associated images
//     const userStories = stories.filter(story => story.userId === userIdNum);
//     userStories.forEach(story => {
//       // Delete image file if it exists
//       if (story.imageUrl) {
//         const filename = path.basename(story.imageUrl);
//         const filePath = path.join(__dirname, "uploads", filename);
//         if (fs.existsSync(filePath)) {
//           fs.unlinkSync(filePath);
//         }
//       }
//     });
    
//     // Remove user's stories from stories array
//     stories = stories.filter(story => story.userId !== userIdNum);
//     writeData(STORIES_FILE, stories);
    
//     // Remove user
//     users.splice(userIndex, 1);
//     writeUsers(users);
    
//     res.json({ success: true, message: "User deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting user:", error);
//     res.status(500).json({ success: false, message: "Failed to delete user" });
//   }
// });

// //* Serve static files ****************************
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use("/assets", express.static(path.join(__dirname, "assets")));

// app.listen(8000, () => console.log("Server running on port 8000"));
// module.exports = app;


//vite
//axios
// moongoose
//npm install



// admin pass: and username   ->   admin@gmail.com -> pass: admin@123