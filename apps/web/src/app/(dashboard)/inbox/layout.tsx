import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const INBOX_OWNER_EMAIL = "akpobor2000@gmail.com";

export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== INBOX_OWNER_EMAIL) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
