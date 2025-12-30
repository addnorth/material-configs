/**
 * Parameter merging logic (format-aware)
 * Handles deep merging of JSON objects with format-specific strategies
 */

export type ArrayMergeStrategy = "replace" | "merge" | "unique";

export interface MergeOptions {
  arrayStrategy?: ArrayMergeStrategy;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Deep merge two objects
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>,
  options: MergeOptions = {}
): T {
  const { arrayStrategy = "replace" } = options;
  const result = { ...target };

  for (const key in source) {
    if (source[key] === null || source[key] === undefined) {
      continue;
    }

    if (Array.isArray(source[key])) {
      if (arrayStrategy === "replace") {
        (result as any)[key] = [...(source[key] as any[])];
      } else if (arrayStrategy === "merge") {
        (result as any)[key] = [
          ...((result[key] as any[]) || []),
          ...(source[key] as any[]),
        ];
      } else if (arrayStrategy === "unique") {
        (result as any)[key] = [
          ...new Set([
            ...((result[key] as any[]) || []),
            ...(source[key] as any[]),
          ]),
        ];
      }
    } else if (
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      source[key] !== null &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key]) &&
      result[key] !== null
    ) {
      (result as any)[key] = deepMerge(
        result[key] as Record<string, any>,
        source[key] as Record<string, any>,
        options
      );
    } else {
      (result as any)[key] = source[key];
    }
  }

  return result;
}

/**
 * Merge multiple objects together
 */
export function mergeAll<T extends Record<string, any>>(
  ...objects: (T | null | undefined)[]
): T {
  let result = {} as T;
  for (const obj of objects) {
    if (obj) {
      result = deepMerge(result, obj);
    }
  }
  return result;
}

/**
 * Validate required fields in an object
 */
export function validateRequiredFields(
  obj: Record<string, any>,
  requiredFields: string[]
): ValidationResult {
  const errors: string[] = [];

  for (const field of requiredFields) {
    const value = getNestedValue(obj, field);
    if (value === undefined || value === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path
    .split(".")
    .reduce((current: any, key: string) => current?.[key], obj);
}
