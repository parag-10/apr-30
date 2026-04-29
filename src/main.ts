import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { RolesGuard } from './shared/guards/roles.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: 'http://localhost:4200', // Angular dev server
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global guards
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new RolesGuard(reflector));

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('HRFlow API')
    .setDescription('Employee & Leave Management System — Training Project')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env['PORT'] ?? 3000);
  console.log(
    `HRFlow API running on: http://localhost:${process.env['PORT'] ?? 3000}/api/v1`,
  );
  console.log(
    `Swagger docs: http://localhost:${process.env['PORT'] ?? 3000}/api/docs`,
  );
}

bootstrap();
