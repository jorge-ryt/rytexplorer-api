/*
  Warnings:

  - You are about to drop the column `transaction_status` on the `transactions` table. All the data in the column will be lost.
  - Made the column `transaction_Status` on table `transactions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "transaction_status",
ALTER COLUMN "transaction_Status" SET NOT NULL,
ALTER COLUMN "transaction_Status" SET DEFAULT 'Pending';
