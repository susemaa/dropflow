/**
 * Binary search that returns the position `x` should be in
 */
export function binarySearch(a: number[], x: number) {
  let l = 0, r = a.length - 1;

  while (true) {
    let i = Math.floor((l+r)/2);

    if (a[i] < x) {
      l = i + 1;
      if (l > r) return l;
    } else if (a[i] > x) {
      r = i - 1;
      if (r < l) return i;
    } else {
      return i;
    }
  }
}

/**
 * Binary search that returns the position `x` should be in, using the `end`
 * property of objects in the `a` array
 */
export function binarySearchEndProp(a: {end: number}[], x: number): number {
  let l = 0, r = a.length - 1;

  while (true) {
    let i = Math.floor((l+r)/2);

    if (a[i].end < x) {
      l = i + 1;
      if (l > r) return l;
    } else if (a[i].end > x) {
      r = i - 1;
      if (r < l) return i;
    } else {
      return i;
    }
  }
}

let _id = 0;
export function id(): string {
  return String(_id++);
}

export function loggableText(text: string): string {
  return text.replace(/\n/g, '⏎').replace(/\t/g, '␉');
}
