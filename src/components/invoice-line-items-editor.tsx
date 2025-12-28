"use client";

import { useState, useCallback, useEffect } from "react";
import type { InvoiceLineItem } from "@/db/types";

interface InvoiceLineItemsEditorProps {
  lineItems: InvoiceLineItem[];
  onChange: (items: InvoiceLineItem[]) => void;
  currency?: string;
  disabled?: boolean;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: "$",
  gbp: "£",
  eur: "€",
};

function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency.toLowerCase()] || "$";
  return `${symbol}${(amount / 100).toFixed(2)}`;
}

function parseCurrencyInput(value: string): number {
  // Remove currency symbols and commas, parse as float, convert to cents
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

export function InvoiceLineItemsEditor({
  lineItems,
  onChange,
  currency = "usd",
  disabled = false,
}: InvoiceLineItemsEditorProps) {
  const [items, setItems] = useState<InvoiceLineItem[]>(lineItems);

  // Sync with parent when lineItems prop changes
  useEffect(() => {
    setItems(lineItems);
  }, [lineItems]);

  const updateItem = useCallback(
    (index: number, field: keyof InvoiceLineItem, value: string | number) => {
      const newItems = [...items];
      const item = { ...newItems[index] };

      if (field === "description") {
        item.description = value as string;
      } else if (field === "quantity") {
        item.quantity = parseFloat(value as string) || 0;
      } else if (field === "unit_price") {
        item.unit_price = parseCurrencyInput(value as string);
      }

      // Recalculate amount
      item.amount = Math.round(item.quantity * item.unit_price);
      newItems[index] = item;

      setItems(newItems);
      onChange(newItems);
    },
    [items, onChange]
  );

  const addItem = useCallback(() => {
    const newItem: InvoiceLineItem = {
      description: "",
      quantity: 1,
      unit_price: 0,
      amount: 0,
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    onChange(newItems);
  }, [items, onChange]);

  const removeItem = useCallback(
    (index: number) => {
      if (items.length <= 1) return; // Keep at least one item
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      onChange(newItems);
    },
    [items, onChange]
  );

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider px-2">
        <div className="col-span-5">Description</div>
        <div className="col-span-2 text-right">Qty</div>
        <div className="col-span-2 text-right">Unit Price</div>
        <div className="col-span-2 text-right">Amount</div>
        <div className="col-span-1"></div>
      </div>

      {/* Line Items */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2"
          >
            {/* Description */}
            <div className="col-span-5">
              <input
                type="text"
                value={item.description}
                onChange={(e) =>
                  updateItem(index, "description", e.target.value)
                }
                placeholder="Item description"
                disabled={disabled}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            {/* Quantity */}
            <div className="col-span-2">
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(index, "quantity", e.target.value)}
                min="0"
                step="0.5"
                disabled={disabled}
                className="w-full px-3 py-2 text-sm text-right border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            {/* Unit Price */}
            <div className="col-span-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  {CURRENCY_SYMBOLS[currency.toLowerCase()] || "$"}
                </span>
                <input
                  type="text"
                  value={(item.unit_price / 100).toFixed(2)}
                  onChange={(e) =>
                    updateItem(index, "unit_price", e.target.value)
                  }
                  disabled={disabled}
                  className="w-full pl-7 pr-3 py-2 text-sm text-right border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
            </div>

            {/* Amount (calculated) */}
            <div className="col-span-2 text-right">
              <span className="text-sm font-medium text-gray-700">
                {formatCurrency(item.amount, currency)}
              </span>
            </div>

            {/* Delete Button */}
            <div className="col-span-1 text-center">
              <button
                onClick={() => removeItem(index)}
                disabled={disabled || items.length <= 1}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={items.length <= 1 ? "At least one item required" : "Remove item"}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Item Button */}
      <button
        onClick={addItem}
        disabled={disabled}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add Line Item
      </button>

      {/* Subtotal */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Subtotal</span>
          <span className="text-lg font-semibold text-gray-900">
            {formatCurrency(subtotal, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Quick presets for common line items
export function QuickLineItemPresets({
  onSelect,
  disabled,
}: {
  onSelect: (item: Omit<InvoiceLineItem, "amount">) => void;
  disabled?: boolean;
}) {
  const presets = [
    { description: "Consulting Services", quantity: 1, unit_price: 15000 },
    { description: "Development Work", quantity: 1, unit_price: 10000 },
    { description: "Design Services", quantity: 1, unit_price: 7500 },
    { description: "Project Management", quantity: 1, unit_price: 5000 },
    { description: "Hourly Rate", quantity: 1, unit_price: 15000 },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset, index) => (
        <button
          key={index}
          onClick={() => onSelect(preset)}
          disabled={disabled}
          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50"
        >
          {preset.description}
        </button>
      ))}
    </div>
  );
}

// Helper hook for managing line items state
export function useLineItems(initialItems?: InvoiceLineItem[]) {
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(
    initialItems || [{ description: "", quantity: 1, unit_price: 0, amount: 0 }]
  );

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const addPreset = useCallback(
    (preset: Omit<InvoiceLineItem, "amount">) => {
      const newItem: InvoiceLineItem = {
        ...preset,
        amount: preset.quantity * preset.unit_price,
      };
      setLineItems((prev) => [...prev, newItem]);
    },
    []
  );

  const reset = useCallback((items?: InvoiceLineItem[]) => {
    setLineItems(
      items || [{ description: "", quantity: 1, unit_price: 0, amount: 0 }]
    );
  }, []);

  return {
    lineItems,
    setLineItems,
    subtotal,
    addPreset,
    reset,
  };
}
