import api from "../../client/axios";

const BASE_URL = "/user";

export const getEmployees = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/get-users`, {
    params,
  });

  return response.data;
};

export const getEmployeeById = async (id) => {
  const response = await api.get(`${BASE_URL}/get-user/${id}`);

  return response.data;
};

export const createEmployee = async (payload) => {
  const response = await api.post(`${BASE_URL}/createUser`, payload);

  return response.data;
};

export const updateEmployee = async (id, payload) => {
  const response = await api.put(`${BASE_URL}/updateUser/${id}`, payload);

  return response.data;
};

export const suspendEmployee = async (id) => {
  const response = await api.patch(`${BASE_URL}/suspendUser/${id}`);

  return response.data;
};

export const deleteEmployee = async (id) => {
  const response = await api.delete(`${BASE_URL}/deleteUser/${id}`);

  return response.data;
};

export const getEmployeeStatistics = async () => {
  const response = await api.get(`${BASE_URL}/statistics`);

  return response.data;
};

export const getUsersPerformance = async () => {
  const response = await api.get(`${BASE_URL}/get-users-performance`);
  return response.data;
};

export default {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  suspendEmployee,
  deleteEmployee,
  getEmployeeStatistics,
  getUsersPerformance,
};
