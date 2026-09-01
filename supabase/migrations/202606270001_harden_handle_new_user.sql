-- Harden public.handle_new_user() so a profile-row problem can NEVER abort
-- GoTrue's auth.users insert. Previously any error raised inside this AFTER
-- INSERT trigger (notably a users_email_unique violation when an email already
-- exists under a different legacy id) rolled back user creation and surfaced to
-- the client as:
--   {"code":500,"error_code":"unexpected_failure","msg":"Database error saving new user"}
-- on email signup AND first-time Google OAuth. The function now best-effort
-- upserts the profile and swallows + logs any failure, so authentication itself
-- always succeeds. See LAUNCH-ISSUES.md -> AUTH-1.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(public.users.name, EXCLUDED.name),
        updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Email already exists under a different (legacy/orphaned) id. Do NOT rewrite
    -- that row's primary key here -- other tables FK to public.users(id). Let auth
    -- succeed; reconcile the profile out-of-band if needed.
    RAISE WARNING 'handle_new_user: profile upsert skipped for % (%): %',
      NEW.id, NEW.email, SQLERRM;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: profile upsert failed for % (%): %',
      NEW.id, NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists and points at the (now hardened) function. Idempotent.
DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping on_auth_user_created trigger creation due to insufficient privileges.';
END;
$$;
