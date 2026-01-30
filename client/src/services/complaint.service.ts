import api from "./api";

export interface ComplaintCategory {
  id: string;
  name: string;
  slaHours: number;
}

export const getComplaintCategories = async (): Promise<
  ComplaintCategory[]
> => {
  const response = await api.get("/complaints/categories");
  return response.data;
};

export const createComplaint = async (
  title: string,
  description: string,
  categoryId: string,
  roomId: string,
) => {
  const response = await api.post("/complaints", {
    title,
    description,
    categoryId,
    roomId,
  });
  return response.data;
};

export const uploadComplaintAttachment = async (
  complaintId: string,
  file: File,
) => {
  const formData = new FormData();
  formData.append("images", file);
  const response = await api.post(
    `/complaints/${complaintId}/attachments`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
};

export const reassignComplaint = async (
  complaintId: string,
  newStaffId: string,
) => {
  const response = await api.patch(`/complaints/reassign/${complaintId}`, {
    newStaffId,
  });
  return response.data;
};

export interface Staff {
  id: string;
  name: string;
  email: string;
  specialization: string;
}

export const getStaffBySpecialization = async (
  categoryName: string,
): Promise<Staff[]> => {
  const response = await api.get("/staff/by-specialization", {
    params: { specialization: categoryName },
  });
  return response.data;
};
