import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { MESS_ISSUE_CATEGORIES } from "../../../shared/constants";
import { createMessIssue } from "../services/messIssues.service";
import FormModal from "./common/FormModal";

interface RaiseMessIssueProps {
  onClose: () => void;
  onSuccess: () => void;
}

const RaiseMessIssue = ({ onClose, onSuccess }: RaiseMessIssueProps) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createMessIssue(title, description, category);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to create mess issue:", error);
      alert("Failed to create mess issue. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormModal
      isOpen={true}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Raise Mess Issue"
      icon={UtensilsCrossed}
      isSubmitting={isSubmitting}
      submitButtonText="Raise Issue"
    >
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Issue Title
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
          placeholder="Brief summary of the mess issue"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Category
        </label>
        <select
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
        >
          <option value="">Select a category</option>
          {MESS_ISSUE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
          placeholder="Detailed description of the mess issue..."
        />
      </div>
    </FormModal>
  );
};

export default RaiseMessIssue;
