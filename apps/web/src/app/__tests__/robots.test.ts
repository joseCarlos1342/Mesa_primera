import robots from '../robots';

describe('robots metadata', () => {
  it('does not expose internal app paths to generic crawlers', () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
    const genericCrawlerRule = rules.find((rule) => rule.userAgent === '*');

    expect(genericCrawlerRule).toEqual({
      userAgent: '*',
      allow: '/',
    });
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