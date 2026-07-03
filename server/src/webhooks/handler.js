import crypto from "crypto";
import { Router } from "express";
import express from "express";
import db from "../db/prisma.js";
import { mandateDebitSuccess } from "./events/mandateDebitSuccess.js";
import { transferSuccess } from "./events/transferSuccess.js";
import { transferFailed } from "./events/transferFailed.js";
import { virtualAccountFunded } from "./events/virtualAccountFunded.js";
import { paymentSuccess } from "./events/paymentSuccess.js";
import { tokenizedCardCharge } from "./events/tokenizedCardCharge.js";
import { paymentFailed } from "./events/paymentFailed.js";
import { recurringChargeFailed } from "./events/recurringChargeFailed.js";

const router = Router();

const EVENT_HANDLERS = {
  "mandate.debit_success": mandateDebitSuccess,
  "transfer.success": transferSuccess,
  "transfer.failed": transferFailed,
  "virtual_account.funded": virtualAccountFunded,
  "payment_success": paymentSuccess,
  "tokenized_card.charge_success": tokenizedCardCharge,
  "payment_failure": paymentFailed,
  "tokenized_card.charge_failed": recurringChargeFailed,
};

// express.raw() must be applied to this route ONLY — do not use global express.json() before this
router.post(
  "/webhooks/nomba",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.header("nomba-signature");
    const expected = crypto
      .createHmac("sha256", process.env.NOMBA_WEBHOOK_SECRET)
      .update(req.body)
      .digest("hex");

    if (!sig || sig !== expected) {
      return res.status(401).send("invalid signature");
    }

    // Return 200 immediately — Nomba stops retrying on 2xx
    res.sendStatus(200);

    const event = JSON.parse(req.body.toString());

    try {
      await db.webhookEvent.create({
        data: {
          requestId: event.requestId,
          event: event.event,
          payload: event,
        },
      });
    } catch (e) {
      if (e.code === "P2002") return; // unique constraint — duplicate requestId, skip
      console.error(JSON.stringify({ type: "webhook_db_error", error: e.message }));
      return;
    }

    const handler = EVENT_HANDLERS[event.event];
    if (handler) {
      handler(event).catch((err) => {
        console.error(JSON.stringify({
          type: "webhook_handler_error",
          event: event.event,
          requestId: event.requestId,
          error: err.message,
        }));
      });
    }
  }
);

export default router;
