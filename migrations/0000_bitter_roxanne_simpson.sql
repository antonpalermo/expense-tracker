CREATE TABLE "transactions" (
	"id" uuid DEFAULT gen_random_uuid(),
	"name" text,
	"description" text,
	"dateCreated" timestamp DEFAULT now(),
	"dateUpdated" timestamp,
	CONSTRAINT "transactions_id_unique" UNIQUE("id")
);
