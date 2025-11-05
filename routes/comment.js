const express = require('express');
const Router = express.Router();
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const checkAuth = require('../middleware/checkAuth');
const jwt = require('jsonwebtoken');

/* -----------------------------------------
   ✅ ADD NEW COMMENT
------------------------------------------ */
Router.post('/new-comment/:videoId', checkAuth, async (req, res) => {
  try {
    console.log('🟢 Add Comment API called');

    // ✅ Token verify
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: 'Authorization token missing' });
    }

    const verifiedUser = jwt.verify(token, 'shivaayuu diaries 123');
    console.log('✅ Verified User:', verifiedUser);

    // ✅ Validation
    if (!req.body.commentText || req.body.commentText.trim() === "") {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    // ✅ Create new comment
    const newComment = new Comment({
      _id: new mongoose.Types.ObjectId(),
      user_id: verifiedUser._id,
      videoId: req.params.videoId,
      commentText: req.body.commentText.trim(),
    });

    const savedComment = await newComment.save();
    console.log('✅ Comment Saved:', savedComment);

    res.status(200).json({
      message: 'Comment added successfully!',
      newComment: savedComment
    });

  } catch (err) {
    console.error('❌ Add Comment Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------------------
   ✅ GET ALL COMMENTS FOR A VIDEO
------------------------------------------ */
Router.get('/:videoId', async (req, res) => {
  try {
    console.log('🟢 Fetching comments for video:', req.params.videoId);

    const comments = await Comment.find({ videoId: req.params.videoId })
      .sort({ createdAt: -1 })
      .populate('user_id', 'channelName email logoUrl'); 

    res.status(200).json({
      count: comments.length,
      comments: comments
    });

  } catch (err) {
    console.error('❌ Fetch Comments Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------------------
   ✅ UPDATE COMMENT
------------------------------------------ */
Router.put('/:commentId', checkAuth, async (req, res) => {
  try {
    console.log('🟡 Edit Comment API called');
    console.log('🧾 Incoming body:', req.body);

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: 'Authorization token missing' });
    }

    const verifiedUser = jwt.verify(token, 'shivaayuu diaries 123');

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // ✅ Allow only the comment owner to edit
    if (comment.user_id.toString() !== verifiedUser._id) {
      return res.status(403).json({ error: 'Not authorized to edit this comment' });
    }

    const newText = req.body.commentText?.trim();
    if (!newText) {
      return res.status(400).json({ error: 'Comment text cannot be empty' });
    }

    comment.commentText = newText;
    const updatedComment = await comment.save();

    console.log('✅ Comment Updated:', updatedComment);

    res.status(200).json({
      message: 'Comment updated successfully!',
      updatedComment
    });

  } catch (err) {
    console.error('❌ Update Comment Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------------------
   ✅ DELETE COMMENT
------------------------------------------ */
Router.delete('/:commentId', checkAuth, async (req, res) => {
  try {
    console.log('🗑️ Delete Comment API called');

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: 'Authorization token missing' });
    }

    const verifiedUser = jwt.verify(token, 'shivaayuu diaries 123');

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // ✅ Allow only owner to delete
    if (comment.user_id.toString() !== verifiedUser._id) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await Comment.deleteOne({ _id: req.params.commentId });
    console.log('Comment deleted successfully');

    res.status(200).json({
      message: 'Comment deleted successfully!'
    });

  } catch (err) {
    console.error('Delete Comment Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = Router;
