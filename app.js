const express = require('express');
const app = express();
const mongoose = require('mongoose');
require('dotenv').config();
const userRoute = require('./routes/user');
const videoRoute = require('./routes/video');
const commentRoute = require('./routes/comment');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const cloudinary = require('cloudinary').v2; 
/* -----------------------------------------
   ✅ CLOUDINARY CONFIGURATION 
------------------------------------------ */
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

console.log("✅ Cloudinary configured successfully");


/* -----------------------------------------
   ✅ CONNECT DATABASE
------------------------------------------ */
const connectWithDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected with MongoDB Database');
  } catch (err) {
    console.error('❌ Database Connection Error:', err);
  }
};
connectWithDatabase();

app.use(cors());


/* -----------------------------------------
   ✅ MIDDLEWARE
------------------------------------------ */
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  createParentPath: true
}));

/* -----------------------------------------
   ✅ ROUTES
------------------------------------------ */
app.use('/user', userRoute);
app.use('/video', videoRoute);
app.use('/comment', commentRoute);

console.log("✅ Routes Mounted Successfully");

/* -----------------------------------------
   ✅ EXPORT APP
------------------------------------------ */
module.exports = app;
