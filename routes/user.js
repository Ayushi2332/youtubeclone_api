// routes/user.js
const express = require('express');
const Router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const User = require('../models/User');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY || process.env.API_KEY,
  api_secret: process.env.CLOUD_API_SECRET || process.env.API_SECRET,
});

// ---------- SIGNUP ----------
Router.post('/signup', async (req, res) => {
  try {
    // validate required fields
    const { channelName, email, phone, password } = req.body;
    if (!channelName || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // ensure logo file is present (using express-fileupload)
    if (!req.files || !req.files.logo) {
      return res.status(400).json({ error: 'Logo image is required' });
    }

    // check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // upload logo to cloudinary
    const uploadedImage = await cloudinary.uploader.upload(req.files.logo.tempFilePath, {
      folder: 'youtube_clone_users',
      resource_type: 'image',
    });

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const newUser = new User({
      _id: new mongoose.Types.ObjectId(),
      channelName,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      logoUrl: uploadedImage.secure_url,
      logoId: uploadedImage.public_id,
      subscribers: 0,
      subscribedBy: [],
      subscribedChannels: []
    });

    const saved = await newUser.save();

    // create token (do NOT include password)
    const token = jwt.sign({
      _id: saved._id,
      channelName: saved.channelName,
      email: saved.email
    }, process.env.JWT_SECRET || 'shivaayuu diaries 123', { expiresIn: '365d' });

    // return user data + token
    return res.status(201).json({
      message: 'Signup successful',
      token,
      user: {
        _id: saved._id,
        channelName: saved.channelName,
        email: saved.email,
        phone: saved.phone,
        logoUrl: saved.logoUrl,
        subscribers: saved.subscribers
      }
    });

  } catch (err) {
    console.error('Signup Error:', err);
    return res.status(500).json({ error: err.message || 'Server error during signup' });
  }
});

// ---------- LOGIN ----------
Router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ error: 'Email is not registered' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({
      _id: user._id,
      channelName: user.channelName,
      email: user.email
    }, process.env.JWT_SECRET || 'shivaayuu diaries 123', { expiresIn: '365d' });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        channelName: user.channelName,
        email: user.email,
        phone: user.phone,
        logoUrl: user.logoUrl,
        subscribers: user.subscribers
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ error: err.message || 'Server error during login' });
  }
});

module.exports = Router;
