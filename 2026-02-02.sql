--
-- Table structure for table `Giveaways`
--

CREATE TABLE `Giveaways` (
  `id` int NOT NULL,
  `guildId` text NOT NULL,
  `channelId` text NOT NULL,
  `messageId` text NOT NULL,
  `duration` bigint NOT NULL,
  `winners` int NOT NULL,
  `prize` text NOT NULL,
  `participants` longtext NOT NULL,
  `ended` tinyint(1) NOT NULL DEFAULT '0',
  `metadata` longtext,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for table `Giveaways`
--
ALTER TABLE `Giveaways`
  ADD PRIMARY KEY (`id`),
  ADD KEY `messageId` (`messageId`(255)),
  ADD KEY `guildId` (`guildId`(255));

--
-- AUTO_INCREMENT for table `Giveaways`
--
ALTER TABLE `Giveaways`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;
