const multer = require("multer");
const path = require("path");

//Storage configuration
const storage = multer.diskStorage({
    destination: function(req,file,cb){
        // cb is a call back function
        cb(null,"./uploads/");  //destiantion folder fror storing uploaded files
    },
    filename: function(req,file,cb){
        cb(null,Date.now() + path.extname(file.originalname)); //unique filename
    },
});

//File filter to accept onlly images
const fileFilter = (req,file,cb) => {
    if(file.mimetype.startsWith("image/")){
        cb(null,true);
    }
    else{
        cb(new Error("Only images are allowed"),false);
    }
};

//init multer instance
const upload = multer({storage,fileFilter});

module.exports = upload;


// admin - admin@gmail.com admin@123
//  sirf mongodb m jakr isadmin ko true krna hota hai
