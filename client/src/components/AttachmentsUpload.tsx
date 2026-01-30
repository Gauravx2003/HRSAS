import { useState, useRef } from "react";
import api from "../services/api";
import { Upload, Loader2, Paperclip, X } from "lucide-react";

interface AttachmentsUploadProps {
  uploadUrl: string;
  onSuccess: () => void;
}

const AttachmentsUpload = ({
  uploadUrl,
  onSuccess,
}: AttachmentsUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const upload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("images", file);
    setLoading(true);

    try {
      await api.post(uploadUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      onSuccess?.();
      clearFile();
    } catch (error) {
      console.error(error);
      // Ideally show an error toast here
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,.pdf,.doc,.docx"
        onChange={handleFileChange}
        className="hidden"
        id={`file-upload-${uploadUrl}`} // Unique ID if multiple instances
      />

      {!file ? (
        <label
          htmlFor={`file-upload-${uploadUrl}`}
          className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
        >
          <Upload className="w-4 h-4 mr-2 text-slate-500" />
          Attach File
        </label>
      ) : (
        <div className="flex items-center space-x-3 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 w-fit">
          <div className="flex items-center">
            <Paperclip className="w-4 h-4 text-indigo-500 mr-2" />
            <span className="text-sm text-slate-700 font-medium truncate max-w-[150px]">
              {file.name}
            </span>
          </div>

          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <button
              onClick={upload}
              disabled={loading}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Upload"
              )}
            </button>

            {!loading && (
              <button
                onClick={clearFile}
                className="text-slate-400 hover:text-red-500 transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentsUpload;
