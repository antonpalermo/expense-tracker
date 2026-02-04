CREATE TABLE "metadata" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"defaults" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "metadata_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "metadata_id_idx" ON "metadata" USING btree ("id");--> statement-breakpoint
CREATE INDEX "metadata_userId_idx" ON "metadata" USING btree ("user_id");