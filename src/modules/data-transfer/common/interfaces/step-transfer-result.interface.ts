import {
  TDataTransferFromExistingRolesToNewRoleUserRole,
  TTransferEntities,
} from "src/modules/data-transfer/common/types";

export interface IStepTransferResult {
  transferredEntity: TTransferEntities;
  existingRoleWithStep: TDataTransferFromExistingRolesToNewRoleUserRole;
}

export interface IStepTransferResultWithOptionalTransferData {
  transferredEntity?: TTransferEntities;
  existingRoleWithStep: TDataTransferFromExistingRolesToNewRoleUserRole;
}
