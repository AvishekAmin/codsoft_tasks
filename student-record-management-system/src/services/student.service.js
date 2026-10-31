import prisma from '../config/db.js';
import ApiError from '../utils/apiError.js';
import { getPaginationParams, getSortingParams, buildPaginationMetadata } from '../utils/queryUtils.js';

export const createStudent = async (data) => {
  const normalizedEmail = data.email ? data.email.toLowerCase().trim() : '';
  const normalizedCode = data.studentCode ? data.studentCode.toUpperCase().trim() : '';

  // Check if studentCode or email already in use
  const existing = await prisma.student.findFirst({
    where: {
      OR: [
        { studentCode: normalizedCode },
        { email: normalizedEmail }
      ]
    }
  });

  if (existing) {
    if (existing.studentCode === normalizedCode) {
      throw ApiError.conflict(`Student with code '${normalizedCode}' already exists`);
    }
    if (existing.email.toLowerCase() === normalizedEmail) {
      throw ApiError.conflict(`Student with email '${normalizedEmail}' already exists`);
    }
  }

  const student = await prisma.student.create({
    data: {
      studentCode: normalizedCode,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: normalizedEmail,
      phone: data.phone?.trim() || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: data.gender?.trim() || null,
      address: data.address?.trim() || null,
      status: data.status || 'ACTIVE'
    }
  });

  return student;
};

export const getStudents = async (query = {}) => {
  const { page, limit, skip, take } = getPaginationParams(query);
  const { sort, order, orderBy } = getSortingParams(
    query.sort,
    query.order,
    ['studentCode', 'firstName', 'lastName', 'email', 'createdAt', 'status'],
    'createdAt',
    'desc'
  );

  const where = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.search) {
    const searchTerm = query.search.trim();
    where.OR = [
      { firstName: { contains: searchTerm, mode: 'insensitive' } },
      { lastName: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } },
      { studentCode: { contains: searchTerm, mode: 'insensitive' } }
    ];
  }

  const [items, totalItems] = await prisma.$transaction([
    prisma.student.findMany({
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
    prisma.student.count({ where })
  ]);

  const pagination = buildPaginationMetadata(totalItems, page, limit);

  return { items, pagination };
};

export const getStudentById = async (id) => {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      _count: {
        select: { enrollments: true }
      }
    }
  });

  if (!student) {
    throw ApiError.notFound(`Student with ID '${id}' not found`);
  }

  return student;
};

export const updateStudent = async (id, data) => {
  const existing = await prisma.student.findUnique({
    where: { id }
  });

  if (!existing) {
    throw ApiError.notFound(`Student with ID '${id}' not found`);
  }

  const updateData = {};

  if (data.studentCode !== undefined) {
    const normalizedCode = data.studentCode.toUpperCase().trim();
    if (normalizedCode !== existing.studentCode) {
      const codeTaken = await prisma.student.findUnique({
        where: { studentCode: normalizedCode }
      });
      if (codeTaken) {
        throw ApiError.conflict(`Student with code '${normalizedCode}' already exists`);
      }
    }
    updateData.studentCode = normalizedCode;
  }

  if (data.email !== undefined) {
    const normalizedEmail = data.email.toLowerCase().trim();
    if (normalizedEmail !== existing.email.toLowerCase()) {
      const emailTaken = await prisma.student.findUnique({
        where: { email: normalizedEmail }
      });
      if (emailTaken) {
        throw ApiError.conflict(`Student with email '${normalizedEmail}' already exists`);
      }
    }
    updateData.email = normalizedEmail;
  }

  if (data.firstName !== undefined) updateData.firstName = data.firstName.trim();
  if (data.lastName !== undefined) updateData.lastName = data.lastName.trim();
  if (data.phone !== undefined) updateData.phone = data.phone ? data.phone.trim() : null;
  if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
  if (data.gender !== undefined) updateData.gender = data.gender ? data.gender.trim() : null;
  if (data.address !== undefined) updateData.address = data.address ? data.address.trim() : null;
  if (data.status !== undefined) updateData.status = data.status;

  const updatedStudent = await prisma.student.update({
    where: { id },
    data: updateData
  });

  return updatedStudent;
};

export const deleteStudent = async (id) => {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      _count: {
        select: { enrollments: true }
      }
    }
  });

  if (!student) {
    throw ApiError.notFound(`Student with ID '${id}' not found`);
  }

  // Enforce referential integrity: reject deletion if dependent enrollments exist
  if (student._count.enrollments > 0) {
    throw ApiError.conflict(
      `Cannot delete student '${student.studentCode}': record has ${student._count.enrollments} dependent enrollment(s). To preserve historical academic records, deactivate the student by setting status to INACTIVE instead.`
    );
  }

  await prisma.student.delete({
    where: { id }
  });

  return true;
};

export const getStudentEnrollments = async (studentId, query = {}) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });

  if (!student) {
    throw ApiError.notFound(`Student with ID '${studentId}' not found`);
  }

  const { page, limit, skip, take } = getPaginationParams(query);
  const { orderBy } = getSortingParams(
    query.sort,
    query.order,
    ['enrollmentDate', 'createdAt', 'status', 'grade'],
    'createdAt',
    'desc'
  );

  const where = { studentId };

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

  return { student, items, pagination };
};

export default {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentEnrollments
};
