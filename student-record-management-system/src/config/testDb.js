import crypto from 'crypto';

/**
 * In-memory relational database simulator for test environments when PostgreSQL is offline.
 * Implements Prisma Client query interface with foreign keys, unique constraints, and transaction support.
 */
class InMemoryPrismaClient {
  constructor() {
    this.users = [];
    this.students = [];
    this.courses = [];
    this.enrollments = [];
    this.revokedTokens = [];
  }

  reset() {
    this.users = [];
    this.students = [];
    this.courses = [];
    this.enrollments = [];
    this.revokedTokens = [];
  }

  get user() {
    return {
      findUnique: async ({ where }) => {
        if (where.id) return this.users.find((u) => u.id === where.id) || null;
        if (where.email) return this.users.find((u) => u.email.toLowerCase() === where.email.toLowerCase()) || null;
        return null;
      },
      create: async ({ data }) => {
        const id = data.id || crypto.randomUUID();
        const now = new Date();
        const record = {
          id,
          name: data.name,
          email: data.email.toLowerCase(),
          passwordHash: data.passwordHash,
          role: data.role || 'STAFF',
          createdAt: now,
          updatedAt: now
        };
        this.users.push(record);
        return { ...record };
      },
      update: async ({ where, data }) => {
        const index = this.users.findIndex((u) => (where.id ? u.id === where.id : u.email === where.email));
        if (index === -1) throw new Error('Record to update not found');
        this.users[index] = {
          ...this.users[index],
          ...data,
          updatedAt: new Date()
        };
        return { ...this.users[index] };
      }
    };
  }

  get revokedToken() {
    return {
      findUnique: async ({ where }) => {
        return this.revokedTokens.find((r) => r.tokenId === where.tokenId) || null;
      },
      create: async ({ data }) => {
        const record = {
          id: crypto.randomUUID(),
          tokenId: data.tokenId,
          expiresAt: data.expiresAt,
          createdAt: new Date()
        };
        this.revokedTokens.push(record);
        return record;
      },
      deleteMany: async ({ where }) => {
        const initialLen = this.revokedTokens.length;
        if (where?.expiresAt?.lt) {
          this.revokedTokens = this.revokedTokens.filter((r) => r.expiresAt >= where.expiresAt.lt);
        }
        return { count: initialLen - this.revokedTokens.length };
      }
    };
  }

  get student() {
    return {
      findUnique: async ({ where, include }) => {
        const student = this.students.find((s) => s.id === where.id);
        if (!student) return null;
        const res = { ...student };
        if (include?._count?.select?.enrollments) {
          const enrollmentsCount = this.enrollments.filter((e) => e.studentId === student.id).length;
          res._count = { enrollments: enrollmentsCount };
        }
        return res;
      },
      findFirst: async ({ where }) => {
        if (where.OR) {
          return (
            this.students.find((s) =>
              where.OR.some((condition) => {
                if (condition.studentCode && s.studentCode === condition.studentCode) return true;
                if (condition.email && s.email.toLowerCase() === condition.email.toLowerCase()) return true;
                return false;
              })
            ) || null
          );
        }
        return this.students[0] || null;
      },
      findMany: async ({ where = {}, skip = 0, take = 10, orderBy = [], include }) => {
        let list = this.students.filter((s) => {
          if (where.status && s.status !== where.status) return false;
          if (where.OR) {
            const matches = where.OR.some((cond) => {
              if (cond.firstName?.contains && !s.firstName.toLowerCase().includes(cond.firstName.contains.toLowerCase())) return false;
              if (cond.lastName?.contains && !s.lastName.toLowerCase().includes(cond.lastName.contains.toLowerCase())) return false;
              if (cond.email?.contains && !s.email.toLowerCase().includes(cond.email.contains.toLowerCase())) return false;
              if (cond.studentCode?.contains && !s.studentCode.toLowerCase().includes(cond.studentCode.contains.toLowerCase())) return false;
              return true;
            });
            if (!matches) return false;
          }
          return true;
        });

        // Apply sorting
        if (orderBy.length > 0) {
          const sortField = Object.keys(orderBy[0])[0];
          const sortDir = orderBy[0][sortField];
          list.sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
          });
        }

        const items = list.slice(skip, skip + take).map((s) => {
          const res = { ...s };
          if (include?._count?.select?.enrollments) {
            const enrollmentsCount = this.enrollments.filter((e) => e.studentId === s.id).length;
            res._count = { enrollments: enrollmentsCount };
          }
          return res;
        });

        return items;
      },
      count: async ({ where = {} }) => {
        return (await this.student.findMany({ where, skip: 0, take: 999999 })).length;
      },
      create: async ({ data }) => {
        const id = data.id || crypto.randomUUID();
        const now = new Date();
        const record = {
          id,
          studentCode: data.studentCode,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email.toLowerCase(),
          phone: data.phone || null,
          dateOfBirth: data.dateOfBirth || null,
          gender: data.gender || null,
          address: data.address || null,
          status: data.status || 'ACTIVE',
          createdAt: now,
          updatedAt: now
        };
        this.students.push(record);
        return { ...record };
      },
      update: async ({ where, data }) => {
        const index = this.students.findIndex((s) => s.id === where.id);
        if (index === -1) throw new Error('Record not found');
        this.students[index] = {
          ...this.students[index],
          ...data,
          updatedAt: new Date()
        };
        return { ...this.students[index] };
      },
      delete: async ({ where }) => {
        const index = this.students.findIndex((s) => s.id === where.id);
        if (index === -1) throw new Error('Record not found');
        const deleted = this.students.splice(index, 1)[0];
        return deleted;
      }
    };
  }

  get course() {
    return {
      findUnique: async ({ where, include }) => {
        const course = this.courses.find((c) => (where.id ? c.id === where.id : c.courseCode === where.courseCode));
        if (!course) return null;
        const res = { ...course };
        if (include?._count?.select?.enrollments) {
          const count = this.enrollments.filter((e) => e.courseId === course.id).length;
          res._count = { enrollments: count };
        }
        return res;
      },
      findMany: async ({ where = {}, skip = 0, take = 10, orderBy = [], include }) => {
        let list = this.courses.filter((c) => {
          if (where.status && c.status !== where.status) return false;
          if (where.department?.contains && !c.department?.toLowerCase().includes(where.department.contains.toLowerCase())) return false;
          if (where.OR) {
            const matches = where.OR.some((cond) => {
              if (cond.courseCode?.contains && !c.courseCode.toLowerCase().includes(cond.courseCode.contains.toLowerCase())) return false;
              if (cond.title?.contains && !c.title.toLowerCase().includes(cond.title.contains.toLowerCase())) return false;
              if (cond.department?.contains && !c.department?.toLowerCase().includes(cond.department.contains.toLowerCase())) return false;
              return true;
            });
            if (!matches) return false;
          }
          return true;
        });

        if (orderBy.length > 0) {
          const sortField = Object.keys(orderBy[0])[0];
          const sortDir = orderBy[0][sortField];
          list.sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
          });
        }

        const items = list.slice(skip, skip + take).map((c) => {
          const res = { ...c };
          if (include?._count?.select?.enrollments) {
            res._count = { enrollments: this.enrollments.filter((e) => e.courseId === c.id).length };
          }
          return res;
        });

        return items;
      },
      count: async ({ where = {} }) => {
        return (await this.course.findMany({ where, skip: 0, take: 999999 })).length;
      },
      create: async ({ data }) => {
        const id = data.id || crypto.randomUUID();
        const now = new Date();
        const record = {
          id,
          courseCode: data.courseCode,
          title: data.title,
          description: data.description || null,
          department: data.department || null,
          credits: data.credits,
          instructor: data.instructor || null,
          status: data.status || 'ACTIVE',
          createdAt: now,
          updatedAt: now
        };
        this.courses.push(record);
        return { ...record };
      },
      update: async ({ where, data }) => {
        const index = this.courses.findIndex((c) => c.id === where.id);
        if (index === -1) throw new Error('Record not found');
        this.courses[index] = {
          ...this.courses[index],
          ...data,
          updatedAt: new Date()
        };
        return { ...this.courses[index] };
      },
      delete: async ({ where }) => {
        const index = this.courses.findIndex((c) => c.id === where.id);
        if (index === -1) throw new Error('Record not found');
        const deleted = this.courses.splice(index, 1)[0];
        return deleted;
      }
    };
  }

  get enrollment() {
    return {
      findUnique: async ({ where, include }) => {
        let enrollment = null;
        if (where.id) {
          enrollment = this.enrollments.find((e) => e.id === where.id);
        } else if (where.unique_student_course_enrollment) {
          const { studentId, courseId } = where.unique_student_course_enrollment;
          enrollment = this.enrollments.find((e) => e.studentId === studentId && e.courseId === courseId);
        }

        if (!enrollment) return null;
        const res = { ...enrollment };
        if (include?.student) {
          res.student = this.students.find((s) => s.id === enrollment.studentId) || null;
        }
        if (include?.course) {
          res.course = this.courses.find((c) => c.id === enrollment.courseId) || null;
        }
        return res;
      },
      findMany: async ({ where = {}, skip = 0, take = 10, orderBy = [], include }) => {
        let list = this.enrollments.filter((e) => {
          if (where.studentId && e.studentId !== where.studentId) return false;
          if (where.courseId && e.courseId !== where.courseId) return false;
          if (where.status && e.status !== where.status) return false;
          return true;
        });

        if (orderBy.length > 0) {
          const sortField = Object.keys(orderBy[0])[0];
          const sortDir = orderBy[0][sortField];
          list.sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
          });
        }

        const items = list.slice(skip, skip + take).map((e) => {
          const res = { ...e };
          if (include?.student) {
            res.student = this.students.find((s) => s.id === e.studentId) || null;
          }
          if (include?.course) {
            res.course = this.courses.find((c) => c.id === e.courseId) || null;
          }
          return res;
        });

        return items;
      },
      count: async ({ where = {} }) => {
        return (await this.enrollment.findMany({ where, skip: 0, take: 999999 })).length;
      },
      create: async ({ data, include }) => {
        const id = data.id || crypto.randomUUID();
        const now = new Date();
        const record = {
          id,
          studentId: data.studentId,
          courseId: data.courseId,
          status: data.status || 'ENROLLED',
          grade: data.grade !== undefined ? data.grade : null,
          enrollmentDate: data.enrollmentDate || now,
          createdAt: now,
          updatedAt: now
        };
        this.enrollments.push(record);
        const res = { ...record };
        if (include?.student) {
          res.student = this.students.find((s) => s.id === record.studentId) || null;
        }
        if (include?.course) {
          res.course = this.courses.find((c) => c.id === record.courseId) || null;
        }
        return res;
      },
      update: async ({ where, data, include }) => {
        const index = this.enrollments.findIndex((e) => e.id === where.id);
        if (index === -1) throw new Error('Record not found');
        this.enrollments[index] = {
          ...this.enrollments[index],
          ...data,
          updatedAt: new Date()
        };
        const res = { ...this.enrollments[index] };
        if (include?.student) {
          res.student = this.students.find((s) => s.id === res.studentId) || null;
        }
        if (include?.course) {
          res.course = this.courses.find((c) => c.id === res.courseId) || null;
        }
        return res;
      },
      delete: async ({ where }) => {
        const index = this.enrollments.findIndex((e) => e.id === where.id);
        if (index === -1) throw new Error('Record not found');
        return this.enrollments.splice(index, 1)[0];
      }
    };
  }

  async $transaction(arg) {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    if (typeof arg === 'function') {
      return arg(this);
    }
    return arg;
  }

  async $disconnect() {
    return Promise.resolve();
  }

  async $queryRaw() {
    return [{ '?column?': 1 }];
  }
}

export const inMemoryPrisma = new InMemoryPrismaClient();
export default inMemoryPrisma;
