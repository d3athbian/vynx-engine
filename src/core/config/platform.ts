export const DEFAULT_QUOTA_MB = 100;

export const MIN_TIZEN_VERSION = 5.5;
export const MIN_WEBOS_VERSION = 6;

export const UA_REGEX = {
  TIZEN: /SMART-?TV.*Tizen/i,
  WEB_OS: /Web0S|WebOS/i,
  MOBILE: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i,
  SMART_TV: /SMART-?TV|Tizen|Web0S|WebOS/i,
} as const;

export type UARegexKey = keyof typeof UA_REGEX;
