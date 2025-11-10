/*
  Warnings:

  - You are about to drop the column `block_id` on the `transactions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."transactions" DROP CONSTRAINT "transactions_block_id_fkey";

-- AlterTable
ALTER TABLE "blocks" ADD COLUMN     "blockTxnsCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "block_id",
ADD COLUMN     "block_number" TEXT;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_block_number_fkey" FOREIGN KEY ("block_number") REFERENCES "blocks"("block_number") ON DELETE SET NULL ON UPDATE CASCADE;
