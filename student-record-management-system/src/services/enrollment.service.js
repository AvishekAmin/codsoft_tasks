import prisma from '../config/db.js';
import ApiError from '../utils/apiError.js';
import { getPaginationParams, getSortingParams, buildPaginationMetadata } from '../utils/queryUtils.js';

export const createEnrollment = async (data) => {
  const { studentId, courseId, status = 'ENROLLED', grade = null, enrollmentDate } = data;

  // Execute multi-step checks and record creation inside a database transaction
  const enrollment = await prisma.$transaction(async (tx) => {
    // 1. Verify student exists and is ACTIVE
    const student = await tx.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      throw ApiError.notFound(`Student with ID '${studentId}' not found`);
    }

    if (student.status !== 'ACTIVE') {
      throw ApiError.badRequest(
        `Cannot enroll student '${student.studentCode}': Student is currently INACTIVE. Only ACTIVE students may enroll in courses.`
      );
    }

    // 2. Verify course exists and is ACTIVE
    const course = await tx.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      throw ApiError.notFound(`Course with ID '${courseId}' not found`);
    }

    if (course.status !== 'ACTIVE') {
      throw ApiError.badRequest(
        `Cannot enroll in course '${course.courseCode}': Course is currently INACTIVE. Only ACTIVE courses accept new enrollments.`
      );
    }

    // 3. Check for existing enrollment record
    const existingEnrollment = await tx.enrollment.findUnique({
      where: {
        unique_student_course_enrollment: {
          studentId,
          courseId
        }
      }
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === 'ENROLLED') {
        throw ApiError.conflict(
          `Student '${student.studentCode}' is already actively enrolled in course '${course.courseCode}'`
        );
      }

      if (existingEnrollment.status === 'COMPLETED') {
        throw ApiError.conflict(
          `Student '${student.studentCode}' has already completed course '${course.courseCode}' and cannot re-enroll`
        );
      }

      // Re-enrollment policy: Reactivate previously WITHDRAWN enrollment
      if (existingEnrollment.status === 'WITHDRAWN') {
        const reactivated = await tx.enrollment.update({
          where: { id: existingEnrollment.id },
          data: {
            status: 'ENROLLED',
            enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
            grade: grade !== undefined ? grade : null
          },
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
            },
            course: {
              select: {
                id: true,
                courseCode: true,
                title: true,
                department: true,
                credits: true,
                status: true
              }
            }
          }
        });

        return reactivated;
      }
    }

    // 4. Create new enrollment
    const newEnrollment = await tx.enrollment.create({
      data: {
        studentId,
        courseId,
        status,
        grade,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date()
      },
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
        },
        course: {
          select: {
            id: true,
            courseCode: true,
            title: true,
            department: true,
            credits: true,
            status: true
          }
        }
      }
    });

    return newEnrollment;
  });

  return enrollment;
};

export const getEnrollments = async (query = {}) => {
  const { page, limit, skip, take } = getPaginationParams(query);
  const { sort, order, orderBy } = getSortingParams(
    query.sort,
    query.order,
    ['enrollmentDate', 'createdAt', 'status', 'grade'],
    'createdAt',
    'desc'
  );

  const where = {};

  if (query.studentId) where.studentId = query.studentId;
  if (query.courseId) where.courseId = query.courseId;
  if (query.status) where.status = query.status;

  if (query.enrollmentDateFrom || query.enrollmentDateTo) {
    where.enrollmentDate = {};
    if (query.enrollmentDateFrom) where.enrollmentDate.gte = new Date(query.enrollmentDateFrom);
    if (query.enrollmentDateTo) where.enrollmentDate.lte = new Date(query.enrollmentDateTo);
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
        },
        course: {
          select: {
            id: true,
            courseCode: true,
            title: true,
            department: true,
            credits: true,
            status: true
          }
        }
      }
    }),
    prisma.enrollment.count({ where })
  ]);

  const pagination = buildPaginationMetadata(totalItems, page, limit);

  return { items, pagination };
};

export const getEnrollmentById = async (id) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id },
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
      },
      course: {
        select: {
          id: true,
          courseCode: true,
          title: true,
          department: true,
          credits: true,
          status: true
        }
      }
    }
  });

  if (!enrollment) {
    throw ApiError.notFound(`Enrollment with ID '${id}' not found`);
  }

  return enrollment;
};

export const updateEnrollment = async (id, data) => {
  const existing = await prisma.enrollment.findUnique({
    where: { id }
  });

  if (!existing) {
    throw ApiError.notFound(`Enrollment with ID '${id}' not found`);
  }

  const updateData = {};

  if (data.status !== undefined) updateData.status = data.status;
  if (data.grade !== undefined) updateData.grade = data.grade;
  if (data.enrollmentDate !== undefined) updateData.enrollmentDate = new Date(data.enrollmentDate);

  const updatedEnrollment = await prisma.enrollment.update({
    where: { id },
    data: updateData,
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
      },
      course: {
        select: {
          id: true,
          courseCode: true,
          title: true,
          department: true,
          credits: true,
          status: true
        }
      }
    }
  });

  return updatedEnrollment;
};

export const deleteEnrollment = async (id) => {
  const existing = await prisma.enrollment.findUnique({
    where: { id }
  });

  if (!existing) {
    throw ApiError.notFound(`Enrollment with ID '${id}' not found`);
  }

  await prisma.enrollment.delete({
    where: { id }
  });

  return true;
};

export default {
  createEnrollment,
  getEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment
};
