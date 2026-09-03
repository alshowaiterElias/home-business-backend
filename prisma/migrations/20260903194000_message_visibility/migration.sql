-- Per-user message hiding. This preserves the message for the other
-- conversation participant while allowing the current user to hide it.
CREATE TABLE `message_visibility` (
    `id` VARCHAR(191) NOT NULL,
    `message_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `deleted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `message_visibility_message_id_user_id_key`(`message_id`, `user_id`),
    INDEX `message_visibility_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `message_visibility`
    ADD CONSTRAINT `message_visibility_message_id_fkey`
    FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `message_visibility`
    ADD CONSTRAINT `message_visibility_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
