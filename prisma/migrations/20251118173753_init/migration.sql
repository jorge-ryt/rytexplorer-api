/*
  Warnings:

  - The `unix_timestamp` column on the `transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "blocks" ALTER COLUMN "block_status" DROP NOT NULL;

-- AlterTable
ALTER TABLE "globalStats" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "nodesMap" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "transactionHistory" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "unix_timestamp",
ADD COLUMN     "unix_timestamp" BIGINT;
