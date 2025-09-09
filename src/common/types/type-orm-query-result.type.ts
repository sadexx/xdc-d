/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */

// ============================================================================
// STEP 1: BASIC TYPE UTILITIES
// ============================================================================

/**
 * Remove readonly modifiers while preserving built-in types like Date, RegExp, etc.
 */
type Mutable<T> = T extends Date | RegExp | Function
  ? T
  : T extends readonly (infer U)[]
    ? Mutable<U>[]
    : T extends object
      ? { -readonly [K in keyof T]: Mutable<T[K]> }
      : T;

/**
 * Extract only property names (exclude methods) from an entity
 */
type PropertyNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? never : K;
}[keyof T];

/**
 * Get only the properties from an entity (no methods)
 */
type PropertiesOnly<T> = Pick<T, PropertyNames<T>>;

// ============================================================================
// STEP 2: ENHANCED PRIMITIVE TYPE DETECTION
// ============================================================================

/**
 * More precise primitive detection to avoid issues with complex entities
 */
type IsPrimitive<T> = T extends string | number | boolean | Date | Buffer | null | undefined
  ? true
  : T extends (string | number | boolean | Date | Buffer | null | undefined)[]
    ? true
    : false;

/**
 * Safe primitive field extraction that handles complex entities
 */
type SafePrimitiveFieldNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? never
    : T[K] extends string | number | boolean | Date | Buffer
      ? K
      : T[K] extends string | number | boolean | Date | Buffer | null
        ? K
        : T[K] extends string | number | boolean | Date | Buffer | undefined
          ? K
          : T[K] extends string | number | boolean | Date | Buffer | null | undefined
            ? K
            : T[K] extends (string | number | boolean | Date | Buffer)[]
              ? K
              : T[K] extends (string | number | boolean | Date | Buffer | null)[]
                ? K
                : T[K] extends (string | number | boolean | Date | Buffer | undefined)[]
                  ? K
                  : T[K] extends (string | number | boolean | Date | Buffer | null | undefined)[]
                    ? K
                    : never;
}[keyof T];

/**
 * Safe primitive extraction
 */
type SafePrimitivesOnly<T> = Pick<T, SafePrimitiveFieldNames<T>>;

// ============================================================================
// STEP 3: NULLABILITY UTILITIES
// ============================================================================

/**
 * Check if a type can be null
 */
type CanBeNull<T> = null extends T ? true : false;

/**
 * Check if a type can be undefined
 */
type CanBeUndefined<T> = undefined extends T ? true : false;

/**
 * Check if a type is an array
 */
type IsArray<T> = NonNullable<T> extends any[] ? true : false;

/**
 * Get array item type
 */
type ArrayItemType<T> = NonNullable<T> extends (infer U)[] ? U : never;

/**
 * Reconstruct nullability for any type
 */
type ReconstructNullability<BaseType, OriginalType> =
  | BaseType
  | (CanBeNull<OriginalType> extends true ? null : never)
  | (CanBeUndefined<OriginalType> extends true ? undefined : never);

// ============================================================================
// STEP 4: RELATION PROCESSING
// ============================================================================

/**
 * Process a single object relation
 */
type ProcessSingleObjectRelation<T> = ReconstructNullability<SafePrimitivesOnly<NonNullable<T>>, T>;

/**
 * Process an array relation
 */
type ProcessArrayRelation<T> = ReconstructNullability<SafePrimitivesOnly<ArrayItemType<T>>[], T>;

/**
 * Main relation processor
 */
type ProcessRelation<T> = IsArray<T> extends true ? ProcessArrayRelation<T> : ProcessSingleObjectRelation<T>;

// ============================================================================
// STEP 5: SELECTION PROCESSING
// ============================================================================

/**
 * Process true selection (load all primitives)
 */
type ProcessTrueSelection<T> = IsPrimitive<T> extends true ? T : ProcessRelation<T>;

/**
 * Process nested selection
 */
type ProcessNestedSelection<EntityField, Selection> =
  IsArray<EntityField> extends true
    ? ReconstructNullability<ProcessEntitySelection<ArrayItemType<EntityField>, Selection>[], EntityField>
    : ReconstructNullability<ProcessEntitySelection<NonNullable<EntityField>, Selection>, EntityField>;

/**
 * Process field selection based on selection type
 */
type ProcessFieldSelection<Entity, Selection, K extends keyof Selection> = K extends keyof Entity
  ? Selection[K] extends true
    ? ProcessTrueSelection<Entity[K]>
    : Selection[K] extends object
      ? ProcessNestedSelection<Entity[K], Selection[K]>
      : Entity[K]
  : never;

/**
 * Process entity selection
 */
type ProcessEntitySelection<Entity, Selection> = {
  [K in keyof Selection as K extends keyof Entity ? K : never]: ProcessFieldSelection<Entity, Selection, K>;
};

// ============================================================================
// STEP 6: DEFAULT FIELD PROCESSING
// ============================================================================

/**
 * Get relation field names (non-primitive fields)
 */
type RelationFieldNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? never : IsPrimitive<T[K]> extends true ? never : K;
}[keyof T];

/**
 * Process default relations (not explicitly selected)
 */
type ProcessDefaultRelations<Entity, Selection> = {
  [K in RelationFieldNames<Entity> as K extends keyof Selection ? never : K]: K extends keyof Entity
    ? ProcessRelation<Entity[K]>
    : never;
};

/**
 * Check if selection has any direct field selections
 */
type HasDirectFields<Selection> = {
  [K in keyof Selection]: Selection[K] extends true ? K : never;
}[keyof Selection] extends never
  ? false
  : true;

// ============================================================================
// STEP 7: MAIN PROCESSOR
// ============================================================================

/**
 * Main selection processor
 */
type ProcessSelection<Entity, Selection> =
  HasDirectFields<Selection> extends false
    ? SafePrimitivesOnly<Entity> &
        ProcessEntitySelection<Entity, Selection> &
        ProcessDefaultRelations<Entity, Selection>
    : ProcessEntitySelection<Entity, Selection>;

// ============================================================================
// STEP 8: PUBLIC API
// ============================================================================

/**
 * Main utility type for TypeORM query result mapping
 *
 * @param Entity - The TypeORM entity class
 * @param Select - The select object from FindOptionsSelect
 *
 * Rules:
 * - Empty select {} → all primitive fields from main entity
 * - Primitive fields selected → only those fields
 * - Relations with true → all primitives from that relation
 * - Relations with nested select → apply rules recursively
 * - Preserves exact nullability from entity definitions
 * - Ignores methods completely
 */
export type QueryResultType<Entity, Selection> = Mutable<ProcessSelection<PropertiesOnly<Entity>, Selection>>;
