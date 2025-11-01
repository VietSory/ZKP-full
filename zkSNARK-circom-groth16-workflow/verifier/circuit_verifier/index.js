/**
 * Tool xác minh verification_key.json có đúng với circuit.circom không
 *
 * Yêu cầu:
 *   - Node.js 18+
 *   - snarkjs CLI cài toàn cục: npm i -g snarkjs
 *   - circom CLI trong PATH
 *
 * Cách chạy:
 *   node index.js ./circuit.circom ./circuit_final.zkey ./verification_key.json
 *
 * Options:
 *   --keep-temp  Giữ lại thư mục tmp sau khi chạy xong
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function removeDirectory(dirPath) {
	try {
		if (fs.existsSync(dirPath)) {
			console.log(`Đang xóa thư mục tạm: ${dirPath}`);
			fs.rmSync(dirPath, { recursive: true, force: true });
			console.log('Đã xóa thư mục tạm thành công');
		}
	} catch (error) {
		console.warn(`Không thể xóa thư mục tạm: ${error.message}`);
	}
}

function main() {
	const args = process.argv.slice(2);
	const keepTemp = args.includes('--keep-temp');

	// Lọc bỏ flag options khỏi args
	const filteredArgs = args.filter((arg) => !arg.startsWith('--'));
	const [circuitPath, zkeyPath, vkPath] = filteredArgs;

	if (!circuitPath || !zkeyPath || !vkPath) {
		console.error('Usage: node index.js <circuit.circom> <circuit_final.zkey> <verification_key.json> [--keep-temp]');
		process.exit(1);
	}

	// tạo output folder tuyệt đối trong cùng thư mục script
	const outDir = path.resolve(__dirname, 'tmp');

	try {
		if (!fs.existsSync(outDir)) {
			fs.mkdirSync(outDir, { recursive: true });
		}

		// Bước 1: compile circuit ra .r1cs
		console.log('Compiling circuit...');
		execSync(`circom ${circuitPath} --r1cs --wasm --sym -o ${outDir}`, { stdio: 'inherit' });

		// Bước 2: export verification key từ zkey bằng snarkjs
		console.log('Exporting verification key from zkey...');
		const vkGenPath = path.join(outDir, 'vk_generated.json');
		execSync(`snarkjs zkey export verificationkey ${zkeyPath} ${vkGenPath}`, { stdio: 'inherit' });

		// Bước 3: đọc cả 2 file vk
		const vkGenerated = fs.readFileSync(vkGenPath, 'utf8');
		const vkPublished = fs.readFileSync(vkPath, 'utf8');

		// Bước 4: so sánh
		if (vkGenerated === vkPublished) {
			console.log('\n[PASS] verification_key.json KHỚP với circuit + zkey\n');
		} else {
			console.error('\n[FAIL] verification_key.json KHÔNG khớp\n');
			console.log('Generated vk:', vkGenerated);
			console.log('Published vk:', vkPublished);
		}
	} catch (error) {
		console.error('Lỗi khi thực thi:', error.message);
		process.exit(1);
	} finally {
		// Dọn dẹp files tạm thời (trừ khi có flag --keep-temp)
		if (!keepTemp) removeDirectory(outDir);
	}
}

// Đảm bảo dọn dẹp ngay cả khi bị interrupt
process.on('SIGINT', () => {
	console.log('\nNhận tín hiệu dừng, đang dọn dẹp...');
	const outDir = path.resolve(__dirname, 'tmp');
	removeDirectory(outDir);
	process.exit(0);
});

process.on('SIGTERM', () => {
	console.log('\nNhận tín hiệu terminate, đang dọn dẹp...');
	const outDir = path.resolve(__dirname, 'tmp');
	removeDirectory(outDir);
	process.exit(0);
});

main();
