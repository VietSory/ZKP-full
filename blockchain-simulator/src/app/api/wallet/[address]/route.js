import { connectDB } from "@/lib/db";
import Wallet from "@/lib/models/Wallet";

export async function GET(request, context) {
  const address = context.params.address.trim();

  await connectDB();
  const wallet = await Wallet.findOne({ address });

  if (!wallet) return new Response("Wallet not found", { status: 404 });

  return Response.json({
    address: wallet.address,
    balance: wallet.balance,
    publicKey: wallet.publicKey,
    privateKey: wallet.privateKey,
  });
}
