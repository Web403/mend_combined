import api from "../../client/axios";

export const getSOSAlerts = async (params = {}) => (await api.get("/sos", { params })).data;
