export interface IGetPermissionsModules {
  [key: string]: {
    isAllAllowed: boolean;
    isAllNotEditable: boolean;
  };
}
