ALTER TABLE "user_preferences" ADD COLUMN "theme_mode" varchar(16) DEFAULT 'system' NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "text_scale" varchar(16) DEFAULT 'comfortable' NOT NULL;
