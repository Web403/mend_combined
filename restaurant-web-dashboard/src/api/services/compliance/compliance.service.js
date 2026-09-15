import api from "../../client/axios";

export const getComplianceReport = async (params = {}) => {
  const response = await api.get("/compliance/report", { params });
  return response.data;
};

export const evaluateCompliance = async (payload = {}) => {
  const response = await api.post("/compliance/evaluate", payload);
  return response.data;
};

export default { getComplianceReport, evaluateCompliance };
