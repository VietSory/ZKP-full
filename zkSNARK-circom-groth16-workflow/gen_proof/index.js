const { Worker } = require('worker_threads');
const path = require('path');
const { readData } = require('../database');
const { buildMerkleTree } = require('../merkle_tree');

/**
 * Lấy tất cả users từ database và convert về format [UID, balance]
 * @returns {Promise<[UID: number, balance: number][]>} - Mảng các cặp [UID, balance]
 */
async function getAllUsersForProof() {
	try {
		const users = await readData('users.json');
		return users.map((user) => [user.uid, user.balance]);
	} catch (error) {
		throw new Error(`Lỗi khi lấy dữ liệu users: ${error.message}`);
	}
}

/**
 * Tạo proof cho dữ liệu đầu vào sử dụng worker thread
 *
 * @param {Array<Array<number>>} input - Mảng các cặp [UID, balance]
 * @param {string} finalHash - Final hash từ kết quả chạy tạo Merkle tree
 * @param {string} timestamp - Timestamp từ kết quả chạy tạo Merkle tree
 * @param {string} circuitPath - Đường dẫn đến circuit file
 * @returns {Promise<any>} - Kết quả từ ZK-SNARK workflow
 */
function genProof(input, finalHash, timestamp, circuitPath) {
	return new Promise((resolve, reject) => {
		// Validate input
		if (!Array.isArray(input) || input.length === 0) {
			reject(new Error('Input phải là một mảng không rỗng'));
			return;
		}

		// Validate input structure
		for (let i = 0; i < input.length; i++) {
			const item = input[i];
			if (!Array.isArray(item) || item.length !== 2 || typeof item[0] !== 'number' || typeof item[1] !== 'number') {
				reject(new Error(`Item tại index ${i} phải có cấu trúc [UID, balance]`));
				return;
			}
		}

		if (!circuitPath || typeof circuitPath !== 'string') {
			reject(new Error('circuitPath phải là một string hợp lệ'));
			return;
		}

		// Tạo worker thread với absolute path
		const workerPath = path.resolve(__dirname, 'worker.js');
		console.log('Worker path:', workerPath); // Debug log

		// Kiểm tra file tồn tại
		const fs = require('fs');
		if (!fs.existsSync(workerPath)) {
			reject(new Error(`Worker file không tồn tại: ${workerPath}`));
			return;
		}

		const worker = new Worker(workerPath, {
			workerData: {
				input,
				finalHash,
				timestamp,
				circuitPath,
			},
		});

		// Lắng nghe message từ worker
		worker.on('message', (result) => {
			resolve(result);
		});

		// Xử lý lỗi từ worker
		worker.on('error', (error) => {
			reject(error);
		});

		// Xử lý khi worker exit
		worker.on('exit', (code) => {
			if (code !== 0) {
				reject(new Error(`Worker thread dừng với exit code ${code}`));
			}
		});
	});
}

module.exports = { genProof, getAllUsersForProof };

// Test
if (require.main === module) {
	// Build Merkle tree

	getAllUsersForProof()
		.then((users) => {
			buildMerkleTree(users).then((result) => {
				console.log('Build merkle tree result', result);
				genProof(users, result.finalHash, result.timestamp, './circuits/prove_PoR');
			});
		})
		.catch((e) => console.log(e));
}
