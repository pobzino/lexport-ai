"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { User, Building2, Mail, Clock, Star, X, Plus } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  email: string;
  company?: string;
  role?: string;
  usage_count: number;
  last_used_at?: string;
}

interface ContactAutocompleteProps {
  label: string;
  value: {
    name?: string;
    email?: string;
    company?: string;
  };
  onChange: (value: { name?: string; email?: string; company?: string }) => void;
  placeholder?: string;
  showCompany?: boolean;
  roleFilter?: string;
}

export function ContactAutocomplete({
  label,
  value,
  onChange,
  placeholder = "Start typing to search contacts...",
  showCompany = true,
  roleFilter,
}: ContactAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch contacts
  const fetchContacts = useCallback(async (searchTerm: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (roleFilter) params.set("role", roleFilter);
      params.set("limit", "10");

      const response = await fetch(`/api/contacts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) {
        fetchContacts(search);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, isOpen, fetchContacts]);

  // Initial fetch when opening
  useEffect(() => {
    if (isOpen && contacts.length === 0) {
      fetchContacts("");
    }
  }, [isOpen, contacts.length, fetchContacts]);

  const handleSelectContact = (contact: Contact) => {
    onChange({
      name: contact.name,
      email: contact.email,
      company: contact.company,
    });
    setIsOpen(false);
    setSearch("");
    setShowManualEntry(false);

    // Track usage
    fetch(`/api/contacts/${contact.id}`, { method: "POST" }).catch(() => {});
  };

  const handleClear = () => {
    onChange({ name: "", email: "", company: "" });
    setSearch("");
    inputRef.current?.focus();
  };

  const hasValue = value.name || value.email;

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>

      {/* Selected Contact Display */}
      {hasValue && !showManualEntry ? (
        <div className="flex items-center gap-3 p-3 bg-[#529ec6]/5 border border-[#529ec6]/20 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-[#529ec6]/10 flex items-center justify-center">
            <User className="w-5 h-5 text-[#529ec6]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{value.name}</p>
            <p className="text-sm text-slate-500 truncate">{value.email}</p>
            {value.company && (
              <p className="text-xs text-slate-400 truncate">{value.company}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-[#529ec6]/10 rounded"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      ) : (
        <>
          {/* Search Input */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={showManualEntry ? value.name || "" : search}
              onChange={(e) => {
                if (showManualEntry) {
                  onChange({ ...value, name: e.target.value });
                } else {
                  setSearch(e.target.value);
                }
              }}
              onFocus={() => !showManualEntry && setIsOpen(true)}
              placeholder={showManualEntry ? "Full Name" : placeholder}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-[#529ec6] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Manual Entry Fields */}
          {showManualEntry && (
            <div className="mt-2 space-y-2">
              <input
                type="email"
                value={value.email || ""}
                onChange={(e) => onChange({ ...value, email: e.target.value })}
                placeholder="Email address"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
              />
              {showCompany && (
                <input
                  type="text"
                  value={value.company || ""}
                  onChange={(e) => onChange({ ...value, company: e.target.value })}
                  placeholder="Company (optional)"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
                />
              )}
              <button
                type="button"
                onClick={() => setShowManualEntry(false)}
                className="text-sm text-[#529ec6] hover:text-[#202e46]"
              >
                Search existing contacts instead
              </button>
            </div>
          )}

          {/* Dropdown */}
          {isOpen && !showManualEntry && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-auto">
              {/* Frequent Contacts Header */}
              {contacts.length > 0 && !search && (
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Frequently Used
                  </p>
                </div>
              )}

              {/* Contact List */}
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => handleSelectContact(contact)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{contact.name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                    {contact.company && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Building2 className="w-3 h-3" />
                        <span className="truncate">{contact.company}</span>
                      </div>
                    )}
                  </div>
                  {contact.usage_count > 1 && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{contact.usage_count}x</span>
                    </div>
                  )}
                </button>
              ))}

              {/* Empty State */}
              {contacts.length === 0 && !isLoading && (
                <div className="px-3 py-4 text-center text-sm text-slate-500">
                  {search ? "No contacts found" : "No saved contacts yet"}
                </div>
              )}

              {/* Add New Contact Option */}
              <button
                type="button"
                onClick={() => {
                  setShowManualEntry(true);
                  setIsOpen(false);
                  if (search) {
                    // Pre-fill name or email from search
                    if (search.includes("@")) {
                      onChange({ email: search });
                    } else {
                      onChange({ name: search });
                    }
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-[#529ec6] font-medium text-sm border-t border-slate-100"
              >
                <Plus className="w-4 h-4" />
                <span>Enter new contact details</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Simple version for forms that just need email + name fields
export function ContactInput({
  nameLabel = "Full Name",
  emailLabel = "Email",
  nameValue,
  emailValue,
  companyValue,
  onNameChange,
  onEmailChange,
  onCompanyChange,
  showCompany = false,
  namePlaceholder = "John Smith",
  emailPlaceholder = "john@company.com",
  companyPlaceholder = "Company Inc.",
}: {
  nameLabel?: string;
  emailLabel?: string;
  nameValue: string;
  emailValue: string;
  companyValue?: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onCompanyChange?: (value: string) => void;
  showCompany?: boolean;
  namePlaceholder?: string;
  emailPlaceholder?: string;
  companyPlaceholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeField, setActiveField] = useState<"name" | "email" | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions based on input
  const fetchSuggestions = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/contacts?search=${encodeURIComponent(searchTerm)}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.contacts || []);
        setShowSuggestions(data.contacts?.length > 0);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  }, []);

  // Debounced search for name field
  useEffect(() => {
    if (activeField === "name") {
      const timer = setTimeout(() => fetchSuggestions(nameValue), 300);
      return () => clearTimeout(timer);
    }
  }, [nameValue, activeField, fetchSuggestions]);

  // Debounced search for email field
  useEffect(() => {
    if (activeField === "email") {
      const timer = setTimeout(() => fetchSuggestions(emailValue), 300);
      return () => clearTimeout(timer);
    }
  }, [emailValue, activeField, fetchSuggestions]);

  const handleSelectSuggestion = (contact: Contact) => {
    onNameChange(contact.name);
    onEmailChange(contact.email);
    if (showCompany && onCompanyChange && contact.company) {
      onCompanyChange(contact.company);
    }
    setShowSuggestions(false);

    // Track usage
    fetch(`/api/contacts/${contact.id}`, { method: "POST" }).catch(() => {});
  };

  return (
    <div ref={wrapperRef} className="space-y-4 relative">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {nameLabel}
        </label>
        <input
          type="text"
          value={nameValue}
          onChange={(e) => onNameChange(e.target.value)}
          onFocus={() => setActiveField("name")}
          placeholder={namePlaceholder}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {emailLabel}
        </label>
        <input
          type="email"
          value={emailValue}
          onChange={(e) => onEmailChange(e.target.value)}
          onFocus={() => setActiveField("email")}
          placeholder={emailPlaceholder}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
        />
      </div>

      {showCompany && onCompanyChange && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Company (optional)
          </label>
          <input
            type="text"
            value={companyValue || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            placeholder={companyPlaceholder}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
          />
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-500">
              Suggestions from your contacts
            </p>
          </div>
          {suggestions.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => handleSelectSuggestion(contact)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left"
            >
              <div className="w-7 h-7 rounded-full bg-[#529ec6]/10 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-[#529ec6]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{contact.name}</p>
                <p className="text-xs text-slate-500 truncate">{contact.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
