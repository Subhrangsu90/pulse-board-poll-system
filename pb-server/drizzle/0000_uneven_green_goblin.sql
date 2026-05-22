CREATE TYPE "public"."poll_response_mode" AS ENUM('anonymous', 'authenticated');--> statement-breakpoint
CREATE TYPE "public"."poll_status" AS ENUM('draft', 'active', 'expired', 'completed');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('single_choice', 'multiple_choice');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oidc_sub" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"picture" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_oidc_sub_unique" UNIQUE("oidc_sub"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"default_response_mode" "poll_response_mode" DEFAULT 'anonymous' NOT NULL,
	"theme_mode" varchar(16) DEFAULT 'system' NOT NULL,
	"text_scale" varchar(16) DEFAULT 'comfortable' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"response_mode" "poll_response_mode" NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_published" boolean DEFAULT false,
	"status" "poll_status" DEFAULT 'draft',
	"public_slug" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "polls_public_slug_unique" UNIQUE("public_slug")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"question_text" text NOT NULL,
	"question_type" "question_type" DEFAULT 'single_choice',
	"is_required" boolean DEFAULT true,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"option_text" varchar(255) NOT NULL,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"user_id" uuid,
	"anonymous_user_identifier" varchar(255),
	"is_anonymous" boolean NOT NULL,
	"submitted_at" timestamp DEFAULT now(),
	"ip_address" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "response_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"user_id" uuid,
	"anonymous_identifier" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_sessions" ADD CONSTRAINT "response_sessions_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_sessions" ADD CONSTRAINT "response_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_option_id_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "polls_creator_created_at_idx" ON "polls" USING btree ("creator_id","created_at");--> statement-breakpoint
CREATE INDEX "polls_active_expires_at_idx" ON "polls" USING btree ("expires_at") WHERE "polls"."status" = 'active';--> statement-breakpoint
CREATE INDEX "questions_poll_order_idx" ON "questions" USING btree ("poll_id","order_index");--> statement-breakpoint
CREATE INDEX "options_question_order_idx" ON "options" USING btree ("question_id","order_index");--> statement-breakpoint
CREATE INDEX "responses_poll_submitted_at_idx" ON "responses" USING btree ("poll_id","submitted_at");--> statement-breakpoint
CREATE INDEX "responses_user_idx" ON "responses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "response_sessions_poll_created_at_idx" ON "response_sessions" USING btree ("poll_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "response_sessions_poll_user_unique" ON "response_sessions" USING btree ("poll_id","user_id") WHERE "response_sessions"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "response_sessions_poll_anonymous_unique" ON "response_sessions" USING btree ("poll_id","anonymous_identifier") WHERE "response_sessions"."anonymous_identifier" is not null;--> statement-breakpoint
CREATE INDEX "answers_option_created_at_idx" ON "answers" USING btree ("option_id","created_at");--> statement-breakpoint
CREATE INDEX "answers_question_option_idx" ON "answers" USING btree ("question_id","option_id");--> statement-breakpoint
CREATE UNIQUE INDEX "answers_response_option_unique" ON "answers" USING btree ("response_id","option_id");