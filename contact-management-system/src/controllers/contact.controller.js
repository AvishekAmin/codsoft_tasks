import * as contactService from '../services/contact.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';

export const create = async (req, res, next) => {
  try {
    const contact = await contactService.createContact(req.user.id, req.body);
    return successResponse(res, 201, 'Contact created successfully', contact);
  } catch (error) {
    next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const { items, pagination } = await contactService.getContacts(req.user.id, req.query);
    return paginatedResponse(res, 200, 'Contacts retrieved successfully', items, pagination);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const contact = await contactService.getContactById(req.user.id, req.params.contactId);
    return successResponse(res, 200, 'Contact retrieved successfully', contact);
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const updated = await contactService.updateContact(req.user.id, req.params.contactId, req.body);
    return successResponse(res, 200, 'Contact updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

export const deleteContact = async (req, res, next) => {
  try {
    await contactService.deleteContact(req.user.id, req.params.contactId);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const searchConvenience = async (req, res, next) => {
  try {
    const searchTerm = req.query.q || req.query.search || '';
    const query = {
      ...req.query,
      search: searchTerm
    };
    const { items, pagination } = await contactService.getContacts(req.user.id, query);
    return paginatedResponse(res, 200, 'Contacts retrieved successfully', items, pagination);
  } catch (error) {
    next(error);
  }
};
