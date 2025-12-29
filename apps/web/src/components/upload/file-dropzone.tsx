"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, Image, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  error?: string;
  acceptedTypes?: string[];
  maxSizeMB?: number;
}

const DEFAULT_ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

export function FileDropzone({
  onFileSelect,
  isUploading = false,
  error,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxSizeMB = 50,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!acceptedTypes.includes(file.type)) {
        return "Invalid file type. Please upload a PDF, Word document, or image.";
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `File too large. Maximum size is ${maxSizeMB}MB.`;
      }
      return null;
    },
    [acceptedTypes, maxSizeMB]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setValidationError(null);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        const error = validateFile(file);
        if (error) {
          setValidationError(error);
          return;
        }
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect, validateFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValidationError(null);
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        const error = validateFile(file);
        if (error) {
          setValidationError(error);
          return;
        }
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect, validateFile]
  );

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setValidationError(null);
  }, []);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <Image className="w-8 h-8 text-[#529ec6]" />;
    }
    return <FileText className="w-8 h-8 text-[#529ec6]" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {selectedFile ? (
          <motion.div
            key="selected"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200"
          >
            {getFileIcon(selectedFile)}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-sm text-slate-500">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            {!isUploading && (
              <button
                onClick={clearFile}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {isUploading && (
              <div className="w-6 h-6 border-2 border-[#529ec6] border-t-transparent rounded-full animate-spin" />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                flex flex-col items-center justify-center w-full h-64
                border-2 border-dashed rounded-2xl cursor-pointer
                transition-all duration-200
                ${
                  isDragging
                    ? "border-[#529ec6] bg-[#529ec6]/5"
                    : "border-slate-300 hover:border-[#529ec6] hover:bg-slate-50"
                }
              `}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <div
                  className={`
                    w-16 h-16 rounded-2xl flex items-center justify-center mb-4
                    transition-colors duration-200
                    ${isDragging ? "bg-[#529ec6]/20" : "bg-slate-100"}
                  `}
                >
                  <Upload
                    className={`w-8 h-8 transition-colors ${
                      isDragging ? "text-[#529ec6]" : "text-slate-400"
                    }`}
                  />
                </div>
                <p className="mb-2 text-lg font-medium text-slate-700">
                  {isDragging ? "Drop your file here" : "Drag & drop your contract"}
                </p>
                <p className="text-sm text-slate-500">
                  or{" "}
                  <span className="text-[#529ec6] font-medium">
                    click to browse
                  </span>
                </p>
                <p className="mt-4 text-xs text-slate-400">
                  PDF, Word, JPG, PNG • Max {maxSizeMB}MB
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                onChange={handleFileInput}
                disabled={isUploading}
              />
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error display */}
      <AnimatePresence>
        {(error || validationError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error || validationError}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
