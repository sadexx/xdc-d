import { UNDEFINED_VALUE } from "src/common/constants";

export function formatRow<T>(data: T, mapping: Record<keyof T, string>): string {
  return (
    Object.keys(mapping)
      .map((key) => {
        const value = data[key as keyof T];
        let string: string;

        if (value === null || value === UNDEFINED_VALUE) {
          string = "N/A";
        } else if (value instanceof Date) {
          string = value.toLocaleString();
        } else {
          string = String(value);
        }

        return string.includes(",") || string.includes("\n") || string.includes(`"`)
          ? `"${string.replace(/"/g, '""')}"`
          : string;
      })
      .join(",") + "\n"
  );
}
