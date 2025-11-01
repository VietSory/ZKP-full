const { buildPoseidon } = require('circomlibjs');
const fs = require('fs');
const path = require('path');
const { nearestPowerOfTwo } = require('../circuit_renderer');

class CircomCompatibleMerkleTree {
	constructor(leaves) {
		this.leaves = leaves;
		this.layers = [];
		this.poseidon = null;
		this.F = null;
		this.timestamp = null;
		this.finalRoot = null;
	}

	async init() {
		this.poseidon = await buildPoseidon();
		this.F = this.poseidon.F;
		this.timestamp = Date.now(); // Tạo timestamp mới mỗi lần
		await this.buildTreeCircomStyle();
		await this.computeFinalRoot();
	}

	async initFromJSON(jsonData) {
		this.poseidon = await buildPoseidon();
		this.F = this.poseidon.F;
		this.leaves = jsonData.leaves;
		this.layers = jsonData.layers;
		this.timestamp = jsonData.timestamp;
		this.finalRoot = jsonData.finalRoot;
	}

	// Hash function giống hệt Circom
	hash(inputs) {
		const fieldInputs = inputs.map((input) => this.F.e(BigInt(input)));
		const result = this.poseidon(fieldInputs);
		return this.F.toString(result);
	}

	// Hash leaf giống Circom: Poseidon([uid, balance])
	hashLeaf(uid, balance) {
		return this.hash([BigInt(uid), BigInt(balance)]);
	}

	// Build tree theo style của Circom - pad đến power of 2 ngay từ đầu
	async buildTreeCircomStyle() {
		// Tìm nearest power of 2
		// const nearestPo2 = this.getNearestPowerOf2(this.leaves.length);
		const nearestPo2 = nearestPowerOfTwo(this.leaves.length);

		// Pad data đến power of 2 ngay từ đầu
		const paddedLeaves = [...this.leaves];
		while (paddedLeaves.length < nearestPo2) {
			paddedLeaves.push([0, 0]); // Pad với [0, 0]
		}

		// Tạo leaf layer đầu tiên
		let currentLayer = paddedLeaves.map(([uid, balance]) => ({
			hash: this.hashLeaf(uid, balance),
			uid: uid,
			balance: balance,
		}));

		this.layers.push(currentLayer);

		// Build các layer tiếp theo
		while (currentLayer.length > 1) {
			const newLayer = [];

			for (let i = 0; i < currentLayer.length; i += 2) {
				const left = currentLayer[i];
				const right = currentLayer[i + 1]; // Không cần check vì đã pad

				const combinedHash = this.hash([BigInt(left.hash), BigInt(right.hash)]);

				newLayer.push({
					hash: combinedHash,
					left: left,
					right: right,
				});
			}

			this.layers.push(newLayer);
			currentLayer = newLayer;
		}
	}

	// Helper: tìm nearest power of 2
	getNearestPowerOf2(n) {
		let power = 1;
		while (power < n) {
			power *= 2;
		}
		return power;
	}

	async computeFinalRoot() {
		const merkleRoot = this.getRoot();
		if (!merkleRoot || !this.timestamp) return null;

		this.finalRoot = this.hash([BigInt(merkleRoot), BigInt(this.timestamp)]);
		return this.finalRoot;
	}

	getRoot() {
		if (this.layers.length === 0) return null;
		return this.layers[this.layers.length - 1][0].hash;
	}

	// Get proof cho một UID từ stored data
	getProofFromStoredData(uid) {
		const leafLayer = this.layers[0];
		let nodeIndex = leafLayer.findIndex((node) => node.uid === uid);

		if (nodeIndex === -1) {
			return null;
		}

		const proof = [];
		const currentNode = leafLayer[nodeIndex];

		for (let layerIndex = 0; layerIndex < this.layers.length - 1; layerIndex++) {
			const currentLayer = this.layers[layerIndex];
			const isLeftNode = nodeIndex % 2 === 0;
			const siblingIndex = isLeftNode ? nodeIndex + 1 : nodeIndex - 1;

			if (siblingIndex < currentLayer.length) {
				proof.push({
					hash: currentLayer[siblingIndex].hash,
					position: isLeftNode ? 'right' : 'left',
				});
			}

			nodeIndex = Math.floor(nodeIndex / 2);
		}

		return {
			uid: uid,
			balance: currentNode.balance,
			leafHash: currentNode.hash,
			proof: proof,
			merkleRoot: this.getRoot(),
			timestamp: this.timestamp,
			finalRoot: this.finalRoot,
		};
	}

	// Export data
	exportToJSON() {
		return {
			merkleRoot: this.getRoot(),
			timestamp: this.timestamp.toString(),
			finalRoot: this.finalRoot,
			leaves: this.leaves,
			paddedSize: this.layers[0].length,
			layers: this.layers.map((layer) =>
				layer.map((node) => ({
					hash: node.hash,
					uid: node.uid,
					balance: node.balance,
				}))
			),
			hashFunction: 'poseidon',
		};
	}
}

/**
 * Hàm build tree từ input data
 * 
 * @param {[UID: number, balance: number][]} input 
 * @returns {Promise<{ finalHash: string, timestamp: string }>}
 */
async function buildMerkleTree(input) {
	const tree = new CircomCompatibleMerkleTree(input);
	await tree.init();

	// Lưu tree data vào file JSON
	const treeData = tree.exportToJSON();
	const filePath = path.join(__dirname, 'poseidon-merkle-tree-data.json');

	fs.writeFileSync(filePath, JSON.stringify(treeData, null, 2));
	console.log(`Poseidon Merkle tree data saved to: ${filePath}`);

	return {
		finalHash: tree.finalRoot,
		timestamp: tree.timestamp.toString(),
	};
}

// Hàm get proof từ UID
async function getMerkleProof(uid, treeDataPath = null) {
	let treeData;

	if (treeDataPath) {
		treeData = JSON.parse(fs.readFileSync(treeDataPath, 'utf8'));
	} else {
		const defaultPath = path.join(__dirname, 'poseidon-merkle-tree-data.json');
		treeData = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
	}

	const tree = new CircomCompatibleMerkleTree([]);
	await tree.initFromJSON(treeData);

	const proof = tree.getProofFromStoredData(uid);
	console.log(`Merkle proof created for user::${uid}:`, proof);

	return proof;
}

// Hàm đọc timestamp từ file JSON tree đã lưu
function getTreeInfo(treeDataPath = null) {
	try {
		let filePath;
		if (treeDataPath) {
			filePath = treeDataPath;
		} else {
			filePath = path.join(__dirname, 'poseidon-merkle-tree-data.json');
		}

		const treeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
		const timestamp = treeData.timestamp;
		const leaves = treeData.leaves;
		const finalHash = treeData.finalRoot;

		console.log(`Tree info from ${filePath}: Timestamp:${timestamp}; FinalHash: ${finalHash}; Leaves:`, leaves);
		return { timestamp, finalHash, leaves };
	} catch (error) {
		console.error('Error reading tree timestamp:', error.message);
		return null;
	}
}

// Helper function để convert UID to field element
function uidToFieldElement(uid) {
	if (typeof uid === 'string') {
		const bytes = Buffer.from(uid, 'utf8');
		let num = BigInt(0);
		for (let i = 0; i < bytes.length; i++) {
			num = (num << BigInt(8)) + BigInt(bytes[i]);
		}
		return num;
	} else {
		return BigInt(uid);
	}
}

// Export các hàm
module.exports = {
	buildMerkleTree,
	getMerkleProof,
	getTreeInfo,
	CircomCompatibleMerkleTree,
	uidToFieldElement,
};

// Ví dụ sử dụng
if (require.main === module) {
	console.log(getTreeInfo());
	// (async () => {
	// 	// Test data với number UIDs
	// 	const input = [
	// 		[101, 1000],
	// 		[102, 2500],
	// 		[103, 1500],
	// 		[104, 3000],
	// 	];

	// 	// Build tree
	// 	console.log('Building Poseidon Merkle Tree...');
	// 	const result = await buildMerkleTree(input);
	// 	console.log('Build result:', result);
	// 	console.log('Final hash:', result.finalHash);
	// 	console.log('Timestamp:', result.timestamp);

	// 	// Get timestamp từ file
	// 	console.log('\nGetting timestamp from saved tree...');
	// 	const savedTimestamp = getTreeInfo();

	// 	// Get proof cho UID 103
	// 	console.log('\nGetting proof for UID 103...');
	// 	const proof = await getMerkleProof(103);
	// })();
}
