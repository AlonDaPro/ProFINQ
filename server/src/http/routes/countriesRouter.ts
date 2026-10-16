import { Router } from 'express';
import type { ProfileService } from '../../services/profileService.js';

/** The countries saved profiles come from: the options of History's country filter. */
export function createCountriesRouter(service: ProfileService): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json({ countries: await service.listCountries() });
  });

  return router;
}
