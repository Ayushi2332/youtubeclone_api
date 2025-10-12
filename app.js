const express = require('express');
const app = express();
const mongoose = require('mongoose');
require('dotenv').config();
const userRoute = require('../api/routes/user');
const videoRoute = require('../api/routes/video');
const commentRoute = require('../api/routes/comment');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const cors = require('cors');

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

app.use(cors())

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
