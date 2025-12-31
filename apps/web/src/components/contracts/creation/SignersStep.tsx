"use client";

import { useState } from "react";
import { Plus, X, User, Mail, Briefcase, AlertCircle, Users, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

interface SignersStepProps {
  signerGroups: SignerGroup[];
  onChange: (groups: SignerGroup[]) => void;
  contractType: string;
  allowAddRole?: boolean;
  availableRoles?: { role: string; label: string }[];
}

export function SignersStep({
  signerGroups,
  onChange,
  contractType,
  allowAddRole = false,
  availableRoles = [],
}: SignersStepProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(signerGroups.map((g) => g.role))
  );

  const generateId = () => `signer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const totalSigners = signerGroups.reduce((acc, g) => acc + g.signers.length, 0);
  const hasEmptySigners = signerGroups.some((g) =>
    g.signers.some((s) => !s.name.trim() || !s.email.trim())
  );

  const toggleGroup = (role: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  };

  const updateSigner = (
    groupIndex: number,
    signerIndex: number,
    field: keyof Signer,
    value: string
  ) => {
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
    setExpandedGroups((prev) => new Set([...prev, role]));
    onChange(newGroups);
  };

  const removeRole = (groupIndex: number) => {
    const newGroups = [...signerGroups];
    const role = newGroups[groupIndex].role;
    newGroups.splice(groupIndex, 1);
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.delete(role);
      return next;
    });
    onChange(newGroups);
  };

  const unusedRoles = availableRoles.filter(
    (r) => !signerGroups.some((g) => g.role === r.role)
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Add Signers</h2>
        <p className="text-slate-600 mt-2">
          Add the people who will sign this contract. You can add multiple signers per role.
        </p>
      </div>

      {/* Summary Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#529ec6]/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-[#529ec6]" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {totalSigners} Signer{totalSigners !== 1 ? "s" : ""} Added
              </h3>
              <p className="text-sm text-slate-500">
                Across {signerGroups.length} role{signerGroups.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {hasEmptySigners && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Some signers are incomplete</span>
            </div>
          )}
        </div>
      </div>

      {/* Signer Groups */}
      <div className="space-y-4">
        {signerGroups.map((group, groupIndex) => {
          const isExpanded = expandedGroups.has(group.role);
          const groupHasEmptySigners = group.signers.some(
            (s) => !s.name.trim() || !s.email.trim()
          );

          return (
            <motion.div
              key={group.role}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.role)}
                className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#529ec6]/10 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-[#529ec6]" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-slate-900">{group.roleLabel}</h4>
                    <p className="text-xs text-slate-500">
                      {group.signers.length} signer{group.signers.length !== 1 ? "s" : ""}
                      {groupHasEmptySigners && (
                        <span className="text-amber-600 ml-2">incomplete</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {allowAddRole && signerGroups.length > 2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRole(groupIndex);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remove this party"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Signers List */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-3">
                      {group.signers.map((signer, signerIndex) => (
                        <motion.div
                          key={signer.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-slate-200 text-sm font-medium text-slate-600">
                            {signerIndex + 1}
                          </div>
                          <div className="flex-1 grid md:grid-cols-3 gap-3">
                            {/* Name */}
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Full Name *
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
                                  className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6] text-sm ${
                                    !signer.name.trim()
                                      ? "border-amber-300 bg-amber-50/50"
                                      : "border-slate-200"
                                  }`}
                                />
                              </div>
                            </div>
                            {/* Email */}
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Email *
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
                                  className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6] text-sm ${
                                    !signer.email.trim()
                                      ? "border-amber-300 bg-amber-50/50"
                                      : "border-slate-200"
                                  }`}
                                />
                              </div>
                            </div>
                            {/* Title (optional) */}
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Title (optional)
                              </label>
                              <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                  type="text"
                                  value={signer.title || ""}
                                  onChange={(e) =>
                                    updateSigner(groupIndex, signerIndex, "title", e.target.value)
                                  }
                                  placeholder="CEO, Manager, etc."
                                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6] text-sm"
                                />
                              </div>
                            </div>
                          </div>
                          {group.signers.length > (group.minSigners || 1) && (
                            <button
                              onClick={() => removeSigner(groupIndex, signerIndex)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove signer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </motion.div>
                      ))}

                      {/* Add Signer Button */}
                      {group.signers.length < (group.maxSigners || 10) && (
                        <button
                          onClick={() => addSigner(groupIndex)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-[#529ec6]/30 hover:text-[#529ec6] hover:bg-[#529ec6]/5 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add Another {group.roleLabel}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Add Role Button */}
      {allowAddRole && unusedRoles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-slate-500 py-2">Add another party:</span>
          {unusedRoles.map((r) => (
            <button
              key={r.role}
              onClick={() => addRole(r.role, r.label)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {r.label}
            </button>
          ))}
        </div>
      )}

      {/* Signing Order Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Signing Order</h4>
            <p className="text-sm text-blue-700">
              Signers will receive signature requests in the order they appear. You can change this
              order after creating the contract.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to create initial signer groups
export function createSignerGroups(
  parties: { role: string; roleLabel: string; name?: string; email?: string; company?: string }[]
): SignerGroup[] {
  const generateId = () => `signer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return parties.map((party) => ({
    role: party.role,
    roleLabel: party.roleLabel,
    signers: [
      {
        id: generateId(),
        name: party.name || "",
        email: party.email || "",
        title: party.company,
      },
    ],
    minSigners: 1,
    maxSigners: 10,
  }));
}
