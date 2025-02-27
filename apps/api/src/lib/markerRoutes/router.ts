import type { Filter } from 'mongodb';
import { Router } from 'express';
import type { MarkerRouteDTO } from './types.js';
import { Double, ObjectId } from 'mongodb';
import { getMarkerRoutesCollection } from './collection.js';
import { getMarkerRoutesURL, postToDiscord } from '../discord.js';
import { ensureAuthenticated } from '../auth/middlewares.js';
import { findRegions, mapIsAeternumMap, findMapDetails } from 'static';

const markerRoutesRouter = Router();

const MAX_MARKER_ROUTE_LENGTH = 100;
markerRoutesRouter.post('/', ensureAuthenticated, async (req, res, next) => {
  try {
    const {
      name,
      description,
      isPublic,
      positions,
      markersByType,
      map,
      origin,
    } = req.body;
    const account = req.account!;

    if (
      typeof name !== 'string' ||
      name.length > MAX_MARKER_ROUTE_LENGTH ||
      typeof isPublic !== 'boolean'
    ) {
      res.status(400).send('Invalid payload');
      return;
    }

    if (positions.length === 0 || !Array.isArray(positions)) {
      res.status(400).send('Invalid payload');
      return;
    }

    const now = new Date();
    const markerRoute: MarkerRouteDTO = {
      name,
      userId: account.steamId,
      username: account.name,
      positions: positions.map((position) =>
        position.map((part: number) => new Double(part))
      ) as [Double, Double][],
      regions: findRegions(positions, map),
      markersByType,
      isPublic: Boolean(isPublic),
      createdAt: now,
      updatedAt: now,
    };

    if (typeof description === 'string') {
      markerRoute.description = description;
    }

    if (ObjectId.isValid(origin)) {
      markerRoute.origin = new ObjectId(origin);
    }

    if (
      typeof map === 'string' &&
      !mapIsAeternumMap(map) &&
      findMapDetails(map)
    ) {
      markerRoute.map = map;
    }

    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingMarkerRoute = await getMarkerRoutesCollection().findOne({
      name: new RegExp(`^${escapedName}$`, 'i'),
      username: account.name,
    });
    if (existingMarkerRoute) {
      res.status(409).send('Route with same name already exists');
      return;
    }
    const inserted = await getMarkerRoutesCollection().insertOne(markerRoute);
    if (!inserted.acknowledged) {
      res.status(500).send('Error inserting marker');
      return;
    }
    if (markerRoute.origin) {
      await getMarkerRoutesCollection().updateOne(
        { _id: new ObjectId(markerRoute.origin) },
        { $inc: { forks: 1 } }
      );
    }

    res.status(200).json(markerRoute);

    postToDiscord(
      `🗺️ ${markerRoute.origin ? 'Forked' : 'New'} route ${name} added by ${
        account.name
      }\n${getMarkerRoutesURL(inserted.insertedId.toString(), map)}`,
      markerRoute.isPublic
    );
  } catch (error) {
    next(error);
  }
});

markerRoutesRouter.get('/', async (req, res, next) => {
  try {
    const account = req.account;

    let query: Filter<MarkerRouteDTO> | undefined = undefined;
    if (account) {
      query = {
        $or: [
          {
            userId: account.steamId,
          },
          {
            isPublic: true,
          },
        ],
      };
    } else {
      query = { isPublic: true };
    }
    const markerRoutes = await getMarkerRoutesCollection()
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();
    res.status(200).json(markerRoutes);
  } catch (error) {
    next(error);
  }
});

markerRoutesRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).send('Invalid payload');
      return;
    }

    const markerRoute = await getMarkerRoutesCollection().findOne({
      _id: new ObjectId(id),
    });
    if (!markerRoute) {
      res.status(404).json({ message: 'No route found' });
      return;
    }
    res.status(200).json(markerRoute);
  } catch (error) {
    next(error);
  }
});

markerRoutesRouter.delete(
  '/:id',
  ensureAuthenticated,
  async (req, res, next) => {
    try {
      const account = req.account!;

      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        res.status(400).send('Invalid payload');
        return;
      }

      const query: Filter<MarkerRouteDTO> = {
        _id: new ObjectId(id),
      };
      if (!account.isModerator) {
        query.userId = account.steamId;
      }

      const markerRoutesCollection = getMarkerRoutesCollection();
      const markerRoute = await markerRoutesCollection.findOne(query);
      if (!markerRoute) {
        res.status(404).end(`No marker route found for id ${id}`);
        return;
      }
      if (
        markerRoute.isPublic &&
        !account.isModerator &&
        markerRoute.userId !== account.steamId
      ) {
        res.status(403).send('💀 no access');
        return;
      }

      const result = await getMarkerRoutesCollection().deleteOne(query);
      if (!result.deletedCount) {
        res.status(404).end(`No marker route found for id ${id}`);
        return;
      }
      if (markerRoute.origin) {
        await getMarkerRoutesCollection().updateOne(
          { _id: new ObjectId(markerRoute.origin) },
          { $inc: { forks: -1 } }
        );
      }

      res.status(200).json({});
      postToDiscord(
        `🗺️💀 Route ${markerRoute.name} deleted by ${account.name}`,
        markerRoute.isPublic
      );
    } catch (error) {
      next(error);
    }
  }
);

markerRoutesRouter.patch(
  '/:id',
  ensureAuthenticated,
  async (req, res, next) => {
    try {
      const account = req.account!;

      const { id } = req.params;
      const { name, description, isPublic, positions, markersByType, map } =
        req.body;

      if (!ObjectId.isValid(id)) {
        res.status(400).send('Invalid payload');
        return;
      }

      const query: Filter<MarkerRouteDTO> = {
        _id: new ObjectId(id),
      };
      if (!account.isModerator) {
        query.userId = account.steamId;
      }
      const markerRoutesCollection = getMarkerRoutesCollection();
      const existingMarkerRoute = await markerRoutesCollection.findOne(query);
      if (!existingMarkerRoute) {
        res.status(404).end(`No marker route found for id ${id}`);
        return;
      }
      if (
        existingMarkerRoute.isPublic &&
        !account.isModerator &&
        existingMarkerRoute.userId !== account.steamId
      ) {
        res.status(403).send('💀 no access');
        return;
      }

      const markerRoute: Partial<MarkerRouteDTO> = {
        updatedAt: new Date(),
      };
      if (typeof name === 'string' && name.length <= MAX_MARKER_ROUTE_LENGTH) {
        markerRoute.name = name;
      }
      if (typeof description === 'string') {
        markerRoute.description = description;
      }
      if (typeof isPublic === 'boolean') {
        markerRoute.isPublic = isPublic;
      }
      if (
        typeof map === 'string' &&
        !mapIsAeternumMap(map) &&
        findMapDetails(map)
      ) {
        markerRoute.map = map;
      }
      if (Array.isArray(positions)) {
        markerRoute.regions = findRegions(positions, map);
        markerRoute.positions = positions.map((position) =>
          position.map((part: number) => new Double(part))
        ) as [Double, Double][];
        if (markerRoute.positions.length === 0) {
          res.status(400).send('Invalid payload');
          return;
        }
      }

      if (typeof markersByType !== 'undefined') {
        markerRoute.markersByType = markersByType;
      }

      const result = await getMarkerRoutesCollection().findOneAndUpdate(query, {
        $set: markerRoute,
      });

      if (!result.ok || !result.value) {
        res.status(404).end(`No marker route found for id ${id}`);
        return;
      }
      res.status(200).json(result.value);
      postToDiscord(
        `🗺️ Route ${result.value.name} updated by ${
          account.name
        }\n${getMarkerRoutesURL(result.value._id.toString(), markerRoute.map)}`,
        markerRoute.isPublic
      );
    } catch (error) {
      next(error);
    }
  }
);

export default markerRoutesRouter;
