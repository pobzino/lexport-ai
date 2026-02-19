"use client";

import { useState, useEffect } from "react";
import { Tag, X, Plus } from "lucide-react";

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface TagManagerProps {
  selectedTags: string[];
  onTagsChange: (tagIds: string[]) => void;
}

const PRESET_TAG_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#F59E0B", // amber
  "#EF4444", // red
  "#14B8A6", // teal
  "#6B7280", // gray
];

export function TagManager({ selectedTags, onTagsChange }: TagManagerProps) {
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_TAG_COLORS[0]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    try {
      const response = await fetch("/api/tags");
      if (response.ok) {
        const data = await response.json();
        setAllTags(data.tags || []);
      }
    } catch (error) {
      console.error("Failed to load tags:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createTag() {
    if (!newTagName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAllTags([...allTags, data.tag]);
        setNewTagName("");
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error("Failed to create tag:", error);
    } finally {
      setCreating(false);
    }
  }

  function toggleTag(tagId: string) {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Tags</label>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          New Tag
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-gray-50 p-3 rounded border space-y-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Tag name"
            className="w-full px-3 py-1.5 text-sm border rounded"
            maxLength={50}
            disabled={creating}
          />
          <div className="flex gap-2 items-center">
            <div className="flex gap-1">
              {PRESET_TAG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTagColor(color)}
                  className={`w-6 h-6 rounded border-2 ${
                    newTagColor === color
                      ? "border-gray-900"
                      : "border-transparent hover:border-gray-400"
                  }`}
                  style={{ backgroundColor: color }}
                  disabled={creating}
                />
              ))}
            </div>
            <button
              onClick={createTag}
              disabled={!newTagName.trim() || creating}
              className="ml-auto px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewTagName("");
              }}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
              disabled={creating}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400">Loading tags...</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {allTags.length === 0 ? (
            <p className="text-sm text-gray-400">
              No tags yet. Create one to categorize your contracts.
            </p>
          ) : (
            allTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition ${
                  selectedTags.includes(tag.id)
                    ? "ring-2 ring-offset-1 ring-gray-900"
                    : "hover:ring-1 ring-gray-400"
                }`}
                style={{
                  backgroundColor: tag.color,
                  color: "#fff",
                }}
              >
                <Tag className="w-3 h-3" />
                {tag.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
