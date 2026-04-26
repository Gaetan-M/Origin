import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const port = configService.get<number>('port', 3000);
  const prefix = configService.get<string>('apiPrefix', 'api/v1');
  const isProd = configService.get<string>('NODE_ENV') === 'production';

  app.setGlobalPrefix(prefix);

  // Trust proxy: only honour X-Forwarded-* headers when running behind a
  // proxy we control. Default 0 (no trust) so a local user cannot forge
  // their IP and bypass per-IP rate limits.
  const trustProxy = configService.get('trustProxy');
  app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);

  app.use(
    helmet({
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
      crossOriginResourcePolicy: { policy: 'same-site' },
      // Default CSP shipped by helmet is fine for a JSON-only API.
    }),
  );
  app.use(compression());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger: only mount when explicitly enabled. Production should keep this
  // off — the schema otherwise hands attackers a complete API inventory.
  const swaggerEnabled = configService.get<boolean>('swaggerEnabled', false);
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Origin API')
      .setDescription('API de la plateforme genealogique Origin')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${prefix}/docs`, app, document);
  }

  // CORS: explicit origin (validated by Joi) — never wildcard with credentials.
  const corsOrigin = configService.get<string>('corsOrigin', 'http://localhost:3001');
  app.enableCors({
    origin: corsOrigin.split(',').map((s) => s.trim()).filter(Boolean),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`Application running on port ${port}`);
  if (swaggerEnabled) logger.log(`Swagger available at /${prefix}/docs`);
}

void bootstrap();
