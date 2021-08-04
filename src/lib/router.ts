import express from 'express';
import { Double, ObjectId } from 'mongodb';
import { Comment, Marker } from '../types';
import { getCommentsCollection } from './comments';
import { getMarkersCollection } from './markers';
import fetch from 'node-fetch';

const router = express.Router();

router.get('/markers', async (_req, res, next) => {
  try {
    const markers = await getMarkersCollection().find({}).toArray();
    res.status(200).json(markers);
  } catch (error) {
    next(error);
  }
});

router.post('/markers', async (req, res, next) => {
  try {
    const { type, position } = req.body;

    if (typeof type !== 'string' || !Array.isArray(position)) {
      res.status(400).send('Invalid payload');
      return;
    }

    const marker: Marker = {
      type,
      position: position.map((p) => new Double(p)) as [Double, Double],
      createdAt: new Date(),
    };

    const existingMarker = await getMarkersCollection().findOne({
      type: marker.type,
      position: marker.position,
    });
    if (existingMarker) {
      res.status(409).send('Marker already exists');
      return;
    }

    const inserted = await getMarkersCollection().insertOne(marker);
    if (!inserted.acknowledged) {
      res.status(500).send('Error inserting marker');
      return;
    }
    res.status(200).json(marker);
  } catch (error) {
    next(error);
  }
});

router.get('/markers/:markerId/comments', async (req, res) => {
  const { markerId } = req.params;
  if (!ObjectId.isValid(markerId)) {
    res.status(400).send('Invalid payload');
    return;
  }
  const comment = await getCommentsCollection()
    .find({ markerId: new ObjectId(markerId) })
    .sort({ createdAt: -1 })
    .toArray();
  if (!comment) {
    res.status(404).end(`No comments found for marker ${markerId}`);
    return;
  }
  res.status(200).json(comment);
});

router.post('/markers/:markerId/comments', async (req, res, next) => {
  try {
    const { markerId } = req.params;
    const { username, message } = req.body;

    if (
      typeof username !== 'string' ||
      typeof message !== 'string' ||
      !ObjectId.isValid(markerId)
    ) {
      res.status(400).send('Invalid payload');
      return;
    }

    const comment: Comment = {
      markerId: new ObjectId(markerId),
      username,
      message,
      createdAt: new Date(),
    };

    const inserted = await getCommentsCollection().insertOne(comment);
    if (!inserted.acknowledged) {
      res.status(500).send('Error inserting comment');
      return;
    }
    res.status(200).json(comment);
  } catch (error) {
    next(error);
  }
});

router.get('/tweets', async (_req, res, next) => {
  try {
    const tweets = await fetch(
      'https://newworldfans.com/api/v1/dev_tracker?source=twitter'
    )
      .then((response) => response.json())
      .then(
        (result: {
          dev_posts: {
            id: number;
            source_id: string;
          }[];
        }) =>
          result.dev_posts.map((post) => ({
            id: post.id,
            sourceId: post.source_id,
          }))
      );
    res.status(200).json(tweets);
  } catch (error) {
    next(error);
  }
});
export default router;
