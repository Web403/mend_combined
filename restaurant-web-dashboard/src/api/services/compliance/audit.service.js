import api from "../../client/axios";

export const getAuditLogs = async (params = {}) => (await api.get("/compliance/audit", { params })).data;
