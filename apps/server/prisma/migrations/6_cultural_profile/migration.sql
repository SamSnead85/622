-- AlterTable
ALTER TABLE "User" ADD COLUMN "culturalProfile" TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE "User" ADD COLUMN "customGreeting" TEXT;
