"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  User,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Briefcase,
  Scale,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Sparkles,
  Clock,
  Building2,
  Mail,
  Phone,
} from "lucide-react";
import {
  SmartPlaceholder,
  PlaceholderCategory,
  getPlaceholdersForContract,
  groupPlaceholdersByCategory,
  formatCategoryLabel,
  isFieldVisible,
  validatePlaceholderValue,
  formatCurrency,
  formatPhoneNumber,
  formatDuration,
  parseDuration,
} from "@/lib/contracts/smart-placeholders";
import type { ContractType } from "@/lib/contracts/schemas";

// ============================================================================
// Types
// ============================================================================

interface Contact {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
}

interface UserProfile {
  name?: string;
  email?: string;
  company_name?: string;
  address?: string;
  phone?: string;
}

interface SmartPlaceholderFormProps {
  contractType: ContractType;
  jurisdiction?: string;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onBulkChange?: (values: Record<string, string>) => void;
  userProfile?: UserProfile;
  className?: string;
  compact?: boolean;
}

// ============================================================================
// Category Icons
// ============================================================================

const CategoryIcons: Record<PlaceholderCategory, React.ReactNode> = {
  your_details: <User className="w-4 h-4" />,
  other_party: <Users className="w-4 h-4" />,
  dates: <Calendar className="w-4 h-4" />,
  financial: <DollarSign className="w-4 h-4" />,
  terms: <FileText className="w-4 h-4" />,
  project: <Briefcase className="w-4 h-4" />,
  legal: <Scale className="w-4 h-4" />,
};

// ============================================================================
// Field Components
// ============================================================================

interface FieldProps {
  placeholder: SmartPlaceholder;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  jurisdiction?: string;
}

function TextField({ placeholder, value, onChange, error }: FieldProps) {
  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder.placeholder || `Enter ${placeholder.label.toLowerCase()}`}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-red-300 focus:ring-red-400"
            : "border-slate-200 focus:ring-[#529ec6]"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function TextAreaField({ placeholder, value, onChange, error }: FieldProps) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder.placeholder}
        rows={3}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none transition-colors ${
          error
            ? "border-red-300 focus:ring-red-400"
            : "border-slate-200 focus:ring-[#529ec6]"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function EmailField({ placeholder, value, onChange, error }: FieldProps) {
  return (
    <div className="relative">
      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder.placeholder || "email@example.com"}
        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-red-300 focus:ring-red-400"
            : "border-slate-200 focus:ring-[#529ec6]"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function PhoneField({ placeholder, value, onChange, error, jurisdiction }: FieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value, jurisdiction);
    onChange(formatted);
  };

  return (
    <div className="relative">
      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder={jurisdiction === "GB" ? "07XXX XXX XXX" : "(555) 123-4567"}
        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-red-300 focus:ring-red-400"
            : "border-slate-200 focus:ring-[#529ec6]"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function DateField({ placeholder, value, onChange, error }: FieldProps) {
  return (
    <div className="relative">
      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-red-300 focus:ring-red-400"
            : "border-slate-200 focus:ring-[#529ec6]"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function CurrencyField({ placeholder, value, onChange, error, jurisdiction }: FieldProps) {
  const currencySymbol = jurisdiction === "GB" ? "£" : "$";

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
        {currencySymbol}
      </span>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder.placeholder || "0.00"}
        className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-red-300 focus:ring-red-400"
            : "border-slate-200 focus:ring-[#529ec6]"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function PercentageField({ placeholder, value, onChange, error }: FieldProps) {
  return (
    <div className="relative">
      <input
        type="number"
        step="0.1"
        min={placeholder.validation?.min ?? 0}
        max={placeholder.validation?.max ?? 100}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className={`w-full pr-8 pl-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-red-300 focus:ring-red-400"
            : "border-slate-200 focus:ring-[#529ec6]"
        }`}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
        %
      </span>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function NumberField({ placeholder, value, onChange, error }: FieldProps) {
  return (
    <div>
      <input
        type="number"
        min={placeholder.validation?.min}
        max={placeholder.validation?.max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-red-300 focus:ring-red-400"
            : "border-slate-200 focus:ring-[#529ec6]"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SelectField({ placeholder, value, onChange, error }: FieldProps) {
  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-white ${
          error
            ? "border-red-300 focus:ring-red-400"
            : "border-slate-200 focus:ring-[#529ec6]"
        }`}
      >
        <option value="">Select {placeholder.label.toLowerCase()}...</option>
        {placeholder.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function DurationField({ placeholder, value, onChange, error }: FieldProps) {
  const parsed = parseDuration(value);
  const units = placeholder.durationUnits || ["days", "weeks", "months", "years"];

  const [numValue, setNumValue] = useState(parsed?.value.toString() || "");
  const [unit, setUnit] = useState(parsed?.unit || units[0]);

  const updateValue = (num: string, u: string) => {
    if (num) {
      onChange(formatDuration(parseInt(num), u));
    } else {
      onChange("");
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="number"
        min="1"
        value={numValue}
        onChange={(e) => {
          setNumValue(e.target.value);
          updateValue(e.target.value, unit);
        }}
        placeholder="0"
        className={`w-20 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-red-300 focus:ring-red-400"
            : "border-slate-200 focus:ring-[#529ec6]"
        }`}
      />
      <select
        value={unit}
        onChange={(e) => {
          setUnit(e.target.value);
          updateValue(numValue, e.target.value);
        }}
        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] bg-white"
      >
        {units.map((u) => (
          <option key={u} value={u}>
            {u.charAt(0).toUpperCase() + u.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

function AddressField({ placeholder, value, onChange, error }: FieldProps) {
  return (
    <div className="relative">
      <Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Street address, City, State, ZIP"
        rows={2}
        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none transition-colors ${
          error
            ? "border-red-300 focus:ring-red-400"
            : "border-slate-200 focus:ring-[#529ec6]"
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ============================================================================
// Contact Picker
// ============================================================================

interface ContactPickerProps {
  value: { name?: string; email?: string; company?: string };
  onChange: (contact: { name?: string; email?: string; company?: string }) => void;
}

function ContactPicker({ value, onChange }: ContactPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "5" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/contacts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch {
      // Ignore errors
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(fetchContacts, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, search, fetchContacts]);

  const selectContact = (contact: Contact) => {
    onChange({
      name: contact.name,
      email: contact.email,
      company: contact.company,
    });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Quick select button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="absolute right-2 top-0 text-xs text-[#529ec6] hover:text-[#202e46] flex items-center gap-1"
      >
        <Users className="w-3 h-3" />
        <span>Select from contacts</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 right-0 top-6 w-72 bg-white border border-slate-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#529ec6]"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-auto">
            {isLoading ? (
              <div className="p-3 text-center text-sm text-slate-500">Loading...</div>
            ) : contacts.length === 0 ? (
              <div className="p-3 text-center text-sm text-slate-500">No contacts found</div>
            ) : (
              contacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => selectContact(contact)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-[#529ec6]/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#529ec6]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{contact.name}</p>
                    <p className="text-xs text-slate-500 truncate">{contact.email}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SmartPlaceholderForm({
  contractType,
  jurisdiction,
  values,
  onChange,
  onBulkChange,
  userProfile,
  className = "",
  compact = false,
}: SmartPlaceholderFormProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<PlaceholderCategory>>(
    new Set(["your_details", "other_party", "project", "financial"])
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set());

  // Get relevant placeholders
  const placeholders = useMemo(
    () => getPlaceholdersForContract(contractType, jurisdiction),
    [contractType, jurisdiction]
  );

  const groupedPlaceholders = useMemo(
    () => groupPlaceholdersByCategory(placeholders),
    [placeholders]
  );

  // Auto-fill from profile on mount
  useEffect(() => {
    if (!userProfile || !onBulkChange) return;

    const autoFillValues: Record<string, string> = {};
    const autoFilledKeys: string[] = [];

    for (const p of placeholders) {
      if (p.autofillFrom === "profile" && p.autofillKey && !values[p.key]) {
        const profileValue = userProfile[p.autofillKey as keyof UserProfile];
        if (profileValue) {
          autoFillValues[p.key] = profileValue;
          autoFilledKeys.push(p.key);
        }
      }
    }

    if (Object.keys(autoFillValues).length > 0) {
      onBulkChange(autoFillValues);
      setAutoFilled(new Set(autoFilledKeys));
    }
  }, [userProfile, placeholders]); // Only run on mount and when profile changes

  // Toggle category expansion
  const toggleCategory = (category: PlaceholderCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Handle field change with validation
  const handleChange = (key: string, value: string) => {
    onChange(key, value);

    // Clear auto-filled status
    if (autoFilled.has(key)) {
      setAutoFilled((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }

    // Validate
    const placeholder = placeholders.find((p) => p.key === key);
    if (placeholder) {
      const result = validatePlaceholderValue(placeholder, value);
      setErrors((prev) => {
        if (result.valid) {
          const { [key]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [key]: result.error || "" };
      });
    }
  };

  // Calculate completion status per category
  const getCategoryStatus = (category: PlaceholderCategory) => {
    const categoryPlaceholders = groupedPlaceholders[category] || [];
    const visiblePlaceholders = categoryPlaceholders.filter((p) =>
      isFieldVisible(p, values)
    );
    const requiredPlaceholders = visiblePlaceholders.filter(
      (p) => p.validation?.required
    );
    const filledRequired = requiredPlaceholders.filter(
      (p) => values[p.key]?.trim()
    );

    return {
      total: visiblePlaceholders.length,
      filled: visiblePlaceholders.filter((p) => values[p.key]?.trim()).length,
      requiredTotal: requiredPlaceholders.length,
      requiredFilled: filledRequired.length,
    };
  };

  // Render a field based on type
  const renderField = (placeholder: SmartPlaceholder) => {
    if (!isFieldVisible(placeholder, values)) return null;

    const value = values[placeholder.key] || "";
    const error = errors[placeholder.key];
    const isAutoFilled = autoFilled.has(placeholder.key);

    const fieldProps: FieldProps = {
      placeholder,
      value,
      onChange: (v) => handleChange(placeholder.key, v),
      error,
      jurisdiction,
    };

    let FieldComponent: React.FC<FieldProps>;
    switch (placeholder.type) {
      case "textarea":
        FieldComponent = TextAreaField;
        break;
      case "email":
        FieldComponent = EmailField;
        break;
      case "phone":
        FieldComponent = PhoneField;
        break;
      case "date":
        FieldComponent = DateField;
        break;
      case "currency":
        FieldComponent = CurrencyField;
        break;
      case "percentage":
        FieldComponent = PercentageField;
        break;
      case "number":
        FieldComponent = NumberField;
        break;
      case "select":
      case "radio":
        FieldComponent = SelectField;
        break;
      case "duration":
        FieldComponent = DurationField;
        break;
      case "address":
        FieldComponent = AddressField;
        break;
      default:
        FieldComponent = TextField;
    }

    return (
      <div
        key={placeholder.key}
        className={`${placeholder.width === "half" ? "col-span-1" : placeholder.width === "third" ? "col-span-1" : "col-span-2"}`}
      >
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
            {placeholder.label}
            {placeholder.validation?.required && (
              <span className="text-red-400">*</span>
            )}
            {isAutoFilled && (
              <span className="ml-1 text-xs text-emerald-500 flex items-center gap-0.5">
                <Sparkles className="w-3 h-3" />
                Auto-filled
              </span>
            )}
          </label>
          {placeholder.autofillFrom === "contact" && (
            <ContactPicker
              value={{
                name: values[placeholder.key],
                email: values[placeholder.key.replace("_name", "_email")],
              }}
              onChange={(contact) => {
                if (contact.name) handleChange(placeholder.key, contact.name);
                if (contact.email) {
                  const emailKey = placeholder.key.replace("_name", "_email");
                  handleChange(emailKey, contact.email);
                }
                if (contact.company) {
                  const companyKey = placeholder.key.replace("_name", "_company");
                  handleChange(companyKey, contact.company);
                }
              }}
            />
          )}
        </div>
        <FieldComponent {...fieldProps} />
        {placeholder.helpText && !error && (
          <p className="mt-1 text-xs text-slate-500">{placeholder.helpText}</p>
        )}
        {placeholder.description && !error && !placeholder.helpText && (
          <p className="mt-1 text-xs text-slate-400">{placeholder.description}</p>
        )}
      </div>
    );
  };

  // Render categories
  const categoryOrder: PlaceholderCategory[] = [
    "your_details",
    "other_party",
    "project",
    "financial",
    "dates",
    "terms",
    "legal",
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {categoryOrder.map((category) => {
        const categoryPlaceholders = groupedPlaceholders[category];
        if (!categoryPlaceholders?.length) return null;

        const status = getCategoryStatus(category);
        const isExpanded = expandedCategories.has(category);
        const isComplete = status.requiredFilled === status.requiredTotal;

        return (
          <div
            key={category}
            className="border border-slate-200 rounded-lg overflow-hidden"
          >
            {/* Category Header */}
            <button
              type="button"
              onClick={() => toggleCategory(category)}
              className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors ${
                isComplete ? "bg-emerald-50/50" : "bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isComplete
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isComplete ? <Check className="w-4 h-4" /> : CategoryIcons[category]}
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-slate-900">
                    {formatCategoryLabel(category)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {status.filled} of {status.total} filled
                    {status.requiredTotal > 0 && (
                      <span>
                        {" "}
                        ({status.requiredFilled}/{status.requiredTotal} required)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isComplete && status.requiredTotal > status.requiredFilled && (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Category Fields */}
            {isExpanded && (
              <div className="p-4 border-t border-slate-100 bg-white">
                <div className="grid grid-cols-2 gap-4">
                  {categoryPlaceholders.map(renderField)}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default SmartPlaceholderForm;
