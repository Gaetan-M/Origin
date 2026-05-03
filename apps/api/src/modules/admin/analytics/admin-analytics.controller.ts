import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminAnalyticsService } from './admin-analytics.service';
import { GrowthQueryDto } from './dto/growth-query.dto';
import { RecentActivityQueryDto } from './dto/recent-activity-query.dto';

/**
 * Read-only analytics endpoints for the admin dashboard.
 *
 * Every route is gated by JwtAuthGuard + RolesGuard at MODERATOR floor —
 * SUPER_ADMIN and ADMIN are admitted by the rank semantics in RolesGuard.
 */
@ApiTags('Admin / Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.MODERATOR)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analytics: AdminAnalyticsService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Aggregate KPI tiles for the moderator dashboard' })
  getKpis() {
    return this.analytics.getKpis();
  }

  @Get('growth')
  @ApiOperation({ summary: 'Daily growth time-series for accounts/persons/contributions' })
  getGrowth(@Query() query: GrowthQueryDto) {
    return this.analytics.getGrowth(query.days);
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Most recent contribution rows with masked actor info' })
  getRecentActivity(@Query() query: RecentActivityQueryDto) {
    return this.analytics.getRecentActivity(query.limit);
  }

  @Get('top-contributors')
  @ApiOperation({ summary: 'Top accounts by contribution count over the last N days' })
  getTopContributors(@Query('limit') limit?: string, @Query('days') days?: string) {
    // Parse here rather than via a DTO so the controller stays trivially
    // callable from internal tooling (e.g. scripts, cron) without the
    // class-validator pipeline.
    const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : undefined;
    const parsedDays = typeof days === 'string' ? parseInt(days, 10) : undefined;
    return this.analytics.getTopContributors(
      Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      Number.isFinite(parsedDays) ? parsedDays : undefined,
    );
  }

  @Get('geo-distribution')
  @ApiOperation({ summary: 'Person counts by birth country, village and region' })
  getGeoDistribution() {
    return this.analytics.getGeoDistribution();
  }

  @Get('health')
  @ApiOperation({ summary: 'Lightweight backend status pill for the dashboard header' })
  getHealth() {
    return this.analytics.getHealth();
  }
}
