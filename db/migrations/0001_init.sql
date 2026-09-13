-- ─────────────────────────────────────────────────────────────
-- D1 Migration: Initial schema
-- Generated from prisma/schema.prisma (SQLite-compatible SQL)
-- Apply with:  npx wrangler d1 execute cart-db --file db/migrations/0001_init.sql --remote
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "currentStage" TEXT NOT NULL DEFAULT '',
    "stagesLog" TEXT NOT NULL DEFAULT '',
    "watermarkText" TEXT NOT NULL DEFAULT '',
    "watermarkPos" TEXT NOT NULL DEFAULT 'bottom-right',
    "watermarkMode" TEXT NOT NULL DEFAULT 'text',
    "watermarkLogo" TEXT NOT NULL DEFAULT '',
    "watermarkSize" TEXT NOT NULL DEFAULT 'medium',
    "watermarkFont" TEXT NOT NULL DEFAULT 'vazirmatn',
    "cardTheme" TEXT NOT NULL DEFAULT 'emerald',
    "priceMarkup" INTEGER NOT NULL DEFAULT 0,
    "priceRound" INTEGER NOT NULL DEFAULT 1000,
    "assistantUrl" TEXT NOT NULL DEFAULT '',
    "assistantKey" TEXT NOT NULL DEFAULT '',
    "assistantModel" TEXT NOT NULL DEFAULT '',
    "useExternal" BOOLEAN NOT NULL DEFAULT 0,
    "error" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "rawInput" TEXT NOT NULL DEFAULT '',
    "inputType" TEXT NOT NULL DEFAULT 'name',
    "name" TEXT NOT NULL DEFAULT '',
    "nameFa" TEXT NOT NULL DEFAULT '',
    "nameEn" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "usage" TEXT NOT NULL DEFAULT '',
    "price" TEXT NOT NULL DEFAULT '',
    "priceValue" INTEGER NOT NULL DEFAULT 0,
    "priceSource" TEXT NOT NULL DEFAULT '[]',
    "priceHistory" TEXT NOT NULL DEFAULT '[]',
    "link" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "specs" TEXT NOT NULL DEFAULT '[]',
    "html" TEXT NOT NULL DEFAULT '',
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "usageEn" TEXT NOT NULL DEFAULT '',
    "specsEn" TEXT NOT NULL DEFAULT '[]',
    "htmlEn" TEXT NOT NULL DEFAULT '',
    "theme" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "issues" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "BaleLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "direction" TEXT NOT NULL,
    "chatId" TEXT NOT NULL DEFAULT '',
    "userName" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL DEFAULT '',
    "ok" BOOLEAN NOT NULL DEFAULT 1,
    "error" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for foreign-key lookups
CREATE INDEX "Card_jobId_idx" ON "Card" ("jobId");
CREATE INDEX "ChatMessage_sessionId_idx" ON "ChatMessage" ("sessionId");
