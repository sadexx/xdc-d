import { Method } from "src/modules/permissions/entities";
import { IGetPermissionsModules } from "src/modules/permissions/common/interfaces";

export interface IGetPermissionsOutput {
  methods: Method[];
  modules: IGetPermissionsModules;
}
