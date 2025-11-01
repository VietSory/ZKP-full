const { parentPort, workerData } = require('worker_threads');
const { runZKSNARKWorkflow } = require('../compiler');
const { renderPoRcircuitCount, renderPoRinput } = require('../circuit_renderer');

(async () => {
	try {
		const { input, finalHash, timestamp, circuitPath } = workerData;
		console.log('WorkerData received:', { inputLength: input?.length, circuitPath, timestamp, finalHash });

		// Render circuit count
		renderPoRcircuitCount(input.length);

		// Tính tổng balance
		const totalBalance = input.reduce((sum, [_uid, balance]) => sum + balance, 0);

		// Render PoR input
		renderPoRinput(input, totalBalance, timestamp, finalHash);

		// Chạy ZK-SNARK workflow
		console.log('Starting ZK workflow...');
		const result = runZKSNARKWorkflow(circuitPath);
		console.log('ZK workflow completed, result:', result);

		// Gửi kết quả về main thread
		parentPort.postMessage(result);
	} catch (error) {
		console.error('Worker error:', error);
		parentPort.postMessage({
			error: error.message,
			stack: error.stack,
		});
	}
})();
