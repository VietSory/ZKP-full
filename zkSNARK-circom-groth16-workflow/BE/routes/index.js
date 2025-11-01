const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const transactionRoutes = require('./transactionRoutes');
const depositRoutes = require('./depositRoutes');
const withdrawRoutes = require('./withdrawRoutes');
const { getMerkleProof } = require('../../merkle_tree');

router.use('/auth', authRoutes);
router.use('/transactions', transactionRoutes);
router.use('/deposits', depositRoutes);
router.use('/withdraws', withdrawRoutes);

// Merkle proof phải ở đây (sau auth), vì chỉ người dùng trong sàn mới có, người ngoài thì k
router.get('/merkle-proof', async (req, res) => {
	const UID = req.session.UID;
	if (!UID) {
		res.json({ message: 'User không tồn tại' });
		return;
	}

	const proof = await getMerkleProof(UID);
	res.json(proof);
});

// Export the router
module.exports = router;
