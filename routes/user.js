const express = require('express');
const User = require('../models/User'); // capitalized model
const Router = express.Router();
const bcrypt = require('bcrypt');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const checkAuth = require('../middleware/checkAuth');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// ================= SIGNUP =================
Router.post('/signup', async (req, res) => {
  try {
    const existingUsers = await User.find({ email: req.body.email });
    if (existingUsers.length > 0) {
      return res.status(500).json({ error: 'email already registered' });
    }

    const hashCode = await bcrypt.hash(req.body.password, 10);
    const uploadedImage = await cloudinary.uploader.upload(req.files.logo.tempFilePath);

    const newUser = new User({
      _id: new mongoose.Types.ObjectId(),
      channelName: req.body.channelName,
      email: req.body.email,
      phone: req.body.phone,
      password: hashCode,
      logoUrl: uploadedImage.secure_url,
      logoId: uploadedImage.public_id,
      subscribers: 0, // number of subscribers
      subscribedBy: [], // users who subscribed to this user
      subscribedChannels: [] // channels this user subscribed to
    });

    const savedUser = await newUser.save();
    res.status(200).json({ newUser: savedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ================= LOGIN =================
Router.post('/login', async (req, res) => {
  try {
    const users = await User.find({ email: req.body.email });
    if (users.length === 0) {
      return res.status(500).json({ error: 'email is not registered...' });
    }

    const isValid = await bcrypt.compare(req.body.password, users[0].password);
    if (!isValid) {
      return res.status(500).json({ error: 'invalid password' });
    }

    const token = jwt.sign(
      {
        _id: users[0]._id,
        channelName: users[0].channelName,
        email: users[0].email,
        phone: users[0].phone,
        logoId: users[0].logoId,
      },
      'shivaayuu diaries 123',
      { expiresIn: '365d' }
    );

    res.status(200).json({
      _id: users[0]._id,
      channelName: users[0].channelName,
      email: users[0].email,
      phone: users[0].phone,
      logoId: users[0].logoId,
      logoUrl: users[0].logoUrl,
      token: token,
      subscribers: users[0].subscribers,
      subscribedChannels: Array.isArray(users[0].subscribedChannels) ? users[0].subscribedChannels : [],
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'something is wrong' });
  }
});

// ================= SUBSCRIBE / UNSUBSCRIBE =================
Router.put('/subscribe/:userBId', checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const userA = jwt.verify(token, 'shivaayuu diaries 123');

    console.log(userA);

    const userB = await User.findById(req.params.userBId);
    console.log(userB);

    if (!userB) return res.status(404).json({ error: 'User B not found' });

    // ---------------- Ensure arrays ----------------
    userB.subscribedBy = Array.isArray(userB.subscribedBy) ? userB.subscribedBy : [];
    const userAData = await User.findById(userA._id);
    userAData.subscribedChannels = Array.isArray(userAData.subscribedChannels) ? userAData.subscribedChannels : [];

    // ---------------- Already subscribed? ----------------
    if (userB.subscribedBy.includes(userA._id)) {
      return res.status(500).json({ error: 'already subscribed...' });
    }

    // ---------------- Subscribe ----------------
    userB.subscribers = typeof userB.subscribers === 'number' ? userB.subscribers + 1 : 1;
    userB.subscribedBy.push(userA._id);
    await userB.save();

    userAData.subscribedChannels.push(userB._id);
    await userAData.save();

    console.log('subscribed..'); // terminal message

    res.status(200).json({ msg: 'subscribed...' });

  } catch (err) {
    console.error('Subscribe Error:', err);
    res.status(500).json({ error: err.message });
  }
});

//unsubscribe api
Router.put('/unsubscribe/:userBId', checkAuth, async (req, res) => {
  try {
    const userA = await jwt.verify(req.headers.authorization.split(" ")[1], 'shivaayuu diaries 123')
    const userB = await User.findById(req.params.userBId)
    console.log(userA)
    console.log(userB)
    if (userB.subscribedBy.includes(userA._id)) {
      //unsubscribe logic
      userB.subscribers -= 1
      userB.subscribedBy = userB.subscribedBy.filter(userId => userId.tostring() != userA._id)
      await userB.save()
      const userAFullInformation = await User.findById(userA._id)
      userAFullInformation.subscribedChannels = userAFullInformation.subscribedChannels.filter(userId => userId.tostring() != userB._id)
      await userAFullInformation.save()

      res.status(200).json({
        msg:'unsubscribed...'
      })
    }
    else {
      return res.status(500).json({
        error: 'you have not subscribed..'
      })
    }
  }
  catch (err) {

  }

})

module.exports = Router;
