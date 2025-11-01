const db = require("../../database");
const express = require("express");
const { requireLogin } = require("../middleware");
const fetch = require("node-fetch");
const router = express.Router();

// GET /deposits
router.get("/", requireLogin, async (req, res) => {
  try {
    const deposits = await db.getDepositHistory(req.session.UID);
    res.json(deposits);
  } catch (error) {
    console.error("Error fetching deposits:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /deposits - Blockchain integration
router.post("/", async (req, res) => {
  try {
    // This endpoint is for backend processing only
    // It will be called by a scheduled task to process blockchain deposits

    const config = await db.readData("config.json");
    const blockchainApiUrl = config.blockchainApiUrl;

    // Fetch blockchain transactions
    const response = await fetch(blockchainApiUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch blockchain data");
    }

    const blockchainTransactions = await response.json();

    // Sort transactions by timestamp (oldest to newest)
    blockchainTransactions.sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    const newestDepositID = await db.getNewestDepositID();

    let processedCount = 0;
    let lastProcessedID = newestDepositID;

    for (const tx of blockchainTransactions) {
      // Skip if we've already processed this transaction
      if (newestDepositID && tx._id === newestDepositID) {
        break;
      }

      // Check if this is a deposit to our exchange wallet
      if (tx.to === config.exchangeWalletAddress) {
        // Find user by wallet address
        const uid = await db.getUIDbyWalletAddress(tx.from);

        if (uid) {
          // Process deposit
          await db.deposit(uid, tx.amount);
          processedCount++;
        }
      }

      lastProcessedID = tx._id;
    }

    // Update newest deposit ID
    if (lastProcessedID !== newestDepositID) {
      await db.setNewestDepositID(lastProcessedID);
    }

    res.json({
      message: `Processed ${processedCount} deposits`,
      processedCount,
    });
  } catch (error) {
    console.error("Error processing deposits:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
