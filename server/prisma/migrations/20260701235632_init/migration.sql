-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'onboarded',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditScore" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "breakdown" JSONB NOT NULL,
    "weeklyRevenue" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advance" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "scoreId" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "subAccountId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "repaymentRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "status" TEXT NOT NULL DEFAULT 'pending_consent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "Advance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repayment" (
    "id" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "weekRevenue" INTEGER NOT NULL,
    "mandateDebitRef" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Repayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "merchantTxRef" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerAccount" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "nombaVirtualAccountId" TEXT NOT NULL,
    "customerReference" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "closedAt" TIMESTAMP(3),
    "defaultAmountExpected" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerPayment" (
    "id" TEXT NOT NULL,
    "buyerAccountId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "payer" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "webhookRequestId" TEXT NOT NULL,
    "reconciliationStatus" TEXT NOT NULL DEFAULT 'exact',
    "amountExpected" INTEGER,
    "surplus" INTEGER,
    "shortfall" INTEGER,
    "senderAccountNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnmatchedPayment" (
    "id" TEXT NOT NULL,
    "nombaAccountId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "senderName" TEXT,
    "senderAccount" TEXT,
    "webhookRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnmatchedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutPayment" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL,
    "webhookRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringCharge" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "tokenId" TEXT NOT NULL,
    "webhookRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutFailure" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "orderId" TEXT,
    "amount" INTEGER,
    "failureReason" TEXT,
    "webhookRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutFailure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringFailure" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "amount" INTEGER,
    "failureReason" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 1,
    "webhookRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_customerId_key" ON "Merchant"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Advance_scoreId_key" ON "Advance"("scoreId");

-- CreateIndex
CREATE UNIQUE INDEX "Advance_mandateId_key" ON "Advance"("mandateId");

-- CreateIndex
CREATE UNIQUE INDEX "Repayment_mandateDebitRef_key" ON "Repayment"("mandateDebitRef");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_merchantTxRef_key" ON "Transfer"("merchantTxRef");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_requestId_key" ON "WebhookEvent"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerAccount_nombaVirtualAccountId_key" ON "BuyerAccount"("nombaVirtualAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerPayment_webhookRequestId_key" ON "BuyerPayment"("webhookRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "UnmatchedPayment_webhookRequestId_key" ON "UnmatchedPayment"("webhookRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutPayment_orderId_key" ON "CheckoutPayment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutPayment_webhookRequestId_key" ON "CheckoutPayment"("webhookRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringCharge_webhookRequestId_key" ON "RecurringCharge"("webhookRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutFailure_webhookRequestId_key" ON "CheckoutFailure"("webhookRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringFailure_webhookRequestId_key" ON "RecurringFailure"("webhookRequestId");

-- AddForeignKey
ALTER TABLE "CreditScore" ADD CONSTRAINT "CreditScore_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advance" ADD CONSTRAINT "Advance_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advance" ADD CONSTRAINT "Advance_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES "CreditScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repayment" ADD CONSTRAINT "Repayment_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "Advance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "Advance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerAccount" ADD CONSTRAINT "BuyerAccount_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerPayment" ADD CONSTRAINT "BuyerPayment_buyerAccountId_fkey" FOREIGN KEY ("buyerAccountId") REFERENCES "BuyerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutPayment" ADD CONSTRAINT "CheckoutPayment_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringCharge" ADD CONSTRAINT "RecurringCharge_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutFailure" ADD CONSTRAINT "CheckoutFailure_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringFailure" ADD CONSTRAINT "RecurringFailure_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
