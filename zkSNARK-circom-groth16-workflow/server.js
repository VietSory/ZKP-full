const express = require('express');
const app = express();
const routes = require('./BE/routes/index');
const cors = require('cors');
const session = require('express-session');
const DepositProcessor = require('./BE/services/depositProcessor');
const { getAllUsersForProof, genProof } = require('./gen_proof');
const { buildMerkleTree, getTreeInfo } = require('./merkle_tree');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
	cors({
		origin: 'http://localhost:8081',
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	})
);
app.use(
	session({
		secret: 'zkp-secret',
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			secure: false,
			sameSite: 'lax',
			maxAge: 1000 * 60 * 60,
		},
	})
);

app.get('/', (req, res) => {
	res.send('Welcome to the API!');
});

// Routes
app.use('/', routes);
app.get('/proof-metadata', (_req, res) => {
	try {
		const proofMetadata = getTreeInfo();
		if (!proofMetadata) throw new Error();
		const { finalHash, leaves, timestamp } = proofMetadata;
		res.json({
			timestamp,
			expectedDebtSum: leaves.reduce((sum, [_uid, balance]) => sum + balance, 0),
			finalHash,
		});
	} catch (error) {
		res.json({ message: 'Bằng chứng đang được tạo, hãy kiểm tra lại sau' });
	}
});

const path = require('path');
const fs = require('fs');
app.get('/zk-proof/:name', (req, res) => {
	const filename = req.params.name;
	const filePath = path.join(__dirname, 'circuits', 'prove_PoR', 'output', filename);

	if (!fs.existsSync(filePath)) {
		return res.json({ message: 'Bằng chứng đang được tạo, hãy kiểm tra lại sau' });
	}

	res.download(filePath, filename, (err) => {
		if (err) {
			console.error('Download error:', err);
			res.status(500).json({ message: 'Lỗi khi tải file', error: err.message });
		}
	});
});

// Error handling
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).send('Something broke!');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);

	// Start deposit processor
	const depositProcessor = new DepositProcessor();
	depositProcessor.start();

	// Interval sinh bằng chứng
	// Trong thực tế triển khai thì có thể quy định thêm ngưỡng giao dịch để cập nhật (Cứ mỗi 100 giao dịch thì cập nhật)
	// Tối ưu interval, nếu check trong khoảng vừa rồi không có giao dịch thì không sinh bằng chứng
	setInterval(async () => {
		getAllUsersForProof()
			.then((users) => {
				buildMerkleTree(users).then((result) => {
					console.log('Build merkle tree result', result);
					genProof(users, result.finalHash, result.timestamp, './circuits/prove_PoR');
				});
			})
			.catch((e) => console.log(e));
	}, 1000 * 60 * 60 * 6);
});
