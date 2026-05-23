-- Fix #6: add unique constraint on gmailId to prevent duplicate emails on sync
ALTER TABLE `emails` ADD UNIQUE INDEX `emails_gmailId_unique` (`gmailId`);
