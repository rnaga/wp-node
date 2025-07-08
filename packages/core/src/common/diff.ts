import { diff } from "deep-object-diff";

export const diffObject = (a: any, b: any) => {
  const result = diff(a, b);
  if (typeof result === "object") {
    return Object.assign({}, result);
  }
  return {};
};

export const diffStringArray = (
  a: string | string[] = [],
  b: string | string[] = []
): string[] => {
  // Ensure both inputs are arrays
  const arrayA = Array.isArray(a) ? a : [a];
  const arrayB = Array.isArray(b) ? b : [b];

  // Find elements in A not in B and elements in B not in A
  const diffFromAtoB = arrayA.filter((item) => !arrayB.includes(item));
  const diffFromBtoA = arrayB.filter((item) => !arrayA.includes(item));

  // Combine and return the unique results
  return Array.from(new Set([...diffFromAtoB, ...diffFromBtoA]));
};
