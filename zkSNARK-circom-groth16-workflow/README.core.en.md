# Setup Process and Core Technologies of the Project

## Environment Preparation

### Key Requirements:

**1. Basic Environment Setup:**

- Follow the setup instructions at:  
  https://docs.google.com/document/d/1e6rXiNfLfY0tyGLNRCeN4jCv5qX2kDYzorYolOLc7ZY/edit?tab=t.m53yszyif1vt#heading=h.d97jf1b071bh
  - Note: This document is written for Windows only. For Linux or other operating systems, you’ll need to manually install:
    - Git
    - Circom
    - Node.js, npm, npx
    - zksnark-related tools
  - The script may fail on non-Windows systems if CLI commands behave differently across environments.
- Clone the `circomlib` library into the project root:
  ```bash
  git clone https://github.com/iden3/circomlib.git
  ```
- Install required packages:
  ```bash
  npm install
  ```

**2. Network Connection and Powers of Tau:**

- **Internet connection is recommended** during setup to download pre-generated Powers of Tau files.
- For large circuits, low-spec machines may fail during trusted setup.
- **With internet**: The script will automatically download Powers of Tau files from storage.
- **Without internet**: The script will attempt to generate Powers of Tau locally — which can be very resource-intensive depending on constraint count.
- **Location**: Powers of Tau files are stored in `compiler/powers_of_tau/`
- **Naming convention**: The final number `k` in the filename represents the maximum supported constraint count of 2^k.
- **File sizes**:
  - Extremely large circuits (k=32): up to 9GB
  - Current demo circuit (k≈15): around 36MB, easily downloadable by script
- **Manual download**: You can pre-download Powers of Tau from https://github.com/iden3/snarkjs#7-prepare-phase-2 and place them into `compiler/powers_of_tau/` if you’re concerned about script-based download.

**3. Working Directory:**

- **Always run commands from the project root directory**
- Navigating (`cd`) into subfolders may cause errors

## How to Test Circom Circuits

### Prepare Files:

1. Create a subfolder inside `circuits/` (e.g., `all_non_negative`)
2. The folder must contain:
   - Exactly **one `.circom` file** (the circuit to test). If multiple files exist, the script may pick the wrong one.
   - An `input.json` file with test inputs (no comments allowed like on some websites)

### Run Test:

```bash
node .\compiler\ <path_to_circuit_folder>
```

**Example:**

```bash
node .\compiler\ .\circuits\all_non_negative\
```

### Main Circuit:

- **Location**: `circuits/prove_PoR/`
- **Templates**: `circuits/prove_PoR/templates/` – contains reusable subcircuits (without `main()`), used as includes in the main circuit

### Output:

After execution, the circuit folder will have an `output/` directory containing:

- `proof.json` – ZK proof
- `public.json` – Public inputs/outputs
- `verification_key.json` – Verification key

> **These three files are all that a verifier needs to verify the proof.**

## ZK-SNARK Demo via Code

### Blocking Version:

```bash
node .\test_zk-snark_flow\success-but-blocking.test.js
```

- Directly imports and runs the proof generation function
- **Downside**: Proof generation is a heavy task and blocks the main thread

### Non-blocking Version:

```bash
node .\test_zk-snark_flow\success-non-blocking.test.js
```

- Uses worker threads to run in parallel
- **Advantage**: Non-blocking and more responsive

## Verifier

- The folder `verifier/zk-SNARK_verifier/` can be **fully decoupled** from the project
- It acts as a standalone tool to verify ZKP proofs downloaded from a server
- Upload the three files mentioned earlier (`proof.json`, `public.json`, `verification_key.json`) to verify

## ZK-SNARK Technology Used

### Scheme: Groth16

The proofs are generated using **Groth16**, one of the most popular and efficient ZK-SNARK schemes available today.

**Groth16 Features:**

- **Proof size**: Fixed size with 3 group elements (~200 bytes)
- **Verification**: Extremely fast, production-ready
- **Trusted Setup**: Requires a dedicated ceremony for each circuit
- **Security**: Well-studied and audited

### Technology Stack:

**1. Circom (Circuit Compiler)**

- Domain-specific language (DSL) for writing arithmetic circuits
- Compiles to R1CS, WASM, and symbol files
- Enables clear and intuitive logic for complex circuits

**2. SnarkJS**

- JavaScript library for working with ZK-SNARKs
- Handles trusted setup, proof generation and verification
- Supports multiple curves and proof schemes

**3. BN128 Elliptic Curve**

- Pairing-friendly curve used for cryptographic operations
- Enables bilinear pairings required by Groth16
- Balances security and performance efficiently

### Trusted Setup Process:

**Phase 1: Powers of Tau**

- Generates a common reference string (CRS) usable across circuits sharing the same curve
- Can be reused across multiple circuits
- Requires multi-party contributions for better trust assumptions

**Phase 2: Circuit-specific Setup**

- Generates a proving key and a verifying key specific to each circuit
  - **Proving key (large)**: used to generate proofs
  - **Verifying key (small)**: used to verify proofs

### Constraint System (R1CS):

- Represents the circuit as a set of equations of the form A ⊙ B = C
- Each constraint corresponds to a basic computation
- The _witness_ holds all intermediate values that satisfy the constraints

*The core part of the project has been completed — from reading users in the database, rendering a Merkle tree, generating a Circom circuit, and preparing inputs for proof generation. To see it in action:*
- Modify the balances or number of users in `database/storages/users.json`
- Run the command: ```node .\gen_proof\```
- The proof will be generated in the output folder of the main circuit ProvePoR mentioned above.