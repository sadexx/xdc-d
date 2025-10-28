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
import { API_PREFIX, ENVIRONMENT, IS_LOCAL } from "src/common/constants";
import { setupGracefulShutdown } from "src/common/lifecycle";
import { SingleLokiLogger } from "src/common/logger";
import { ExpressAdapter } from "@nestjs/platform-express";

export let httpServer: INestApplication<ExpressAdapter>;

async function bootstrap(): Promise<void> {
  httpServer = await NestFactory.create(AppModule);
  httpServer.enableShutdownHooks();

  const configService = httpServer.get(ConfigService);
  const allowedOrigins = configService.getOrThrow<string>("FRONTEND_URIS_CORS").split(",");

  httpServer.enableCors({
    credentials: true,
    origin: allowedOrigins,
    methods: ["HEAD", "OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Authorization", "Origin", "X-Requested-With", "Content-Type", "Accept"],
    exposedHeaders: ["ETag"],
  });
  httpServer.use(cookieParser());
  httpServer.use(
    session({
      secret: configService.getOrThrow("AUTH_SESSION_SECRET"),
      resave: false,
      saveUninitialized: false,
      cookie: { secure: true, httpOnly: true },
    }),
  );

  httpServer.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  httpServer.useGlobalInterceptors(new CustomSerializerInterceptor(httpServer.get(Reflector)));
  httpServer.setGlobalPrefix(API_PREFIX);
  httpServer.use(express.static(join(__dirname, "modules", "deep-link", "common")));

  httpServer.useWebSocketAdapter(new IoAdapter(httpServer));

  await httpServer.listen(configService.getOrThrow("APP_PORT"));

  SingleLokiLogger.log(
    `You can access server on ${configService.getOrThrow("APP_URL")}:${configService.getOrThrow("APP_PORT")}/${API_PREFIX}` +
      `\nServer is running in ${ENVIRONMENT} mode.`,
  );

  if (!IS_LOCAL) {
    setupGracefulShutdown(httpServer);
  }
}

void bootstrap();
