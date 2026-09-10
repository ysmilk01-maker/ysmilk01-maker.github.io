# -*- coding: utf-8 -*-
"""공통 CSS·JS의 내용 해시를 HTML에 붙인다. --check는 갱신 필요 여부만 확인한다."""
import argparse
import hashlib
import html
from pathlib import Path
import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

SITE = Path(__file__).resolve().parent.parent
ASSETS = ('style.css', 'site.js', 'app.js')
ASSET_REF = re.compile(
    r'''(?P<attr>\b(?:href|src)\s*=\s*)(?P<quote>["'])'''
    r'''(?P<url>(?:\./|\.\./|/)?(?:style\.css|site\.js|app\.js)(?:[?#][^"']*)?)'''
    r'''(?P=quote)'''
)


def asset_versions(site):
    # Windows 체크아웃의 CRLF와 GitHub Pages의 LF가 같은 버전이 되게 한다.
    return {
        name: hashlib.sha256((site / name).read_bytes().replace(b'\r\n', b'\n')).hexdigest()[:12]
        for name in ASSETS
    }


def version_references(source, versions):
    def replace(match):
        url = urlsplit(html.unescape(match['url']))
        name = url.path.rsplit('/', 1)[-1]
        # 기존 v만 바꾼다. 다른 쿼리와 프래그먼트는 그대로 유지한다.
        query = [(key, value) for key, value in parse_qsl(url.query, keep_blank_values=True) if key != 'v']
        query.append(('v', versions[name]))
        value = urlunsplit(('', '', url.path, urlencode(query), url.fragment))
        return match['attr'] + match['quote'] + html.escape(value, quote=True) + match['quote']

    return ASSET_REF.sub(replace, source)


def update_asset_versions(site=SITE, check=False):
    site = Path(site)
    versions = asset_versions(site)
    # 홈페이지가 관리하는 페이지만 고친다. 별도 작업 흐름의 lab/은 훑지 않는다.
    pages = [site / 'index.html', site / 'privacy.html', *sorted((site / 'apps').glob('*.html'))]
    changes = []
    for path in pages:
        # read_text/write_text의 줄바꿈 변환으로 개인정보 페이지 전체가 바뀌지 않게 한다.
        before = path.read_bytes().decode('utf-8')
        after = version_references(before, versions)
        if after != before:
            changes.append((path, after))

    for path, after in changes:
        if not check:
            path.write_bytes(after.encode('utf-8'))
        print(('갱신 필요: ' if check else '갱신: ') + path.relative_to(site).as_posix())
    if not changes:
        print('공통 CSS·JS 버전이 모두 최신입니다.')
    return len(changes)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='파일을 고치지 않고, 오래된 참조가 있으면 종료 코드 1')
    args = parser.parse_args()
    changed = update_asset_versions(check=args.check)
    return 1 if args.check and changed else 0


if __name__ == '__main__':
    raise SystemExit(main())
