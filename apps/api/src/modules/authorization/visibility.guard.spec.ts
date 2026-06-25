import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { VisibilityScope } from '@prisma/client';
import { VisibilityGuard } from './visibility.guard';
import { GraphDegreeService } from './graph-degree.service';
import {
  VisibilityRequest,
  VisibilityTargetData,
  VisibilityTargetExtractor,
} from './visibility.decorator';

const mockGraphDegree = {
  computeDegree: jest.fn(),
};

const mockConfig = {
  get: jest.fn((_key: string, defaultValue?: number) => defaultValue ?? 5),
};

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

/** Builds a minimal ExecutionContext carrying the given request. */
function buildContext(request: VisibilityRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('VisibilityGuard', () => {
  let guard: VisibilityGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisibilityGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: GraphDegreeService, useValue: mockGraphDegree },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    guard = module.get<VisibilityGuard>(VisibilityGuard);
    jest.clearAllMocks();
  });

  describe('evaluate (decision logic)', () => {
    it('PUBLIC: allows any authenticated requester', async () => {
      const target: VisibilityTargetData = {
        ownerId: 'owner-person',
        visibilityScope: VisibilityScope.PUBLIC,
        visibleMaxDegree: null,
      };
      await expect(guard.evaluate(target, 'anyone')).resolves.toBe(true);
      await expect(guard.evaluate(target, null)).resolves.toBe(true);
      expect(mockGraphDegree.computeDegree).not.toHaveBeenCalled();
    });

    it('PRIVATE_SELF: allows the owner only', async () => {
      const target: VisibilityTargetData = {
        ownerId: 'owner-person',
        visibilityScope: VisibilityScope.PRIVATE_SELF,
        visibleMaxDegree: null,
      };
      await expect(guard.evaluate(target, 'owner-person')).resolves.toBe(true);
      await expect(guard.evaluate(target, 'someone-else')).resolves.toBe(false);
      await expect(guard.evaluate(target, null)).resolves.toBe(false);
      expect(mockGraphDegree.computeDegree).not.toHaveBeenCalled();
    });

    it('FAMILY: allows the owner without a graph lookup', async () => {
      const target: VisibilityTargetData = {
        ownerId: 'owner-person',
        visibilityScope: VisibilityScope.FAMILY,
        visibleMaxDegree: 3,
      };
      await expect(guard.evaluate(target, 'owner-person')).resolves.toBe(true);
      expect(mockGraphDegree.computeDegree).not.toHaveBeenCalled();
    });

    it('FAMILY: allows when degree is within visibleMaxDegree', async () => {
      mockGraphDegree.computeDegree.mockResolvedValue(2);
      const target: VisibilityTargetData = {
        ownerId: 'owner-person',
        visibilityScope: VisibilityScope.FAMILY,
        visibleMaxDegree: 3,
      };
      await expect(guard.evaluate(target, 'requester')).resolves.toBe(true);
      expect(mockGraphDegree.computeDegree).toHaveBeenCalledWith(
        'requester',
        'owner-person',
        3,
      );
    });

    it('FAMILY: denies when degree exceeds the cap (unreachable => null)', async () => {
      mockGraphDegree.computeDegree.mockResolvedValue(null);
      const target: VisibilityTargetData = {
        ownerId: 'owner-person',
        visibilityScope: VisibilityScope.FAMILY,
        visibleMaxDegree: 2,
      };
      await expect(guard.evaluate(target, 'requester')).resolves.toBe(false);
    });

    it('FAMILY: falls back to the configured default degree when unset', async () => {
      mockGraphDegree.computeDegree.mockResolvedValue(5);
      const target: VisibilityTargetData = {
        ownerId: 'owner-person',
        visibilityScope: VisibilityScope.FAMILY,
        visibleMaxDegree: null,
      };
      await expect(guard.evaluate(target, 'requester')).resolves.toBe(true);
      expect(mockConfig.get).toHaveBeenCalledWith(
        'authorization.familyMaxDegree',
        5,
      );
      expect(mockGraphDegree.computeDegree).toHaveBeenCalledWith(
        'requester',
        'owner-person',
        5,
      );
    });

    it('FAMILY: denies when the requester has no personId', async () => {
      const target: VisibilityTargetData = {
        ownerId: 'owner-person',
        visibilityScope: VisibilityScope.FAMILY,
        visibleMaxDegree: 3,
      };
      await expect(guard.evaluate(target, null)).resolves.toBe(false);
      expect(mockGraphDegree.computeDegree).not.toHaveBeenCalled();
    });
  });

  describe('canActivate', () => {
    it('is a no-op (allows) when no @VisibilityTarget metadata is present', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const ctx = buildContext({ user: { id: 'acc', personId: 'p' } });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it('throws Unauthorized when there is no authenticated user', async () => {
      const extractor: VisibilityTargetExtractor = () => ({
        ownerId: 'p',
        visibilityScope: VisibilityScope.PUBLIC,
        visibleMaxDegree: null,
      });
      mockReflector.getAllAndOverride.mockReturnValue(extractor);
      const ctx = buildContext({});
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('allows a PUBLIC target for an authenticated user', async () => {
      const extractor: VisibilityTargetExtractor = () => ({
        ownerId: 'owner',
        visibilityScope: VisibilityScope.PUBLIC,
        visibleMaxDegree: null,
      });
      mockReflector.getAllAndOverride.mockReturnValue(extractor);
      const ctx = buildContext({ user: { id: 'acc', personId: 'p' } });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it('throws Forbidden for a PRIVATE_SELF target accessed by a non-owner', async () => {
      const extractor: VisibilityTargetExtractor = () => ({
        ownerId: 'owner-person',
        visibilityScope: VisibilityScope.PRIVATE_SELF,
        visibleMaxDegree: null,
      });
      mockReflector.getAllAndOverride.mockReturnValue(extractor);
      const ctx = buildContext({ user: { id: 'acc', personId: 'intruder' } });
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('throws Forbidden when the target cannot be resolved', async () => {
      const extractor: VisibilityTargetExtractor = () => null;
      mockReflector.getAllAndOverride.mockReturnValue(extractor);
      const ctx = buildContext({ user: { id: 'acc', personId: 'p' } });
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });
});
