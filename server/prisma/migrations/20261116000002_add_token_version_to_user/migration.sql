-- CreateTokenVersion
-- This migration adds a tokenVersion column to the users table with a default value of 0.

ALTER TABLE `users` ADD COLUMN `tokenVersion` INT NOT NULL DEFAULT 0;
