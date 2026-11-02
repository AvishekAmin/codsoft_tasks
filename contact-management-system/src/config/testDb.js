import crypto from 'crypto';

/**
 * In-memory relational database simulator for test environments when PostgreSQL is offline.
 * Implements Prisma Client query interface with foreign keys, partial unique constraints,
 * owner-scoping, search, sorting, pagination, and token revocation.
 */
class InMemoryPrismaClient {
  constructor() {
    this.users = [];
    this.contacts = [];
    this.revokedTokens = [];
  }

  reset() {
    this.users = [];
    this.contacts = [];
    this.revokedTokens = [];
  }

  get user() {
    return {
      findUnique: async ({ where }) => {
        if (where.id) return this.users.find((u) => u.id === where.id) || null;
        if (where.email) return this.users.find((u) => u.email.toLowerCase() === where.email.toLowerCase()) || null;
        return null;
      },
      findFirst: async ({ where }) => {
        return (
          this.users.find((u) => {
            if (where.id && u.id !== where.id) return false;
            if (where.email && u.email.toLowerCase() !== where.email.toLowerCase()) return false;
            return true;
          }) || null
        );
      },
      create: async ({ data }) => {
        const emailLower = data.email.toLowerCase();
        const existing = this.users.find((u) => u.email === emailLower);
        if (existing) {
          const err = new Error('Unique constraint failed on the fields: (`email`)');
          err.code = 'P2002';
          err.meta = { target: ['email'] };
          throw err;
        }

        const id = data.id || crypto.randomUUID();
        const now = new Date();
        const record = {
          id,
          name: data.name,
          email: emailLower,
          passwordHash: data.passwordHash,
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
      },
      delete: async ({ where }) => {
        const index = this.users.findIndex((u) => (where.id ? u.id === where.id : u.email === where.email));
        if (index === -1) throw new Error('Record to delete not found');
        const [deleted] = this.users.splice(index, 1);
        // Cascade delete contacts and revoked tokens
        this.contacts = this.contacts.filter((c) => c.ownerId !== deleted.id);
        this.revokedTokens = this.revokedTokens.filter((r) => r.userId !== deleted.id);
        return { ...deleted };
      }
    };
  }

  get contact() {
    return {
      findUnique: async ({ where }) => {
        if (!where.id) return null;
        return this.contacts.find((c) => c.id === where.id) || null;
      },
      findFirst: async ({ where }) => {
        return (
          this.contacts.find((c) => {
            if (where.id && c.id !== where.id) return false;
            if (where.ownerId && c.ownerId !== where.ownerId) return false;
            if (where.email && c.email !== where.email) return false;
            if (where.phone && c.phone !== where.phone) return false;
            if (where.NOT) {
              if (where.NOT.id && c.id === where.NOT.id) return false;
            }
            return true;
          }) || null
        );
      },
      findMany: async ({ where = {}, orderBy = [], skip = 0, take = 10 } = {}) => {
        let results = this.contacts.filter((c) => {
          if (where.ownerId && c.ownerId !== where.ownerId) return false;
          if (where.id && c.id !== where.id) return false;

          if (where.AND && Array.isArray(where.AND)) {
            for (const cond of where.AND) {
              if (cond.OR && Array.isArray(cond.OR)) {
                const orMatch = cond.OR.some((orCond) => {
                  if (orCond.name?.contains) {
                    return c.name.toLowerCase().includes(orCond.name.contains.toLowerCase());
                  }
                  if (orCond.email?.contains) {
                    return c.email && c.email.toLowerCase().includes(orCond.email.contains.toLowerCase());
                  }
                  if (orCond.phone?.contains) {
                    return c.phone && c.phone.includes(orCond.phone.contains);
                  }
                  return false;
                });
                if (!orMatch) return false;
              }

              if (cond.companyName?.contains) {
                if (!c.companyName || !c.companyName.toLowerCase().includes(cond.companyName.contains.toLowerCase())) {
                  return false;
                }
              }

              if (cond.city?.contains) {
                if (!c.city || !c.city.toLowerCase().includes(cond.city.contains.toLowerCase())) {
                  return false;
                }
              }

              if (cond.country?.contains) {
                if (!c.country || !c.country.toLowerCase().includes(cond.country.contains.toLowerCase())) {
                  return false;
                }
              }
            }
          }

          return true;
        });

        // Sorting
        if (orderBy && orderBy.length > 0) {
          results.sort((a, b) => {
            for (const orderRule of orderBy) {
              const field = Object.keys(orderRule)[0];
              const direction = orderRule[field];
              let valA = a[field];
              let valB = b[field];

              if (valA === null || valA === undefined) valA = '';
              if (valB === null || valB === undefined) valB = '';

              if (valA instanceof Date) valA = valA.getTime();
              if (valB instanceof Date) valB = valB.getTime();

              if (typeof valA === 'string') valA = valA.toLowerCase();
              if (typeof valB === 'string') valB = valB.toLowerCase();

              if (valA < valB) return direction === 'asc' ? -1 : 1;
              if (valA > valB) return direction === 'asc' ? 1 : -1;
            }
            return 0;
          });
        }

        return results.slice(skip, skip + take).map((r) => ({ ...r }));
      },
      count: async ({ where = {} } = {}) => {
        const records = await this.contact.findMany({ where, skip: 0, take: 999999 });
        return records.length;
      },
      create: async ({ data }) => {
        // Enforce foreign key: owner must exist
        const owner = this.users.find((u) => u.id === data.ownerId);
        if (!owner) {
          const err = new Error('Foreign key constraint failed on ownerId');
          err.code = 'P2003';
          throw err;
        }

        // Enforce partial unique indexes per owner: email and phone
        if (data.email) {
          const existingEmail = this.contacts.find(
            (c) => c.ownerId === data.ownerId && c.email && c.email.toLowerCase() === data.email.toLowerCase()
          );
          if (existingEmail) {
            const err = new Error('Unique constraint failed on the fields: (`ownerId`, `email`)');
            err.code = 'P2002';
            err.meta = { target: ['contacts_ownerId_email_unique', 'email'] };
            throw err;
          }
        }

        if (data.phone) {
          const existingPhone = this.contacts.find(
            (c) => c.ownerId === data.ownerId && c.phone && c.phone === data.phone
          );
          if (existingPhone) {
            const err = new Error('Unique constraint failed on the fields: (`ownerId`, `phone`)');
            err.code = 'P2002';
            err.meta = { target: ['contacts_ownerId_phone_unique', 'phone'] };
            throw err;
          }
        }

        const id = data.id || crypto.randomUUID();
        const now = new Date();
        const record = {
          id,
          ownerId: data.ownerId,
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          addressLine1: data.addressLine1 || null,
          addressLine2: data.addressLine2 || null,
          city: data.city || null,
          state: data.state || null,
          postalCode: data.postalCode || null,
          country: data.country || null,
          companyName: data.companyName || null,
          jobTitle: data.jobTitle || null,
          notes: data.notes || null,
          createdAt: now,
          updatedAt: now
        };

        this.contacts.push(record);
        return { ...record };
      },
      update: async ({ where, data }) => {
        const index = this.contacts.findIndex((c) => c.id === where.id);
        if (index === -1) {
          throw new Error('Record to update not found');
        }

        const current = this.contacts[index];

        // Check uniqueness if email or phone is updated
        if (data.email !== undefined && data.email !== null) {
          const duplicate = this.contacts.find(
            (c) =>
              c.ownerId === current.ownerId &&
              c.id !== current.id &&
              c.email &&
              c.email.toLowerCase() === data.email.toLowerCase()
          );
          if (duplicate) {
            const err = new Error('Unique constraint failed on the fields: (`ownerId`, `email`)');
            err.code = 'P2002';
            err.meta = { target: ['contacts_ownerId_email_unique', 'email'] };
            throw err;
          }
        }

        if (data.phone !== undefined && data.phone !== null) {
          const duplicate = this.contacts.find(
            (c) => c.ownerId === current.ownerId && c.id !== current.id && c.phone && c.phone === data.phone
          );
          if (duplicate) {
            const err = new Error('Unique constraint failed on the fields: (`ownerId`, `phone`)');
            err.code = 'P2002';
            err.meta = { target: ['contacts_ownerId_phone_unique', 'phone'] };
            throw err;
          }
        }

        this.contacts[index] = {
          ...current,
          ...data,
          updatedAt: new Date()
        };
        return { ...this.contacts[index] };
      },
      delete: async ({ where }) => {
        const index = this.contacts.findIndex((c) => c.id === where.id);
        if (index === -1) {
          throw new Error('Record to delete not found');
        }
        const [deleted] = this.contacts.splice(index, 1);
        return { ...deleted };
      },
      deleteMany: async ({ where = {} } = {}) => {
        const initialCount = this.contacts.length;
        this.contacts = this.contacts.filter((c) => {
          if (where.ownerId && c.ownerId === where.ownerId) return false;
          return true;
        });
        return { count: initialCount - this.contacts.length };
      }
    };
  }

  get revokedToken() {
    return {
      findUnique: async ({ where }) => {
        if (!where.tokenId) return null;
        return this.revokedTokens.find((r) => r.tokenId === where.tokenId) || null;
      },
      create: async ({ data }) => {
        const record = {
          id: data.id || crypto.randomUUID(),
          tokenId: data.tokenId,
          userId: data.userId || null,
          expiresAt: data.expiresAt,
          createdAt: new Date()
        };
        this.revokedTokens.push(record);
        return { ...record };
      },
      deleteMany: async ({ where = {} } = {}) => {
        const initialCount = this.revokedTokens.length;
        if (where.expiresAt && where.expiresAt.lt) {
          this.revokedTokens = this.revokedTokens.filter((r) => r.expiresAt >= where.expiresAt.lt);
        }
        return { count: initialCount - this.revokedTokens.length };
      }
    };
  }

  async $transaction(fn) {
    if (typeof fn === 'function') {
      return fn(this);
    }
    if (Array.isArray(fn)) {
      const results = [];
      for (const item of fn) {
        results.push(await item);
      }
      return results;
    }
    throw new Error('Transaction requires a callback or array of promises');
  }

  async $queryRaw() {
    return [{ 1: 1 }];
  }

  async $disconnect() {
    return true;
  }
}

const inMemoryPrisma = new InMemoryPrismaClient();
export default inMemoryPrisma;
