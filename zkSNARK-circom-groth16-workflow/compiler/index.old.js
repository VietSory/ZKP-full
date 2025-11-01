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
 * Kiểm tra và tạo Powers of Tau ceremony (trusted setup chung)
 * Đây là bước chuẩn bị cho việc tạo proof, chỉ cần làm 1 lần và có thể dùng chung cho nhiều circuit
 */
function ensurePtau() {
	console.log('> [Info] Checking Powers of Tau setup...');

	// Đặt thư mục ptau trong compiler folder để dễ quản lý
	const ptauDir = path.join(__dirname, 'powers_of_tau');
	const ptauFile = path.join(ptauDir, 'pot10_final.ptau');
	const ptauTemp = path.join(ptauDir, 'pot10_temp.ptau');
	const ptauPrepared = path.join(ptauDir, 'pot10_final_prepared.ptau');

	// Tạo thư mục ptau nếu chưa có
	if (!fs.existsSync(ptauDir)) {
		fs.mkdirSync(ptauDir, { recursive: true });
	}

	if (!fs.existsSync(ptauFile)) {
		console.log('> [Info] Creating Powers of Tau ceremony...');

		// Bước 1: Tạo ceremony ban đầu với 2^10 = 1024 constraints
		console.log('\n\n--> [Info] Step 1: Initialize ceremony');
		run(`npx snarkjs powersoftau new bn128 10 ${quote(ptauTemp)} -v`);

		// Bước 2: Đóng góp entropy để bảo mật (từ file temp -> file final)
		console.log('\n\n--> [Info] Step 2: Contributing entropy');
		run(
			`npx snarkjs powersoftau contribute ${quote(ptauTemp)} ${quote(
				ptauFile
			)} --name="MaiTienDung" --entropy="$(date)" -v`
		);

		// Dọn dẹp file tạm
		if (fs.existsSync(ptauTemp)) {
			fs.unlinkSync(ptauTemp);
			console.log('> [Info] Cleaned up temporary ptau file');
		}
	} else {
		console.log('> [Info] Powers of Tau file already exists');
	}

	// Chuẩn bị phase 2 cho Groth16 protocol
	if (!fs.existsSync(ptauPrepared)) {
		console.log('> [Info] Preparing phase 2 for Groth16...');
		run(`npx snarkjs powersoftau prepare phase2 ${quote(ptauFile)} ${quote(ptauPrepared)}`);
	} else {
		console.log('> [Info] Phase 2 preparation already completed');
	}

	return ptauPrepared;
}

/**
 * Biên dịch Circom circuit thành các file cần thiết
 * @param {string} circuitDir - Thư mục chứa file .circom
 * @param {string} outputDir - Thư mục output
 * @returns {string} - Tên circuit (không có extension)
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

	// Biên dịch circuit thành:
	// - .r1cs: Rank-1 Constraint System (định nghĩa constraints)
	// - .wasm: WebAssembly để tính witness
	// - .sym: Symbol table cho debug
	run(`circom ${quote(circomPath)} --r1cs --wasm --sym -o ${quote(outputDir)}`);
	console.log('> [Info] Circuit compiled successfully');

	return circuitName;
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

	// Kiểm tra file input có tồn tại
	if (!fs.existsSync(inputFile)) {
		throw new Error(`Input file not found: ${inputFile}`);
	}
	
	// Bước 1: Groth16 setup - tạo proving và verifying keys từ R1CS và ptau
	console.log('\n\n--> [Info] Step 1: Groth16 setup (generating keys)');
	run(`npx snarkjs groth16 setup ${quote(r1cs)} ${quote(ptauPrepared)} ${quote(zkey0)}`);

	// Bước 2: Đóng góp vào zkey để tăng tính bảo mật
	console.log('\n\n--> [Info] Step 2: Contributing to zkey');
	run(`npx snarkjs zkey contribute ${quote(zkey0)} ${quote(zkeyFinal)} --name="MaiTienDung" --entropy="$(date)" -v`);

	// Bước 3: Xuất verification key để verifier sử dụng
	console.log('\n\n--> [Info] Step 3: Exporting verification key');
	run(`npx snarkjs zkey export verificationkey ${quote(zkeyFinal)} ${quote(vkey)}`);

	// Bước 4: Tạo witness từ input (chạy circuit với input cụ thể)
	console.log('\n\n--> [Info] Step 4: Generating witness from input');
	run(`node ${quote(genWitness)} ${quote(wasm)} ${quote(inputFile)} ${quote(witness)}`);

	// Bước 5: Tạo proof từ witness
	console.log('\n\n--> [Info] Step 5: Generating zero-knowledge proof');
	run(`npx snarkjs groth16 prove ${quote(zkeyFinal)} ${quote(witness)} ${quote(proof)} ${quote(pub)}`);

	// Hiển thị thông tin debug để kiểm tra
	printDebugInfo(outputDir, vkey, pub, proof);

	// Bước 6: Verify proof
	console.log('\n\n--> [Info] Step 6: Verifying proof');
	run(`npx snarkjs groth16 verify ${quote(vkey)} ${quote(pub)} ${quote(proof)}`);
}

/**
 * In thông tin debug để kiểm tra các file được tạo
 * @param {string} outputDir - Thư mục output
 * @param {string} vkey - Đường dẫn verification key
 * @param {string} pub - Đường dẫn public inputs
 * @param {string} proof - Đường dẫn proof
 */
function printDebugInfo(outputDir, vkey, pub, proof) {
	console.log('> [Debug] ===== FILE STATUS =====');
	console.log('> [Debug] Output directory:', outputDir);
	console.log('> [Debug] Verification Key exists:', fs.existsSync(vkey));
	console.log('> [Debug] Public inputs exists:', fs.existsSync(pub));
	console.log('> [Debug] Proof exists:', fs.existsSync(proof));

	// Kiểm tra nội dung public inputs
	if (fs.existsSync(pub)) {
		const publicInputs = fs.readFileSync(pub, 'utf8').trim();
		console.log('> [Debug] Public inputs content:', publicInputs);

		try {
			JSON.parse(publicInputs);
			console.log('> [Debug] Public inputs JSON format: Valid');
		} catch (e) {
			console.log('> [Error] Public inputs JSON format: Invalid -', e.message);
		}
	}

	// Kiểm tra proof file
	if (fs.existsSync(proof)) {
		try {
			const proofContent = fs.readFileSync(proof, 'utf8');
			JSON.parse(proofContent);
			console.log('> [Debug] Proof JSON format: Valid');
		} catch (e) {
			console.log('> [Error] Proof JSON format: Invalid -', e.message);
		}
	}

	// Kiểm tra verification key
	if (fs.existsSync(vkey)) {
		try {
			const vkeyContent = fs.readFileSync(vkey, 'utf8');
			JSON.parse(vkeyContent);
			console.log('> [Debug] Verification key JSON format: Valid');
		} catch (e) {
			console.log('> [Error] Verification key JSON format: Invalid -', e.message);
		}
	}
	console.log('> [Debug] ===============================\n');
}

/**
 * Hàm chính để chạy toàn bộ quy trình ZKP
 * @param {string} inputCircuitDir - Đường dẫn từ user (có thể relative từ process.cwd() hoặc absolute)
 */
function runZKPWorkflow(inputCircuitDir) {
	try {
		console.log('> [Info] Starting ZK-SNARK workflow...\n');

		// Resolve đường dẫn circuit từ input của user
		const circuitDir = resolveCircuitPath(inputCircuitDir);
		console.log('> [Info] Circuit directory resolved to:', circuitDir);

		// Kiểm tra thư mục circuit có tồn tại
		if (!fs.existsSync(circuitDir)) {
			throw new Error(`Circuit directory not found: ${circuitDir}`);
		}

		// Thiết lập thư mục output trong circuit directory
		const outputDir = path.join(circuitDir, 'output');

		// Xóa và tạo lại thư mục output
		if (fs.existsSync(outputDir)) {
			fs.rmSync(outputDir, { recursive: true });
		}
		fs.mkdirSync(outputDir, { recursive: true });
		console.log('> [Info] Output directory:', outputDir);

		// Chạy các bước theo thứ tự
		const ptauPrepared = ensurePtau();
		const circuitName = compileCircuit(circuitDir, outputDir);
		setupAndProve(circuitDir, outputDir, circuitName, ptauPrepared);

		console.log('\n> [Success] ZK-SNARK workflow completed successfully!');
		return true;
	} catch (err) {
		console.error('\n> [Error] Workflow failed:', err.message);
		return false;
	}
}

// Export hàm để có thể import từ file khác
module.exports = { runZKPWorkflow };

// Nếu file được chạy trực tiếp (không require), lấy tham số từ command line
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

	runZKPWorkflow(inputPath);
}
