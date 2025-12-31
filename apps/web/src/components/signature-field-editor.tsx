"use client";

import { useState, useCallback } from "react";
import {
  PenTool,
  Type,
  Calendar,
  FileText,
  Check,
  User,
  Building2,
} from "lucide-react";

export type FieldType = "signature" | "initials" | "date" | "text" | "checkbox";

export interface SignatureField {
  id: string;
  type: FieldType;
  label?: string;
  signerRole: string;
  required: boolean;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  page: number;
  order: number;
}

export interface SignatureFieldEditorProps {
  fields: SignatureField[];
  signerRoles: string[];
  signatureBlock?: string;
  onFieldsChange: (fields: SignatureField[]) => void;
  onFieldCreate: (field: Omit<SignatureField, "id">) => Promise<SignatureField>;
  onFieldUpdate: (id: string, updates: Partial<SignatureField>) => Promise<void>;
  onFieldDelete: (id: string) => Promise<void>;
  disabled?: boolean;
}

interface FieldConfig {
  type: FieldType;
  icon: typeof PenTool;
  label: string;
  description: string;
  defaultLabel: string;
}

const fieldConfigs: FieldConfig[] = [
  {
    type: "signature",
    icon: PenTool,
    label: "Signature",
    description: "Hand-drawn or typed signature",
    defaultLabel: "Signature",
  },
  {
    type: "date",
    icon: Calendar,
    label: "Date",
    description: "Date of signing",
    defaultLabel: "Date",
  },
  {
    type: "initials",
    icon: Type,
    label: "Initials",
    description: "Signer's initials",
    defaultLabel: "Initials",
  },
  {
    type: "text",
    icon: FileText,
    label: "Printed Name",
    description: "Full legal name",
    defaultLabel: "Printed Name",
  },
];

// Default positions for auto-placement (percentage-based, stacked vertically per role)
const getDefaultPosition = (type: FieldType, roleIndex: number): { x: number; y: number; width: number; height: number } => {
  const baseY = roleIndex * 25; // Each role gets 25% of vertical space

  switch (type) {
    case "signature":
      return { x: 5, y: baseY + 5, width: 200, height: 60 };
    case "date":
      return { x: 60, y: baseY + 5, width: 120, height: 30 };
    case "initials":
      return { x: 85, y: baseY + 5, width: 80, height: 40 };
    case "text":
      return { x: 5, y: baseY + 15, width: 200, height: 30 };
    default:
      return { x: 5, y: baseY + 5, width: 150, height: 40 };
  }
};

export function SignatureFieldEditor({
  fields,
  signerRoles,
  onFieldCreate,
  onFieldDelete,
  disabled = false,
}: SignatureFieldEditorProps) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Check if a field type exists for a given role
  const hasField = useCallback(
    (role: string, type: FieldType): boolean => {
      return fields.some((f) => f.signerRole === role && f.type === type);
    },
    [fields]
  );

  // Get the field for a role and type
  const getField = useCallback(
    (role: string, type: FieldType): SignatureField | undefined => {
      return fields.find((f) => f.signerRole === role && f.type === type);
    },
    [fields]
  );

  // Toggle a field on/off for a role
  const toggleField = useCallback(
    async (role: string, type: FieldType, config: FieldConfig) => {
      if (disabled) return;

      const key = `${role}-${type}`;
      setIsUpdating(key);

      try {
        const existingField = getField(role, type);

        if (existingField) {
          // Remove the field
          await onFieldDelete(existingField.id);
        } else {
          // Add the field
          const roleIndex = signerRoles.indexOf(role);
          const position = getDefaultPosition(type, roleIndex);

          await onFieldCreate({
            type,
            signerRole: role,
            label: config.defaultLabel,
            required: type === "signature", // Signatures are required by default
            positionX: position.x,
            positionY: position.y,
            width: position.width,
            height: position.height,
            page: 1, // Default to first page for list-based editor
            order: fields.filter((f) => f.signerRole === role).length + 1,
          });
        }
      } catch (error) {
        console.error("Error toggling field:", error);
      } finally {
        setIsUpdating(null);
      }
    },
    [disabled, getField, onFieldDelete, onFieldCreate, signerRoles, fields]
  );

  // Get icon for role (simple heuristic)
  const getRoleIcon = (role: string) => {
    const lowerRole = role.toLowerCase();
    if (lowerRole.includes("company") || lowerRole.includes("corp") || lowerRole.includes("party")) {
      return Building2;
    }
    return User;
  };

  // Clear all fields
  const clearAllFields = useCallback(async () => {
    if (disabled || fields.length === 0) return;

    const confirmed = window.confirm(
      `This will remove all ${fields.length} signature field(s). Are you sure?`
    );
    if (!confirmed) return;

    setIsUpdating("clearing");
    try {
      // Delete all fields one by one
      for (const field of fields) {
        await onFieldDelete(field.id);
      }
    } catch (error) {
      console.error("Error clearing fields:", error);
    } finally {
      setIsUpdating(null);
    }
  }, [disabled, fields, onFieldDelete]);

  if (signerRoles.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No signers configured for this contract.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Select which fields each party needs to complete when signing.
        </p>
        {fields.length > 0 && (
          <button
            onClick={clearAllFields}
            disabled={disabled || isUpdating === "clearing"}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
          >
            {isUpdating === "clearing" ? "Clearing..." : "Clear All Fields"}
          </button>
        )}
      </div>

      {/* Signer Cards */}
      <div className="grid gap-4">
        {signerRoles.map((role) => {
          const RoleIcon = getRoleIcon(role);
          const roleFields = fields.filter((f) => f.signerRole === role);
          const hasAnyField = roleFields.length > 0;

          return (
            <div
              key={role}
              className={`rounded-xl border-2 transition-all duration-200 ${hasAnyField
                ? "border-[#529ec6]/20 bg-gradient-to-br from-[#529ec6]/5/50 to-white shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
                }`}
            >
              {/* Card Header */}
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${hasAnyField
                    ? "bg-[#529ec6]/10 text-[#529ec6]"
                    : "bg-slate-100 text-slate-500"
                    }`}>
                    <RoleIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{role}</h3>
                    <p className="text-xs text-slate-500">
                      {hasAnyField
                        ? "Click fields below to toggle"
                        : "Select fields this party must complete"}
                    </p>
                  </div>
                  {hasAnyField && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                      <Check className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Ready</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Field Toggles */}
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {fieldConfigs.map((config) => {
                    const Icon = config.icon;
                    const isEnabled = hasField(role, config.type);
                    const isLoading = isUpdating === `${role}-${config.type}`;

                    return (
                      <button
                        key={config.type}
                        onClick={() => toggleField(role, config.type, config)}
                        disabled={disabled || isLoading}
                        className={`relative group flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${isEnabled
                          ? "border-[#529ec6] bg-[#529ec6]/5 text-[#202e46] shadow-sm"
                          : "border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:bg-slate-100"
                          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {/* Checkmark indicator */}
                        {isEnabled && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-[#202e46] rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}

                        {/* Loading state */}
                        {isLoading && (
                          <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-[#529ec6] border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}

                        <div className={`p-2 rounded-lg transition-colors ${isEnabled ? "bg-[#529ec6]/20" : "bg-slate-200/50 group-hover:bg-slate-200"
                          }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">{config.label}</p>
                          <p className={`text-[10px] ${isEnabled ? "text-[#529ec6]" : "text-slate-400"}`}>
                            {config.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
