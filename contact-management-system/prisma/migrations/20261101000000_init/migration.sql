-- Migration: 20261101000000_init
-- Description: Create users, contacts, and revoked_tokens tables with partial unique indexes

-- CreateTable users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable contacts
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "companyName" TEXT,
    "jobTitle" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contacts_at_least_one_contact_method" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL)
);

-- CreateTable revoked_tokens
CREATE TABLE "revoked_tokens" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex for contacts
CREATE INDEX "contacts_ownerId_idx" ON "contacts"("ownerId");
CREATE INDEX "contacts_name_idx" ON "contacts"("name");
CREATE INDEX "contacts_email_idx" ON "contacts"("email");
CREATE INDEX "contacts_phone_idx" ON "contacts"("phone");
CREATE INDEX "contacts_companyName_idx" ON "contacts"("companyName");
CREATE INDEX "contacts_city_idx" ON "contacts"("city");
CREATE INDEX "contacts_country_idx" ON "contacts"("country");
CREATE INDEX "contacts_createdAt_idx" ON "contacts"("createdAt");

-- Partial Unique Indexes for duplicate prevention per owner (ignores NULL values)
CREATE UNIQUE INDEX "contacts_ownerId_email_unique" ON "contacts"("ownerId", "email") WHERE "email" IS NOT NULL;
CREATE UNIQUE INDEX "contacts_ownerId_phone_unique" ON "contacts"("ownerId", "phone") WHERE "phone" IS NOT NULL;

-- CreateIndex for revoked_tokens
CREATE UNIQUE INDEX "revoked_tokens_tokenId_key" ON "revoked_tokens"("tokenId");
CREATE INDEX "revoked_tokens_tokenId_idx" ON "revoked_tokens"("tokenId");
CREATE INDEX "revoked_tokens_expiresAt_idx" ON "revoked_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revoked_tokens" ADD CONSTRAINT "revoked_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
