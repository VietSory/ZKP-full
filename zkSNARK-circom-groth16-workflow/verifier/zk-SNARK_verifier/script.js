let proofData = null;
let publicSignals = null;
let verificationKey = null;

// File upload handlers
document.getElementById('proof-file').addEventListener('change', function (e) {
	handleFileUpload(e, 'proof', (data) => {
		proofData = data;
		updateUploadUI('proof-upload', 'proof.json loaded ✓');
	});
});

document.getElementById('public-file').addEventListener('change', function (e) {
	handleFileUpload(e, 'public', (data) => {
		publicSignals = data;
		updateUploadUI('public-upload', 'public.json loaded ✓');
	});
});

document.getElementById('vkey-file').addEventListener('change', function (e) {
	handleFileUpload(e, 'vkey', (data) => {
		verificationKey = data;
		updateUploadUI('vkey-upload', 'verification_key.json loaded ✓');
	});
});

function handleFileUpload(event, type, callback) {
	const file = event.target.files[0];
	if (file) {
		const reader = new FileReader();
		reader.onload = function (e) {
			try {
				const data = JSON.parse(e.target.result);
				callback(data);
				checkAllFilesLoaded();
			} catch (error) {
				showError(`Invalid JSON file: ${file.name}`);
			}
		};
		reader.readAsText(file);
	}
}

function updateUploadUI(uploadId, message) {
	const uploadDiv = document.getElementById(uploadId);
	uploadDiv.classList.add('has-file');
	uploadDiv.querySelector('p').textContent = message;
}

function checkAllFilesLoaded() {
	const verifyBtn = document.getElementById('verify-btn');
	if (proofData && publicSignals && verificationKey) {
		verifyBtn.disabled = false;
	}
}

// Verification function
document.getElementById('verify-btn').addEventListener('click', async function () {
	if (!proofData || !publicSignals || !verificationKey) {
		showError('Please upload all three files first.');
		return;
	}

	showLoading(true);
	hideResult();

	try {
		console.log('Starting verification...');
		console.log('Proof:', proofData);
		console.log('Public signals:', publicSignals);
		console.log('Verification key:', verificationKey);

		// Perform verification using snarkjs
		const result = await snarkjs.groth16.verify(verificationKey, publicSignals, proofData);
		console.log('SnarkJS verify result: ', result);

		showLoading(false);

		if (result) {
			showSuccess();
		} else {
			showVerificationFailure();
		}
	} catch (error) {
		console.error('Verification error:', error);
		showLoading(false);
		showError('Verification failed: ' + error.message);
	}
});

function showLoading(show) {
	document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function hideResult() {
	document.getElementById('result-section').style.display = 'none';
}

function showSuccess() {
	const resultSection = document.getElementById('result-section');
	const resultIcon = document.getElementById('result-icon');
	const resultTitle = document.getElementById('result-title');
	const resultMessage = document.getElementById('result-message');
	const publicSignalsDisplay = document.getElementById('public-signals-display');

	resultSection.className = 'result-section result-success';
	resultSection.style.display = 'block';

	resultIcon.textContent = '✅';
	resultTitle.textContent = 'Verification Successful!';
	resultMessage.textContent =
		'The zero-knowledge proof is mathematically valid and all circuit constraints are satisfied.';

	// Display decoded public signals
	displayPublicSignals(publicSignalsDisplay);
}

function showVerificationFailure() {
	const resultSection = document.getElementById('result-section');
	const resultIcon = document.getElementById('result-icon');
	const resultTitle = document.getElementById('result-title');
	const resultMessage = document.getElementById('result-message');

	resultSection.className = 'result-section result-error';
	resultSection.style.display = 'block';

	resultIcon.textContent = '❌';
	resultTitle.textContent = 'Verification Failed';
	resultMessage.textContent = 'The proof is invalid or does not satisfy the circuit constraints.';

	document.getElementById('public-signals-display').innerHTML = '';
}

function showError(message) {
	const resultSection = document.getElementById('result-section');
	const resultIcon = document.getElementById('result-icon');
	const resultTitle = document.getElementById('result-title');
	const resultMessage = document.getElementById('result-message');

	resultSection.className = 'result-section result-error';
	resultSection.style.display = 'block';

	resultIcon.textContent = '⚠️';
	resultTitle.textContent = 'Error';
	resultMessage.textContent = message;

	document.getElementById('public-signals-display').innerHTML = '';
}

function displayPublicSignals(container) {
	if (!publicSignals || !Array.isArray(publicSignals)) {
		container.innerHTML = '';
		return;
	}

	const html = `
                <h4>📊 Public Signals Analysis</h4>
                <div class="signal-row">
                    <span>Check result:</span>
                    <span>${publicSignals[0] === '1' ? '✅ PASS' : '❌ FAIL'}</span>
                </div>
                <div class="signal-row">
                    <span>Expected Sum:</span>
                    <span>${publicSignals[1] || 'N/A'}</span>
                </div>
                <div class="signal-row">
                    <span>Timestamp:</span>
                    <span>${publicSignals[2] ? formatTimestamp(parseInt(publicSignals[2])) : 'N/A'}</span>
                </div>
                <div class="signal-row">
                    <span>Final Hash:</span>
                    <span>${publicSignals[3] ? publicSignals[3].substring(0, 20) + '...' : 'N/A'}</span>
                </div>
            `;

	container.innerHTML = html;
}

function formatTimestamp(timestamp) {
	const date = new Date(timestamp);

	const dd = String(date.getDate()).padStart(2, '0');
	const mm = String(date.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
	const yyyy = date.getFullYear();

	const hh = String(date.getHours()).padStart(2, '0');
	const min = String(date.getMinutes()).padStart(2, '0');
	const ss = String(date.getSeconds()).padStart(2, '0');

	return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}
