import prisma from '../config/db.js';
import { AppError } from '../middleware/error.middleware.js';
import {
  getPaginationParams,
  getSortingParams,
  buildContactWhereClause,
  buildPaginationMetadata
} from '../utils/queryUtils.js';

/**
 * Creates a new contact associated with the authenticated owner.
 *
 * @param {string} ownerId - UUID of the authenticated user
 * @param {object} data - Contact data payload
 * @returns {Promise<object>} Created contact
 */
export const createContact = async (ownerId, data) => {
  // Application-level uniqueness check for email per owner
  if (data.email) {
    const existingWithEmail = await prisma.contact.findFirst({
      where: {
        ownerId,
        email: data.email
      }
    });

    if (existingWithEmail) {
      throw new AppError('A contact with this email address already exists in your contact list', 409);
    }
  }

  // Application-level uniqueness check for phone per owner
  if (data.phone) {
    const existingWithPhone = await prisma.contact.findFirst({
      where: {
        ownerId,
        phone: data.phone
      }
    });

    if (existingWithPhone) {
      throw new AppError('A contact with this phone number already exists in your contact list', 409);
    }
  }

  // Persist contact in database
  const contact = await prisma.contact.create({
    data: {
      ...data,
      ownerId
    }
  });

  return contact;
};

/**
 * Retrieves a paginated, sorted, and filtered list of contacts owned by the user.
 *
 * @param {string} ownerId
 * @param {object} query - Query parameters (page, limit, search, sort, order, etc.)
 * @returns {Promise<{ items: Array<object>, pagination: object }>}
 */
export const getContacts = async (ownerId, query) => {
  const { page, limit, skip, take } = getPaginationParams(query);
  const orderBy = getSortingParams(query);
  const where = buildContactWhereClause(ownerId, query);

  const [items, totalItems] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy,
      skip,
      take
    }),
    prisma.contact.count({ where })
  ]);

  const pagination = buildPaginationMetadata(totalItems, page, limit);

  return {
    items,
    pagination
  };
};

/**
 * Retrieves an individual contact by ID, ensuring strict owner-scoping.
 *
 * @param {string} ownerId
 * @param {string} contactId
 * @returns {Promise<object>}
 */
export const getContactById = async (ownerId, contactId) => {
  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      ownerId
    }
  });

  if (!contact) {
    throw new AppError('Contact not found or inaccessible', 404);
  }

  return contact;
};

/**
 * Partially updates an existing contact owned by the user.
 *
 * @param {string} ownerId
 * @param {string} contactId
 * @param {object} updateData
 * @returns {Promise<object>}
 */
export const updateContact = async (ownerId, contactId, updateData) => {
  // Ensure the contact exists and belongs to the authenticated user
  const existingContact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      ownerId
    }
  });

  if (!existingContact) {
    throw new AppError('Contact not found or inaccessible', 404);
  }

  // Ensure resulting contact preserves at least one contact method
  const resultingEmail = updateData.email !== undefined ? updateData.email : existingContact.email;
  const resultingPhone = updateData.phone !== undefined ? updateData.phone : existingContact.phone;

  if (!resultingEmail && !resultingPhone) {
    throw new AppError('A contact must retain at least one contact method (email or phone)', 400);
  }

  // Duplicate checks if email or phone is updated to a new value
  if (updateData.email && updateData.email !== existingContact.email) {
    const duplicateEmail = await prisma.contact.findFirst({
      where: {
        ownerId,
        email: updateData.email,
        NOT: { id: contactId }
      }
    });

    if (duplicateEmail) {
      throw new AppError('A contact with this email address already exists in your contact list', 409);
    }
  }

  if (updateData.phone && updateData.phone !== existingContact.phone) {
    const duplicatePhone = await prisma.contact.findFirst({
      where: {
        ownerId,
        phone: updateData.phone,
        NOT: { id: contactId }
      }
    });

    if (duplicatePhone) {
      throw new AppError('A contact with this phone number already exists in your contact list', 409);
    }
  }

  const updated = await prisma.contact.update({
    where: { id: contactId },
    data: updateData
  });

  return updated;
};

/**
 * Deletes a contact record owned by the authenticated user.
 *
 * @param {string} ownerId
 * @param {string} contactId
 * @returns {Promise<void>}
 */
export const deleteContact = async (ownerId, contactId) => {
  const existingContact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      ownerId
    }
  });

  if (!existingContact) {
    throw new AppError('Contact not found or inaccessible', 404);
  }

  await prisma.contact.delete({
    where: { id: contactId }
  });
};
