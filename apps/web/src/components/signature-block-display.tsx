"use client";

import {
  PenTool,
  Type,
  Calendar,
  FileText,
  Clock,
  Check,
  CheckSquare,
} from "lucide-react";
import type { FieldType, SignatureField } from "./signature-field-editor";

interface FieldValue {
  id: string;
  field_id: string;
  signature_request_id: string;
  value?: string;
  signature_id?: string;
  completed_at: string;
}

interface Signature {
  id: string;
  signature_request_id: string;
  signature_data: string;
  signature_type: string;
  signed_at: string;
}

interface SignatureRequest {
  id: string;
  signer_name: string;
  signer_email: string;
  signer_role?: string;
  status: string;
  signed_at?: string;
}

// Map DB field to our interface
interface DBSignatureField {
  id: string;
  contract_id: string;
  type: FieldType;
  label?: string;
  signer_role: string;
  required: boolean;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  order: number;
}

interface SignatureBlockDisplayProps {
  signatureBlock: string;
  fields: DBSignatureField[];
  fieldValues: FieldValue[];
  signatures: Signature[];
  signatureRequests: SignatureRequest[];
  showPlaceholders?: boolean;
}

const fieldTypeConfig: Record<FieldType, { icon: typeof PenTool; label: string }> = {
  signature: { icon: PenTool, label: "Signature" },
  initials: { icon: Type, label: "Initials" },
  date: { icon: Calendar, label: "Date" },
  text: { icon: FileText, label: "Text" },
  checkbox: { icon: CheckSquare, label: "Checkbox" },
};

export function SignatureBlockDisplay({
  signatureBlock,
  fields,
  fieldValues,
  signatures,
  signatureRequests,
  showPlaceholders = true,
}: SignatureBlockDisplayProps) {
  // If no fields, show the original signature block text
  if (fields.length === 0) {
    return (
      <div className="px-8 py-6 bg-slate-50 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-500 uppercase mb-4">
          Signatures
        </h3>
        <div className="whitespace-pre-wrap text-slate-700 font-mono text-sm">
          {signatureBlock}
        </div>
      </div>
    );
  }

  // Get the signer info for a field
  const getSignerInfo = (signerRole: string) => {
    return signatureRequests.find((r) => r.signer_role === signerRole);
  };

  // Get the field value and signature for a field
  const getFieldData = (fieldId: string) => {
    const fieldValue = fieldValues.find((fv) => fv.field_id === fieldId);
    if (!fieldValue) return null;

    const signature = fieldValue.signature_id
      ? signatures.find((s) => s.id === fieldValue.signature_id)
      : null;

    return { fieldValue, signature };
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Group fields by signer role
  const roles = [...new Set(fields.map((f) => f.signer_role))];

  return (
    <div className="px-8 py-6 border-t border-slate-200">
      <h3 className="text-sm font-semibold text-slate-500 uppercase mb-6">
        Signatures
      </h3>

      {/* Document-style signature blocks grouped by role */}
      <div className="space-y-8">
        {roles.map((role) => {
          const roleFields = fields.filter((f) => f.signer_role === role);
          const signerInfo = getSignerInfo(role);

          const signatureField = roleFields.find((f) => f.type === "signature");
          const dateField = roleFields.find((f) => f.type === "date");
          const initialsField = roleFields.find((f) => f.type === "initials");
          const textFields = roleFields.filter((f) => f.type === "text");

          const signatureData = signatureField ? getFieldData(signatureField.id) : null;
          const dateData = dateField ? getFieldData(dateField.id) : null;
          const initialsData = initialsField ? getFieldData(initialsField.id) : null;

          return (
            <div key={role} className="pb-6 border-b border-slate-200 last:border-0">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-4">{role}</p>

              <div className="flex flex-wrap gap-8">
                {/* Signature */}
                {signatureField && (
                  <div className="flex-1 min-w-[200px]">
                    {signatureData?.signature ? (
                      <div>
                        <img
                          src={signatureData.signature.signature_data}
                          alt={`${signerInfo?.signer_name || role}'s signature`}
                          className="h-12 object-contain mb-1"
                        />
                        <div className="border-t border-slate-400 pt-1">
                          <p className="text-xs text-slate-500">{signatureField.label || "Signature"}</p>
                        </div>
                      </div>
                    ) : showPlaceholders ? (
                      <div className="pb-1 border-b-2 border-dashed border-amber-400 bg-amber-50">
                        <div className="h-10 flex items-center justify-center gap-2">
                          <PenTool className="w-4 h-4 text-amber-500" />
                          <span className="text-sm text-amber-600">Awaiting signature</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{signatureField.label || "Signature"}</p>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Date */}
                {dateField && (
                  <div className="w-40">
                    {dateData ? (
                      <div>
                        <p className="text-sm font-medium text-slate-900 h-12 flex items-end pb-1">
                          {dateData.fieldValue.value || formatDate(dateData.fieldValue.completed_at)}
                        </p>
                        <div className="border-t border-slate-400 pt-1">
                          <p className="text-xs text-slate-500">{dateField.label || "Date"}</p>
                        </div>
                      </div>
                    ) : showPlaceholders ? (
                      <div className="pb-1 border-b-2 border-dashed border-amber-400 bg-amber-50">
                        <div className="h-10 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{dateField.label || "Date"}</p>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Initials */}
                {initialsField && (
                  <div className="w-24">
                    {initialsData?.signature ? (
                      <div>
                        <img
                          src={initialsData.signature.signature_data}
                          alt="Initials"
                          className="h-10 object-contain mb-1"
                        />
                        <div className="border-t border-slate-400 pt-1">
                          <p className="text-xs text-slate-500">{initialsField.label || "Initials"}</p>
                        </div>
                      </div>
                    ) : showPlaceholders ? (
                      <div className="pb-1 border-b-2 border-dashed border-blue-400 bg-blue-50">
                        <div className="h-10 flex items-center justify-center">
                          <Type className="w-4 h-4 text-blue-500" />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{initialsField.label || "Initials"}</p>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Text Fields (e.g., Printed Name) */}
                {textFields.map((textField) => {
                  const textData = getFieldData(textField.id);
                  return (
                    <div key={textField.id} className="w-48">
                      {textData ? (
                        <div>
                          <p className="text-sm font-medium text-slate-900 h-10 flex items-end pb-1">
                            {textData.fieldValue.value}
                          </p>
                          <div className="border-t border-slate-400 pt-1">
                            <p className="text-xs text-slate-500">{textField.label || "Text"}</p>
                          </div>
                        </div>
                      ) : showPlaceholders ? (
                        <div className="pb-1 border-b-2 border-dashed border-slate-400 bg-slate-50">
                          <div className="h-10 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-slate-400" />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{textField.label || "Text"}</p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
