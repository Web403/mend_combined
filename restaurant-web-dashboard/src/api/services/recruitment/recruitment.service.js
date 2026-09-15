import api from "../../client/axios";

export const getPublicJobs = async (params = {}) => (await api.get("/recruitment/jobs", { params })).data;
export const getPublicGigs = async (params = {}) => (await api.get("/gigs", { params })).data;

export default { getPublicJobs, getPublicGigs };
