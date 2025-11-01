pragma circom 2.1.6;

template MerkleRootWithTimestamp(n) {
    assert(n > 0);
    assert(n & (n - 1) == 0); // n phải là lũy thừa của 2

    signal input data[n][2];     // [UID, balance]
    signal input timestamp;      
    signal input finalHash;      // public input để verify

    var depth = log_2(n);

    // Tính leaf = Poseidon([UID, balance])
    signal leaves[n];
    component leafHashers[n];
    for (var i = 0; i < n; i++) {
        leafHashers[i] = Poseidon(2);
        leafHashers[i].inputs[0] <== data[i][0];
        leafHashers[i].inputs[1] <== data[i][1];
        leaves[i] <== leafHashers[i].out;
    }

    // Mảng các tầng của Merkle tree
    signal levels[depth + 1][n];  // levels[0] = leaves, cuối là root

    for (var i = 0; i < n; i++) {
        levels[0][i] <== leaves[i];
    }

    // Hash từng tầng
    component hashers[depth][n/2];
    for (var d = 1; d <= depth; d++) {
        var width = n >> d;
        for (var i = 0; i < width; i++) {
            hashers[d - 1][i] = Poseidon(2);
            hashers[d - 1][i].inputs[0] <== levels[d - 1][2 * i];
            hashers[d - 1][i].inputs[1] <== levels[d - 1][2 * i + 1];
            levels[d][i] <== hashers[d - 1][i].out;
        }
    }

    // Hash root với timestamp
    component finalHasher = Poseidon(2);
    finalHasher.inputs[0] <== levels[depth][0];  // Merkle root
    finalHasher.inputs[1] <== timestamp;
    
    log("Root:", levels[depth][0]);
    log("Final hash:", finalHasher.out);

    // Tạo constraint finalHash input phải bằng với computed hash
    finalHash === finalHasher.out;
}

// Helper
function log_2(x) {
    var r = 0;
    while ((1 << r) < x) {
        r++;
    }
    return r;
}
