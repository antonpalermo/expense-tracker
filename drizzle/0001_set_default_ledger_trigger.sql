-- Custom SQL migration file, put your code below! --
DROP TRIGGER IF EXISTS set_default_ledger_trigger;

-- this trigger will set use the user_id as id to create a new metadata record
-- if user_id exist then update the existing record.
CREATE TRIGGER IF NOT EXISTS set_default_ledger_trigger AFTER INSERT ON ledger BEGIN
INSERT INTO
  metadata (id, defaults, user_id)
VALUES
  (
    NEW.user_id,
    json_object ('ledgerId', NEW.id),
    NEW.user_id
  ) ON CONFLICT (user_id) DO
UPDATE
SET
  defaults = json_set (
    COALESCE(metadata.defaults, json ('{}')),
    '$.ledgerId',
    NEW.id
  );

END;
