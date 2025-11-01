import { connectDB } from "@/lib/db";
import Wallet from "@/lib/models/Wallet";

export async function GET(params) {
  await connectDB();

  const Address = await Wallet.find();
  return Response.json(Address);
}
