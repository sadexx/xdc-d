import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory, Reflector } from "@nestjs/core";
import { IoAdapter } from "@nestjs/platform-socket.io";
import cookieParser from "cookie-parser";
import * as express from "express";
import session from "express-session";
import { join } from "path";
import { AppModule } from "src/app.module";
import { CustomSerializerInterceptor } from "src/common/interceptors";
import { API_PREFIX, ENVIRONMENT } from "src/common/constants";
import { EEnvironment } from "src/common/enums";
import { setupGracefulShutdown } from "src/common/lifecycle";
import { SingleLokiLogger } from "src/common/logger";

export let app: INestApplication;

async function bootstrap(): Promise<void> {
  app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const allowedOrigins = configService.getOrThrow<string>("FRONTEND_URIS_CORS").split(",");
  const isProduction = ENVIRONMENT !== EEnvironment.LOCAL;

  app.enableCors({
    credentials: true,
    origin: allowedOrigins,
    methods: ["HEAD", "OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Authorization", "Origin", "X-Requested-With", "Content-Type", "Accept"],
    exposedHeaders: ["ETag"],
  });
  app.use(cookieParser());
  app.use(
    session({
      secret: configService.getOrThrow("AUTH_SESSION_SECRET"),
      resave: false,
      saveUninitialized: false,
      cookie: { secure: true, httpOnly: true },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new CustomSerializerInterceptor(app.get(Reflector)));
  app.setGlobalPrefix(API_PREFIX);
  app.use(express.static(join(__dirname, "modules", "deep-link", "common")));

  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(configService.getOrThrow("APP_PORT"));

  SingleLokiLogger.log(
    `You can access server on ${configService.getOrThrow("APP_URL")}:${configService.getOrThrow("APP_PORT")}/${API_PREFIX}`,
  );

  if (isProduction) {
    setupGracefulShutdown(app);
  }
}

void bootstrap();
