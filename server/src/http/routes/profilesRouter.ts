import { Router } from 'express';
import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_IDS_PER_LOOKUP, MAX_PAGE_SIZE } from '../../constants/api.js';
import { HttpStatus } from '../../constants/httpStatus.js';
import { profileDetailsSchema, profileIdSchema, profileSchema } from '../../domain/profile/index.js';
import type { ProfileService } from '../../services/profileService.js';
import { cursorParamSchema, encodeCursor } from '../pageCursor.js';
import { parseRequest, RequestPart } from '../requestValidation.js';

const idParamsSchema = z.object({ id: profileIdSchema });

const idListSchema = z
  .string()
  .transform((value) => [...new Set(value.split(','))])
  .pipe(z.array(profileIdSchema).min(1).max(MAX_IDS_PER_LOOKUP));

/** Either a page of the list (?limit=&cursor=) or a lookup of specific profiles (?ids=a,b,c). */
const listQuerySchema = z
  .object({
    // Digits only: Number() would also accept "0x10" or "1e1".
    limit: z
      .string()
      .regex(/^\d+$/, 'limit must be a whole number')
      .transform(Number)
      .pipe(z.number().min(1).max(MAX_PAGE_SIZE))
      .optional(),
    cursor: cursorParamSchema.optional(),
    ids: idListSchema.optional(),
  })
  .strict()
  .refine((query) => !query.ids || (query.limit === undefined && query.cursor === undefined), {
    message: 'ids cannot be combined with limit or cursor',
    path: ['ids'],
  });

export function createProfilesRouter(service: ProfileService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { limit, cursor, ids } = parseRequest(listQuerySchema, req.query, RequestPart.Query);
    if (ids) {
      res.json({ profiles: await service.findByIds(ids), nextCursor: null });
      return;
    }
    const page = await service.listPage({ limit: limit ?? DEFAULT_PAGE_SIZE, after: cursor });
    res.json({ profiles: page.items, nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null });
  });

  router.get('/:id', async (req, res) => {
    const { id } = parseRequest(idParamsSchema, req.params, RequestPart.Params);
    res.json(await service.getById(id));
  });

  router.post('/', async (req, res) => {
    const profile = parseRequest(profileSchema, req.body, RequestPart.Body);
    const saved = await service.save(profile);
    res
      .status(HttpStatus.Created)
      .location(`${req.baseUrl}/${encodeURIComponent(saved.id)}`)
      .json(saved);
  });

  // Replaces every editable field at once: the client always sends the whole form.
  router.put('/:id', async (req, res) => {
    const { id } = parseRequest(idParamsSchema, req.params, RequestPart.Params);
    const details = parseRequest(profileDetailsSchema, req.body, RequestPart.Body);
    res.json(await service.update(id, details));
  });

  router.delete('/:id', async (req, res) => {
    const { id } = parseRequest(idParamsSchema, req.params, RequestPart.Params);
    await service.remove(id);
    res.status(HttpStatus.NoContent).end();
  });

  return router;
}
