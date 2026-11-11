-- CreateEnum
CREATE TYPE "DbEngine" AS ENUM ('MYSQL', 'POSTGRES');

-- CreateEnum
CREATE TYPE "DbCredentialType" AS ENUM ('PASSWORD');

-- CreateTable
CREATE TABLE "DbConnection" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "ownerTeamId" TEXT,
    "name" TEXT NOT NULL,
    "engine" "DbEngine" NOT NULL,
    "hostname" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "database" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "tunnelHostId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "folder" TEXT,
    "color" TEXT,
    "lastConnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DbConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DbCredential" (
    "id" TEXT NOT NULL,
    "dbConnectionId" TEXT NOT NULL,
    "type" "DbCredentialType" NOT NULL DEFAULT 'PASSWORD',
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DbCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DbConnection_ownerUserId_idx" ON "DbConnection"("ownerUserId");

-- CreateIndex
CREATE INDEX "DbConnection_ownerTeamId_idx" ON "DbConnection"("ownerTeamId");

-- CreateIndex
CREATE INDEX "DbConnection_tunnelHostId_idx" ON "DbConnection"("tunnelHostId");

-- CreateIndex
CREATE UNIQUE INDEX "DbCredential_dbConnectionId_key" ON "DbCredential"("dbConnectionId");

-- AddForeignKey
ALTER TABLE "DbConnection" ADD CONSTRAINT "DbConnection_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DbConnection" ADD CONSTRAINT "DbConnection_ownerTeamId_fkey" FOREIGN KEY ("ownerTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DbConnection" ADD CONSTRAINT "DbConnection_tunnelHostId_fkey" FOREIGN KEY ("tunnelHostId") REFERENCES "Host"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DbCredential" ADD CONSTRAINT "DbCredential_dbConnectionId_fkey" FOREIGN KEY ("dbConnectionId") REFERENCES "DbConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
