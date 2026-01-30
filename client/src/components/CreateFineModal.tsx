import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  DollarSign,
  Building,
  Home,
  User,
  Tag,
} from "lucide-react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../store/slices/authSlice";
import {
  getHostelBlocks,
  getBlockRooms,
  getRoomResidents,
} from "../services/userCreation.service";
import { createFine } from "../services/fines.service";

interface CreateFineModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Block {
  id: string;
  name: string;
}

interface Room {
  rooms: {
    id: string;
    roomNumber: string;
    capacity: number;
    currentOccupancy: number;
  };
  room_types: {
    capacity: number;
  };
}

interface Resident {
  id: string;
  name: string;
  email: string;
}

const FINE_CATEGORIES = [
  { value: "HOSTEL_FEE", label: "Hostel Fee" },
  { value: "FINE", label: "Fine" },
  { value: "MESS_FEE", label: "Mess Fee" },
  { value: "SECURITY_DEPOSIT", label: "Security Deposit" },
];

const CreateFineModal = ({ onClose, onSuccess }: CreateFineModalProps) => {
  const user = useSelector(selectCurrentUser);

  // Form state
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  // Data state
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);

  // Loading states
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingResidents, setIsLoadingResidents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch blocks when modal opens
  useEffect(() => {
    if (user?.hostelId) {
      fetchBlocks();
    }
  }, [user?.hostelId]);

  // Fetch rooms when block is selected
  useEffect(() => {
    if (selectedBlockId) {
      fetchRooms(selectedBlockId);
    } else {
      setRooms([]);
      setSelectedRoomId("");
      setResidents([]);
      setSelectedResidentId("");
    }
  }, [selectedBlockId]);

  // Fetch residents when room is selected
  useEffect(() => {
    if (selectedRoomId) {
      fetchResidents(selectedRoomId);
    } else {
      setResidents([]);
      setSelectedResidentId("");
    }
  }, [selectedRoomId]);

  const fetchBlocks = async () => {
    if (!user?.hostelId) return;

    setIsLoadingBlocks(true);
    try {
      const data = await getHostelBlocks(user.hostelId);
      setBlocks(data);
    } catch (error) {
      console.error("Failed to fetch blocks:", error);
      alert("Failed to load blocks. Please try again.");
    } finally {
      setIsLoadingBlocks(false);
    }
  };

  const fetchRooms = async (blockId: string) => {
    setIsLoadingRooms(true);
    try {
      const data = await getBlockRooms(blockId);
      setRooms(data);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      alert("Failed to load rooms. Please try again.");
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const fetchResidents = async (roomId: string) => {
    setIsLoadingResidents(true);
    try {
      const data = await getRoomResidents(roomId);
      setResidents(data);
    } catch (error) {
      console.error("Failed to fetch residents:", error);
      alert("Failed to load residents. Please try again.");
    } finally {
      setIsLoadingResidents(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      await createFine(
        selectedResidentId,
        parseFloat(amount),
        description,
        category,
      );

      alert("Fine imposed successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to create fine:", error);
      alert(
        error.response?.data?.message ||
          "Failed to impose fine. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">Impose Fine</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Block Dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Building className="w-4 h-4 inline mr-1" />
              Block <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedBlockId}
              onChange={(e) => setSelectedBlockId(e.target.value)}
              disabled={isLoadingBlocks}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {isLoadingBlocks ? "Loading blocks..." : "Select a block"}
              </option>
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room Dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Home className="w-4 h-4 inline mr-1" />
              Room <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              disabled={!selectedBlockId || isLoadingRooms}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {!selectedBlockId
                  ? "Select a block first"
                  : isLoadingRooms
                    ? "Loading rooms..."
                    : rooms.length === 0
                      ? "No rooms available"
                      : "Select a room"}
              </option>
              {rooms.map((room) => (
                <option key={room?.rooms.id} value={room.rooms.id}>
                  {room.rooms.roomNumber}
                </option>
              ))}
            </select>
          </div>

          {/* Resident Dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Resident <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedResidentId}
              onChange={(e) => setSelectedResidentId(e.target.value)}
              disabled={!selectedRoomId || isLoadingResidents}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {!selectedRoomId
                  ? "Select a room first"
                  : isLoadingResidents
                    ? "Loading residents..."
                    : residents.length === 0
                      ? "No residents in this room"
                      : "Select a resident"}
              </option>
              {residents.map((resident) => (
                <option key={resident.id} value={resident.id}>
                  {resident.name} ({resident.email})
                </option>
              ))}
            </select>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Tag className="w-4 h-4 inline mr-1" />
              Category <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
            >
              <option value="">Select a category</option>
              {FINE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              placeholder="Enter amount"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
              placeholder="Enter reason for the fine"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Imposing...
                </>
              ) : (
                "Impose Fine"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFineModal;
