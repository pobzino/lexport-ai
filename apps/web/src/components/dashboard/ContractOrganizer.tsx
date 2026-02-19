"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Folder, Tag } from "lucide-react";
import { FolderSidebar } from "./FolderSidebar";

interface Contract {
  id: string;
  title: string;
  type: string;
  status: string;
  updated_at: string;
  folder_id?: string | null;
  tags?: { id: string; name: string; color: string }[];
}

interface ContractOrganizerProps {
  initialContracts: Contract[];
}

export function ContractOrganizer({ initialContracts }: ContractOrganizerProps) {
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContracts();
  }, [selectedFolderId, selectedTags]);

  async function loadContracts() {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (selectedFolderId && selectedFolderId !== "uncategorized") {
        params.set("folderId", selectedFolderId);
      } else if (selectedFolderId === "uncategorized") {
        params.set("uncategorized", "true");
      }
      if (selectedTags.length > 0) {
        params.set("tags", selectedTags.join(","));
      }

      const response = await fetch(
        `/api/contracts?${params.toString()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setContracts(data.contracts || []);
      }
    } catch (error) {
      console.error("Failed to load contracts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function moveToFolder(contractId: string, folderId: string | null) {
    try {
      const response = await fetch(`/api/contracts/${contractId}/folder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });

      if (response.ok) {
        // Refresh contracts
        loadContracts();
      }
    } catch (error) {
      console.error("Failed to move contract:", error);
    }
  }

  const uncategorizedCount = initialContracts.filter(
    (c) => !c.folder_id
  ).length;

  const filteredContracts = contracts.filter((contract) => {
    // Folder filter
    if (selectedFolderId === "uncategorized") {
      if (contract.folder_id) return false;
    } else if (selectedFolderId) {
      if (contract.folder_id !== selectedFolderId) return false;
    }

    // Tag filter
    if (selectedTags.length > 0) {
      const contractTagIds = contract.tags?.map((t) => t.id) || [];
      const hasAllTags = selectedTags.every((tagId) =>
        contractTagIds.includes(tagId)
      );
      if (!hasAllTags) return false;
    }

    return true;
  });

  return (
    <div className="flex gap-6 -mx-6">
      <FolderSidebar
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
        uncategorizedCount={uncategorizedCount}
      />

      <div className="flex-1 px-6">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">No contracts in this folder</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContracts.map((contract) => (
              <div
                key={contract.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="text-lg font-medium text-blue-600 hover:underline"
                    >
                      {contract.title}
                    </Link>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                      <span className="capitalize">{contract.type}</span>
                      <span>•</span>
                      <span className="capitalize">{contract.status}</span>
                      <span>•</span>
                      <span>
                        {new Date(contract.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    {contract.tags && contract.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {contract.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: tag.color }}
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {tag.name}
                          </span>
                        ))}
                        {contract.tags.length > 3 && (
                          <span className="text-xs text-gray-500 px-2 py-0.5">
                            +{contract.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
