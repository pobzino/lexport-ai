import type { SupabaseClient } from "./client";
import type { Contract, ContractStatus, ContractType, Jurisdiction } from "@lexport/shared";

export interface CreateContractInput {
  type: ContractType;
  title: string;
  jurisdiction: Jurisdiction;
  content?: Record<string, unknown>;
}

export interface UpdateContractInput {
  title?: string;
  status?: ContractStatus;
  content?: Record<string, unknown>;
}

// Note: These functions use 'any' for Supabase operations since we don't have
// generated types from the database schema. In production, generate types with:
// npx supabase gen types typescript --project-id <your-project-id>

export function createContractsApi(client: SupabaseClient) {
  return {
    async list(userId: string) {
      const { data, error } = await client
        .from("contracts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as Contract[];
    },

    async get(id: string) {
      const { data, error } = await client
        .from("contracts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as Contract;
    },

    async create(userId: string, input: CreateContractInput) {
      const insertData = {
        user_id: userId,
        type: input.type,
        title: input.title,
        jurisdiction: input.jurisdiction,
        content: input.content || {},
        status: "draft" as const,
      };

      const { data, error } = await client
        .from("contracts")
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Contract;
    },

    async update(id: string, input: UpdateContractInput) {
      const updateData = {
        ...input,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await client
        .from("contracts")
        .update(updateData as never)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Contract;
    },

    async delete(id: string) {
      const { error } = await client.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },

    async getByStatus(userId: string, status: ContractStatus) {
      const { data, error } = await client
        .from("contracts")
        .select("*")
        .eq("user_id", userId)
        .eq("status", status)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as Contract[];
    },
  };
}
