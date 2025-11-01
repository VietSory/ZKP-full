import { connectDB } from "@/lib/db";
import Transaction from "@/lib/models/Transaction";

export async function GET(request, context) {
  const address = context.params.address.trim();

  await connectDB();

  const txs = await Transaction.find({
    $or: [{ from: address }, { to: address }],
  }).sort({ timestamp: -1 });

  return Response.json(txs);
}
