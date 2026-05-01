export const sleep = (time: number) => new Promise((r) => setTimeout(r, time));

export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
