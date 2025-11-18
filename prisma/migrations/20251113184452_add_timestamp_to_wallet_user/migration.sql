/*
  Warnings:

  - Added the required column `timestamp` to the `WalletUser` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WalletUser" ADD COLUMN     "timestamp" TEXT NOT NULL;
