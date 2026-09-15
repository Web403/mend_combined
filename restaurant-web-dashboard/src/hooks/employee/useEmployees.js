import { useCallback, useEffect, useState } from "react";
import { getEmployees } from "../../api/services/employees";

export default function useEmployees(filters) {
  const [employees, setEmployees] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  /**
   * Fetch Employees
   */
  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getEmployees(filters);

      setEmployees(response.data || []);

      setPagination(
        response.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          "Unable to fetch employees."
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /**
   * Refresh Employees
   */
  const refreshEmployees = useCallback(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  /**
   * Remove Employee From State
   */
  const removeEmployee = useCallback((employeeId) => {
    setEmployees((prev) =>
      prev.filter((emp) => emp._id !== employeeId)
    );

    setPagination((prev) => ({
      ...prev,
      total: Math.max(prev.total - 1, 0),
    }));
  }, []);

  /**
   * Add Employee To State
   */
  const addEmployee = useCallback((employee) => {
    setEmployees((prev) => [employee, ...prev]);

    setPagination((prev) => ({
      ...prev,
      total: prev.total + 1,
    }));
  }, []);

  /**
   * Update Employee
   */
  const updateEmployee = useCallback((employee) => {
    setEmployees((prev) =>
      prev.map((item) =>
        item._id === employee._id ? employee : item
      )
    );
  }, []);

  /**
   * Initial Fetch
   */
  useEffect(() => {
    const timer = setTimeout(fetchEmployees, 0);

    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  return {
    employees,

    pagination,

    loading,

    error,

    fetchEmployees,

    refreshEmployees,

    addEmployee,

    updateEmployee,

    removeEmployee,
  };
}
