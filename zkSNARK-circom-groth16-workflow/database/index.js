const fs = require('fs').promises;
const path = require('path');

const storagePath = path.join(__dirname, 'storages');

async function getHighestUID() {
	const users = await readData('users.json');
	if (users.length === 0) return 0;

	return Math.max(...users.map((user) => user.uid)); // Changed from id to uid
}

async function readData(fileName) {
	try {
		const filePath = path.join(storagePath, fileName);
		const data = await fs.readFile(filePath, 'utf8');
		return JSON.parse(data);
	} catch (error) {
		if (error.code === 'ENOENT') {
			return []; // Return empty array if file doesn't exist
		}
		throw error;
	}
}

async function writeData(fileName, data) {
	const filePath = path.join(storagePath, fileName);
	await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// User functions
async function getUserInfo(uid) {
	const users = await readData('users.json');
	const user = users.find((u) => u.uid === uid); // Changed from id to uid
	if (!user) return null;

	return {
		username: user.username,
		balance: user.balance,
		walletAddress: user.walletAddress,
	};
}

async function login(username, password) {
	const users = await readData('users.json');
	const user = users.find((u) => u.username === username && u.password === password);
	return user ? user.uid : null; // Changed from id to uid
}

async function register(username, password, walletAddress) {
	const users = await readData('users.json');

	// Check if username already exists
	if (users.some((u) => u.username === username)) {
		return false;
	}

	const highestUID = await getHighestUID();
	const newUID = highestUID + 1;

	const newUser = {
		uid: newUID, // Changed from id to uid
		username,
		password,
		walletAddress,
		balance: 0,
	};

	users.push(newUser);
	await writeData('users.json', users);
	return true;
}

async function getBalanceOf(uid) {
	const users = await readData('users.json');
	const user = users.find((u) => u.uid === uid); // Changed from id to uid
	return user ? user.balance : 0;
}

async function getUIDbyWalletAddress(walletAddress) {
	const users = await readData('users.json');
	const user = users.find((u) => u.walletAddress === walletAddress);
	return user ? user.uid : null; // Changed from id to uid
}

// Transaction functions
async function getTransactionHistory(uid) {
	const transactions = await readData('transactions.json');
	const users = await readData('users.json');

	return transactions
		.filter((t) => t.from_uid === uid || t.to_uid === uid)
		.map((t) => {
			const fromUser = users.find((u) => u.uid === t.from_uid);
			const toUser = users.find((u) => u.uid === t.to_uid);
			return {
				username: t.from_uid === uid ? toUser?.username || 'Unknown' : fromUser?.username || 'Unknown',
				amount: t.from_uid === uid ? -t.amount : t.amount,
				timestamp: t.timestamp,
			};
		});
}

async function transfer(fromUID, toUID, amount) {
	const users = await readData('users.json');
	const transactions = await readData('transactions.json');

	const fromUser = users.find((u) => u.uid === fromUID); // Changed from id to uid
	const toUser = users.find((u) => u.uid === toUID); // Changed from id to uid

	if (!fromUser || !toUser) {
		return false;
	}

	if (fromUser.balance < amount) {
		return false;
	}

	// Update balances
	fromUser.balance -= amount;
	toUser.balance += amount;

	// Create transaction record
	const newTransaction = {
		id: Date.now().toString(),
		from_uid: fromUID,
		to_uid: toUID,
		amount: amount,
		timestamp: Date.now(),
	};

	transactions.push(newTransaction);

	// Save changes
	await writeData('users.json', users);
	await writeData('transactions.json', transactions);

	return true;
}

// Deposit functions
async function getDepositHistory(uid) {
	const deposits = await readData('deposits.json');
	return deposits
		.filter((d) => d.uid === uid)
		.map((d) => ({
			timestamp: d.timestamp,
			amount: d.amount,
		}));
}

async function deposit(uid, amount) {
	const users = await readData('users.json');
	const deposits = await readData('deposits.json');

	const user = users.find((u) => u.uid === uid); // Changed from id to uid
	if (!user) return;

	// Update user balance
	user.balance += amount;

	// Create deposit record
	const newDeposit = {
		id: Date.now().toString(),
		uid: uid,
		amount: amount,
		timestamp: Date.now(),
	};

	deposits.push(newDeposit);

	// Save changes
	await writeData('users.json', users);
	await writeData('deposits.json', deposits);
}

async function getNewestDepositID() {
	const config = await readData('config.json');
	return config.newestDepositID || null;
}

async function setNewestDepositID(newVal) {
	const config = await readData('config.json');
	config.newestDepositID = newVal;
	await writeData('config.json', config);
}

// Withdraw functions
async function getWithdrawHistory(uid) {
	const withdrawals = await readData('withdrawals.json');
	return withdrawals
		.filter((w) => w.uid === uid)
		.map((w) => ({
			timestamp: w.timestamp,
			amount: w.amount,
		}));
}

async function withdraw(uid, amount) {
	const users = await readData('users.json');
	const withdrawals = await readData('withdrawals.json');

	const user = users.find((u) => u.uid === uid); // Changed from id to uid
	if (!user || user.balance < amount) return false;

	// Update user balance
	user.balance -= amount;

	// Create withdrawal record
	const newWithdrawal = {
		id: Date.now().toString(),
		uid: uid,
		amount: amount,
		timestamp: Date.now(),
	};

	withdrawals.push(newWithdrawal);

	// Save changes
	await writeData('users.json', users);
	await writeData('withdrawals.json', withdrawals);

	return true;
}

module.exports = {
	readData,
	writeData,
	// User functions
	getUserInfo,
	login,
	register,
	getBalanceOf,
	getUIDbyWalletAddress,
	// Transaction functions
	getTransactionHistory,
	transfer,
	// Deposit functions
	getDepositHistory,
	deposit,
	getNewestDepositID,
	setNewestDepositID,
	// Withdraw functions
	getWithdrawHistory,
	withdraw,
};
