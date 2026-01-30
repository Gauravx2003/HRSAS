import { useState } from "react";
import { X } from "lucide-react";

interface AttachmentPreviewProps {
  attachments?: Array<{ id: string; fileURL: string }>;
}

const AttachmentPreview = ({ attachments }: AttachmentPreviewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const displayCount = Math.min(attachments.length, 4);
  const remainingCount = attachments.length - displayCount;

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  const handleNext = () => {
    if (!selectedImage) return;
    const currentIndex = attachments.findIndex(
      (a) => a.fileURL === selectedImage,
    );
    const nextIndex = (currentIndex + 1) % attachments.length;
    setSelectedImage(attachments[nextIndex].fileURL);
  };

  const handlePrev = () => {
    if (!selectedImage) return;
    const currentIndex = attachments.findIndex(
      (a) => a.fileURL === selectedImage,
    );
    const prevIndex =
      (currentIndex - 1 + attachments.length) % attachments.length;
    setSelectedImage(attachments[prevIndex].fileURL);
  };

  return (
    <>
      {/* Overlapping Circles */}
      <div className="flex items-center mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center -space-x-2">
          {attachments.slice(0, displayCount).map((attachment, index) => (
            <div
              key={attachment.id}
              onClick={() => handleImageClick(attachment.fileURL)}
              className="relative w-8 h-8 rounded-full border-2 border-white bg-slate-100 overflow-hidden cursor-pointer hover:scale-110 transition-transform hover:z-10"
              style={{ zIndex: displayCount - index }}
            >
              <img
                src={attachment.fileURL}
                alt={`Attachment ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback for non-image files
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement!.innerHTML = `
                    <div class="w-full h-full flex items-center justify-center bg-indigo-100">
                      <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                  `;
                }}
              />
            </div>
          ))}
          {remainingCount > 0 && (
            <div
              className="relative w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
              onClick={() =>
                handleImageClick(attachments[displayCount].fileURL)
              }
            >
              <span className="text-xs font-semibold text-slate-600">
                +{remainingCount}
              </span>
            </div>
          )}
        </div>
        <span className="ml-3 text-xs text-slate-500">
          {attachments.length}{" "}
          {attachments.length === 1 ? "attachment" : "attachments"}
        </span>
      </div>

      {/* Image Viewer Modal */}
      {isModalOpen && selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Navigation Buttons */}
          {attachments.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-4 text-white hover:text-gray-300 transition-colors"
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-4 text-white hover:text-gray-300 transition-colors"
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="max-w-4xl max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="Attachment"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>

          {/* Image Counter */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
            {attachments.findIndex((a) => a.fileURL === selectedImage) + 1} /{" "}
            {attachments.length}
          </div>
        </div>
      )}
    </>
  );
};

export default AttachmentPreview;
