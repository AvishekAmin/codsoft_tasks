import { Router } from 'express';
import * as contactController from '../controllers/contact.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createContactSchema,
  updateContactSchema,
  contactIdParamSchema,
  listContactsQuerySchema
} from '../validators/contact.validator.js';

const router = Router();

// All contact routes require Bearer token authentication
router.use(authenticate);

// Convenience search endpoint (placed before /:contactId to avoid route clash)
router.get('/search', contactController.searchConvenience);

// Standard CRUD endpoints
router.post('/', validate(createContactSchema, 'body'), contactController.create);
router.get('/', validate(listContactsQuerySchema, 'query'), contactController.list);
router.get('/:contactId', validate(contactIdParamSchema, 'params'), contactController.getById);
router.patch(
  '/:contactId',
  validate(contactIdParamSchema, 'params'),
  validate(updateContactSchema, 'body'),
  contactController.update
);
router.delete('/:contactId', validate(contactIdParamSchema, 'params'), contactController.deleteContact);

export default router;
