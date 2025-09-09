export const generateCaseForEnumOrder = (alias: string, enumOrder: Record<string, number>): string => {
  const cases = Object.entries(enumOrder)
    .map(([key, index]) => `WHEN '${key}' THEN ${index}`)
    .join(" ");

  return `CASE ${alias} ${cases} END`;
};
