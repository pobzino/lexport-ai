import { redirect } from "next/navigation";

export default function ContractPage({
  params,
}: {
  params: { id: string };
}) {
  // Redirect to the edit page
  redirect(`/contracts/${params.id}/edit`);
}
