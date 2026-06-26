import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { PersonsModule } from './modules/persons/persons.module';
import { RelationshipsModule } from './modules/relationships/relationships.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { IdentityDocumentsModule } from './modules/identity-documents/identity-documents.module';
import { MediaModule } from './modules/media/media.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MatchingModule } from './modules/matching/matching.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { KinshipProbeModule } from './modules/kinship-probe/kinship-probe.module';
import { FamilyCodesModule } from './modules/family-codes/family-codes.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { EventingModule } from './eventing/eventing.module';
import { LifeEventsModule } from './modules/life-events/life-events.module';
import { FamilyFeedModule } from './modules/family-feed/family-feed.module';
import { CulturalContentModule } from './modules/cultural-content/cultural-content.module';
import { PublicFeedModule } from './modules/public-feed/public-feed.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { KinshipCheckModule } from './modules/kinship-check/kinship-check.module';
import { SearchModule } from './search/search.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttle.ttl', 60000),
          limit: config.get<number>('throttle.limit', 100),
        },
      ],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    AccountsModule,
    PersonsModule,
    RelationshipsModule,
    ClaimsModule,
    IdentityDocumentsModule,
    MediaModule,
    NotificationsModule,
    MatchingModule,
    InvitationsModule,
    MessagingModule,
    KinshipProbeModule,
    FamilyCodesModule,
    AdminModule,
    AuthorizationModule,
    EventingModule,
    LifeEventsModule,
    FamilyFeedModule,
    CulturalContentModule,
    PublicFeedModule,
    ModerationModule,
    KinshipCheckModule,
    SearchModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Global correlation-id + structured access logging (additive).
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
