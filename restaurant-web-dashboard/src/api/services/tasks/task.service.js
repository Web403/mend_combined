import api from "../../client/axios";

export const getTasks = async (params = {}) => (await api.get("/task/list-tasks", { params })).data;
