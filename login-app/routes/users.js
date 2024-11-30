const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        let user = new User({ username, password });
        await user.save();
        res.status(201).send('User registered');
    } catch (error) {
        res.status(400).send(error);
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).send('Invalid credentials');

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).send('Invalid credentials');

        const token = jwt.sign({ id: user._id }, 'secretkey', { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).send(error);
    }
});

router.put('/update', async (req, res) => {
    const { username, newUsername, newPassword } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).send('User not found');

        if (newUsername) user.username = newUsername;
        if (newPassword) user.password = newPassword;

        await user.save();
        res.send('User updated');
    } catch (error) {
        res.status(500).send(error);
    }
});

router.delete('/delete', async (req, res) => {
    const { username } = req.body;
    try {
        const user = await User.findOneAndDelete({ username });
        if (!user) return res.status(404).send('User not found');

        res.send('User deleted');
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;
