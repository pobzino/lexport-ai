"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Folder,
    FolderPlus,
    Tag,
    ChevronRight,
    ChevronDown,
    MoreHorizontal,
    Pencil,
    Trash2,
    X
} from "lucide-react";
import toast from "@/lib/toast";
import { cn } from "@/lib/utils";

interface FolderType {
    id: string;
    name: string;
    color: string;
    icon: string;
    contracts: { count: number }[];
}

interface TagType {
    id: string;
    name: string;
    color: string;
    contract_tags: { count: number }[];
}

interface FoldersSidebarProps {
    selectedFolderId: string | null;
    selectedTagId: string | null;
    onSelectFolder: (folderId: string | null) => void;
    onSelectTag: (tagId: string | null) => void;
}

const TAG_COLORS = [
    "#202e46", "#529ec6", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316"
];

export function FoldersSidebar({
    selectedFolderId,
    selectedTagId,
    onSelectFolder,
    onSelectTag,
}: FoldersSidebarProps) {
    const [folders, setFolders] = useState<FolderType[]>([]);
    const [tags, setTags] = useState<TagType[]>([]);
    const [loading, setLoading] = useState(true);
    const [foldersExpanded, setFoldersExpanded] = useState(true);
    const [tagsExpanded, setTagsExpanded] = useState(true);
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [newTagName, setNewTagName] = useState("");
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

    const supabase = createClient();

    useEffect(() => {
        fetchFoldersAndTags();
    }, []);

    async function fetchFoldersAndTags() {
        try {
            const [foldersRes, tagsRes] = await Promise.all([
                supabase.from("folders").select("*, contracts(count)").order("name"),
                supabase.from("tags").select("*, contract_tags(count)").order("name"),
            ]);

            if (foldersRes.data) setFolders(foldersRes.data);
            if (tagsRes.data) setTags(tagsRes.data);
            if (foldersRes.error || tagsRes.error) {
                toast.error("Failed to load folders or tags.");
            }
        } catch (error) {
            console.error("Error fetching folders/tags:", error);
            toast.error("Failed to load folders and tags.");
        } finally {
            setLoading(false);
        }
    }

    async function createFolder() {
        if (!newFolderName.trim()) return;

        try {
            const res = await fetch("/api/folders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newFolderName }),
            });

            if (res.ok) {
                const { folder } = await res.json();
                setFolders(prev => [...prev, { ...folder, contracts: [{ count: 0 }] }]);
                setNewFolderName("");
                setIsAddingFolder(false);
            } else {
                toast.error("Failed to create folder.");
            }
        } catch (error) {
            console.error("Error creating folder:", error);
            toast.error("Failed to create folder.");
        }
    }

    async function createTag() {
        if (!newTagName.trim()) return;

        try {
            const res = await fetch("/api/tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newTagName, color: newTagColor }),
            });

            if (res.ok) {
                const { tag } = await res.json();
                setTags(prev => [...prev, { ...tag, contract_tags: [{ count: 0 }] }]);
                setNewTagName("");
                setIsAddingTag(false);
            } else {
                toast.error("Failed to create tag.");
            }
        } catch (error) {
            console.error("Error creating tag:", error);
            toast.error("Failed to create tag.");
        }
    }

    async function deleteFolder(folderId: string) {
        try {
            const res = await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
            if (res.ok) {
                setFolders(prev => prev.filter(f => f.id !== folderId));
                if (selectedFolderId === folderId) onSelectFolder(null);
            } else {
                toast.error("Failed to delete folder.");
            }
        } catch (error) {
            console.error("Error deleting folder:", error);
            toast.error("Failed to delete folder.");
        }
    }

    async function deleteTag(tagId: string) {
        try {
            const res = await fetch(`/api/tags/${tagId}`, { method: "DELETE" });
            if (res.ok) {
                setTags(prev => prev.filter(t => t.id !== tagId));
                if (selectedTagId === tagId) onSelectTag(null);
            } else {
                toast.error("Failed to delete tag.");
            }
        } catch (error) {
            console.error("Error deleting tag:", error);
            toast.error("Failed to delete tag.");
        }
    }

    return (
        <div className="w-56 bg-white border-r border-slate-200 h-full flex flex-col">
            {/* All Contracts */}
            <button
                onClick={() => { onSelectFolder(null); onSelectTag(null); }}
                className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                    !selectedFolderId && !selectedTagId
                        ? "bg-[#529ec6]/10 text-[#202e46]"
                        : "text-slate-600 hover:bg-slate-50"
                )}
            >
                <Folder className="h-4 w-4" />
                All Contracts
            </button>

            {/* Folders Section */}
            <div className="mt-4">
                <button
                    onClick={() => setFoldersExpanded(!foldersExpanded)}
                    className="flex items-center justify-between w-full px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600"
                >
                    <span>Folders</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsAddingFolder(true); }}
                            className="p-0.5 hover:bg-slate-100 rounded"
                        >
                            <FolderPlus className="h-3.5 w-3.5" />
                        </button>
                        {foldersExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </div>
                </button>

                {foldersExpanded && (
                    <div className="mt-1 space-y-0.5">
                        {isAddingFolder && (
                            <div className="px-3 py-1.5">
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && createFolder()}
                                    placeholder="Folder name..."
                                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#529ec6]/50"
                                    autoFocus
                                />
                                <div className="flex gap-1 mt-1">
                                    <button onClick={createFolder} className="text-xs text-[#529ec6] hover:underline">Save</button>
                                    <button onClick={() => setIsAddingFolder(false)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                                </div>
                            </div>
                        )}

                        {folders.map((folder) => (
                            <div
                                key={folder.id}
                                className={cn(
                                    "group flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors",
                                    selectedFolderId === folder.id
                                        ? "bg-[#529ec6]/10 text-[#202e46]"
                                        : "text-slate-600 hover:bg-slate-50"
                                )}
                                onClick={() => { onSelectFolder(folder.id); onSelectTag(null); }}
                            >
                                <div className="flex items-center gap-2">
                                    <Folder className="h-4 w-4" style={{ color: folder.color }} />
                                    <span className="truncate">{folder.name}</span>
                                    <span className="text-xs text-slate-400">
                                        {folder.contracts?.[0]?.count || 0}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tags Section */}
            <div className="mt-4">
                <button
                    onClick={() => setTagsExpanded(!tagsExpanded)}
                    className="flex items-center justify-between w-full px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600"
                >
                    <span>Tags</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsAddingTag(true); }}
                            className="p-0.5 hover:bg-slate-100 rounded"
                        >
                            <Tag className="h-3.5 w-3.5" />
                        </button>
                        {tagsExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </div>
                </button>

                {tagsExpanded && (
                    <div className="mt-1 space-y-0.5">
                        {isAddingTag && (
                            <div className="px-3 py-1.5">
                                <input
                                    type="text"
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && createTag()}
                                    placeholder="Tag name..."
                                    className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#529ec6]/50"
                                    autoFocus
                                />
                                <div className="flex gap-1 mt-2 flex-wrap">
                                    {TAG_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setNewTagColor(color)}
                                            className={cn(
                                                "h-5 w-5 rounded-full border-2",
                                                newTagColor === color ? "border-slate-400" : "border-transparent"
                                            )}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-1 mt-1">
                                    <button onClick={createTag} className="text-xs text-[#529ec6] hover:underline">Save</button>
                                    <button onClick={() => setIsAddingTag(false)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                                </div>
                            </div>
                        )}

                        {tags.map((tag) => (
                            <div
                                key={tag.id}
                                className={cn(
                                    "group flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors",
                                    selectedTagId === tag.id
                                        ? "bg-[#529ec6]/10 text-[#202e46]"
                                        : "text-slate-600 hover:bg-slate-50"
                                )}
                                onClick={() => { onSelectTag(tag.id); onSelectFolder(null); }}
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-3 w-3 rounded-full"
                                        style={{ backgroundColor: tag.color }}
                                    />
                                    <span className="truncate">{tag.name}</span>
                                    <span className="text-xs text-slate-400">
                                        {tag.contract_tags?.[0]?.count || 0}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteTag(tag.id); }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
