"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Check,
  AlertCircle,
} from "lucide-react";

interface Contract {
  id: string;
  title: string;
  type: string;
  jurisdiction: string;
  content: {
    preamble: string;
    recitals: string;
    clauses: Array<{
      id: string;
      title: string;
      content: string;
      type: string;
      order: number;
    }>;
    signatureBlock: string;
  };
}

export default function CreateTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contractId = searchParams.get("from");

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Fetch the source contract
  useEffect(() => {
    if (!contractId) {
      setError("No contract specified");
      setLoading(false);
      return;
    }

    async function fetchContract() {
      try {
        const res = await fetch(`/api/contracts/${contractId}`);
        if (!res.ok) throw new Error("Contract not found");
        const data = await res.json();
        setContract(data.contract);
        setName(`${data.contract.title} Template`);
        setDescription(`Template based on ${data.contract.title}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contract");
      } finally {
        setLoading(false);
      }
    }

    fetchContract();
  }, [contractId]);

  const handleSave = async () => {
    if (!contract || !name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          type: contract.type,
          jurisdiction: contract.jurisdiction,
          content: contract.content,
          source_contract_id: contract.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create template");
      }

      setSuccess(true);
      setTimeout(() => router.push("/templates"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#529ec6]" />
      </div>
    );
  }

  if (error && !contract) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/contracts"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Contracts
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-emerald-800 mb-2">
            Template Created!
          </h2>
          <p className="text-emerald-600">Redirecting to templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/contracts"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Save as Template</h1>
          <p className="text-slate-500 text-sm">
            Create a reusable template from this contract
          </p>
        </div>
      </div>

      {/* Source Contract Info */}
      <div className="bg-slate-50 rounded-lg p-4 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-[#529ec6]/10 rounded-lg flex items-center justify-center">
          <FileText className="w-6 h-6 text-[#529ec6]" />
        </div>
        <div>
          <p className="text-sm text-slate-500">Creating template from</p>
          <p className="font-medium text-slate-900">{contract?.title}</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Template Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter template name"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description for this template"
            rows={3}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-transparent resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            href="/contracts"
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Template
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
