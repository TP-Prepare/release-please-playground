import { greet } from "@wely674378-team/core";

export const greetAll = (names: string[]): string[] => names.map(greet);
