/*
Warnings:

- You are about to drop the column `saleId` on the `CashFlowTransaction` table. All the data in the column will be lost.
- You are about to drop the column `isInstallment` on the `Sale` table. All the data in the column will be lost.
- A unique constraint covering the columns `[reversalOfId]` on the table `CashFlowTransaction` will be added. If there are existing duplicate values, this will fail.
- Added the required column `origin` to the `CashFlowTransaction` table without a default value. This is not possible if the table is not empty.
- Changed the type of `flow` on the `CashFlowTransaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
- Made the column `purchasedAt` on table `Sale` required. This step will fail if there are existing NULL values in that column.
 */
DROP VIEW IF EXISTS "CashFlowStats";

DROP VIEW IF EXISTS "CustomerStats";

DROP VIEW IF EXISTS "SaleStats";

DROP VIEW IF EXISTS "ProductStats";

-- CreateEnum
CREATE TYPE "TransactionOrigin" AS ENUM ('MANUAL', 'PAYMENT');

-- CreateEnum
CREATE TYPE "TransactionDirection" AS ENUM ('INFLOW', 'OUTFLOW');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD');

-- CreateEnum
CREATE TYPE "ReceivableStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "ReceivableType" AS ENUM ('IMMEDIATE', 'INSTALLMENT', 'TAB');

-- DropForeignKey
ALTER TABLE "CashFlowTransaction"
DROP CONSTRAINT "CashFlowTransaction_saleId_fkey";

-- AlterTable
ALTER TABLE "CashFlowTransaction"
DROP COLUMN "saleId",
ADD COLUMN "origin" "TransactionOrigin" NOT NULL,
ADD COLUMN "paymentId" TEXT,
ADD COLUMN "reversalOfId" TEXT,
DROP COLUMN "flow",
ADD COLUMN "flow" "TransactionDirection" NOT NULL;

-- AlterTable
ALTER TABLE "Sale"
DROP COLUMN "isInstallment",
ALTER COLUMN "purchasedAt"
SET
    NOT NULL;

-- CreateTable
CREATE TABLE
    "Payment" (
        "id" TEXT NOT NULL,
        "customerId" TEXT,
        "method" "PaymentMethod" NOT NULL,
        "total" INTEGER NOT NULL,
        "paidAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reversedAt" TIMESTAMP(3),
        CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
    );

-- CreateTable
CREATE TABLE
    "PaymentAllocation" (
        "id" TEXT NOT NULL,
        "amount" INTEGER NOT NULL,
        "paymentId" TEXT NOT NULL,
        "receivableId" TEXT NOT NULL,
        CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
    );

-- CreateTable
CREATE TABLE
    "Receivable" (
        "id" TEXT NOT NULL,
        "type" "ReceivableType" NOT NULL,
        "status" "ReceivableStatus" NOT NULL,
        "total" INTEGER NOT NULL,
        "paid" INTEGER NOT NULL DEFAULT 0,
        "installmentIdx" INTEGER,
        "installmentCount" INTEGER,
        "customerId" TEXT,
        "saleId" TEXT NOT NULL,
        "paidAt" TIMESTAMP(3),
        "dueDate" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deletedAt" TIMESTAMP(3),
        CONSTRAINT "Receivable_pkey" PRIMARY KEY ("id")
    );

-- CreateIndex
CREATE UNIQUE INDEX "CashFlowTransaction_reversalOfId_key" ON "CashFlowTransaction" ("reversalOfId");

-- AddForeignKey
ALTER TABLE "CashFlowTransaction" ADD CONSTRAINT "CashFlowTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowTransaction" ADD CONSTRAINT "CashFlowTransaction_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "CashFlowTransaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;