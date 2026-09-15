import api from "../../client/axios";

const BASE_URL = "/attendance";

/**
 * Returns the latest attendance record for every employee in the authenticated
 * hotel. `hotelId` can be supplied when the API is called by a privileged user.
 */
export const getEmployeesWithAttendance = async (params = {}) => {
  const response = await api.get(`${BASE_URL}/getEmployeesWithAttendance`, {
    params,
  });

  return response.data;
};

export default {
  getEmployeesWithAttendance,
};
