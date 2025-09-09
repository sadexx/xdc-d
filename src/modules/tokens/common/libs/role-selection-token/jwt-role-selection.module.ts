import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtRoleSelectionService } from "src/modules/tokens/common/libs/role-selection-token/jwt-role-selection.service";

@Module({
  imports: [JwtModule],
  providers: [JwtRoleSelectionService],
  exports: [JwtRoleSelectionService],
})
export class JwtRoleSelectionModule {}
