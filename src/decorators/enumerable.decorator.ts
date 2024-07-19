export function Enumerable(value: boolean) {
  return (target: any, key: string) => {
    Object.defineProperty(target, key, {
      get() {
        return undefined;
      },
      set(this: any, val: any) {
        Object.defineProperty(this, key, {
          value: val,
          writable: true,
          enumerable: value,
          configurable: true,
        });
      },
      enumerable: false,
    });
  };
}
