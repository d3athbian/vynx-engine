export const DEFAULT_QUOTA_MB = 100;

export const UA_REGEX = {
  TIZEN: /Tizen/i,
  WEB_OS: /WebOS|LG Browser/i,
  SMART_TV: /Smart-TV|Tizen|WebOS/i,
  MOBILE: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i,
} as const;
