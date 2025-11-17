export type ValuesOf<T> = T[keyof T];

export type KeysOf<T> = keyof T;

export type NonNullableProperty<T, K extends keyof T> = NonNullable<T[K]>;

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type NonNullableProperties<T, K extends keyof T> = Prettify<
  T & {
    [P in K]-?: NonNullable<T[P]>;
  }
>;

export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
