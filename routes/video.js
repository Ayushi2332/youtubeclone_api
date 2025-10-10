const express = require('express');
const Router = express.Router();
const cloudinary = require('cloudinary').v2;
const checkAuth = require('../middleware/checkAuth');
const Video = require('../models/Video');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.CLOUD_SECRET,
});

// ---------------- UPLOAD VIDEO ----------------
Router.post('/upload', checkAuth, async (req, res) => {
    try {
        if (!req.files || !req.files.video || !req.files.thumbnail) {
            return res.status(400).json({ error: "Video and thumbnail are required" });
        }

        if (!req.body.title || !req.body.description) {
            return res.status(400).json({ error: "Title and description are required" });
        }

        const uploadedVideo = await cloudinary.uploader.upload(
            req.files.video.tempFilePath,
            { resource_type: 'video', timeout: 120000 }
        );

        const uploadedThumbnail = await cloudinary.uploader.upload(
            req.files.thumbnail.tempFilePath,
            { resource_type: 'image', timeout: 120000 }
        );

        const tagsArray = req.body.tags
            ? req.body.tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0)
            : [];

        const newVideo = new Video({
            _id: new mongoose.Types.ObjectId(),
            title: req.body.title,
            description: req.body.description,
            user_id: req.user._id,
            videoUrl: uploadedVideo.secure_url,
            videoId: uploadedVideo.public_id,
            thumbnailUrl: uploadedThumbnail.secure_url,
            thumbnailId: uploadedThumbnail.public_id,
            category: req.body.category || "Uncategorized",
            tags: tagsArray,
            likes: 0,
            dislikes: 0,
            likedBy: [],
            dislikedBy: [],
            viewedBy: [],
            views: 0
        });

        const savedVideo = await newVideo.save();
        res.status(200).json({ message: "Upload successful", savedVideo });

    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ---------------- UPDATE VIDEO ----------------
Router.put('/:videoId', checkAuth, async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const verifiedUser = jwt.verify(token, 'shivaayuu diaries 123');

        const video = await Video.findById(req.params.videoId);
        if (!video) return res.status(404).json({ error: "Video not found" });

        if (video.user_id.toString() !== verifiedUser._id.toString()) {
            return res.status(403).json({ error: "You are not allowed to update this video" });
        }

        if (!req.body.title || !req.body.description) {
            return res.status(400).json({ error: "Title and description are required" });
        }

        const updatedData = {
            title: req.body.title,
            description: req.body.description,
            category: req.body.category || video.category,
            tags: req.body.tags
                ? req.body.tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0)
                : video.tags
        };

        if (req.files && req.files.thumbnail) {
            await cloudinary.uploader.destroy(video.thumbnailId);
            const updatedThumbnail = await cloudinary.uploader.upload(
                req.files.thumbnail.tempFilePath,
                { resource_type: 'image' }
            );
            updatedData.thumbnailUrl = updatedThumbnail.secure_url;
            updatedData.thumbnailId = updatedThumbnail.public_id;
        }

        const updatedVideo = await Video.findByIdAndUpdate(req.params.videoId, { $set: updatedData }, { new: true });
        res.status(200).json({ message: "Video updated successfully", updatedVideo });

    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ---------------- DELETE VIDEO ----------------
Router.delete('/:videoId', checkAuth, async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const verifiedUser = jwt.verify(token, 'shivaayuu diaries 123');

        const video = await Video.findById(req.params.videoId);
        if (!video) return res.status(404).json({ error: "Video not found" });

        if (video.user_id.toString() !== verifiedUser._id.toString()) {
            return res.status(403).json({ error: "You are not allowed to delete this video" });
        }

        await cloudinary.uploader.destroy(video.videoId, { resource_type: 'video' });
        await cloudinary.uploader.destroy(video.thumbnailId, { resource_type: 'image' });

        const deletedVideo = await Video.findByIdAndDelete(req.params.videoId);
        res.status(200).json({ message: "Video deleted successfully", deletedVideo });

    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ---------------- LIKE VIDEO ----------------
Router.put('/like/:videoId', checkAuth, async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const verifiedUser = jwt.verify(token, 'shivaayuu diaries 123');

        const video = await Video.findById(req.params.videoId);
        if (!video) return res.status(404).json({ error: "Video not found" });

        video.likes = video.likes || 0;
        video.dislikes = video.dislikes || 0;
        video.likedBy = Array.isArray(video.likedBy) ? video.likedBy : [];
        video.dislikedBy = Array.isArray(video.dislikedBy) ? video.dislikedBy : [];

        if (video.likedBy.includes(verifiedUser._id.toString())) {
            return res.status(400).json({ error: "Already liked" });
        }

        // Remove dislike if exists
        if (video.dislikedBy.includes(verifiedUser._id.toString())) {
            video.dislikes -= 1;
            video.dislikedBy = video.dislikedBy.filter(id => id.toString() !== verifiedUser._id.toString());
        }

        video.likes += 1;
        video.likedBy.push(verifiedUser._id);
        await video.save();

        res.status(200).json({
            message: "Video liked successfully",
            likes: video.likes,
            likedBy: video.likedBy,
            dislikes: video.dislikes,
            dislikedBy: video.dislikedBy
        });

    } catch (err) {
        console.error("Like Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ---------------- DISLIKE VIDEO ----------------
Router.put('/dislike/:videoId', checkAuth, async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const verifiedUser = jwt.verify(token, 'shivaayuu diaries 123');

        const video = await Video.findById(req.params.videoId);
        if (!video) return res.status(404).json({ error: "Video not found" });

        video.likes = video.likes || 0;
        video.dislikes = video.dislikes || 0;
        video.likedBy = Array.isArray(video.likedBy) ? video.likedBy : [];
        video.dislikedBy = Array.isArray(video.dislikedBy) ? video.dislikedBy : [];

        if (video.dislikedBy.includes(verifiedUser._id.toString())) {
            return res.status(400).json({ error: "Already disliked" });
        }

        // Remove like if exists
        if (video.likedBy.includes(verifiedUser._id.toString())) {
            video.likes -= 1;
            video.likedBy = video.likedBy.filter(id => id.toString() !== verifiedUser._id.toString());
        }

        video.dislikes += 1;
        video.dislikedBy.push(verifiedUser._id);
        await video.save();

        res.status(200).json({
            message: "Video disliked successfully",
            likes: video.likes,
            likedBy: video.likedBy,
            dislikes: video.dislikes,
            dislikedBy: video.dislikedBy
        });

    } catch (err) {
        console.error("Dislike Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ---------------- VIEWS ----------------
Router.put('/views/:videoId', async (req, res) => {
    try {
        const video = await Video.findById(req.params.videoId);
        if (!video) return res.status(404).json({ error: "Video not found" });

        video.views = video.views || 0;
        video.views += 1;

        await video.save();
        res.status(200).json({ msg: 'good to go...' });

    } catch (err) {
        console.error("Views Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = Router;
