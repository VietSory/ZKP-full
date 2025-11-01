const db = require('../../database');
const express = require('express');
const { requireLogin } = require('../middleware');
const router = express.Router();

// GET /transactions
router.get('/', requireLogin, async (req, res) => {
	try {
		const transactions = await db.getTransactionHistory(req.session.UID);
		res.json(transactions);
	} catch (error) {
		console.error('Error fetching transactions:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// POST /transactions
router.post('/', requireLogin, async (req, res) => {
	try {
		const { toUID, amount } = req.body;
		if (toUID === req.session.UID) return res.status(400).json({ error: 'Cannot transfer money to myself' });
		if (!toUID || !amount) {
			return res.status(400).json({ error: 'toUID and amount are required' });
		}

		if (amount <= 0) {
			return res.status(400).json({ error: 'Số tiền không hợp lệ!' });
		}

		const currentBalance = await db.getBalanceOf(req.session.UID);

		if (currentBalance < amount) {
			return res.status(400).json({ error: 'Số dư không đủ!' });
		}

		const success = await db.transfer(req.session.UID, toUID, amount);

		if (success) {
			res.json({ message: 'Chuyển thành công!' });
		} else {
			res.status(400).json({ error: 'Người dùng chuyển đến không tồn tại!' });
		}
	} catch (error) {
		console.error('Error creating transaction:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;
