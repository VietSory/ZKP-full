const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Thư mục gốc của project (process.cwd())
const PROJECT_ROOT = process.cwd();

/**
 * Resolve đường dẫn từ process.cwd() hoặc absolute path
 * @param {string} inputPath - Đường dẫn input từ user
 * @returns {string} - Absolute path đã được resolve
 */
function resolveCircuitPath(inputPath) {
	// Nếu là absolute path, dùng luôn
	if (path.isAbsolute(inputPath)) {
		return inputPath;
	}

	// Nếu là relative path, resolve từ process.cwd()
	return path.resolve(PROJECT_ROOT, inputPath);
}

/**
 * Thêm dấu ngoặc kép cho đường dẫn để tránh lỗi với space trong tên file/folder
 * @param {string} p - Đường dẫn cần quote
 * @returns {string} - Đường dẫn đã được quote
 */
function quote(p) {
	return `"${p}"`;
}

/**
 * Thực thi command line và hiển thị output
 * @param {string} cmd - Command cần thực thi
 * @param {string} workingDir - Thư mục làm việc (default: PROJECT_ROOT)
 */
function run(cmd, workingDir = PROJECT_ROOT) {
	console.log('> [Execute]:', cmd);
	console.log('> [WorkDir]:', workingDir);
	try {
		execSync(cmd, { stdio: 'inherit', shell: true, cwd: workingDir });
	} catch (error) {
		console.error('> [Error] Command failed:', cmd);
		throw error;
	}
}

/**
 * Lấy số constraints thực tế từ file .r1cs
 * @param {string} r1csPath - Đường dẫn file .r1cs
 * @returns {number} - Số constraints thực tế
 */
function getActualConstraintCount(r1csPath) {
	try {
		// Sử dụng snarkjs để đọc thông tin từ r1cs
		const output = execSync(`npx snarkjs r1cs info ${quote(r1csPath)}`, {
			encoding: 'utf8',
			stdio: 'pipe',
		});

		// Parse output để lấy số constraints
		const constraintMatch = output.match(/# of constraints:\s*(\d+)/i);
		if (constraintMatch) {
			return parseInt(constraintMatch[1]);
		}

		console.log('> [Warning] Could not parse constraint count from r1cs info');
		return 0;
	} catch (error) {
		console.log('> [Warning] Could not get actual constraint count:', error.message);
		return 0;
	}
}

/**
 * Ước tính số constraints cần thiết từ file .circom
 * @param {string} circomPath - Đường dẫn file .circom
 * @returns {number} - Power of 2 cần thiết (10, 15, 20, etc.)
 */
function estimateConstraints(circomPath) {
	try {
		const content = fs.readFileSync(circomPath, 'utf8');

		// Đếm các thành phần quan trọng
		const poseidonCount = (content.match(/Poseidon\s*\(/g) || []).length;
		const sha256Count = (content.match(/Sha256\s*\(/g) || []).length;
		const componentCount = (content.match(/component\s+\w+/g) || []).length;
		const templateCount = (content.match(/template\s+\w+/g) || []).length;
		const signalCount = (content.match(/signal\s+(input|output|private)?\s*\w+/g) || []).length;

		// Ước tính constraints theo từng loại (dựa trên thực tế)
		let estimatedConstraints = 0;

		// Poseidon hash rất tốn constraints
		estimatedConstraints += poseidonCount * 1200; // ~1200 constraints per Poseidon

		// SHA256 cũng tốn nhiều
		estimatedConstraints += sha256Count * 25000; // ~25k constraints per SHA256

		// Các component khác
		estimatedConstraints += componentCount * 50;
		estimatedConstraints += templateCount * 100;
		estimatedConstraints += signalCount * 10;

		// Minimum baseline
		estimatedConstraints = Math.max(estimatedConstraints, 1000);

		// Thêm buffer 50% để đảm bảo
		estimatedConstraints = Math.ceil(estimatedConstraints * 1.5);

		// Tìm power of 2 phù hợp
		let power = 10; // 2^10 = 1024
		while (1 << power < estimatedConstraints && power < 25) {
			power++;
		}

		console.log(`> [Info] Circuit analysis:`);
		console.log(`>   - Poseidon hashers: ${poseidonCount}`);
		console.log(`>   - SHA256 hashers: ${sha256Count}`);
		console.log(`>   - Total components: ${componentCount}`);
		console.log(`> [Info] Estimated constraints: ${estimatedConstraints}`);
		console.log(`> [Info] Using powers of tau: 2^${power} = ${1 << power}`);

		return power;
	} catch (error) {
		console.log('> [Warning] Could not estimate constraints, using default 2^15');
		return 15; // Default to 2^15 = 32768 for safety
	}
}

/**
 * Download ptau file từ Hermez nếu chưa có
 * @param {number} power - Power of 2
 * @param {string} ptauDir - Thư mục chứa ptau files
 * @returns {string} - Đường dẫn file ptau đã download
 */
function downloadHermezPtau(power, ptauDir) {
	const ptauFile = path.join(ptauDir, `powersOfTau28_hez_final_${power.toString().padStart(2, '0')}.ptau`);

	if (fs.existsSync(ptauFile)) {
		console.log(`> [Info] Hermez ptau file already exists (2^${power})`);
		return ptauFile;
	}

	console.log(`> [Info] Downloading Hermez ptau file for 2^${power} constraints...`);
	// https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_08.ptau
	const url = `https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_${power
		.toString()
		.padStart(2, '0')}.ptau`;

	try {
		// Sử dụng curl hoặc wget để download
		const downloadCmd =
			process.platform === 'win32' ? `curl -L "${url}" -o ${quote(ptauFile)}` : `wget "${url}" -O ${quote(ptauFile)}`;

		console.log(`> [Info] Downloading from: ${url}`);
		run(downloadCmd);

		if (fs.existsSync(ptauFile)) {
			const fileSize = (fs.statSync(ptauFile).size / (1024 * 1024)).toFixed(2);
			console.log(`> [Success] Downloaded ptau file (${fileSize} MB)`);
			return ptauFile;
		} else {
			throw new Error('Download failed - file not found after download');
		}
	} catch (error) {
		console.log(`> [Warning] Failed to download Hermez ptau: ${error.message}`);
		console.log('> [Info] Falling back to generating ptau locally...');
		return null;
	}
}

/**
 * Kiểm tra và chuẩn bị Powers of Tau ceremony
 * @param {number} power - Power of 2 (default: 15 for 2^15 constraints)
 */
function ensurePtau(power = 15) {
	console.log(`> [Info] Preparing Powers of Tau setup (2^${power})...`);

	const ptauDir = path.join(__dirname, 'powers_of_tau');
	if (!fs.existsSync(ptauDir)) {
		fs.mkdirSync(ptauDir, { recursive: true });
	}

	// Thử download từ Hermez trước
	let ptauFile = downloadHermezPtau(power, ptauDir);

	// Nếu download thất bại, tạo local
	if (!ptauFile) {
		console.log('> [Warning] Creating ptau locally (this will be slow!)');
		const ptauTemp = path.join(ptauDir, `pot${power}_temp.ptau`);
		ptauFile = path.join(ptauDir, `pot${power}_final.ptau`);

		if (!fs.existsSync(ptauFile)) {
			console.log('\n--> [Info] Step 1: Initialize ceremony');
			run(`npx snarkjs powersoftau new bn128 ${power} ${quote(ptauTemp)} -v`);

			console.log('\n--> [Info] Step 2: Contributing entropy');
			run(
				`npx snarkjs powersoftau contribute ${quote(ptauTemp)} ${quote(
					ptauFile
				)} --name="MaiTienDung" --entropy="$(date)" -v`
			);

			if (fs.existsSync(ptauTemp)) {
				fs.unlinkSync(ptauTemp);
			}
		}
	}

	// Nếu file đã là 'hez_final', tức đã có phase 2 => dùng trực tiếp
	if (path.basename(ptauFile).includes('hez_final')) {
		console.log('> [Info] ptau file already includes Phase 2 (hez_final), skipping prepare phase2');
		return ptauFile;
	}

	// Nếu là file tự tạo, cần prepare phase2
	const ptauPrepared = path.join(ptauDir, `powersOfTau28_hez_final_${power.toString().padStart(2, '0')}_prepared.ptau`);
	if (fs.existsSync(ptauPrepared)) {
		console.log('> [Info] Prepared ptau file already exists');
		return ptauPrepared;
	}

	console.log('> [Info] Preparing phase 2 for Groth16...');
	run(`npx snarkjs powersoftau prepare phase2 ${quote(ptauFile)} ${quote(ptauPrepared)}`);

	return ptauPrepared;
}

/**
 * Biên dịch Circom circuit thành các file cần thiết
 * @param {string} circuitDir - Thư mục chứa file .circom
 * @param {string} outputDir - Thư mục output
 * @returns {Object} - {circuitName, constraintPower}
 */
function compileCircuit(circuitDir, outputDir) {
	console.log('> [Info] Compiling Circom circuit...');

	// Tìm file .circom trong thư mục
	const CIRCOM_FILE = fs.readdirSync(circuitDir).find((f) => f.endsWith('.circom'));
	if (!CIRCOM_FILE) {
		throw new Error('No .circom file found in directory');
	}

	const circuitName = CIRCOM_FILE.replace('.circom', '');
	const circomPath = path.resolve(circuitDir, CIRCOM_FILE);

	// Ước tính số constraints cần thiết
	let constraintPower = estimateConstraints(circomPath);

	// Biên dịch circuit thành:
	// - .r1cs: Rank-1 Constraint System
	// - .wasm: WebAssembly để tính witness
	// - .sym: Symbol table cho debug
	console.log('> [Info] Compiling with optimizations...');
	run(`circom ${quote(circomPath)} --r1cs --wasm --sym --O1 -o ${quote(outputDir)}`);

	// Kiểm tra file output
	const r1csPath = path.join(outputDir, `${circuitName}.r1cs`);
	const wasmPath = path.join(outputDir, `${circuitName}_js/${circuitName}.wasm`);

	if (!fs.existsSync(r1csPath) || !fs.existsSync(wasmPath)) {
		throw new Error('Circuit compilation failed - missing output files');
	}

	// Kiểm tra constraint count thực tế
	const actualConstraints = getActualConstraintCount(r1csPath);
	if (actualConstraints > 0) {
		console.log(`> [Info] Actual constraints: ${actualConstraints}`);

		// Tính lại power cần thiết dựa trên constraint thực tế
		let requiredPower = 10;
		while (1 << requiredPower < actualConstraints * 2 && requiredPower < 25) {
			requiredPower++;
		}

		if (requiredPower > constraintPower) {
			console.log(`> [Warning] Need higher power: 2^${requiredPower} (was estimated 2^${constraintPower})`);
			constraintPower = requiredPower;
		}
	}

	console.log('> [Info] Circuit compiled successfully');
	return { circuitName, constraintPower };
}

/**
 * Validate input file format
 * @param {string} inputFile - Đường dẫn file input.json
 */
function validateInput(inputFile) {
	console.log('> [Info] Validating input file...');

	if (!fs.existsSync(inputFile)) {
		throw new Error(`Input file not found: ${inputFile}`);
	}

	try {
		const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
		console.log('> [Info] Input signals:', Object.keys(inputData));
		return inputData;
	} catch (error) {
		throw new Error(`Invalid input JSON format: ${error.message}`);
	}
}

/**
 * Thiết lập hệ thống proving và tạo proof
 * @param {string} circuitDir - Thư mục chứa circuit và input
 * @param {string} outputDir - Thư mục output
 * @param {string} circuitName - Tên circuit
 * @param {string} ptauPrepared - Đường dẫn file ptau đã chuẩn bị
 */
function setupAndProve(circuitDir, outputDir, circuitName, ptauPrepared) {
	console.log('> [Info] Setting up Groth16 proving system...');

	// Định nghĩa đường dẫn tất cả các file cần thiết
	const r1cs = path.resolve(outputDir, `${circuitName}.r1cs`);
	const wasm = path.resolve(outputDir, `${circuitName}_js/${circuitName}.wasm`);
	const zkey0 = path.resolve(outputDir, `${circuitName}_0000.zkey`);
	const zkeyFinal = path.resolve(outputDir, `${circuitName}_final.zkey`);
	const vkey = path.resolve(outputDir, `verification_key.json`);
	const witness = path.resolve(outputDir, `witness.wtns`);
	const proof = path.resolve(outputDir, `proof.json`);
	const pub = path.resolve(outputDir, `public.json`);
	const inputFile = path.resolve(circuitDir, 'input.json');
	const genWitness = path.resolve(outputDir, `${circuitName}_js/generate_witness.js`);

	// Validate input
	validateInput(inputFile);

	// Bước 1: Groth16 setup
	console.log('\n\n--> [Info] Step 1: Groth16 setup (generating keys)');
	run(`npx snarkjs groth16 setup ${quote(r1cs)} ${quote(ptauPrepared)} ${quote(zkey0)}`);

	// Bước 2: Đóng góp vào zkey
	console.log('\n\n--> [Info] Step 2: Contributing to zkey');
	run(`npx snarkjs zkey contribute ${quote(zkey0)} ${quote(zkeyFinal)} --name="MaiTienDung" --entropy="$(date)" -v`);

	// Bước 3: Xuất verification key
	console.log('\n\n--> [Info] Step 3: Exporting verification key');
	run(`npx snarkjs zkey export verificationkey ${quote(zkeyFinal)} ${quote(vkey)}`);
	// Nếu muốn không đóng góp
	// run(`npx snarkjs zkey export verificationkey ${quote(zkey0)} ${quote(vkey)}`);

	// Bước 4: Tạo witness từ input
	console.log('\n\n--> [Info] Step 4: Generating witness from input');

	// Kiểm tra Node.js version compatibility
	try {
		run(`node ${quote(genWitness)} ${quote(wasm)} ${quote(inputFile)} ${quote(witness)}`);
	} catch (error) {
		console.log('> [Warning] Standard witness generation failed, trying alternative method...');
		// Fallback method cho một số version cũ
		run(`npx snarkjs wtns calculate ${quote(wasm)} ${quote(inputFile)} ${quote(witness)}`);
	}

	// Bước 5: Tạo proof từ witness
	console.log('\n\n--> [Info] Step 5: Generating zero-knowledge proof');
	run(`npx snarkjs groth16 prove ${quote(zkeyFinal)} ${quote(witness)} ${quote(proof)} ${quote(pub)}`);
	// Khi không đóng góp vào Zkey
	// run(`npx snarkjs groth16 prove ${quote(zkey0)} ${quote(witness)} ${quote(proof)} ${quote(pub)}`);

	// Hiển thị thông tin debug
	printDebugInfo(outputDir, vkey, pub, proof);

	// Bước 6: Verify proof (Cắt qua verifier, chỉ chạy khi dev để đỡ mất thời gian chạy verify riêng)
	// console.log('\n\n--> [Info] Step 6: Verifying proof');
	// run(`npx snarkjs groth16 verify ${quote(vkey)} ${quote(pub)} ${quote(proof)}`);

	// Cleanup intermediate files để tiết kiệm dung lượng
	console.log('\n\n--> [Info] Cleaning up intermediate files...');
	const filesToClean = [zkey0, witness];
	filesToClean.forEach((file) => {
		if (fs.existsSync(file)) {
			fs.unlinkSync(file);
			console.log(`> [Info] Cleaned: ${path.basename(file)}`);
		}
	});
}

/**
 * In thông tin debug và summary
 */
function printDebugInfo(outputDir, vkey, pub, proof) {
	console.log('\n> [Debug] ===== FILE STATUS =====');
	console.log('> [Debug] Output directory:', outputDir);
	console.log('> [Debug] Verification Key exists:', fs.existsSync(vkey));
	console.log('> [Debug] Public inputs exists:', fs.existsSync(pub));
	console.log('> [Debug] Proof exists:', fs.existsSync(proof));

	// File sizes
	if (fs.existsSync(proof)) {
		const proofSize = fs.statSync(proof).size;
		console.log(`> [Debug] Proof file size: ${proofSize} bytes`);
	}

	// Kiểm tra nội dung public inputs
	if (fs.existsSync(pub)) {
		const publicInputs = fs.readFileSync(pub, 'utf8').trim();
		console.log('> [Debug] Public inputs content:', publicInputs);

		try {
			const pubData = JSON.parse(publicInputs);
			console.log('> [Debug] Public inputs count:', pubData.length);
			console.log('> [Debug] Public inputs JSON format: Valid');
		} catch (e) {
			console.log('> [Error] Public inputs JSON format: Invalid -', e.message);
		}
	}

	// Validate JSON files
	const jsonFiles = [
		{ path: proof, name: 'Proof' },
		{ path: vkey, name: 'Verification key' },
	];

	jsonFiles.forEach(({ path: filePath, name }) => {
		if (fs.existsSync(filePath)) {
			try {
				JSON.parse(fs.readFileSync(filePath, 'utf8'));
				console.log(`> [Debug] ${name} JSON format: Valid`);
			} catch (e) {
				console.log(`> [Error] ${name} JSON format: Invalid - ${e.message}`);
			}
		}
	});

	console.log('> [Debug] ===============================\n');
}

/**
 * Hàm chính để chạy toàn bộ quy trình
 * @param {string} inputCircuitDir - Đường dẫn từ user
 * @returns {boolean} - Chạy thành công hay fail, nếu chạy fail sinh bằng chứng thất bại
 */
function runZKSNARKWorkflow(inputCircuitDir) {
	const startTime = Date.now();

	try {
		console.log('> [Info] Starting ZK-SNARK workflow...\n');

		// Resolve đường dẫn circuit từ input của user
		const circuitDir = resolveCircuitPath(inputCircuitDir);
		console.log('> [Info] Circuit directory resolved to:', circuitDir);

		// Kiểm tra thư mục circuit có tồn tại
		if (!fs.existsSync(circuitDir)) {
			throw new Error(`Circuit directory not found: ${circuitDir}`);
		}

		// Thiết lập thư mục output
		const outputDir = path.join(circuitDir, 'output');

		// Xóa và tạo lại thư mục output
		if (fs.existsSync(outputDir)) {
			fs.rmSync(outputDir, { recursive: true });
		}
		fs.mkdirSync(outputDir, { recursive: true });
		console.log('> [Info] Output directory:', outputDir);

		// Chạy các bước theo thứ tự
		const { circuitName, constraintPower } = compileCircuit(circuitDir, outputDir);
		const ptauPrepared = ensurePtau(constraintPower);
		setupAndProve(circuitDir, outputDir, circuitName, ptauPrepared);

		const endTime = Date.now();
		const duration = ((endTime - startTime) / 1000).toFixed(2);

		console.log('\n> [Success] ========== WORKFLOW COMPLETED ==========');
		console.log(`> [Success] Circuit: ${circuitName}`);
		console.log(`> [Success] Duration: ${duration} seconds`);
		console.log(`> [Success] Output files in: ${outputDir}`);
		console.log('> [Success] Files generated:');
		console.log('> [Success]   - proof.json (ZK proof)');
		console.log('> [Success]   - public.json (public inputs)');
		console.log('> [Success]   - verification_key.json (for verification)');
		console.log('> [Success] ==============================================');

		return true;
	} catch (err) {
		console.error('\n> [Error] ========== WORKFLOW FAILED ==========');
		console.error('> [Error] Reason:', err);
		console.error('> [Error] =========================================');
		return false;
	}
}

// Export hàm để có thể import từ file khác
module.exports = { runZKSNARKWorkflow };

// CLI interface
if (require.main === module) {
	const inputPath = process.argv[2];
	if (!inputPath) {
		console.error('> [Error] Please provide circuit directory path');
		console.error('> [Usage] node ./compiler <circuit_directory>');
		console.error('> [Example] node ./compiler ./circuits/circuit1');
		console.error('> [Example] node ./compiler /absolute/path/to/circuit');
		process.exit(1);
	}

	console.log('> [Info] Project root:', PROJECT_ROOT);
	console.log('> [Info] Compiler location:', __dirname);
	console.log('> [Info] Input path:', inputPath);

	const success = runZKSNARKWorkflow(inputPath);
	process.exit(success ? 0 : 1);
}
