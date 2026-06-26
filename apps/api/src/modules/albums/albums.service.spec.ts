import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AlbumKind,
  VisibilityScope,
  ClaimStatus,
  type Album,
} from '@prisma/client';
import { AlbumsService } from './albums.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GraphDegreeService } from '../authorization/graph-degree.service';
import { EventPublisher } from '../../eventing/event-publisher';

const OWNER = 'account-owner';
const STRANGER = 'account-stranger';
const SUBJECT = 'person-subject';
const VIEWER_PERSON = 'person-viewer';

function makeAlbum(overrides: Partial<Album> = {}): Album {
  return {
    id: 'album-1',
    subjectPersonId: SUBJECT,
    ownerAccountId: OWNER,
    title: 'A life',
    description: null,
    kind: AlbumKind.PERSONAL,
    coverMediaId: null,
    visibilityScope: VisibilityScope.PRIVATE_SELF,
    visibleMaxDegree: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe('AlbumsService', () => {
  let service: AlbumsService;
  let prisma: {
    album: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    albumItem: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    claim: { findMany: jest.Mock };
    person: { findFirst: jest.Mock };
    media: { findFirst: jest.Mock };
    contribution: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let graphDegree: { computeDegree: jest.Mock };
  let events: { publish: jest.Mock };

  beforeEach(async () => {
    prisma = {
      album: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      albumItem: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      claim: { findMany: jest.fn().mockResolvedValue([]) },
      person: { findFirst: jest.fn().mockResolvedValue({ id: SUBJECT }) },
      media: { findFirst: jest.fn().mockResolvedValue({ id: 'media-1' }) },
      contribution: { create: jest.fn().mockResolvedValue({}) },
      // Execute the callback with the same mock acting as the tx client.
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    graphDegree = { computeDegree: jest.fn() };
    events = { publish: jest.fn().mockResolvedValue(undefined) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AlbumsService,
        { provide: PrismaService, useValue: prisma },
        { provide: GraphDegreeService, useValue: graphDegree },
        { provide: EventPublisher, useValue: events },
      ],
    }).compile();

    service = moduleRef.get(AlbumsService);
  });

  describe('createAlbum', () => {
    it('defaults to PRIVATE_SELF and writes a Contribution + event', async () => {
      const created = makeAlbum();
      prisma.album.create.mockResolvedValue(created);

      const result = await service.createAlbum(OWNER, { title: 'A life' });

      expect(result).toBe(created);
      expect(prisma.album.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerAccountId: OWNER,
            visibilityScope: VisibilityScope.PRIVATE_SELF,
          }),
        }),
      );
      expect(prisma.contribution.create).toHaveBeenCalledTimes(1);
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'album.created' }),
      );
    });
  });

  describe('addItem (ordering + owner guard)', () => {
    it('auto-appends at max(position)+1 when position omitted', async () => {
      prisma.album.findFirst.mockResolvedValue(makeAlbum());
      prisma.albumItem.findFirst.mockResolvedValue({ position: 4 });
      prisma.albumItem.create.mockImplementation(
        ({ data }: { data: { position: number } }) =>
          Promise.resolve({ id: 'item-1', mediaId: 'media-1', ...data }),
      );

      await service.addItem('album-1', OWNER, { mediaId: 'media-1' });

      expect(prisma.albumItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ position: 5 }),
        }),
      );
    });

    it('starts at position 0 for the first item', async () => {
      prisma.album.findFirst.mockResolvedValue(makeAlbum());
      prisma.albumItem.findFirst.mockResolvedValue(null);
      prisma.albumItem.create.mockImplementation(
        ({ data }: { data: { position: number } }) =>
          Promise.resolve({ id: 'item-1', mediaId: 'media-1', ...data }),
      );

      await service.addItem('album-1', OWNER, { mediaId: 'media-1' });

      expect(prisma.albumItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ position: 0 }),
        }),
      );
    });

    it('rejects a non-owner with ForbiddenException', async () => {
      prisma.album.findFirst.mockResolvedValue(makeAlbum());

      await expect(
        service.addItem('album-1', STRANGER, { mediaId: 'media-1' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.albumItem.create).not.toHaveBeenCalled();
    });

    it('throws NotFound when the album does not exist', async () => {
      prisma.album.findFirst.mockResolvedValue(null);

      await expect(
        service.addItem('missing', OWNER, { mediaId: 'media-1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getAlbum (visibility enforcement)', () => {
    it('PRIVATE_SELF: owner can read', async () => {
      prisma.album.findFirst.mockResolvedValue(
        makeAlbum({ visibilityScope: VisibilityScope.PRIVATE_SELF }),
      );
      prisma.albumItem.findMany.mockResolvedValue([]);

      const album = await service.getAlbum('album-1', OWNER);
      expect(album.id).toBe('album-1');
    });

    it('PRIVATE_SELF: a stranger is forbidden', async () => {
      prisma.album.findFirst.mockResolvedValue(
        makeAlbum({ visibilityScope: VisibilityScope.PRIVATE_SELF }),
      );

      await expect(service.getAlbum('album-1', STRANGER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('PUBLIC: any authenticated requester can read', async () => {
      prisma.album.findFirst.mockResolvedValue(
        makeAlbum({ visibilityScope: VisibilityScope.PUBLIC }),
      );
      prisma.albumItem.findMany.mockResolvedValue([]);

      const album = await service.getAlbum('album-1', STRANGER);
      expect(album.id).toBe('album-1');
    });

    it('FAMILY: allowed when claimed person is within degree of the subject', async () => {
      prisma.album.findFirst.mockResolvedValue(
        makeAlbum({
          visibilityScope: VisibilityScope.FAMILY,
          visibleMaxDegree: 3,
        }),
      );
      prisma.claim.findMany.mockResolvedValue([{ personId: VIEWER_PERSON }]);
      graphDegree.computeDegree.mockResolvedValue(2);
      prisma.albumItem.findMany.mockResolvedValue([]);

      const album = await service.getAlbum('album-1', STRANGER);
      expect(album.id).toBe('album-1');
      expect(graphDegree.computeDegree).toHaveBeenCalledWith(
        VIEWER_PERSON,
        SUBJECT,
        3,
      );
    });

    it('FAMILY: forbidden when beyond degree (unreachable -> null)', async () => {
      prisma.album.findFirst.mockResolvedValue(
        makeAlbum({
          visibilityScope: VisibilityScope.FAMILY,
          visibleMaxDegree: 3,
        }),
      );
      prisma.claim.findMany.mockResolvedValue([{ personId: VIEWER_PERSON }]);
      graphDegree.computeDegree.mockResolvedValue(null);

      await expect(service.getAlbum('album-1', STRANGER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('FAMILY: forbidden when requester has no claimed person', async () => {
      prisma.album.findFirst.mockResolvedValue(
        makeAlbum({ visibilityScope: VisibilityScope.FAMILY }),
      );
      prisma.claim.findMany.mockResolvedValue([]);

      await expect(service.getAlbum('album-1', STRANGER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(graphDegree.computeDegree).not.toHaveBeenCalled();
    });

    it('FAMILY: forbidden when the album has no subject person to anchor degree', async () => {
      prisma.album.findFirst.mockResolvedValue(
        makeAlbum({
          visibilityScope: VisibilityScope.FAMILY,
          subjectPersonId: null,
        }),
      );

      await expect(service.getAlbum('album-1', STRANGER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns items ordered by position', async () => {
      prisma.album.findFirst.mockResolvedValue(
        makeAlbum({ visibilityScope: VisibilityScope.PUBLIC }),
      );
      prisma.albumItem.findMany.mockResolvedValue([
        { id: 'i0', position: 0 },
        { id: 'i1', position: 1 },
      ]);

      const album = await service.getAlbum('album-1', STRANGER);
      expect(album.items.map((i) => i.id)).toEqual(['i0', 'i1']);
      expect(prisma.albumItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        }),
      );
    });
  });

  describe('listAlbumsForPerson', () => {
    it('filters out albums the requester cannot see', async () => {
      prisma.album.findMany.mockResolvedValue([
        makeAlbum({ id: 'public', visibilityScope: VisibilityScope.PUBLIC }),
        makeAlbum({
          id: 'private',
          visibilityScope: VisibilityScope.PRIVATE_SELF,
        }),
      ]);

      const visible = await service.listAlbumsForPerson(SUBJECT, STRANGER);
      expect(visible.map((a) => a.id)).toEqual(['public']);
    });
  });

  describe('setVisibility', () => {
    it('publishes FAMILY and records a Contribution (owner-only)', async () => {
      prisma.album.findFirst.mockResolvedValue(makeAlbum());
      prisma.album.update.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve(makeAlbum({ ...data } as Partial<Album>)),
      );

      await service.setVisibility('album-1', OWNER, {
        visibilityScope: VisibilityScope.FAMILY,
        visibleMaxDegree: 2,
      });

      expect(prisma.album.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            visibilityScope: VisibilityScope.FAMILY,
            visibleMaxDegree: 2,
          }),
        }),
      );
      expect(prisma.contribution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'set_visibility' }),
        }),
      );
    });

    it('clears visibleMaxDegree when switching away from FAMILY', async () => {
      prisma.album.findFirst.mockResolvedValue(
        makeAlbum({
          visibilityScope: VisibilityScope.FAMILY,
          visibleMaxDegree: 3,
        }),
      );
      prisma.album.update.mockResolvedValue(makeAlbum());

      await service.setVisibility('album-1', OWNER, {
        visibilityScope: VisibilityScope.PUBLIC,
      });

      expect(prisma.album.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ visibleMaxDegree: null }),
        }),
      );
    });

    it('rejects a non-owner', async () => {
      prisma.album.findFirst.mockResolvedValue(makeAlbum());

      await expect(
        service.setVisibility('album-1', STRANGER, {
          visibilityScope: VisibilityScope.PUBLIC,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // Sanity: ClaimStatus.VERIFIED is the status used to resolve the requester
  // person nodes for FAMILY degree checks.
  it('resolves only VERIFIED claims for FAMILY checks', async () => {
    prisma.album.findFirst.mockResolvedValue(
      makeAlbum({ visibilityScope: VisibilityScope.FAMILY, visibleMaxDegree: 5 }),
    );
    prisma.claim.findMany.mockResolvedValue([{ personId: VIEWER_PERSON }]);
    graphDegree.computeDegree.mockResolvedValue(1);
    prisma.albumItem.findMany.mockResolvedValue([]);

    await service.getAlbum('album-1', STRANGER);

    expect(prisma.claim.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: ClaimStatus.VERIFIED }),
      }),
    );
  });
});
