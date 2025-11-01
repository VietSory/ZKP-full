pragma circom 2.1.6;

// Note: chưa test với bigint
template SumBalances(n) {
    signal input balances[n];       // Private input: danh sách số dư
    signal input expectedSum;       // Public input: tổng công khai

    signal output isCorrect;        // Output: 1 nếu tổng đúng, assert fail nếu sai

    signal sum[n + 1];
    signal diff;

    sum[0] <== 0;

    for (var i = 0; i < n; i++) {
        sum[i + 1] <== sum[i] + balances[i];
        log("Running sum after user", i, ":", sum[i + 1]);
    }

    // Tính difference
    diff <== sum[n] - expectedSum;
    
    log("Computed sum:", sum[n]);
    log("Expected sum:", expectedSum);
    log("Difference:", diff);
    
    // Assert: difference phải bằng 0
    assert(diff == 0);
    
    // Output 1 nếu pass (sẽ không đến được đây nếu assert fail)
    isCorrect <== 1;
}

component main = SumBalances(4);