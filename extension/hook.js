// Own an instance method only while enabled. A later extension may wrap ours;
// a disabled wrapper in such a chain becomes an inert passthrough.
export class OsdHook {
  constructor(manager, consume, onError = () => {}) {
    this.manager = manager;
    this.consume = consume;
    this.onError = onError;
    this.slots = [];
    this.active = false;
  }
  enable() {
    if (this.active) return;
    for (const name of ["show", "showAll"])
      if (typeof this.manager[name] !== "function")
        throw new Error(`Unsupported OSD API: ${name}`);
    this.active = true;
    for (const name of ["show", "showAll"]) {
      const original = this.manager[name],
        descriptor = Object.getOwnPropertyDescriptor(this.manager, name),
        hook = this;
      const wrapper = function (...args) {
        if (hook.active) {
          try {
            if (hook.consume(name, args)) return;
          } catch (e) {
            hook.onError(e);
          }
        }
        return original.apply(this, args);
      };
      this.slots.push({ name, original, wrapper, descriptor });
      this.manager[name] = wrapper;
    }
  }
  disable() {
    this.active = false;
    for (const { name, wrapper, descriptor } of this.slots)
      if (this.manager[name] === wrapper) {
        if (descriptor) Object.defineProperty(this.manager, name, descriptor);
        else delete this.manager[name];
      }
    this.slots = [];
  }
}
export function volumeEvent(method, args, preferred = 0) {
  const [icon, label] = args;
  const names = icon?.get_names?.() ?? [icon?.to_string?.() ?? ""];
  if (
    !names.some((n) =>
      /^audio-volume-(muted|low|medium|high|overamplified)(-symbolic)?$/.test(
        n,
      ),
    )
  )
    return null;
  const levels =
    method === "show"
      ? args[2]
      : { [preferred]: { level: args[2], maxLevel: args[3] } };
  if (!levels || typeof levels !== "object") return null;
  const index = levels[preferred]
    ? preferred
    : Object.keys(levels).find((k) => levels[k]);
  const value = levels[index];
  if (!value || !Number.isFinite(value.level)) return null;
  return {
    monitor: Number(index),
    level: value.level,
    maxLevel: value.maxLevel > 0 ? value.maxLevel : 1,
    muted: names.some((n) => n.includes("muted")),
    label,
  };
}
