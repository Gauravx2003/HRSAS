// src/components/common/StatusCard.tsx
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import ExpandableText from "./ExpandableText"; // Import the one we just made
import AttachmentsUpload from "../AttachmentsUpload";
import AttachmentPreview from "../AttachmentPreview";

interface StatusCardProps {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  uploadUrl: string; // Dynamic URL for the upload component
  onSuccess: () => void;
  attachments?: Array<{ id: string; fileURL: string }>;
  // This allows us to insert different tags (Category vs Staff) for different pages
  children?: React.ReactNode;
}

const StatusCard = ({
  id,
  title,
  description,
  status,
  createdAt,
  uploadUrl,
  onSuccess,
  attachments,
  children,
}: StatusCardProps) => {
  // Helper Logic moved inside (or you can keep passing it in as props if logic differs drastically)
  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "RESOLVED":
        return "bg-green-100 text-green-700 border-green-200";
      case "REJECTED":
        return "bg-red-100 text-red-700 border-red-200";
      case "IN_PROGRESS":
      case "IN_REVIEW":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case "RESOLVED":
        return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case "REJECTED":
        return <AlertCircle className="w-3 h-3 mr-1" />;
      default:
        return <Clock className="w-3 h-3 mr-1" />;
    }
  };

  console.log(id);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors">
      {/* 1. Header: Status & Date */}
      <div className="flex justify-between items-start mb-3">
        <span
          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}
        >
          {getStatusIcon(status)}
          {status.replace("_", " ")}
        </span>
        <span className="text-xs text-slate-500">
          {new Date(createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* 2. Title */}
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>

      {/* 3. Variable Content (Category badges, Staff info, etc.) */}
      <div className="mb-3">{children}</div>

      {/* 4. Description */}
      <ExpandableText text={description} />

      {/* 5. Attachment Preview */}
      {attachments && attachments.length > 0 && (
        <AttachmentPreview attachments={attachments} />
      )}

      {/* 6. Footer: Upload */}
      <AttachmentsUpload uploadUrl={uploadUrl} onSuccess={onSuccess} />
    </div>
  );
};

export default StatusCard;
