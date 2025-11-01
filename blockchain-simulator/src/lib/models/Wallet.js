import mongoose from "mongoose";

const WalletSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true },
  publicKey: { type: String, required: true, unique: true },
  privateKey: { type: String, required: true },
  balance: { type: Number, default: 1000 },
});

export default mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);
