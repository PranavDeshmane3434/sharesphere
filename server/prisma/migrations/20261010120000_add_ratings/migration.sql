CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ratings_value_check" CHECK ("value" >= 1 AND "value" <= 5),
    CONSTRAINT "ratings_user_id_resource_id_key" UNIQUE ("user_id", "resource_id"),
    CONSTRAINT "ratings_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ratings_resource_id_fkey"
        FOREIGN KEY ("resource_id") REFERENCES "resources"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);