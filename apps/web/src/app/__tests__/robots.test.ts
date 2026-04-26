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

  it('allows only public marketing and legal routes for GEO crawlers and preserves the sitemap', () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
    const geoCrawlerRule = rules.find((rule) => rule.userAgent === 'GPTBot');

    expect(geoCrawlerRule).toBeDefined();
    expect(geoCrawlerRule!.disallow).toBe('/');
    expect(geoCrawlerRule!.allow).toEqual(
      expect.arrayContaining([
        '/',
        '/rules',
        '/privacy',
        '/terms',
        '/security-policy',
      ]),
    );

    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userAgent: 'ClaudeBot', disallow: '/' }),
        expect.objectContaining({ userAgent: 'Google-Extended', disallow: '/' }),
        expect.objectContaining({ userAgent: 'ChatGPT-User', disallow: '/' }),
        expect.objectContaining({ userAgent: 'PerplexityBot', disallow: '/' }),
      ]),
    );
    expect(config.sitemap).toBe('https://primerariveradalos4ases.com/sitemap.xml');
  });
});