import prisma from '../config/db.js';
import ApiError from '../utils/apiError.js';
import { getPaginationParams, getSortingParams, buildPaginationMetadata } from '../utils/queryUtils.js';

export const createCourse = async (data) => {
  const normalizedCode = data.courseCode.toUpperCase().trim();

  // Check if course code already exists
  const existing = await prisma.course.findUnique({
    where: { courseCode: normalizedCode }
  });

  if (existing) {
    throw ApiError.conflict(`Course with code '${normalizedCode}' already exists`);
  }

  const course = await prisma.course.create({
    data: {
      courseCode: normalizedCode,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      department: data.department?.trim() || null,
      credits: data.credits,
      instructor: data.instructor?.trim() || null,
      status: data.status || 'ACTIVE'
    }
  });

  return course;
};

export const getCourses = async (query = {}) => {
  const { page, limit, skip, take } = getPaginationParams(query);
  const { sort, order, orderBy } = getSortingParams(
    query.sort,
    query.order,
    ['courseCode', 'title', 'credits', 'department', 'createdAt', 'status'],
    'createdAt',
    'desc'
  );

  const where = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.department) {
    where.department = {
      contains: query.department.trim(),
      mode: 'insensitive'
    };
  }

  if (query.search) {
    const searchTerm = query.search.trim();
    where.OR = [
      { courseCode: { contains: searchTerm, mode: 'insensitive' } },
      { title: { contains: searchTerm, mode: 'insensitive' } },
      { department: { contains: searchTerm, mode: 'insensitive' } }
    ];
  }

  const [items, totalItems] = await prisma.$transaction([
    prisma.course.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        _count: {
          select: { enrollments: true }
        }
      }
    }),
    prisma.course.count({ where })
  ]);

  const pagination = buildPaginationMetadata(totalItems, page, limit);

  return { items, pagination };
};

export const getCourseById = async (id) => {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      _count: {
        select: { enrollments: true }
      }
    }
  });

  if (!course) {
    throw ApiError.notFound(`Course with ID '${id}' not found`);
  }

  return course;
};

export const updateCourse = async (id, data) => {
  const existing = await prisma.course.findUnique({
    where: { id }
  });

  if (!existing) {
    throw ApiError.notFound(`Course with ID '${id}' not found`);
  }

  const updateData = {};

  if (data.courseCode !== undefined) {
    const normalizedCode = data.courseCode.toUpperCase().trim();
    if (normalizedCode !== existing.courseCode) {
      const codeTaken = await prisma.course.findUnique({
        where: { courseCode: normalizedCode }
      });
      if (codeTaken) {
        throw ApiError.conflict(`Course with code '${normalizedCode}' already exists`);
      }
    }
    updateData.courseCode = normalizedCode;
  }

  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description ? data.description.trim() : null;
  if (data.department !== undefined) updateData.department = data.department ? data.department.trim() : null;
  if (data.credits !== undefined) updateData.credits = data.credits;
  if (data.instructor !== undefined) updateData.instructor = data.instructor ? data.instructor.trim() : null;
  if (data.status !== undefined) updateData.status = data.status;

  const updatedCourse = await prisma.course.update({
    where: { id },
    data: updateData
  });

  return updatedCourse;
};

export const deleteCourse = async (id) => {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      _count: {
        select: { enrollments: true }
      }
    }
  });

  if (!course) {
    throw ApiError.notFound(`Course with ID '${id}' not found`);
  }

  // Enforce referential integrity: reject deletion if dependent enrollments exist
  if (course._count.enrollments > 0) {
    throw ApiError.conflict(
      `Cannot delete course '${course.courseCode}': record has ${course._count.enrollments} dependent enrollment(s). To preserve historical academic records, deactivate the course by setting status to INACTIVE instead.`
    );
  }

  await prisma.course.delete({
    where: { id }
  });

  return true;
};

export const getCourseStudents = async (courseId, query = {}) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId }
  });

  if (!course) {
    throw ApiError.notFound(`Course with ID '${courseId}' not found`);
  }

  const { page, limit, skip, take } = getPaginationParams(query);
  const { orderBy } = getSortingParams(
    query.sort,
    query.order,
    ['enrollmentDate', 'createdAt', 'status', 'grade'],
    'createdAt',
    'desc'
  );

  const where = { courseId };

  if (query.status) {
    where.status = query.status;
  }

  const [items, totalItems] = await prisma.$transaction([
    prisma.enrollment.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true
          }
        }
      }
    }),
    prisma.enrollment.count({ where })
  ]);

  const pagination = buildPaginationMetadata(totalItems, page, limit);

  return { course, items, pagination };
};

export default {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getCourseStudents
};
