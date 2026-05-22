CREATE TABLE "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "key_hash" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "last_used_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "api_keys_user_idx" ON "api_keys"("user_id");
