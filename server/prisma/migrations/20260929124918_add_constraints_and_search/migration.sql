ALTER TABLE "users" ADD CONSTRAINT "credits_non_negative" CHECK ("credits" >= 0);

ALTER TABLE "resources" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', "title" || ' ' || coalesce("description", ''))
  ) STORED;

CREATE INDEX "resources_search_vector_idx" ON "resources" USING GIN ("search_vector");