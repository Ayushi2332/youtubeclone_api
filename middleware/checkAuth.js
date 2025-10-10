const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        // Check if authorization header exists
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'Authorization header missing' });
        }

        // Handle both 'Bearer <token>' and direct '<token>' formats
        const token = req.headers.authorization.startsWith('Bearer ')
            ? req.headers.authorization.split(' ')[1]
            : req.headers.authorization;

        if (!token) {
            return res.status(401).json({ error: 'Token missing' });
        }

        // Verify token
        const decoded = jwt.verify(token, 'shivaayuu diaries 123');
        req.user = decoded; // store user info for later use
        next();
    } catch (err) {
        console.error('JWT Error:', err.message);
        return res.status(401).json({
            error: 'Invalid or expired token'
        });
    }
};
