"use client";

import { useState, useEffect } from "react";
import { Folder, Plus, MoreVertical, Edit2, Trash2 } from "lucide-react";
import toast from "@/lib/toast";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { CreateFolderDialog } from "./CreateFolderDialog";

interface FolderItem {
  id: string;
  name: string;
  color: string;
  contractCount?: number;
}

interface FolderSidebarProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  uncategorizedCount: number;
}

export function FolderSidebar({
  selectedFolderId,
  onSelectFolder,
  uncategorizedCount,
}: FolderSidebarProps) {
  const { confirm } = useConfirmDialog();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);

  useEffect(() => {
    loadFolders();
  }, []);

  async function loadFolders() {
    try {
      const response = await fetch("/api/folders");
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      } else {
        toast.error("Failed to load folders.");
      }
    } catch (error) {
      console.error("Failed to load folders:", error);
      toast.error("Failed to load folders.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteFolder(folderId: string) {
    const confirmed = await confirm({ title: "Delete Folder", message: "Delete this folder? Contracts will be moved to uncategorized.", variant: "danger", confirmText: "Delete" });
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setFolders(folders.filter((f) => f.id !== folderId));
        if (selectedFolderId === folderId) {
          onSelectFolder(null);
        }
      } else {
        toast.error("Failed to delete folder. Please try again.");
      }
    } catch (error) {
      console.error("Failed to delete folder:", error);
      toast.error("Failed to delete folder. Please try again.");
    }
  }

  function handleCreateFolder(folder: FolderItem) {
    setFolders([...folders, folder]);
    setShowCreateDialog(false);
  }

  function handleUpdateFolder(updatedFolder: FolderItem) {
    setFolders(folders.map((f) => (f.id === updatedFolder.id ? updatedFolder : f)));
    setEditingFolder(null);
  }

  return (
    <>
      <div className="w-64 border-r bg-gray-50 p-4 space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Folders</h2>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="p-1.5 hover:bg-gray-200 rounded"
            title="Create folder"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* All Contracts */}
        <button
          onClick={() => onSelectFolder(null)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm ${
            selectedFolderId === null
              ? "bg-blue-100 text-blue-900"
              : "hover:bg-gray-100 text-gray-700"
          }`}
        >
          <Folder className="w-4 h-4" style={{ color: "#3B82F6" }} />
          <span className="flex-1 text-left">All Contracts</span>
        </button>

        {/* Uncategorized */}
        {uncategorizedCount > 0 && (
          <button
            onClick={() => onSelectFolder("uncategorized")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm ${
              selectedFolderId === "uncategorized"
                ? "bg-gray-200 text-gray-900"
                : "hover:bg-gray-100 text-gray-500"
            }`}
          >
            <Folder className="w-4 h-4" style={{ color: "#9CA3AF" }} />
            <span className="flex-1 text-left">Uncategorized</span>
            <span className="text-xs text-gray-500">{uncategorizedCount}</span>
          </button>
        )}

        {/* User Folders */}
        {loading ? (
          <div className="text-sm text-gray-400 px-3 py-2">Loading...</div>
        ) : (
          <div className="space-y-1">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded text-sm ${
                  selectedFolderId === folder.id
                    ? "bg-blue-100 text-blue-900"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <button
                  onClick={() => onSelectFolder(folder.id)}
                  className="flex-1 flex items-center gap-2 text-left"
                >
                  <Folder className="w-4 h-4" style={{ color: folder.color }} />
                  <span className="flex-1 truncate">{folder.name}</span>
                  {folder.contractCount !== undefined && (
                    <span className="text-xs text-gray-500">{folder.contractCount}</span>
                  )}
                </button>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button
                    onClick={() => setEditingFolder(folder)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Edit folder"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteFolder(folder.id)}
                    className="p-1 hover:bg-red-100 rounded"
                    title="Delete folder"
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && folders.length === 0 && (
          <div className="text-sm text-gray-400 px-3 py-2">
            No folders yet. Create one to organize your contracts.
          </div>
        )}
      </div>

      {showCreateDialog && (
        <CreateFolderDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={handleCreateFolder}
        />
      )}

      {editingFolder && (
        <CreateFolderDialog
          folder={editingFolder}
          onClose={() => setEditingFolder(null)}
          onCreated={handleUpdateFolder}
        />
      )}
    </>
  );
}
