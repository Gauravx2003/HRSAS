import api from "./api";

// (residentId, amount, description, category);

export const createFine = async (
  residentId: string,
  amount: number,
  description: string,
  category: string,
) => {
  const response = await api.post("/payments/create", {
    residentId,
    amount,
    description,
    category,
  });
  return response.data;
};
