const express = require('express');
const Router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const User = require('../models/User');
const checkAuth = require('../middleware/checkAuth');


cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// ================= SIGNUP =================
Router.post('/signup', async (req, res) => {
  try {
    // check existing user
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // file check
    if (!req.files || !req.files.logo) {
      return res.status(400).json({ error: 'Logo image is required' });
    }

    // upload to cloudinary
    const uploadedImage = await cloudinary.uploader.upload(req.files.logo.tempFilePath);

    // password hash
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // create new user
    const newUser = new User({
      _id: new mongoose.Types.ObjectId(),
      channelName: req.body.channelName,
      email: req.body.email,
      phone: req.body.phone,
      password: hashedPassword,
      logoUrl: uploadedImage.secure_url,
      logoId: uploadedImage.public_id,
      subscribers: 0,
      subscribedBy: [],
      subscribedChannels: []
    });

    const savedUser = await newUser.save();
    res.status(200).json({ message: 'User created successfully', user: savedUser });
  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================= LOGIN =================
Router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).json({ error: 'Email not registered' });
    }

    const isValid = await bcrypt.compare(req.body.password, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // token create
    const token = jwt.sign(
      {
        _id: user._id,
        channelName: user.channelName,
        email: user.email,
        phone: user.phone,
        logoUrl: user.logoUrl,
      },
      process.env.JWT_SECRET || 'shivaayuu diaries 123',
      { expiresIn: '365d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        channelName: user.channelName,
        email: user.email,
        phone: user.phone,
        logoUrl: user.logoUrl,
        subscribers: user.subscribers,
        subscribedChannels: user.subscribedChannels || [],
      },
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================= SUBSCRIBE =================
Router.put('/subscribe/:userBId', checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const userA = jwt.verify(token, process.env.JWT_SECRET || 'shivaayuu diaries 123');
    const userB = await User.findById(req.params.userBId);

    if (!userB) return res.status(404).json({ error: 'User not found' });

    // prevent duplicates
    if (userB.subscribedBy.includes(userA._id)) {
      return res.status(400).json({ error: 'Already subscribed' });
    }

    userB.subscribers += 1;
    userB.subscribedBy.push(userA._id);
    await userB.save();

    const userAData = await User.findById(userA._id);
    userAData.subscribedChannels.push(userB._id);
    await userAData.save();

    res.status(200).json({ message: 'Subscribed successfully' });
  } catch (err) {
    console.error('Subscribe Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================= UNSUBSCRIBE =================
Router.put('/unsubscribe/:userBId', checkAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const userA = jwt.verify(token, process.env.JWT_SECRET || 'shivaayuu diaries 123');
    const userB = await User.findById(req.params.userBId);

    if (!userB) return res.status(404).json({ error: 'User not found' });

    if (!userB.subscribedBy.includes(userA._id)) {
      return res.status(400).json({ error: 'You are not subscribed' });
    }

    userB.subscribers -= 1;
    userB.subscribedBy = userB.subscribedBy.filter(id => id.toString() !== userA._id);
    await userB.save();

    const userAData = await User.findById(userA._id);
    userAData.subscribedChannels = userAData.subscribedChannels.filter(id => id.toString() !== userB._id);
    await userAData.save();

    res.status(200).json({ message: 'Unsubscribed successfully' });
  } catch (err) {
    console.error('Unsubscribe Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = Router;
