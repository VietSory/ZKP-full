Verifier này coi như là một bên thứ 3 đã có đầy đủ môi trường, nó xác minh rằng 3 file bằng chứng đã được công bố được sinh ra từ mạch circom đã được công bố cho cộng đồng kiểm chứng.

Đảm bảo rằng 3 file bằng chứng được công bố được tạo ra từ đúng mạch đã công bố. Nếu không, bằng chứng là vô nghĩa.

Script tại index.js thực hiện tính lại verification_key.json từ mạch và file zkey đã công bố, sau đó so sánh với verification_key.json bên sàn công bố.

Chạy (Tại thư mục gốc dự án):
```bash
node .\verifier\circuit_verifier\ .\circuits\prove_PoR\prove_PoR.circom .\circuits\prove_PoR\output\prove_PoR_final.zkey .\circuits\prove_PoR\output\verification_key.json
```

trong đó:
- ".\circuits\prove_PoR\prove_PoR.circom" đường dẫn đến mạch
- ".\circuits\prove_PoR\output\prove_PoR_final.zkey" file zkey được công bố
- ".\circuits\prove_PoR\output\verification_key.json" file verification_key đã được công bố