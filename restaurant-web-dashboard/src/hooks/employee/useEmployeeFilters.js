import { useCallback, useMemo, useState } from "react";

const DEFAULT_FILTERS = {
  page: 1,
  limit: 10,

  search: "",

  status: "",
  profession: "",
  availability: "",
  yearsOfExperience: "",

  sortBy: "createdAt",
  sortOrder: "desc",
};

export default function useEmployeeFilters(initialFilters = {}) {
  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  /**
   * Update a single filter
   */
  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      page: key === "page" ? value : 1,
      [key]: value,
    }));
  }, []);

  /**
   * Update multiple filters
   */
  const updateFilters = useCallback((values) => {
    setFilters((prev) => ({
      ...prev,
      ...values,
      page: 1,
    }));
  }, []);

  /**
   * Change page
   */
  const changePage = useCallback((page) => {
    setFilters((prev) => ({
      ...prev,
      page,
    }));
  }, []);

  /**
   * Change page size
   */
  const changeLimit = useCallback((limit) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      limit,
    }));
  }, []);

  /**
   * Change sorting
   */
  const changeSorting = useCallback((sortBy) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      sortBy,
      sortOrder:
        prev.sortBy === sortBy && prev.sortOrder === "asc"
          ? "desc"
          : "asc",
    }));
  }, []);

  /**
   * Reset all filters
   */
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  /**
   * Remove empty values before sending to backend
   */
  const query = useMemo(() => {
    const params = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (
        value !== "" &&
        value !== null &&
        value !== undefined
      ) {
        params[key] = value;
      }
    });

    return params;
  }, [filters]);

  return {
    filters,
    query,

    updateFilter,
    updateFilters,

    changePage,
    changeLimit,

    changeSorting,

    resetFilters,
  };
}