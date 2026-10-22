// Exercise production HTML without sending synthetic visits to the real counter.
export async function stubMetrika(context) {
  await context.route(/^https:\/\/mc\.yandex\.ru\/(?:metrika\/tag\.js\?id=113730251|watch\/113730251)$/, route => {
    if (route.request().resourceType() === 'script') {
      return route.fulfill({contentType: 'application/javascript', body: ''});
    }
    return route.fulfill({contentType: 'image/gif',
      body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')});
  });
}
