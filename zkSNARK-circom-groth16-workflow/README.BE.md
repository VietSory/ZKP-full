# API ZKP - Exchange Backend

A Node.js/Express backend for a cryptocurrency exchange with blockchain integration.

## Features

- User authentication and registration
- Internal off-chain transactions between users
- Blockchain deposit processing (automatic every 3 seconds)
- Withdrawal functionality
- Session-based authentication
- CORS support for frontend integration

## Data Models

### User

- `uid`: number - Unique user identifier
- `username`: string - Display name
- `walletAddress`: string - Blockchain wallet address (for deposits/withdrawals only)
- `balance`: number - Off-chain balance on the exchange

### Transaction (Internal)

- `id`: number - Unique transaction ID
- `from_uid`: number - Sender UID
- `to_uid`: number - Receiver UID
- `amount`: number - Transfer amount
- `timestamp`: number - Transaction timestamp

### Deposit

- `id`: number - Unique deposit ID
- `uid`: number - User UID
- `amount`: number - Deposit amount
- `timestamp`: number - Deposit timestamp

### Withdrawal

- `id`: number - Unique withdrawal ID
- `uid`: number - User UID
- `amount`: number - Withdrawal amount
- `timestamp`: number - Withdrawal timestamp

## API Endpoints

### Authentication

#### POST /auth/login

Login with username and password.

```json
{
  "username": "string",
  "password": "string"
}
```

Response:

```json
{
  "redirect": "/"
}
```

#### GET /auth/user

Get current user information (requires login).
Response:

```json
{
  "username": "string",
  "balance": number,
  "walletAddress": "string"
}
```

#### POST /auth/signup

Register new user.

```json
{
  "username": "string",
  "password": "string",
  "walletAddress": "string"
}
```

Response:

```json
{
  "redirect": "/"
}
```

#### GET /auth/logout

Logout current user.
Response:

```json
{
  "redirect": "/login"
}
```

### Transactions

#### GET /transactions

Get transaction history for current user (requires login).
Response:

```json
[
  {
    "username": "string",
    "amount": number,
    "timestamp": number
  }
]
```

#### POST /transactions

Create internal transfer (requires login).

```json
{
  "toUID": number,
  "amount": number
}
```

Response:

```json
{
  "message": "Chuyển thành công!"
}
```

### Deposits

#### GET /deposits

Get deposit history for current user (requires login).
Response:

```json
[
  {
    "timestamp": number,
    "amount": number
  }
]
```

#### POST /deposits

Process blockchain deposits (backend only, called automatically).

### Withdrawals

#### GET /withdraws

Get withdrawal history for current user (requires login).
Response:

```json
[
  {
    "timestamp": number,
    "amount": number
  }
]
```

#### POST /withdraws

Create withdrawal request (requires login).

```json
{
  "amount": number
}
```

Response:

```json
{
  "message": "Rút tiền thành công!"
}
```

## Configuration

The exchange wallet address and blockchain API URL are configured in `database/storages/config.json`:

```json
{
  "exchangeWalletAddress": "686cd78ceabb453001dc499b2e2bfd5a6ff48da6d776480a543a7bf0432611bc",
  "newestDepositID": null,
  "blockchainApiUrl": "https://miniblockchain.vercel.app/api/transaction/686cd78ceabb453001dc499b2e2bfd5a6ff48da6d776480a543a7bf0432611bc"
}
```

## Installation

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## Features

- **Automatic Deposit Processing**: The system automatically checks for new blockchain deposits every 3 seconds
- **Session Management**: Secure session-based authentication
- **CORS Support**: Configured for frontend integration
- **Error Handling**: Comprehensive error handling and validation
- **Data Persistence**: JSON-based data storage

## Security Features

- Session-based authentication
- Input validation
- Balance verification before transactions
- Secure cookie configuration
- CORS protection

## Error Responses

All endpoints return appropriate HTTP status codes and error messages in Vietnamese:

- `400`: Bad Request - Invalid input data
- `401`: Unauthorized - Not logged in
- `409`: Conflict - Username already exists
- `500`: Internal Server Error

Error response format:

```json
{
  "error": "Error message in Vietnamese"
}
```
