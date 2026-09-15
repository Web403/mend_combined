import api from "../../client/axios";
import ENDPOINTS from "../../endpoints";

export const login = (payload) => {
    return api.post(
        ENDPOINTS.AUTH.LOGIN,
        payload
    );
};