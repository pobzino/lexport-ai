"use client";

import { Plus, X, User, Mail, Briefcase } from "lucide-react";

export interface Signer {
  id: string;
  name: string;
  email: string;
  title?: string;
}

export interface SignerGroup {
  role: string;
  roleLabel: string;
  signers: Signer[];
  minSigners?: number;
  maxSigners?: number;
}

interface DynamicSignersSectionProps {
  signerGroups: SignerGroup[];
  onChange: (groups: SignerGroup[]) => void;
  allowAddRole?: boolean;
  availableRoles?: { role: string; label: string }[];
}

export function DynamicSignersSection({
  signerGroups,
  onChange,
  allowAddRole = false,
  availableRoles = [],
}: DynamicSignersSectionProps) {
  const generateId = () => `signer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const updateSigner = (groupIndex: number, signerIndex: number, field: keyof Signer, value: string) => {
    const newGroups = [...signerGroups];
    newGroups[groupIndex].signers[signerIndex] = {
      ...newGroups[groupIndex].signers[signerIndex],
      [field]: value,
    };
    onChange(newGroups);
  };

  const addSigner = (groupIndex: number) => {
    const newGroups = [...signerGroups];
    const group = newGroups[groupIndex];
    const maxSigners = group.maxSigners || 10;

    if (group.signers.length < maxSigners) {
      group.signers.push({
        id: generateId(),
        name: "",
        email: "",
      });
      onChange(newGroups);
    }
  };

  const removeSigner = (groupIndex: number, signerIndex: number) => {
    const newGroups = [...signerGroups];
    const group = newGroups[groupIndex];
    const minSigners = group.minSigners || 1;

    if (group.signers.length > minSigners) {
      group.signers.splice(signerIndex, 1);
      onChange(newGroups);
    }
  };

  const addRole = (role: string, label: string) => {
    const newGroups = [...signerGroups];
    newGroups.push({
      role,
      roleLabel: label,
      signers: [{ id: generateId(), name: "", email: "" }],
      minSigners: 1,
      maxSigners: 10,
    });
    onChange(newGroups);
  };

  const removeRole = (groupIndex: number) => {
    const newGroups = [...signerGroups];
    newGroups.splice(groupIndex, 1);
    onChange(newGroups);
  };

  // Get roles that haven't been added yet
  const unusedRoles = availableRoles.filter(
    (r) => !signerGroups.some((g) => g.role === r.role)
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">Signers</h3>
          <p className="text-sm text-slate-500">
            Add the people who will sign this contract
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <User className="w-4 h-4" />
          <span>
            {signerGroups.reduce((acc, g) => acc + g.signers.length, 0)} signer(s)
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {signerGroups.map((group, groupIndex) => (
          <div
            key={group.role}
            className="border border-slate-200 rounded-lg overflow-hidden"
          >
            {/* Role Header */}
            <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{group.roleLabel}</h4>
                  <p className="text-xs text-slate-500">
                    {group.signers.length} signer{group.signers.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {allowAddRole && signerGroups.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeRole(groupIndex)}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  title="Remove this party"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Signers List */}
            <div className="p-4 space-y-3">
              {group.signers.map((signer, signerIndex) => (
                <div
                  key={signer.id}
                  className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex-1 grid md:grid-cols-3 gap-3">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={signer.name}
                          onChange={(e) =>
                            updateSigner(groupIndex, signerIndex, "name", e.target.value)
                          }
                          placeholder="John Smith"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={signer.email}
                          onChange={(e) =>
                            updateSigner(groupIndex, signerIndex, "email", e.target.value)
                          }
                          placeholder="john@company.com"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        />
                      </div>
                    </div>

                    {/* Title (optional) */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Title <span className="text-slate-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={signer.title || ""}
                        onChange={(e) =>
                          updateSigner(groupIndex, signerIndex, "title", e.target.value)
                        }
                        placeholder="CEO, Founder, etc."
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                      />
                    </div>
                  </div>

                  {/* Remove Signer Button */}
                  {group.signers.length > (group.minSigners || 1) && (
                    <button
                      type="button"
                      onClick={() => removeSigner(groupIndex, signerIndex)}
                      className="mt-6 p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remove signer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {/* Add Signer Button */}
              {group.signers.length < (group.maxSigners || 10) && (
                <button
                  type="button"
                  onClick={() => addSigner(groupIndex)}
                  className="w-full py-2 px-4 border-2 border-dashed border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add another {group.roleLabel} signer
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add Role Button */}
        {allowAddRole && unusedRoles.length > 0 && (
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-3">Add another party to this contract:</p>
            <div className="flex flex-wrap gap-2">
              {unusedRoles.map((role) => (
                <button
                  key={role.role}
                  type="button"
                  onClick={() => addRole(role.role, role.label)}
                  className="px-3 py-1.5 text-sm font-medium text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to create initial signer groups from party data
export function createSignerGroups(
  parties: Array<{
    role: string;
    roleLabel: string;
    name?: string;
    email?: string;
    company?: string;
  }>
): SignerGroup[] {
  return parties.map((party) => ({
    role: party.role,
    roleLabel: party.roleLabel,
    signers: [
      {
        id: `signer-${party.role}-1`,
        name: party.name || "",
        email: party.email || "",
        title: party.company || "",
      },
    ],
    minSigners: 1,
    maxSigners: 10,
  }));
}

// Helper to convert signer groups back to metadata format
export function signersToMetadata(
  groups: SignerGroup[]
): Record<string, { name: string; email: string; role: string; signers?: Signer[] }> {
  const result: Record<string, { name: string; email: string; role: string; signers?: Signer[] }> = {};

  for (const group of groups) {
    // Use first signer as the primary for backwards compatibility
    const primarySigner = group.signers[0];
    result[group.role] = {
      name: primarySigner?.name || "",
      email: primarySigner?.email || "",
      role: group.role,
      // Include all signers if more than one
      signers: group.signers.length > 1 ? group.signers : undefined,
    };
  }

  return result;
}
