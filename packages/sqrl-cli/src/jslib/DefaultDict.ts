export class DefaultDict<T> {
  [key: string]: T;
  constructor(constr: () => T) {
    return new Proxy(
      {},
      {
        get: (target, name) => {
          if (!target.hasOwnProperty(name)) {
            target[name] = constr();
          }
          return target[name];
        }
      }
    );
  }
}
