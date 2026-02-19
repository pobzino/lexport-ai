"use client";

import { useState, useEffect, useRef } from "react";
import { Tag, X } from "lucide-react";

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface TagInputProps {
  contractId: string;
  initialTags?: TagItem[];
  onTagsChange?: (tags: TagItem[]) => void;
}

export function TagInput({ contractId, initialTags = [], onTagsChange }: TagInputProps) {
  const [selectedTags, setSelectedTags] = useState<TagItem[]>(initialTags);
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAllTags();
    // Load contract's current tags
    loadContractTags();
  }, [contractId]);

  async function loadAllTags() {
    try {
      const response = await fetch("/api/tags");
      if (response.ok) {
        const data = await response.json();
        setAllTags(data.tags || []);
      }
    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  }

  async function loadContractTags() {
    try {
      const response = await fetch(`/api/contracts/${contractId}/tags`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTags(data.tags || []);
        onTagsChange?.(data.tags || []);
      }
    } catch (error) {
      console.error("Failed to load contract tags:", error);
    }
  }

  async function addTag(tag: TagItem) {
    setLoading(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: tag.id }),
      });

      if (response.ok) {
        const newTags = [...selectedTags, tag];
        setSelectedTags(newTags);
        onTagsChange?.(newTags);
        setSearchQuery("");
        setShowDropdown(false);
      }
    } catch (error) {
      console.error("Failed to add tag:", error);
    } finally {
      setLoading(false);
    }
  }

  async function removeTag(tagId: string) {
    setLoading(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });

      if (response.ok) {
        const newTags = selectedTags.filter((t) => t.id !== tagId);
        setSelectedTags(newTags);
        onTagsChange?.(newTags);
      }
    } catch (error) {
      console.error("Failed to remove tag:", error);
    } finally {
      setLoading(false);
    }
  }

  const availableTags = allTags.filter(
    (tag) =>
      !selectedTags.some((st) => st.id === tag.id) &&
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 items-center">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            <Tag className="w-3 h-3" />
            {tag.name}
            <button
              onClick={() => removeTag(tag.id)}
              className="ml-1 hover:bg-white/20 rounded-full p-0.5"
              disabled={loading}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Add tag..."
            className="px-2 py-1 text-sm border rounded w-32 focus:ring-1 focus:ring-blue-500"
            disabled={loading}
          />

          {showDropdown && availableTags.length > 0 && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-20 max-h-48 overflow-y-auto min-w-[12rem]">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => addTag(tag)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    disabled={loading}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
