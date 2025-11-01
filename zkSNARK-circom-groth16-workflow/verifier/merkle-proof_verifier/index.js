const fs = require('fs');
const path = require('path');
const circomlibjs = require('circomlibjs');

const inputPath = path.join(__dirname, 'input.json');
const rawData = fs.readFileSync(inputPath, 'utf8');
const data = JSON.parse(rawData);

(async () => {
	const poseidon = await circomlibjs.buildPoseidon();
	const F = poseidon.F;

	// Step 0: Verify leafHash = Poseidon(uid, balance)
	const uidBigInt = BigInt(data.uid);
	const balanceBigInt = BigInt(data.balance);

	const computedLeafHash = F.toString(poseidon([uidBigInt, balanceBigInt]));
	const expectedLeafHash = BigInt(data.leafHash).toString();

	if (computedLeafHash !== expectedLeafHash) {
		throw new Error(`Leaf hash mismatch!\nExpected: ${expectedLeafHash}\nGot     : ${computedLeafHash}`);
	} else {
		console.log('Leaf hash is valid (uid + balance).');
	}

	// Step 1: Verify Merkle Proof
	let hash = BigInt(data.leafHash);

	for (const p of data.proof) {
		const sibling = BigInt(p.hash);

		if (p.position === 'left') {
			hash = poseidon([sibling, hash]);
		} else if (p.position === 'right') {
			hash = poseidon([hash, sibling]);
		} else {
			throw new Error(`Unknown position: ${p.position}`);
		}
	}

	const calculatedRoot = F.toString(hash);
	const expectedRoot = BigInt(data.merkleRoot).toString();

	if (calculatedRoot !== expectedRoot) {
		throw new Error(`Merkle root mismatch!\nExpected: ${expectedRoot}\nGot     : ${calculatedRoot}`);
	} else {
		console.log('Merkle proof is valid.');
	}

	// Step 2: Verify finalRoot = Poseidon(merkleRoot, timestamp)
	const merkleRootBigInt = BigInt(data.merkleRoot);
	const timestampBigInt = BigInt(data.timestamp);

	const computedFinalRoot = F.toString(poseidon([merkleRootBigInt, timestampBigInt]));
	const expectedFinalRoot = BigInt(data.finalRoot).toString();

	if (computedFinalRoot !== expectedFinalRoot) {
		throw new Error(`Final root mismatch!\nExpected: ${expectedFinalRoot}\nGot     : ${computedFinalRoot}`);
	} else {
		console.log('Final root is valid.');
	}
})();
