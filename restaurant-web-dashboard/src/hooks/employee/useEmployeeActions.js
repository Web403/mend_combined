import { useState, useCallback } from "react";
import {
  createEmployee,
  updateEmployee,
  suspendEmployee,
  deleteEmployee,
} from "../../api/services/employees";

export default function useEmployeeActions({
  addEmployee,
  updateEmployeeState,
  removeEmployee,
  refreshEmployees,
} = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Create Employee
   */
  const create = useCallback(
    async (payload) => {
      try {
        setLoading(true);
        setError("");

        const response = await createEmployee(payload);

        if (addEmployee && response.data) {
          addEmployee(response.data);
        } else {
          await refreshEmployees?.();
        }

        return response;
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          "Unable to create employee.";

        setError(message);

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [addEmployee, refreshEmployees]
  );

  /**
   * Update Employee
   */
  const update = useCallback(
    async (id, payload) => {
      try {
        setLoading(true);
        setError("");

        const response = await updateEmployee(id, payload);

        if (updateEmployeeState && response.data) {
          updateEmployeeState(response.data);
        } else {
          await refreshEmployees?.();
        }

        return response;
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          "Unable to update employee.";

        setError(message);

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [updateEmployeeState, refreshEmployees]
  );

  /**
   * Suspend Employee
   */
  const suspend = useCallback(
    async (id) => {
      try {
        setLoading(true);
        setError("");

        const response = await suspendEmployee(id);

        if (updateEmployeeState && response.data) {
          updateEmployeeState(response.data);
        } else {
          await refreshEmployees?.();
        }

        return response;
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          "Unable to suspend employee.";

        setError(message);

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [updateEmployeeState, refreshEmployees]
  );

  /**
   * Delete Employee
   */
  const remove = useCallback(
    async (id) => {
      try {
        setLoading(true);
        setError("");

        await deleteEmployee(id);

        if (removeEmployee) {
          removeEmployee(id);
        } else {
          await refreshEmployees?.();
        }

        return true;
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          "Unable to delete employee.";

        setError(message);

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [removeEmployee, refreshEmployees]
  );

  return {
    loading,
    error,

    create,
    update,
    suspend,
    remove,
  };
}