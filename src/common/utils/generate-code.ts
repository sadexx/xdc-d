const MIN_CODE_VALUE: number = 100000;
const MAX_CODE_OFFSET: number = 900000;
export const generateCode = (): string => Math.floor(MIN_CODE_VALUE + Math.random() * MAX_CODE_OFFSET).toString();
