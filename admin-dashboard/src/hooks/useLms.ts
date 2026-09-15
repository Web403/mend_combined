// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useLms.ts — data-fetching hooks for the LMS dashboard
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { CourseAPI, LectureAPI } from "../api/lms.api";
import type {
  Course,
  CourseWithLectures,
  Lecture,
  PaginationMeta,
  CourseFilters,
  CreateCoursePayload,
  UpdateCoursePayload,
  CreateLecturePayload,
  UpdateLecturePayload,
  CourseStatus,
} from "../types/lms";

// ── useCourses ────────────────────────────────────────────────────────────────

export function useCourses(initialFilters: CourseFilters = {}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [filters, setFilters] = useState<CourseFilters>({
    page: 1,
    limit: 12,
    ...initialFilters,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await CourseAPI.list(filters);
      setCourses(result.courses);
      setMeta(result.meta);
    } catch (err: any) {
      setError(err.message ?? "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const updateFilters = useCallback((updates: Partial<CourseFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return { courses, meta, filters, loading, error, updateFilters, setPage, refetch: fetch };
}

// ── useCourse (single with lectures) ─────────────────────────────────────────

export function useCourse(id: string | null) {
  const [course, setCourse] = useState<CourseWithLectures | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await CourseAPI.getFull(id);
      setCourse(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load course");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { course, loading, error, refetch: fetch };
}

// ── useCourseActions ──────────────────────────────────────────────────────────

export function useCourseActions() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCourse = async (payload: CreateCoursePayload): Promise<Course | null> => {
    setSaving(true);
    setError(null);
    try {
      return await CourseAPI.create(payload);
    } catch (err: any) {
      setError(err.message ?? "Failed to create course");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateCourse = async (
    id: string,
    payload: UpdateCoursePayload
  ): Promise<Course | null> => {
    setSaving(true);
    setError(null);
    try {
      return await CourseAPI.update(id, payload);
    } catch (err: any) {
      setError(err.message ?? "Failed to update course");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (
    id: string,
    status: CourseStatus
  ): Promise<Course | null> => {
    setSaving(true);
    setError(null);
    try {
      return await CourseAPI.updateStatus(id, status);
    } catch (err: any) {
      setError(err.message ?? "Failed to update status");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async (id: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      await CourseAPI.delete(id);
      return true;
    } catch (err: any) {
      setError(err.message ?? "Failed to delete course");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { saving, error, createCourse, updateCourse, updateStatus, deleteCourse };
}

// ── useLectureActions ─────────────────────────────────────────────────────────

export function useLectureActions() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLecture = async (
    courseId: string,
    payload: CreateLecturePayload
  ): Promise<Lecture | null> => {
    setSaving(true);
    setError(null);
    try {
      return await LectureAPI.create(courseId, payload);
    } catch (err: any) {
      setError(err.message ?? "Failed to create lecture");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateLecture = async (
    courseId: string,
    id: string,
    payload: UpdateLecturePayload
  ): Promise<Lecture | null> => {
    setSaving(true);
    setError(null);
    try {
      return await LectureAPI.update(courseId, id, payload);
    } catch (err: any) {
      setError(err.message ?? "Failed to update lecture");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const deleteLecture = async (
    courseId: string,
    id: string
  ): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      await LectureAPI.delete(courseId, id);
      return true;
    } catch (err: any) {
      setError(err.message ?? "Failed to delete lecture");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const reorderLectures = async (
    courseId: string,
    orderedIds: string[]
  ): Promise<Lecture[] | null> => {
    setSaving(true);
    setError(null);
    try {
      return await LectureAPI.reorder(courseId, orderedIds);
    } catch (err: any) {
      setError(err.message ?? "Failed to reorder lectures");
      return null;
    } finally {
      setSaving(false);
    }
  };

  return { saving, error, createLecture, updateLecture, deleteLecture, reorderLectures };
}
