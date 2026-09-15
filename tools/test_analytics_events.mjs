import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const php = fs.readFileSync(new URL('../wordpress/ntsl-site/ntsl-site.php', import.meta.url), 'utf8');
const match = php.match(/<script id="ntsl-analytics-events">([\s\S]*?)<\/script>/);
assert.ok(match, '분석 이벤트 스크립트를 찾을 수 없습니다.');

let clickHandler;
const events = [];

class FakeElement {
  constructor({ href, text = '', ariaLabel = '', platform = false, insideArticle = false }) {
    this.href = href;
    this.textContent = text;
    this.ariaLabel = ariaLabel;
    this.platform = platform;
    this.insideArticle = insideArticle;
  }

  closest(selector) {
    if (selector === 'a[href]') return this;
    if (selector === '.entry-content, .post-content, article') return this.insideArticle ? this : null;
    return null;
  }

  matches(selector) {
    return selector === '.platform-link' && this.platform;
  }

  getAttribute(name) {
    if (name === 'href') return this.href;
    if (name === 'aria-label') return this.ariaLabel;
    return '';
  }
}

const context = {
  Element: FakeElement,
  URL,
  document: {
    addEventListener(type, handler) {
      if (type === 'click') clickHandler = handler;
    }
  },
  window: {
    location: new URL('https://ninetosixlab.com/current-post/'),
    gtag(_kind, name, params) {
      events.push({ name, params });
    }
  }
};

vm.runInNewContext(match[1], context);
assert.equal(typeof clickHandler, 'function');

clickHandler({ target: new FakeElement({
  href: 'intoss://daily-free-sudoku',
  text: '토스에서 열기',
  platform: true
}) });
let recorded = events.shift();
assert.equal(recorded.name, 'app_open_click');
assert.equal(recorded.params.app_destination, 'toss');
assert.equal(recorded.params.link_text, '토스에서 열기');

clickHandler({ target: new FakeElement({
  href: 'https://ninetosixlab.com/related-post/?utm_source=test',
  text: '관련 글 읽기',
  insideArticle: true
}) });
recorded = events.shift();
assert.equal(recorded.name, 'related_content_click');
assert.equal(recorded.params.source_path, '/current-post/');
assert.equal(recorded.params.destination_path, '/related-post/');
assert.equal(recorded.params.link_text, '관련 글 읽기');

clickHandler({ target: new FakeElement({
  href: 'https://developers.google.com/search/',
  text: '공식 문서',
  insideArticle: true
}) });
assert.equal(events.length, 0, '외부 참고 링크를 관련 글 클릭으로 기록하면 안 됩니다.');

console.log('분석 이벤트 테스트 통과');
