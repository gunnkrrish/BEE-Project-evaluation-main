const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const User = require('./models/user.model'); // Import your User model
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // Check for guest token format
  if (token && token.startsWith('guest-token-')) {
    req.user = { 
      userId: token.split('-')[2], // Extract guest ID from token
      isGuest: true 
    };
    return next();
  }

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); 
    req.user = user;
    next();
  });
}

// Admin middleware to check if a user is an admin

async function adminMiddleware(req, res, next) {
  try {
    // Skip admin check for guest users
    if (req.user.isGuest) {
      return res.status(403).json({ 
        error: true, 
        message: "Access denied. Guest users cannot access admin features." 
      });
    }

    // Check MongoDB for admin status
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({ 
        error: true, 
        message: "Access denied. Admin privileges required." 
      });
    }
    
    next();
  } catch (error) {
    console.error("Admin check error:", error);
    return res.status(500).json({ error: true, message: "Server error" });
  }
}

const writeData = (filename, data) => {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
};

const readData = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading data:", error);
    return [];
  }
};



// Optional middleware that allows both authenticated users and guests
function allowGuestAccess(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // If no token, treat as guest
  if (!token) {
    req.user = { isGuest: true, userId: `guest-${Date.now()}` };
    return next();
  }

  // Check for guest token format
  if (token.startsWith('guest-token-')) {
    req.user = { 
      userId: token.split('-')[2], // Extract guest ID from token
      isGuest: true 
    };
    return next();
  }

  // Regular token verification
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      // If token is invalid, treat as guest
      req.user = { isGuest: true, userId: `guest-${Date.now()}` };
      return next();
    }
    req.user = user;
    next();
  });
}

// Export all functions
module.exports = { 
  authenticateToken, 
  readData, 
  writeData, 
  adminMiddleware,
  allowGuestAccess 
};



// const jwt = require('jsonwebtoken')

// function authenticateToken(req,res,next){
//     const authHeader = req.headers["authorization"];
//     const token = authHeader &&authHeader.split(" ")[1];

//     //no token unauthorized
//     if(!token) return res.sendStatus(401);

//     jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,user)=>{
//        if (err) return res.sendStatus(401);
//        req.user = user;
//        next();  
//     });
// }

// module.exports = {
//     authenticateToken
// };