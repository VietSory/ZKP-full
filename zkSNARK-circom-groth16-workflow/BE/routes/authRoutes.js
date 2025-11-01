const db = require('../../database');
const express = require('express');
const { requireLogin } = require('../middleware');
const router = express.Router();

// POST /login
router.post('/login', async (req, res) => {
	try {
		const { username, password } = req.body;

		if (!username || !password) {
			return res.status(400).json({
				error: 'Username and password are required',
			});
		}

		const UID = await db.login(username, password);

		if (UID) {
			req.session.UID = UID;
			res.json({ redirect: '/' });
		} else {
			res.status(401).json({ error: 'Tên hoặc password sai' });
		}
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// GET /user
router.get('/user', requireLogin, async (req, res) => {
	try {
		const userInfo = await db.getUserInfo(req.session.UID);
		res.json(userInfo);
	} catch (error) {
		console.error('Error fetching user:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// POST /signup
router.post('/signup', async (req, res) => {
	try {
		const { username, password, walletAddress } = req.body;

		if (!username || !password || !walletAddress) {
			return res.status(400).json({
				error: 'All fields are required: username, password and wallet address',
			});
		}

		const success = await db.register(username, password, walletAddress);

		if (success) {
			const UID = await db.login(username, password);
			req.session.UID = UID;
			res.json({ redirect: '/' });
		} else {
			res.status(409).json({ error: 'Username đã tồn tại' });
		}
	} catch (error) {
		console.error('Registration error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

router.get('/user/uid', requireLogin, async (req, res) => {
	try {
		res.json({ uid: req.session.UID });
	} catch (error) {
		console.error('Error fetching UID:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// GET /logout
router.get('/logout', (req, res) => {
	try {
		req.session.destroy((err) => {
			if (err) {
				console.error('Logout error:', err);
				return res.status(500).json({ error: 'Internal server error' });
			}
			res.json({ redirect: '/login' });
		});
	} catch (error) {
		console.error('Logout error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;
