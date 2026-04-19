import robots from '../robots';

describe('robots metadata', () => {
  it('blocks protected app paths and allows public routes for generic crawlers', () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
    const genericCrawlerRule = rules.find((rule) => rule.userAgent === '*');

    expect(genericCrawlerRule).toBeDefined();
    expect(genericCrawlerRule!.allow).toBe('/');
    expect(genericCrawlerRule!.disallow).toEqual(
      expect.arrayContaining([
        '/dashboard',
        '/replays',
        '/admin',
        '/api/',
        '/wallet',
      ]),
    );
  });

  it('keeps AI training crawlers blocked and preserves the sitemap', () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];

    expect(rules).toEqual(
      expect.arrayContaining([
        { userAgent: 'GPTBot', disallow: '/' },
        { userAgent: 'ClaudeBot', disallow: '/' },
        { userAgent: 'Google-Extended', disallow: '/' },
      ]),
    );
    expect(config.sitemap).toBe('https://primerariveradalos4ases.com/sitemap.xml');
  });
});