export type FieldType = "signature" | "initials" | "date" | "text" | "checkbox";

export interface PlacedFieldData {
  id: string;
  type: FieldType;
  signerId: string;
  signerRole: string;
  page: number;
  x: number;      // X position (% of page width)
  y: number;      // Y position (% of page height)
  width: number;  // Width in pixels
  height: number; // Height in pixels
  required: boolean;
  label?: string;
  placeholder?: string;
}

export interface FieldConfig {
  type: FieldType;
  label: string;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  color: string;
}

export const FIELD_CONFIGS: FieldConfig[] = [
  {
    type: "signature",
    label: "Signature",
    description: "Hand-drawn signature",
    defaultWidth: 200,
    defaultHeight: 60,
    color: "#8b5cf6", // violet
  },
  {
    type: "initials",
    label: "Initials",
    description: "Signer initials",
    defaultWidth: 80,
    defaultHeight: 40,
    color: "#3b82f6", // blue
  },
  {
    type: "date",
    label: "Date",
    description: "Date of signing",
    defaultWidth: 120,
    defaultHeight: 30,
    color: "#10b981", // emerald
  },
  {
    type: "text",
    label: "Text",
    description: "Free text input",
    defaultWidth: 180,
    defaultHeight: 30,
    color: "#f59e0b", // amber
  },
  {
    type: "checkbox",
    label: "Checkbox",
    description: "Yes/No selection",
    defaultWidth: 24,
    defaultHeight: 24,
    color: "#ef4444", // red
  },
];

export function getFieldConfig(type: FieldType): FieldConfig {
  return FIELD_CONFIGS.find((c) => c.type === type) || FIELD_CONFIGS[0];
}
