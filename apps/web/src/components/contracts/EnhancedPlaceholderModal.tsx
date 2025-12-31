"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Loader2,
  Sparkles,
  User,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Briefcase,
  Shield,
  ChevronDown,
  ChevronUp,
  Check,
  Mail,
  Phone,
  Building2,
  Search,
  Clock,
  Plus,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import type { Template } from "@/db/types";

// ============================================================================
// Types
// ============================================================================

interface Placeholder {
  id: string;
  token: string;
  label: string;
  description?: string;
  category: string;
  type: "text" | "email" | "date" | "number" | "textarea" | "phone" | "currency" | "percentage" | "duration" | "select" | "address";
  required: boolean;
  autofillKey?: string;
  // Options can be strings (from DB) or objects - getSmartOptions normalizes them
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: Array<string | { value: string; label: string }>;
  defaultValue?: string;
}

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

interface EnhancedPlaceholderModalProps {
  template: Template & { content?: { placeholders?: Placeholder[] } };
  placeholderValues: Record<string, string>;
  onValuesChange: (values: Record<string, string>) => void;
  onSubmit: () => void;
  onClose: () => void;
  isSubmitting: boolean;
  jurisdiction?: string;
}

// ============================================================================
// Constants - Smart Options
// ============================================================================

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

const ENTITY_TYPES = [
  { value: "individual", label: "Individual / Sole Proprietor" },
  { value: "llc", label: "Limited Liability Company (LLC)" },
  { value: "corporation", label: "Corporation (Inc./Corp.)" },
  { value: "s_corp", label: "S Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "lp", label: "Limited Partnership (LP)" },
  { value: "llp", label: "Limited Liability Partnership (LLP)" },
  { value: "nonprofit", label: "Nonprofit Organization" },
  { value: "trust", label: "Trust" },
  { value: "other", label: "Other" },
];

// ============================================================================
// Helper Functions
// ============================================================================

function formatPhoneNumber(value: string, jurisdiction?: string): string {
  const digits = value.replace(/\D/g, "");

  if (jurisdiction === "GB") {
    if (digits.length <= 5) return digits;
    if (digits.length <= 8) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

// Validation helpers
function validateEmail(value: string): string | null {
  if (!value) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) ? null : "Please enter a valid email address";
}

function validatePhone(value: string): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? null : "Please enter a valid phone number";
}

function validateRequired(value: string, label: string): string | null {
  return value?.trim() ? null : `${label} is required`;
}

// Detect input type from placeholder ID/label
function detectEnhancedType(placeholder: Placeholder): Placeholder["type"] {
  const idLower = placeholder.id.toLowerCase();
  const labelLower = placeholder.label.toLowerCase();

  if (idLower.includes("phone") || idLower.includes("tel") || labelLower.includes("phone")) {
    return "phone";
  }

  if (
    idLower.includes("amount") ||
    idLower.includes("fee") ||
    idLower.includes("salary") ||
    idLower.includes("payment") ||
    idLower.includes("price") ||
    idLower.includes("cost") ||
    labelLower.includes("amount") ||
    labelLower.includes("fee") ||
    labelLower.includes("salary")
  ) {
    return "currency";
  }

  if (idLower.includes("percent") || labelLower.includes("%")) {
    return "percentage";
  }

  if (idLower.includes("address") || labelLower.includes("address")) {
    return "address";
  }

  if (
    idLower.includes("duration") ||
    idLower.includes("period") ||
    idLower.includes("term") ||
    labelLower.includes("days)") ||
    labelLower.includes("months)") ||
    labelLower.includes("years)")
  ) {
    return "duration";
  }

  // Detect state/entity type fields
  if (
    idLower.includes("state") && (idLower.includes("organization") || idLower.includes("incorporated")) ||
    labelLower.includes("state of organization") ||
    labelLower.includes("state of incorporation")
  ) {
    return "select";
  }

  if (
    idLower.includes("entity") && idLower.includes("type") ||
    labelLower.includes("entity type")
  ) {
    return "select";
  }

  return placeholder.type;
}

// Get smart options for select fields
function getSmartOptions(placeholder: Placeholder): Array<{ value: string; label: string }> | undefined {
  // Handle placeholder options if they exist
  if (placeholder.options?.length) {
    // Normalize options: handle both string arrays and object arrays
    return placeholder.options.map((opt) => {
      if (typeof opt === "string") {
        // Convert string to { value, label } format
        return { value: opt.toLowerCase().replace(/\s+/g, "_"), label: opt };
      }
      return opt;
    });
  }

  const idLower = placeholder.id.toLowerCase();
  const labelLower = placeholder.label.toLowerCase();

  if (
    idLower.includes("state") && (idLower.includes("organization") || idLower.includes("incorporated")) ||
    labelLower.includes("state of organization") ||
    labelLower.includes("state of incorporation")
  ) {
    return US_STATES;
  }

  if (
    idLower.includes("entity") && idLower.includes("type") ||
    labelLower.includes("entity type")
  ) {
    return ENTITY_TYPES;
  }

  return undefined;
}

// Map autofill keys from placeholder IDs
function getAutofillMapping(placeholder: Placeholder, category: string): string | null {
  if (category !== "party_a") return null;

  const idLower = placeholder.id.toLowerCase();

  if (idLower.includes("name") && !idLower.includes("company")) return "name";
  if (idLower.includes("email")) return "email";
  if (idLower.includes("company")) return "company_name";
  if (idLower.includes("phone")) return "phone";
  if (idLower.includes("address")) return "address";

  return null;
}

// ============================================================================
// Category Configuration
// ============================================================================

const CategoryIcons: Record<string, React.ReactNode> = {
  party_a: <User className="w-4 h-4" />,
  party_b: <Users className="w-4 h-4" />,
  project: <Briefcase className="w-4 h-4" />,
  dates: <Calendar className="w-4 h-4" />,
  terms: <FileText className="w-4 h-4" />,
  financial: <DollarSign className="w-4 h-4" />,
  insurance: <Shield className="w-4 h-4" />,
  legal: <Shield className="w-4 h-4" />,
  other: <FileText className="w-4 h-4" />,
};

const CategoryNames: Record<string, string> = {
  party_a: "Your Information",
  party_b: "Other Party",
  project: "Project Details",
  dates: "Important Dates",
  terms: "Agreement Terms",
  financial: "Financial Terms",
  insurance: "Insurance Requirements",
  privacy: "Privacy & Data Protection",
  compliance: "Compliance",
  legal: "Legal Terms",
  optional: "Optional Provisions",
  other: "Other Details",
};

const CategoryOrder = [
  "party_a",
  "party_b",
  "project",
  "dates",
  "terms",
  "financial",
  "insurance",
  "privacy",
  "compliance",
  "legal",
  "optional",
  "other",
];

// ============================================================================
// Field Components
// ============================================================================

interface FieldProps {
  placeholder: Placeholder;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  jurisdiction?: string;
  isAutoFilled?: boolean;
}

function TextField({ placeholder, value, onChange, onBlur, error }: FieldProps) {
  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={`Enter ${placeholder.label.toLowerCase()}`}
        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
          error
            ? "border-red-300 focus:ring-red-400 bg-red-50"
            : "border-slate-200 focus:ring-emerald-500/30 focus:border-emerald-500"
        }`}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function EmailField({ placeholder, value, onChange, onBlur, error }: FieldProps) {
  return (
    <div>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="email@example.com"
          className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
            error
              ? "border-red-300 focus:ring-red-400 bg-red-50"
              : "border-slate-200 focus:ring-emerald-500/30 focus:border-emerald-500"
          }`}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function PhoneField({ placeholder, value, onChange, onBlur, error, jurisdiction }: FieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value, jurisdiction);
    onChange(formatted);
  };

  return (
    <div>
      <div className="relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="tel"
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={jurisdiction === "GB" ? "07XXX XXX XXX" : "(555) 123-4567"}
          className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
            error
              ? "border-red-300 focus:ring-red-400 bg-red-50"
              : "border-slate-200 focus:ring-emerald-500/30 focus:border-emerald-500"
          }`}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function DateField({ value, onChange, onBlur, error }: FieldProps) {
  return (
    <div>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
            error
              ? "border-red-300 focus:ring-red-400 bg-red-50"
              : "border-slate-200 focus:ring-emerald-500/30 focus:border-emerald-500"
          }`}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function CurrencyField({ placeholder, value, onChange, onBlur, error, jurisdiction }: FieldProps) {
  const currencySymbol = jurisdiction === "GB" ? "£" : "$";

  return (
    <div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
          {currencySymbol}
        </span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="0.00"
          className={`w-full pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
            error
              ? "border-red-300 focus:ring-red-400 bg-red-50"
              : "border-slate-200 focus:ring-emerald-500/30 focus:border-emerald-500"
          }`}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function PercentageField({ value, onChange, onBlur, error }: FieldProps) {
  return (
    <div>
      <div className="relative">
        <input
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="0"
          className={`w-full pr-8 pl-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
            error
              ? "border-red-300 focus:ring-red-400 bg-red-50"
              : "border-slate-200 focus:ring-emerald-500/30 focus:border-emerald-500"
          }`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
          %
        </span>
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function NumberField({ value, onChange, onBlur, error }: FieldProps) {
  return (
    <div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="0"
        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
          error
            ? "border-red-300 focus:ring-red-400 bg-red-50"
            : "border-slate-200 focus:ring-emerald-500/30 focus:border-emerald-500"
        }`}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function DurationField({ value, onChange, onBlur, error }: FieldProps) {
  // Parse existing value like "30 days" or "6 months"
  const parseValue = useCallback(() => {
    const match = value?.match(/^(\d+)\s*(day|days|week|weeks|month|months|year|years)$/i);
    return {
      num: match ? match[1] : "",
      unit: match ? match[2].toLowerCase().replace(/s$/, "") : "day",
    };
  }, [value]);

  const { num: initialNum, unit: initialUnit } = parseValue();
  const [localNum, setLocalNum] = useState(initialNum);
  const [localUnit, setLocalUnit] = useState(initialUnit);
  const isInitialMount = useRef(true);

  // Sync local state when external value changes
  useEffect(() => {
    const { num, unit } = parseValue();
    setLocalNum(num);
    setLocalUnit(unit);
  }, [value, parseValue]);

  // Update parent only when local values change (not on mount)
  const handleNumChange = (newNum: string) => {
    setLocalNum(newNum);
    if (newNum) {
      const plural = parseInt(newNum) !== 1 ? "s" : "";
      onChange(`${newNum} ${localUnit}${plural}`);
    } else {
      onChange("");
    }
  };

  const handleUnitChange = (newUnit: string) => {
    setLocalUnit(newUnit);
    if (localNum) {
      const plural = parseInt(localNum) !== 1 ? "s" : "";
      onChange(`${localNum} ${newUnit}${plural}`);
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="number"
            min="1"
            value={localNum}
            onChange={(e) => handleNumChange(e.target.value)}
            onBlur={onBlur}
            placeholder="0"
            className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
              error
                ? "border-red-300 focus:ring-red-400 bg-red-50"
                : "border-slate-200 focus:ring-emerald-500/30 focus:border-emerald-500"
            }`}
          />
        </div>
        <select
          value={localUnit}
          onChange={(e) => handleUnitChange(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white min-w-[100px]"
        >
          <option value="day">Days</option>
          <option value="week">Weeks</option>
          <option value="month">Months</option>
          <option value="year">Years</option>
        </select>
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function TextAreaField({ placeholder, value, onChange, onBlur, error }: FieldProps) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={`Enter ${placeholder.label.toLowerCase()}`}
        rows={3}
        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 resize-none transition-all ${
          error
            ? "border-red-300 focus:ring-red-400 bg-red-50"
            : "border-slate-200 focus:ring-emerald-500/30 focus:border-emerald-500"
        }`}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function AddressField({ value, onChange, onBlur, error }: FieldProps) {
  return (
    <div>
      <div className="relative">
        <Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="Street address, City, State, ZIP"
          rows={2}
          className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 resize-none transition-all ${
            error
              ? "border-red-300 focus:ring-red-400 bg-red-50"
              : "border-slate-200 focus:ring-emerald-500/30 focus:border-emerald-500"
          }`}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function SelectField({ placeholder, value, onChange, onBlur, error }: FieldProps) {
  const options = getSmartOptions(placeholder) || [];

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all bg-white ${
          error
            ? "border-red-300 focus:ring-red-400 bg-red-50"
            : "border-slate-200 focus:ring-emerald-500/30 focus:border-emerald-500"
        }`}
      >
        <option value="">Select {placeholder.label.toLowerCase()}...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Contact Picker (Enhanced)
// ============================================================================

interface ContactPickerProps {
  onSelect: (contact: Contact) => void;
  category: string;
}

function ContactPicker({ onSelect, category }: ContactPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", email: "", company: "" });
  const [isAdding, setIsAdding] = useState(false);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "10" });
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
      fetchContacts();
    }
  }, [isOpen, fetchContacts]);

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.email) return;

    setIsAdding(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      });

      if (res.ok) {
        const data = await res.json();
        onSelect(data.contact);
        setIsOpen(false);
        setShowAddForm(false);
        setNewContact({ name: "", email: "", company: "" });
      }
    } catch {
      // Ignore errors
    } finally {
      setIsAdding(false);
    }
  };

  if (category !== "party_b") return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
      >
        <Users className="w-3.5 h-3.5" />
        Select from contacts
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-8 z-30 bg-white rounded-xl shadow-2xl border border-slate-200 w-80 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {!showAddForm ? (
            <>
              {/* Search */}
              <div className="p-3 border-b border-slate-100 bg-slate-50">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search contacts..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              {/* Contact List */}
              <div className="max-h-64 overflow-y-auto">
                {isLoading ? (
                  <div className="p-6 text-center text-slate-500 text-sm">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading contacts...
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="p-6 text-center">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 mb-3">
                      {search ? "No contacts found" : "No contacts yet"}
                    </p>
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => {
                        onSelect(contact);
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 text-left transition-colors border-b border-slate-50 last:border-b-0"
                    >
                      <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {contact.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {contact.email}
                          {contact.company && ` • ${contact.company}`}
                        </p>
                      </div>
                      {(contact.phone || contact.company) && (
                        <div className="text-xs text-slate-400">
                          Will fill {[contact.phone && "phone", contact.company && "company"].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Add New Contact Button */}
              <div className="p-2 border-t border-slate-100 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add new contact
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Add Contact Form */}
              <div className="p-3 border-b border-slate-100 bg-slate-50">
                <h4 className="font-medium text-slate-900 text-sm">Add new contact</h4>
              </div>
              <div className="p-3 space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Name *</label>
                  <input
                    type="text"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    placeholder="Contact name"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Email *</label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Company</label>
                  <input
                    type="text"
                    value={newContact.company}
                    onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                    placeholder="Company name (optional)"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>
              <div className="p-3 border-t border-slate-100 bg-slate-50 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddContact}
                  disabled={!newContact.name || !newContact.email || isAdding}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add & Use
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Save as Contact Checkbox
// ============================================================================

interface SaveAsContactProps {
  values: Record<string, string>;
  placeholders: Placeholder[];
  onSaved: () => void;
}

function SaveAsContactCheckbox({ values, placeholders, onSaved }: SaveAsContactProps) {
  const [checked, setChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Extract party B values
  const getPartyBData = () => {
    let name = "";
    let email = "";
    let company = "";
    let phone = "";

    for (const p of placeholders) {
      if (p.category !== "party_b") continue;
      const idLower = p.id.toLowerCase();
      const val = values[p.id] || "";

      if (idLower.includes("name") && !idLower.includes("company") && val) {
        name = val;
      } else if (idLower.includes("email") && val) {
        email = val;
      } else if (idLower.includes("company") && val) {
        company = val;
      } else if (idLower.includes("phone") && val) {
        phone = val;
      }
    }

    return { name, email, company, phone };
  };

  const partyB = getPartyBData();
  const canSave = partyB.name && partyB.email;

  const handleSave = async () => {
    if (!canSave || isSaving) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partyB),
      });

      if (res.ok) {
        onSaved();
      }
    } catch {
      // Ignore errors
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (checked && canSave) {
      handleSave();
    }
  }, [checked]);

  if (!canSave) return null;

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        disabled={isSaving}
        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
      <UserPlus className="w-4 h-4" />
      Save {partyB.name} as a contact
      {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
    </label>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function EnhancedPlaceholderModal({
  template,
  placeholderValues,
  onValuesChange,
  onSubmit,
  onClose,
  isSubmitting,
  jurisdiction,
}: EnhancedPlaceholderModalProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(CategoryOrder)
  );
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [contactSaved, setContactSaved] = useState(false);

  const placeholders = template.content?.placeholders || [];

  // Enhance placeholders with smart types
  const enhancedPlaceholders = placeholders.map((p) => ({
    ...p,
    type: detectEnhancedType(p),
  }));

  // Group by category
  const groupedPlaceholders = enhancedPlaceholders.reduce((acc, p) => {
    const category = p.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(p);
    return acc;
  }, {} as Record<string, Placeholder[]>);

  const orderedCategories = CategoryOrder.filter(
    (c) => groupedPlaceholders[c]?.length
  );

  // Fetch user profile for auto-fill
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setUserProfile(data.profile);
        }
      } catch {
        // Ignore errors
      }
    }
    fetchProfile();
  }, []);

  // Auto-fill from profile (only once when profile loads)
  const hasAutoFilled = useRef(false);
  useEffect(() => {
    if (!userProfile || hasAutoFilled.current) return;
    hasAutoFilled.current = true;

    const updates: Record<string, string> = {};
    const autoFilled: string[] = [];

    for (const p of enhancedPlaceholders) {
      const category = p.category || "other";
      const autofillKey = getAutofillMapping(p, category);

      if (autofillKey && !placeholderValues[p.id]) {
        const profileValue = userProfile[autofillKey as keyof UserProfile];
        if (profileValue) {
          updates[p.id] = profileValue;
          autoFilled.push(p.id);
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      onValuesChange({ ...placeholderValues, ...updates });
      setAutoFilledFields(new Set(autoFilled));
    }
  }, [userProfile]);

  // Count required fields
  const requiredFields = enhancedPlaceholders.filter((p) => p.required);
  const filledRequired = requiredFields.filter(
    (p) => placeholderValues[p.id]?.trim()
  );
  const canSubmit = requiredFields.every((p) => placeholderValues[p.id]?.trim());

  // Validate a field
  const validateField = (placeholder: Placeholder, value: string): string | null => {
    if (placeholder.required && !value?.trim()) {
      return validateRequired(value, placeholder.label);
    }
    if (placeholder.type === "email" && value) {
      return validateEmail(value);
    }
    if (placeholder.type === "phone" && value) {
      return validatePhone(value);
    }
    return null;
  };

  const updateValue = (id: string, value: string) => {
    onValuesChange({ ...placeholderValues, [id]: value });

    // Clear error when user types
    if (errors[id]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }

    // Clear auto-fill status
    if (autoFilledFields.has(id)) {
      setAutoFilledFields((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleBlur = (placeholder: Placeholder) => {
    setTouched((prev) => new Set(prev).add(placeholder.id));

    const error = validateField(placeholder, placeholderValues[placeholder.id] || "");
    if (error) {
      setErrors((prev) => ({ ...prev, [placeholder.id]: error }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[placeholder.id];
        return next;
      });
    }
  };

  const handleContactSelect = (contact: Contact) => {
    const partyBFields = groupedPlaceholders["party_b"] || [];
    const updates: Record<string, string> = { ...placeholderValues };

    for (const p of partyBFields) {
      const idLower = p.id.toLowerCase();
      if (idLower.includes("name") && !idLower.includes("company") && contact.name) {
        updates[p.id] = contact.name;
      } else if (idLower.includes("email") && contact.email) {
        updates[p.id] = contact.email;
      } else if (idLower.includes("company") && contact.company) {
        updates[p.id] = contact.company;
      } else if (idLower.includes("phone") && contact.phone) {
        updates[p.id] = contact.phone;
      }
    }

    onValuesChange(updates);
    setContactSaved(true); // Contact was selected from existing, so it's already saved
  };

  const toggleCategory = (category: string) => {
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

  // Get category completion status
  const getCategoryStatus = (category: string) => {
    const categoryPlaceholders = groupedPlaceholders[category] || [];
    const required = categoryPlaceholders.filter((p) => p.required);
    const filled = required.filter((p) => placeholderValues[p.id]?.trim());
    return {
      total: categoryPlaceholders.length,
      requiredTotal: required.length,
      requiredFilled: filled.length,
      isComplete: required.length === filled.length,
    };
  };

  // Render field based on type
  const renderField = (placeholder: Placeholder) => {
    const value = placeholderValues[placeholder.id] || "";
    const isAutoFilled = autoFilledFields.has(placeholder.id);
    const error = touched.has(placeholder.id) ? errors[placeholder.id] : undefined;

    const fieldProps: FieldProps = {
      placeholder,
      value,
      onChange: (v) => updateValue(placeholder.id, v),
      onBlur: () => handleBlur(placeholder),
      error,
      jurisdiction,
      isAutoFilled,
    };

    let FieldComponent: React.FC<FieldProps>;
    switch (placeholder.type) {
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
      case "duration":
        FieldComponent = DurationField;
        break;
      case "address":
        FieldComponent = AddressField;
        break;
      case "textarea":
        FieldComponent = TextAreaField;
        break;
      case "select":
        FieldComponent = SelectField;
        break;
      default:
        FieldComponent = TextField;
    }

    return <FieldComponent {...fieldProps} />;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Fill in Contract Details
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">{template.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress indicator */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                <span className="font-semibold text-emerald-600">{filledRequired.length}</span>
                {" "}of{" "}
                <span className="font-semibold">{requiredFields.length}</span>
                {" "}required fields completed
              </span>
              <div className="w-48 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out"
                  style={{
                    width: `${
                      requiredFields.length
                        ? (filledRequired.length / requiredFields.length) * 100
                        : 100
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Form content */}
          <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-220px)]">
            <div className="space-y-4">
              {orderedCategories.map((category) => {
                const status = getCategoryStatus(category);
                const isExpanded = expandedCategories.has(category);

                return (
                  <div
                    key={category}
                    className="border border-slate-200 rounded-xl overflow-hidden transition-all"
                  >
                    {/* Category header - using div instead of button to avoid nested button issue with ContactPicker */}
                    <div
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <div
                        className="flex items-center gap-3 flex-1"
                        onClick={() => toggleCategory(category)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && toggleCategory(category)}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            status.isComplete
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {status.isComplete ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            CategoryIcons[category] || (
                              <FileText className="w-4 h-4" />
                            )
                          )}
                        </div>
                        <div className="text-left">
                          <h3 className="font-medium text-slate-900">
                            {CategoryNames[category] || category}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {status.requiredFilled} of {status.requiredTotal} required
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {category === "party_b" && (
                          <ContactPicker
                            category={category}
                            onSelect={handleContactSelect}
                          />
                        )}
                        <div
                          onClick={() => toggleCategory(category)}
                          className={`transform transition-transform duration-200 cursor-pointer p-1 hover:bg-slate-200 rounded ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        >
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    {/* Category fields with animation */}
                    <div
                      className={`transition-all duration-200 ease-in-out overflow-hidden ${
                        isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="px-4 py-4 bg-white border-t border-slate-100">
                        <div className="grid gap-4 md:grid-cols-2">
                          {groupedPlaceholders[category].map((placeholder) => (
                            <div
                              key={placeholder.id}
                              className={
                                placeholder.type === "textarea" ||
                                placeholder.type === "address"
                                  ? "md:col-span-2"
                                  : ""
                              }
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                  {placeholder.label}
                                  {placeholder.required && (
                                    <span className="text-red-400">*</span>
                                  )}
                                </label>
                                {autoFilledFields.has(placeholder.id) && (
                                  <span className="text-xs text-emerald-500 flex items-center gap-0.5 animate-in fade-in duration-300">
                                    <Sparkles className="w-3 h-3" />
                                    Auto-filled
                                  </span>
                                )}
                              </div>
                              {placeholder.description && (
                                <p className="text-xs text-slate-500 mb-1.5">
                                  {placeholder.description}
                                </p>
                              )}
                              {renderField(placeholder)}
                            </div>
                          ))}
                        </div>

                        {/* Save as contact option for party_b */}
                        {category === "party_b" && !contactSaved && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <SaveAsContactCheckbox
                              values={placeholderValues}
                              placeholders={enhancedPlaceholders}
                              onSaved={() => setContactSaved(true)}
                            />
                          </div>
                        )}
                        {category === "party_b" && contactSaved && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs text-emerald-600 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Contact saved
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!canSubmit || isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Contract
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
