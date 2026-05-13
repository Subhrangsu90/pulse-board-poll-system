CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"oidc_sub" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"picture" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_oidc_sub_unique" UNIQUE("oidc_sub"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
