-- Add person_id + photo_year columns and back-relation so a Person can have
-- a gallery of photos (the previous Person.primary_photo_id only tracked
-- the single currently-displayed photo).

ALTER TABLE "media"
  ADD COLUMN "person_id"  UUID,
  ADD COLUMN "photo_year" INT;

ALTER TABLE "media"
  ADD CONSTRAINT "media_person_id_fkey"
  FOREIGN KEY ("person_id") REFERENCES "persons"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_media_person" ON "media"("person_id");

-- Backfill: every existing primary photo is owned by the person who claims
-- it, so the gallery query picks them up too.
UPDATE "media" m
SET "person_id" = p.id
FROM "persons" p
WHERE p."primary_photo_id" = m.id
  AND m."person_id" IS NULL;
