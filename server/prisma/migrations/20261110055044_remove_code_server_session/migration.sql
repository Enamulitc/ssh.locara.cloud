/*
  Warnings:

  - You are about to drop the `CodeServerSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CodeServerSession" DROP CONSTRAINT "CodeServerSession_hostId_fkey";

-- DropForeignKey
ALTER TABLE "CodeServerSession" DROP CONSTRAINT "CodeServerSession_kubeClusterId_fkey";

-- DropForeignKey
ALTER TABLE "CodeServerSession" DROP CONSTRAINT "CodeServerSession_userId_fkey";

-- DropTable
DROP TABLE "CodeServerSession";
