# Quy trình setup và mô tả công nghệ lõi của dự án

## Chuẩn bị môi trường

### Yêu cầu quan trọng:

**1. Setup môi trường cơ bản:**

- Setup môi trường theo hướng dẫn tại: https://docs.google.com/document/d/1e6rXiNfLfY0tyGLNRCeN4jCv5qX2kDYzorYolOLc7ZY/edit?tab=t.m53yszyif1vt#heading=h.d97jf1b071bh
  - Lưu ý rằng document trên chỉ viết cho Windows, với Linux hay hệ điều hành khác cần cài đặt các môi trường:
    - git
    - circom
    - nodeJS, npm, npx
    - zksnark
  - Script có thể chạy sai trên các hệ điều hành khác nếu những lệnh CLI thao tác với các môi trường trên có sự khác biệt
- Clone thư viện circomlib vào thư mục gốc dự án:
  ```bash
  git clone https://github.com/iden3/circomlib.git
  ```
- Cài đặt các package cần thiết:
  ```bash
  npm install
  ```

**2. Về kết nối mạng và Powers of Tau:**

- **Khuyến nghị có mạng internet** khi chạy để tải các file Powers of Tau có sẵn
- Với mạch lớn, máy yếu có thể không chạy nổi quá trình trusted setup
- **Khi có mạng**: Script sẽ tự động tải file Powers of Tau đã được tạo sẵn từ storage
- **Khi offline**: Script buộc phải tự sinh Powers of Tau - có thể rất nặng tùy số lượng constraints
- **Vị trí file**: Các file Powers of Tau được lưu trong `compiler/powers_of_tau/`
- **Quy tắc đặt tên**: Số k cuối tên file cho biết hỗ trợ tối đa 2^k constraints
- **Kích thước file**:
  - Mạch cực lớn (k=32): có thể lên đến 9GB
  - Mạch demo hiện tại (k≈15): chỉ khoảng 36MB vẫn có thể download nhanh qua script
- **Tải trước**: Có thể tải Powers of Tau từ https://github.com/iden3/snarkjs#7-prepare-phase-2 và đặt vào thư mục `compiler/powers_of_tau/` nếu lo ngại download bằng script

**3. Thư mục làm việc:**

- **Luôn chạy lệnh từ thư mục gốc dự án**
- Nếu cd sang thư mục khác sẽ gây lỗi

## Hướng dẫn test mạch Circom

### Chuẩn bị file:

1. Tạo folder trong `circuits/` (ví dụ: `all_non_negative`)
2. Trong folder vừa tạo cần có:
   - Duy nhất 1 file `.circom` chứa mạch cần test (Nếu có nhiều thì script có thể sẽ pick sai)
   - File `input.json` chứa input data (không có comment như trên web)

### Chạy test:

```bash
node .\compiler\ <đường_dẫn_đến_thư_mục_chứa_mạch>
```

**Ví dụ:**

```bash
node .\compiler\ .\circuits\all_non_negative\
```

### Mạch chính:

- **Vị trí**: `circuits/prove_PoR/`
- **Templates**: `circuits/prove_PoR/templates/` - chứa các mạch phụ trợ đã loại bỏ hàm main để mạch chính include

### Kết quả:

Sau khi chạy xong, trong thư mục chứa mạch sẽ có folder `output/` chứa:

- `proof.json` - Bằng chứng ZK
- `public.json` - Public inputs/outputs
- `verification_key.json` - Key để verify
- **3 file trên là những gì verifier cần để xác minh bằng chứng**

## Verifier
- Thư mục `verifier/` có thể tách riêng hoàn toàn khỏi dự án vì xem nó như một bên thứ 3 verify bằng chứng, mỗi thư mục con trong đó đều có readme, hãy đọc nó

## Công nghệ ZK-SNARK được sử dụng

### Scheme: Groth16

Bằng chứng được tạo sử dụng **Groth16** - một trong những ZK-SNARK scheme phổ biến và hiệu quả nhất hiện tại.

**Đặc điểm Groth16:**

- **Proof size**: Cố định 3 group elements (~200 bytes)
- **Verification**: Rất nhanh, phù hợp production
- **Trusted Setup**: Cần ceremony riêng cho mỗi circuit
- **Security**: Mature, đã được audit kỹ lưỡng

### Công nghệ stack:

**1. Circom (Circuit Compiler)**

- Ngôn ngữ domain-specific (DSL) để viết arithmetic circuits
- Compile ra R1CS (Rank-1 Constraint System), WASM, và symbol files
- Cho phép viết logic phức tạp một cách trực quan

**2. SnarkJS**

- Thư viện JavaScript để làm việc với ZK-SNARKs
- Xử lý trusted setup, generate/verify proofs
- Hỗ trợ nhiều curve và schemes

**3. BN128 Elliptic Curve**

- Pairing-friendly curve cho cryptographic operations
- Hỗ trợ bilinear pairings cần thiết cho Groth16
- Balance tốt giữa security và performance

### Quy trình Trusted Setup:

**Phase 1: Powers of Tau**

- Tạo common reference string cho tất cả circuits cùng curve
- Có thể tái sử dụng cho nhiều circuits khác nhau
- Cần nhiều người contribute để đảm bảo security

**Phase 2: Circuit-specific Setup**

- Generate proving key và verifying key riêng cho từng circuit
- Proving key (lớn): dùng để tạo proofs
- Verifying key (nhỏ): dùng để verify proofs

### Constraint System (R1CS):

- Biểu diễn circuit dưới dạng hệ phương trình dạng A⊙B = C
- Mỗi constraint đại diện một phép toán cơ bản
- Witness chứa tất cả intermediate values thỏa mãn constraints

*Đã hoàn thành phần cốt lõi nhất của dự án, từ các user trong database, render thành merkle tree, mạch circom và input cho việc sinh bằng chứng. Chi tiết hãy thử:*
- Thay đổi balance hoặc số lượng user trong `database/storages/users.json`
- Chạy lệnh `node .\gen_proof\`
- Bằng chứng sẽ được sinh tại thư mục `output` của mạch chính `ProvePoR` đã đề cập ở trên.