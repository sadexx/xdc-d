import { CanActivate, ExecutionContext, Injectable, InternalServerErrorException } from "@nestjs/common";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { Request } from "express";
import { RedisService } from "src/modules/redis/services";
import { IGetPermissionsOutput } from "src/modules/permissions/common/outputs";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const user: ITokenUserData = request.user;

    const methodsForRole = await this.redisService.getJson<IGetPermissionsOutput>(user.role);

    if (!methodsForRole) {
      throw new InternalServerErrorException("Permissions is not loaded");
    }

    const currentMethod = methodsForRole.methods.find(
      (method) => method.methodType === request.method.toUpperCase() && method.path === request.route.path,
    );

    if (!currentMethod) {
      throw new InternalServerErrorException("Method is not seeded!");
    }

    return currentMethod.isAllowed;
  }
}
