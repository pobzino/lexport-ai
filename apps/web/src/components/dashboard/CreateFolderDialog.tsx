"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface FolderItem {
  id: string;
  name: string;
  color: string;
}

interface CreateFolderDialogProps {
  folder?: FolderItem | null;
  onClose: () => void;
  onCreated: (folder: FolderItem) => void;
}

const PRESET_COLORS = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#10B981" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Orange", value: "#F59E0B" },
  { name: "Red", value: "#EF4444" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Indigo", value: "#6366F1" },
];

export function CreateFolderDialog({
  folder,
  onClose,
  onCreated,
}: CreateFolderDialogProps) {
  const [name, setName] = useState(folder?.name || "");
  const [color, setColor] = useState(folder?.color || "#3B82F6");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!folder;

  useEffect(() => {
    // Focus name input on mount
    const input = document.getElementById("folder-name") as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Folder name is required");
      return;
    }

    if (name.length > 100) {
      setError("Folder name must be 100 characters or less");
      return;
    }

    setLoading(true);

    try {
      const url = isEditing ? `/api/folders/${folder.id}` : "/api/folders";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save folder");
      }

      const data = await response.json();
      onCreated(data.folder);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {isEditing ? "Edit Folder" : "Create Folder"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="folder-name" className="block text-sm font-medium mb-1">
              Folder Name
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Client Contracts, Legal Docs"
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Color</label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setColor(preset.value)}
                  className={`h-10 rounded border-2 transition ${
                    color === preset.value
                      ? "border-gray-900 ring-2 ring-blue-500"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                  disabled={loading}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-20 rounded border cursor-pointer"
                disabled={loading}
              />
              <span className="text-sm text-gray-600">Custom color</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
