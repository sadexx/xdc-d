-- Template: Apply DDL stored in a variable, then record it in migration_logs.
-- Replace metadata values and the v_sql content before running.
-- Notes:
--   - This DO block runs inside a transaction; on error everything will be rolled back.
--   - Statements that cannot run inside a transaction (e.g., CREATE INDEX CONCURRENTLY) must be executed separately.
DO
$$
DECLARE
  -- ---- METADATA: replace these values ----
  v_migration_file_name text := 'Migration1756123009571';   -- unique file name
  v_applied_by text := 'Anton';                             -- operator name/email
  v_migration_type text := 'applied';                       -- enum label used in your table (string)
  v_notes text := 'Applied via pgAdmin Query Tool';         -- free-form notes
  -- -----------------------------------------

  -- The DDL (or multi-statement SQL) to be executed and recorded.
  -- Keep statements separated by semicolons.
  v_sql text := $sql$

ALTER TABLE "promo_campaigns" ADD COLUMN IF NOT EXISTS "banner_display" boolean NOT NULL;
ALTER TABLE "promo_campaigns" ADD COLUMN IF NOT EXISTS "conditions_url" character varying;

$sql$;

  v_already_exists boolean := false;
  v_lock_acquired boolean;
  v_stmt text;
  v_enum_exists boolean;
BEGIN
  -- Validate that provided migration_type matches an enum label for migration_logs.migration_type
  SELECT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'migration_logs_migration_type_enum'::regtype
      AND enumlabel = v_migration_type
  ) INTO v_enum_exists;

  IF NOT v_enum_exists THEN
    RAISE EXCEPTION 'Invalid migration_type value: %. Valid labels must match migration_logs.migration_type enum.', v_migration_type;
  END IF;

  -- -- Normalize line endings: convert CRLF -> LF
  v_sql := regexp_replace(v_sql, E'\r\n', E'\n', 'g');

  -- -- Trim leading/trailing whitespace (spaces, tabs, newlines)
  v_sql := regexp_replace(v_sql, E'^\\s+|\\s+$', '', 'g');

  -- -- Optional: collapse sequences of 3+ newlines to exactly two (keeps some paragraph spacing)
  v_sql := regexp_replace(v_sql, E'\n{3,}', E'\n\n', 'g');

  -- Guard: check migration_logs to avoid double-registration (compare enum column as text)
  SELECT EXISTS (
    SELECT 1 FROM migration_logs
    WHERE migration_file_name = v_migration_file_name
      AND migration_type::text = v_migration_type
  ) INTO v_already_exists;

  IF v_already_exists THEN
    RAISE NOTICE 'Migration log entry % with type % already exists. Aborting.', v_migration_file_name, v_migration_type;
    RETURN;
  END IF;

  -- Acquire an advisory lock to prevent concurrent runs.
  -- Use a fixed numeric key unique for environment.
  v_lock_acquired := pg_try_advisory_lock(1234567890);
  IF NOT v_lock_acquired THEN
    RAISE EXCEPTION 'Could not acquire migration advisory lock. Another process may be running migrations.';
  END IF;

  BEGIN
    -- Execute each statement from v_sql (split by semicolon). Trim and ignore empty parts.
    FOR v_stmt IN
      SELECT trim(both ' ' FROM s) AS stmt
      FROM regexp_split_to_table(v_sql, E';') AS s
    LOOP
      IF v_stmt <> '' THEN
        EXECUTE v_stmt;
      END IF;
    END LOOP;

    -- Insert audit row into migration_logs
    INSERT INTO migration_logs (
      migration_file_name,
      applied_by,
      migration_type,
      sql_text,
      notes
    ) VALUES (
      v_migration_file_name,
      v_applied_by,
      v_migration_type::migration_logs_migration_type_enum,
      v_sql,
      v_notes
    );

    -- Release advisory lock
    PERFORM pg_advisory_unlock(1234567890);

    RAISE NOTICE 'Migration % applied and registered successfully.', v_migration_file_name;
  EXCEPTION WHEN OTHERS THEN
    -- Ensure the advisory lock is released on error as well
    PERFORM pg_advisory_unlock(1234567890);
    RAISE;
  END;

END;
$$ LANGUAGE plpgsql;