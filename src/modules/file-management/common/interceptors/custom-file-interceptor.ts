import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { FileInterceptor, MulterModuleOptions } from "@nestjs/platform-express";
import { CustomStorageService } from "src/modules/file-management/common/storages";

@Injectable()
export class CustomFileInterceptor implements NestInterceptor {
  constructor(
    @Inject(CustomStorageService)
    private readonly customStorageService: CustomStorageService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const multerOptions: MulterModuleOptions = {
      storage: this.customStorageService,
    };

    const fileInterceptor = FileInterceptor("file", multerOptions);
    const fileInterceptorInstance = new fileInterceptor();

    await fileInterceptorInstance.intercept(context, next);

    return next.handle();
  }
}
