export function getNavigator(): Navigator | null {
  if (typeof navigator === "undefined") return null;
  return navigator;
}

export function getWindow(): Window | null {
  if (typeof window === "undefined") return null;
  return window;
}

export function getUserAgent(): string {
  const nav = getNavigator();
  return nav?.userAgent ?? "";
}

export function getNavigatorProperty<K extends string>(prop: K): unknown {
  const nav = getNavigator();
  if (!nav) return undefined;
  return (nav as unknown as Record<string, unknown>)[prop];
}

export function getWindowProperty<K extends string>(prop: K): unknown {
  const win = getWindow();
  if (!win) return undefined;
  return (win as unknown as Record<string, unknown>)[prop];
}
