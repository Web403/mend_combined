import api from "../../client/axios";

const BASE_URL = "/shift";

export const getAllShifts = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/get-all-shifts`, { params });
  return response.data;
};

export const getShiftById = async (id) => {
  const response = await api.get(`${BASE_URL}/get-shift-by-id/${id}`);
  return response.data;
};

export const getUserShifts = async (userId) => {
  const response = await api.get(`${BASE_URL}/get-user-shifts/${userId}`);
  return response.data;
};

export const createShift = async (payload) => {
  const response = await api.post(`${BASE_URL}/create-shift`, payload);
  return response.data;
};

export const updateShift = async (id, payload) => {
  const response = await api.put(`${BASE_URL}/update-shift/${id}`, payload);
  return response.data;
};

export const deleteShift = async (id) => {
  const response = await api.delete(`${BASE_URL}/delete-shift/${id}`);
  return response.data;
};

export default {
  getAllShifts,
  getShiftById,
  getUserShifts,
  createShift,
  updateShift,
  deleteShift,
};
