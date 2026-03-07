import api from "./api";

// Types
export interface RoomTypeInfo {
  typeId: string;
  typeName: string;
  capacity: number;
  price: number;
  totalRooms: number;
  occupiedRooms: number;
}

export interface BlockOverview {
  id: string;
  name: string;
  totalRooms: number;
  occupiedRooms: number;
  roomTypes: RoomTypeInfo[];
}

export interface OccupancyStats {
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  occupancyRate: number;
  byType: {
    typeId: string;
    typeName: string;
    total: number;
    occupied: number;
  }[];
}

export interface RoomType {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  price: number;
  capacity: number | null;
  createdAt: string;
}

// API Calls
export const getBlocksOverview = async (): Promise<BlockOverview[]> => {
  const res = await api.get("/infrastructure/overview");
  return res.data;
};

export const getOccupancyStats = async (): Promise<OccupancyStats> => {
  const res = await api.get("/infrastructure/stats");
  return res.data;
};

export const getRoomTypes = async (): Promise<RoomType[]> => {
  const res = await api.get("/infrastructure/room-types");
  return res.data;
};

export const createRoomType = async (data: {
  name: string;
  price: number;
  capacity: number;
  description?: string;
}) => {
  const res = await api.post("/infrastructure/room-type", data);
  return res.data;
};

export const addRoomsToBlock = async (data: {
  blockId: string;
  typeId: string;
  roomNumbers: string[];
}) => {
  const res = await api.post("/infrastructure/rooms", data);
  return res.data;
};

export const createBlockWithMixedRooms = async (data: {
  name: string;
  configurations: { typeId: string; roomNumbers: string[] }[];
}) => {
  const res = await api.post("/infrastructure/block-with-mixed-rooms", data);
  return res.data;
};

export const getRoomsOfBlock = async (blockId: string) => {
  const res = await api.get(`/infrastructure/blockRooms/${blockId}`);
  return res.data;
};
