import { Router } from 'express';
import { HttpStatus } from '../../constants/httpStatus.js';
import { profileIdSchema, profileSchema, updateProfileNameSchema } from '../../domain/profile/index.js';
import type { ProfileService } from '../../services/profileService.js';

export function createProfilesRouter(service: ProfileService): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json({ profiles: await service.list() });
  });

  router.get('/:id', async (req, res) => {
    const id = profileIdSchema.parse(req.params.id);
    res.json(await service.getById(id));
  });

  router.post('/', async (req, res) => {
    const profile = profileSchema.parse(req.body);
    const saved = await service.save(profile);
    res
      .status(HttpStatus.Created)
      .location(`${req.baseUrl}/${encodeURIComponent(saved.id)}`)
      .json(saved);
  });

  router.patch('/:id', async (req, res) => {
    const id = profileIdSchema.parse(req.params.id);
    const { name } = updateProfileNameSchema.parse(req.body);
    res.json(await service.rename(id, name));
  });

  router.delete('/:id', async (req, res) => {
    const id = profileIdSchema.parse(req.params.id);
    await service.remove(id);
    res.status(HttpStatus.NoContent).end();
  });

  return router;
}
