-- DATA-4 (P2): The app calls
--   supabase.rpc("increment_ai_chat_messages", { user_uuid })
-- in apps/web/src/app/api/contracts/[id]/chat/route.ts, but the function exists
-- in no migration. The call therefore errors silently, ai_chat_messages_used is
-- never incremented, and the free-tier AI-chat limit is not enforced (revenue
-- leak). Create it, mirroring increment_ai_contracts_used
-- (20241231_add_subscription_system.sql). The ai_chat_messages_used column was
-- added in 202603120330_invoice_reminder_and_user_onboarding_parity.sql.
-- See LAUNCH-ISSUES.md -> DATA-4.

CREATE OR REPLACE FUNCTION increment_ai_chat_messages(user_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET ai_chat_messages_used = COALESCE(ai_chat_messages_used, 0) + 1,
        updated_at = NOW()
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
