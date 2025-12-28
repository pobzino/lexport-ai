import { getPortalSession, getPortalContracts } from "@/lib/portal-auth";
import { PortalContracts } from "@/components/portal/PortalContracts";

interface SignatureRequest {
  id: string;
  status: string;
  signer_name: string;
  signer_role: string;
  token: string;
  signed_at: string | null;
  contract: {
    id: string;
    title: string;
    type: string;
    jurisdiction: string;
    status: string;
    content?: string;
    created_at: string;
    updated_at: string;
    payment_required: boolean;
    payment_amount: number | null;
    payment_currency: string | null;
    payment_status: string;
  };
}

export default async function PortalDashboardPage() {
  const session = await getPortalSession();
  if (!session) return null;

  const rawContracts = await getPortalContracts(session.email);

  // Transform the data - Supabase relations may return arrays
  const contracts: SignatureRequest[] = rawContracts
    .map((item: Record<string, unknown>) => {
      const contractData = item.contract as
        | Record<string, unknown>
        | Record<string, unknown>[];
      // Handle both single object and array formats
      const contract = Array.isArray(contractData) ? contractData[0] : contractData;
      if (!contract) return null;
      return {
        id: item.id as string,
        status: item.status as string,
        signer_name: item.signer_name as string,
        signer_role: item.signer_role as string,
        token: item.token as string,
        signed_at: item.signed_at as string | null,
        contract: contract as SignatureRequest["contract"],
      };
    })
    .filter((c): c is SignatureRequest => c !== null);

  return <PortalContracts contracts={contracts} email={session.email} />;
}
