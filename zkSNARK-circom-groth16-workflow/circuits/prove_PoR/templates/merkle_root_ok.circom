pragma circom 2.1.6;

template MerkleRootWithTimestamp(n, nearestPo2) {
    assert(n > 0);
    assert(nearestPo2 & (nearestPo2 - 1) == 0); // nearestPo2 phải là lũy thừa của 2
    assert(n <= nearestPo2);   // n không được vượt quá nearestPo2

    signal input data[n][2];     // Chỉ nhận n phần tử thực tế
    signal input timestamp;      // public input để verify
    signal input finalHash;      // public input để verify

    var depth = log_2(nearestPo2);

    // Tạo mảng data đầy đủ với padding
    signal paddedData[nearestPo2][2];
    
    // Copy dữ liệu thực tế
    for (var i = 0; i < n; i++) {
        paddedData[i][0] <== data[i][0];
        paddedData[i][1] <== data[i][1];
    }
    
    // Padding với ["0", "0"] cho các vị trí còn lại
    for (var i = n; i < nearestPo2; i++) {
        paddedData[i][0] <== 0;
        paddedData[i][1] <== 0;
    }

    // Tính leaf = Poseidon([UID, balance])
    signal leaves[nearestPo2];
    component leafHashers[nearestPo2];
    for (var i = 0; i < nearestPo2; i++) {
        leafHashers[i] = Poseidon(2);
        leafHashers[i].inputs[0] <== paddedData[i][0];
        leafHashers[i].inputs[1] <== paddedData[i][1];
        leaves[i] <== leafHashers[i].out;
    }

    // Mảng các tầng của Merkle tree
    signal levels[depth + 1][nearestPo2];  // levels[0] = leaves, cuối là root

    for (var i = 0; i < nearestPo2; i++) {
        levels[0][i] <== leaves[i];
    }

    // Hash từng tầng
    component hashers[depth][nearestPo2 / 2];
    for (var d = 1; d <= depth; d++) {
        var width = nearestPo2 >> d;
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

    log("Actual size:", n);
    log("Padded size:", nearestPo2);
    log("Root:", levels[depth][0]);
    log("Final hash:", finalHasher.out);

    // Tạo constraint finalHash input phải bằng với computed hash
    finalHash === finalHasher.out;
}

// Helper functions
function log_2(x) {
    var r = 0;
    while ((1 << r) < x) {
        r++;
    }
    return r;
}
