CREATE TABLE `classrooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`teacherId` int NOT NULL,
	`joinCode` varchar(8) NOT NULL,
	`gradeLevel` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `classrooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `classrooms_joinCode_unique` UNIQUE(`joinCode`)
);
--> statement-breakpoint
CREATE TABLE `student_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`classroomId` int,
	`parentId` int,
	`teacherId` int,
	`totalXP` int NOT NULL DEFAULT 0,
	`totalStars` int NOT NULL DEFAULT 0,
	`sessionsCompleted` int NOT NULL DEFAULT 0,
	`totalFocusTimeSec` int NOT NULL DEFAULT 0,
	`streakDays` int NOT NULL DEFAULT 0,
	`highScore` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(512) NOT NULL,
	`fileUrl` text,
	`fileType` enum('curriculum_pdf','parent_iep_report','student_homework') NOT NULL,
	`mimeType` varchar(128),
	`fileSizeBytes` int,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`aiMetadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','teacher','student','parent') NOT NULL DEFAULT 'student';--> statement-breakpoint
ALTER TABLE `users` ADD `avatarSeed` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `spacePasscode` varchar(8);