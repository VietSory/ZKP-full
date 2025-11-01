import { connectDB } from "@/lib/db";
import Wallet from "@/lib/models/Wallet";
import Transaction from "@/lib/models/Transaction";
import crypto from "crypto";
import { NextResponse } from "next/server";

function sign(data, privateKeyPem) {
  const sign = crypto.createSign("SHA256");
  sign.update(JSON.stringify(data));
  sign.end();
  return sign.sign(privateKeyPem, "hex");
}

function verify(data, signature, publicKeyPem) {
  const verify = crypto.createVerify("SHA256");
  verify.update(JSON.stringify(data));
  verify.end();
  return verify.verify(publicKeyPem, Buffer.from(signature, "hex"));
}

export async function POST(req) {
  await connectDB();

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { from, to, amount, privateKey } = body;
  if (!from || !to || !amount || !privateKey) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const sender = await Wallet.findOne({ address: from });
  const receiver = await Wallet.findOne({ address: to });

  if (!sender || !receiver)
    return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });

  if (sender.balance < amount)
    return NextResponse.json(
      { error: "Insufficient balance" },
      { status: 400 }
    );

  const txData = { from, to, amount };
  let signature;

  try {
    signature = sign(txData, privateKey);
  } catch (e) {
    return NextResponse.json(
      { error: "Sign error: " + e.message },
      { status: 400 }
    );
  }

  const isValid = verify(txData, signature, sender.publicKey);
  if (!isValid)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  await Transaction.create({ ...txData, signature });

  sender.balance -= amount;
  receiver.balance += amount;

  await sender.save();
  await receiver.save();

  return NextResponse.json({
    message: "Transaction successful",
    amount,
    signature,
  });
}
