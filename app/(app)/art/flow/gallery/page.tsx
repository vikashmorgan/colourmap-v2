import type { Metadata } from 'next';

import GalleryRoom from '@/components/GalleryRoom';
import { collectionBySlug, driveThumbnail, driveView } from '@/lib/art/collections';

/*
 * The walkable 3D gallery of the AI Sculptures · Flow collection: its pictures
 * on the walls, sculptures in marble, bronze, gold or glass down the middle,
 * your own models dropped in. See components/GalleryRoom.tsx.
 */

const flow = collectionBySlug('flow');

export const metadata: Metadata = { title: `The gallery · ${flow?.title ?? 'Collection'}` };

export default function FlowGalleryPage() {
  if (!flow) return null;
  const pictures = flow.images.map((image) => ({
    title: image.title,
    src: driveThumbnail(image.id, 700),
    large: driveThumbnail(image.id, 1600),
    href: driveView(image.id),
  }));
  return (
    <GalleryRoom
      title="The gallery"
      back={{ href: '/art/flow', label: flow.title }}
      images={pictures}
    />
  );
}
