#!/usr/bin/env python3
"""
나인투식스랩 사이트 플러그인(ntsl-site) 빌드.

깃 저장소(dev/ninetosix-site)의 정적 파일을 플러그인 안으로 복사하고
zip 으로 묶는다. 손으로 복사하다 빠뜨리는 걸 막으려고 만들었다.

  python build-plugin.py                 # 버전 그대로 빌드
  python build-plugin.py --bump          # 패치 버전 +1 하고 빌드
  python build-plugin.py --version 1.4.0 # 버전 지정

만들어지는 것: ./dist/ntsl-site.zip

**버전을 올려야 워드프레스가 「교체」 화면을 제대로 띄운다.** 같은 버전으로
올리면 교체는 되지만 헷갈리니 --bump 를 쓰는 게 낫다.
"""

import argparse
import os
import re
import shutil
import sys
import zipfile

# 윈도우 콘솔은 기본이 cp949 라 한글·기호에서 깨지거나 죽는다.
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass

HERE = os.path.dirname(os.path.abspath(__file__))

# 깃 저장소. 다른 데 있으면 --src 로 넘긴다.
DEFAULT_SRC = os.path.dirname(HERE)

# 플러그인 소스(이 패키지 안). php 와 blog.css 가 여기 있다.
PLUGIN_SRC = os.path.join(HERE, "ntsl-site")

# 정적 사이트에서 그대로 가져올 파일
COPY_FILES = [
    "index.html",
    "privacy.html",
    "style.css",
    "site.js",
    "app.js",
    "favicon.png",
    "apple-touch-icon.png",
]
COPY_DIRS = ["apps"]

# lab/ 은 17MB 라 번들하지 않는다. 플러그인이 깃허브 페이지를 가리킨다.
SKIP_NOTE = "lab/ 은 번들하지 않음. NTSL_LAB_BASE 가 깃허브 페이지를 가리킨다"


def referenced_images(src):
    """html·css 가 실제로 부르는 img/ 파일만 고른다. 안 쓰는 건 안 담는다."""
    files = ["index.html", "privacy.html", "style.css"]
    apps_dir = os.path.join(src, "apps")
    if os.path.isdir(apps_dir):
        files += ["apps/" + f for f in os.listdir(apps_dir) if f.endswith(".html")]

    refs = set()
    for rel in files:
        path = os.path.join(src, rel)
        if not os.path.exists(path):
            continue
        text = open(path, encoding="utf-8", errors="replace").read()
        for m in re.findall(r'(?:src|href)="([^"]+)"|url\((?:\'|")?([^)\'"]+)', text):
            p = m[0] or m[1]
            if not p or p.startswith(("http", "#", "data:", "mailto:")):
                continue
            p = p.split("?")[0].lstrip("./")
            while p.startswith("../"):
                p = p[3:]
            if p.startswith("img/"):
                refs.add(p)
    return sorted(refs)


def set_version(php_path, version):
    text = open(php_path, encoding="utf-8").read()
    text = re.sub(r"(\* Version: )[\d.]+", r"\g<1>" + version, text, count=1)
    text = re.sub(
        r"(define\( 'NTSL_SITE_VER', ')[\d.]+(' \);)",
        r"\g<1>" + version + r"\g<2>",
        text,
        count=1,
    )
    open(php_path, "w", encoding="utf-8", newline="\n").write(text)


def current_version(php_path):
    text = open(php_path, encoding="utf-8").read()
    m = re.search(r"\* Version: ([\d.]+)", text)
    return m.group(1) if m else "0.0.0"


def bump(version):
    parts = version.split(".")
    while len(parts) < 3:
        parts.append("0")
    parts[2] = str(int(parts[2]) + 1)
    return ".".join(parts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=DEFAULT_SRC, help="깃 저장소 경로")
    ap.add_argument("--version")
    ap.add_argument("--bump", action="store_true")
    args = ap.parse_args()

    src = os.path.abspath(os.path.expanduser(args.src))
    if not os.path.isdir(src):
        sys.exit("깃 저장소를 못 찾음: " + src)
    if not os.path.isdir(PLUGIN_SRC):
        sys.exit("플러그인 소스를 못 찾음: " + PLUGIN_SRC)

    php = os.path.join(PLUGIN_SRC, "ntsl-site.php")
    version = args.version or (bump(current_version(php)) if args.bump else current_version(php))
    set_version(php, version)

    build = os.path.join(HERE, "build", "ntsl-site")
    build_root = os.path.realpath(os.path.join(HERE, "build"))
    if os.path.dirname(build_root) != os.path.realpath(HERE):
        sys.exit("빌드 삭제 경로가 작업 폴더 밖입니다: " + build_root)
    if os.path.exists(build_root):
        shutil.rmtree(build_root)
    os.makedirs(os.path.join(build, "static"))

    # 1) 플러그인 코드
    for name in os.listdir(PLUGIN_SRC):
        if name == "static":
            continue
        s = os.path.join(PLUGIN_SRC, name)
        if os.path.isfile(s):
            shutil.copy(s, os.path.join(build, name))

    # 2) 정적 파일
    copied = 0
    for name in COPY_FILES:
        s = os.path.join(src, name)
        if os.path.exists(s):
            shutil.copy(s, os.path.join(build, "static", name))
            copied += 1
        else:
            print("  [없음] " + name)
    for d in COPY_DIRS:
        s = os.path.join(src, d)
        if os.path.isdir(s):
            shutil.copytree(s, os.path.join(build, "static", d))
            copied += len(os.listdir(s))

    # 3) 참조되는 이미지만
    imgs = referenced_images(src)
    total = 0
    for rel in imgs:
        s = os.path.join(src, rel)
        if not os.path.exists(s):
            print("  [없음] " + rel)
            continue
        d = os.path.join(build, "static", rel)
        os.makedirs(os.path.dirname(d), exist_ok=True)
        shutil.copy(s, d)
        total += os.path.getsize(s)

    # 4) zip
    dist = os.path.join(HERE, "dist")
    os.makedirs(dist, exist_ok=True)
    out = os.path.join(dist, "ntsl-site.zip")
    if os.path.exists(out):
        os.remove(out)

    n = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _dirs, files in os.walk(build):
            for f in files:
                p = os.path.join(root, f)
                arc = "ntsl-site/" + os.path.relpath(p, build).replace(os.sep, "/")
                z.write(p, arc)
                n += 1

    print("버전      : " + version)
    print("정적 파일 : %d개" % copied)
    print("이미지    : %d개 (%dKB)" % (len(imgs), total // 1024))
    print("zip       : %s (%d개 파일, %dKB)" % (out, n, os.path.getsize(out) // 1024))
    print("참고      : " + SKIP_NOTE)
    print()
    print("올리는 곳 : https://ninetosixlab.com/wp-admin/plugin-install.php?tab=upload")
    print("            업로드 → 「현재 플러그인을 업로드한 것으로 교체」")
    print("            → 설정 > WP Super Cache > 내용 > 캐시 삭제")


if __name__ == "__main__":
    main()
