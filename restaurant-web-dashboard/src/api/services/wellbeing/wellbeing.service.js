import api from "../../client/axios";

export const getUsersWithWellbeing = async (params = {}) => {
  const response = await api.get("/wellbeing/users-with-wellbeing", { params });
  return response.data;
};

export const getFatigueAlerts = async (params = {}) => {
  const response = await api.get("/wellbeing/alerts/fatigue", { params });
  return response.data;
};

export default { getUsersWithWellbeing, getFatigueAlerts };
