ALTER TABLE "user" ADD COLUMN IF NOT EXISTS staff_roles jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS directory_role_mask text;

UPDATE "user"
SET staff_roles = to_jsonb(ARRAY[lower(trim(staff_role))])
WHERE trim(COALESCE(staff_role, '')) <> ''
  AND staff_roles = '[]'::jsonb;
