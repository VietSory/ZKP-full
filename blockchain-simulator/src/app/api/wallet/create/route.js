import { connectDB } from "@/lib/db";
import Wallet from "@/lib/models/Wallet";
import crypto from "crypto";

export async function POST() {
  await connectDB();

  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "secp256k1",
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const address = crypto.createHash("sha256").update(publicKey).digest("hex");

  
  const wallet = await Wallet.create({
    publicKey,
    privateKey,
    address,
    balance: 1000,
  });

  return Response.json({
    address,
    publicKey,
    privateKey,
    balance: wallet.balance,
  });
}
