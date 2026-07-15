export function isInternalRequest(headerSecret: string | string[] | undefined, configuredSecret: string | undefined): boolean {
  return typeof headerSecret === 'string' && Boolean(configuredSecret) && headerSecret === configuredSecret;
}
