<?php
/**
 * Plugin Name: 나인투식스랩 사이트
 * Description: 깃 저장소(dev/ninetosix-site)의 정적 홈페이지를 워드프레스에서 그대로 서빙하고, 블로그와 일반 페이지에도 같은 네비게이션·푸터·색을 씌웁니다. 카페24 매니지드 워드프레스는 FTP·파일매니저가 없어 테마 파일을 올릴 수 없으므로 플러그인 방식을 씁니다.
 * Version: 1.3.15
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'NTSL_SITE_DIR', plugin_dir_path( __FILE__ ) );
define( 'NTSL_SITE_URL', plugin_dir_url( __FILE__ ) );
define( 'NTSL_SITE_VER', '1.3.15' );

// 2026-09-13 서비스 종료: 이전 버전의 지분공시 예약 작업이 있으면 해제한다.
add_action( 'admin_init', function () {
    if ( current_user_can( 'manage_options' ) && wp_next_scheduled( 'ntsl_d_sync' ) ) {
        wp_clear_scheduled_hook( 'ntsl_d_sync' );
    }
} );

/**
 * 홈페이지 GA4. 정적 페이지와 블로그가 모두 호출하는 wp_head에 한 번만 삽입한다.
 * 분석 태그는 이 플러그인에서만 관리한다. Site Kit/다른 삽입 도구에 중복 등록하지 않는다.
 * Google Analytics의 홈페이지 웹 스트림이며 앱 내부에는 삽입하지 않는다.
 */
add_action( 'wp_head', function () {
    if ( is_admin() || is_feed() || is_robots() || is_preview() ) {
        return;
    }
    if ( 'ninetosixlab.com' !== wp_parse_url( home_url(), PHP_URL_HOST ) ) {
        return;
    }
    ?>
<!-- 나인투식스랩 홈페이지 Google Analytics -->
<script async id="ntsl-google-tag" src="https://www.googletagmanager.com/gtag/js?id=G-622TW2X538"></script>
<script id="ntsl-analytics-config">
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-622TW2X538', {
  allow_google_signals: false,
  allow_ad_personalization_signals: false
});
</script>
<script id="ntsl-analytics-events">
(function () {
  'use strict';

  function labelOf(link) {
    return (link.getAttribute('aria-label') || link.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);
  }

  document.addEventListener('click', function (event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    var link = event.target.closest('a[href]');
    if (!link || typeof window.gtag !== 'function') {
      return;
    }

    var raw = link.getAttribute('href') || '';
    if (!raw || raw.charAt(0) === '#' || raw.indexOf('mailto:') === 0 || raw.indexOf('tel:') === 0) {
      return;
    }

    // 앱 실행·스토어 이동은 향상된 측정만으로 빠질 수 있어 별도 이벤트로 남긴다.
    if (link.matches('.platform-link') || raw.indexOf('intoss://') === 0) {
      var destination = 'other';
      if (raw.indexOf('intoss://') === 0) {
        destination = 'toss';
      } else {
        try {
          destination = new URL(link.href, window.location.href).hostname.replace(/^www\./, '');
        } catch (_error) {
          destination = 'other';
        }
      }
      window.gtag('event', 'app_open_click', {
        app_destination: destination,
        link_text: labelOf(link)
      });
      return;
    }

    // 글 본문 안에서 다른 글·페이지로 이동하는 흐름만 기록한다.
    if (!link.closest('.entry-content, .post-content, article')) {
      return;
    }

    var target;
    try {
      target = new URL(link.href, window.location.href);
    } catch (_error) {
      return;
    }
    if (target.origin !== window.location.origin || target.pathname === window.location.pathname) {
      return;
    }
    if (/\.(?:avif|gif|jpe?g|png|svg|webp|zip)$/i.test(target.pathname)) {
      return;
    }

    window.gtag('event', 'related_content_click', {
      source_path: window.location.pathname,
      destination_path: target.pathname,
      link_text: labelOf(link)
    });
  });
})();
</script>
    <?php
}, 1 );

/** 실제로 게임이 도는 곳. lab/ 은 17MB 라 번들하지 않고 깃허브 페이지를 가리킨다. */
define( 'NTSL_LAB_BASE', 'https://ysmilk01-maker.github.io/lab/' );

/** 앱 상세 페이지 슬러그. 정적 파일명과 같다. */
function ntsl_apps() {
	return array( 'ai', 'beatwave', 'coin', 'krx', 'saju', 'shooter', 'sudoku' );
}

/** 페이지 경로 => 정적 파일 */
function ntsl_page_map() {
	$map = array(
		''        => 'index.html',
		'privacy' => 'privacy.html',
	);
	foreach ( ntsl_apps() as $a ) {
		$map[ 'apps/' . $a ] = 'apps/' . $a . '.html';
	}
	return $map;
}

/** 지금 요청이 어떤 정적 문서에 해당하는지. 아니면 빈 문자열. */
function ntsl_static_source() {
	if ( is_admin() || ! is_page() ) {
		return '';
	}
	$id = get_queried_object_id();
	if ( ! $id ) {
		return '';
	}
	$path = trim( wp_make_link_relative( get_permalink( $id ) ), '/' );
	$map  = ntsl_page_map();

	return isset( $map[ $path ] ) ? $map[ $path ] : '';
}

/**
 * 정적 문서가 아닌 앞단 화면 — 블로그 목록, 글, 일반 페이지, 검색, 404.
 * 테마가 그리는 뼈대 위에 우리 껍데기를 씌운다.
 */
function ntsl_is_shell_context() {
	if ( is_admin() || is_feed() || is_robots() ) {
		return false;
	}
	if ( '' !== ntsl_static_source() ) {
		return false;
	}
	return ( is_home() || is_singular() || is_archive() || is_search() || is_404() );
}

/* ------------------------------------------------------------------ *
 * 정적 페이지 템플릿
 * ------------------------------------------------------------------ */

add_filter( 'theme_page_templates', function ( $templates ) {
	$templates['ntsl-static'] = '나인투식스랩 정적 페이지';
	return $templates;
} );

add_filter( 'template_include', function ( $template ) {
	if ( is_page() && 'ntsl-static' === get_page_template_slug( get_queried_object_id() ) ) {
		return NTSL_SITE_DIR . 'template-static.php';
	}
	return $template;
} );

/** /apps/ 는 목록이 따로 없다. 홈의 앱 구역으로 보낸다. */
add_action( 'template_redirect', function () {
	if ( is_page() && 'apps' === trim( wp_make_link_relative( get_permalink( get_queried_object_id() ) ), '/' ) ) {
		wp_safe_redirect( home_url( '/#apps' ), 302 );
		exit;
	}
} );

/* ------------------------------------------------------------------ *
 * 스타일시트
 * ------------------------------------------------------------------ */

add_action( 'wp_enqueue_scripts', function () {
	$static = ( '' !== ntsl_static_source() );
	$shell  = ntsl_is_shell_context();
	if ( ! $static && ! $shell ) {
		return;
	}

	wp_enqueue_style( 'ntsl-site', NTSL_SITE_URL . 'static/style.css', array(), NTSL_SITE_VER );

	// 테마 CSS 뒤에 와야 하므로 늦게 건다.
	if ( $shell ) {
		wp_enqueue_style( 'ntsl-shell', NTSL_SITE_URL . 'blog.css', array(), NTSL_SITE_VER );
	}
}, 50 );

/* ------------------------------------------------------------------ *
 * 껍데기 (네비게이션 · 푸터)
 * ------------------------------------------------------------------ */

/** 블로그(글 목록) 주소. 지정 안 했으면 빈 문자열. */
function ntsl_blog_url() {
	$id = (int) get_option( 'page_for_posts' );
	return $id ? get_permalink( $id ) : '';
}

/**
 * 원본 네비게이션에 없는 항목을 끼운다.
 * 개인정보 앞에 넣어 「앱 · 만드는 방식 · 소개 · 블로그 · 개인정보」 순으로 만든다.
 */
function ntsl_add_nav_links( $html ) {
	$items = '';

	$about = get_page_by_path( 'about' );
	if ( $about && 'publish' === $about->post_status ) {
		$items .= '<li><a href="' . esc_url( get_permalink( $about ) ) . '">소개</a></li>';
	}

	$blog = ntsl_blog_url();
	if ( $blog ) {
		$items .= '<li><a href="' . esc_url( $blog ) . '">블로그</a></li>';
	}

	if ( '' === $items ) {
		return $html;
	}

	if ( preg_match( '#<li><a href="[^"]*/privacy/"[^>]*>.*?</li>#is', $html, $m ) ) {
		return str_replace( $m[0], $items . $m[0], $html );
	}

	return preg_replace( '#(<nav class="nav">.*?<ul>)(.*?)(</ul>)#is', '$1$2' . $items . '$3', $html, 1 );
}

/**
 * index.html 에서 껍데기 한 조각을 떼어 온다.
 * 링크는 정적 페이지와 똑같이 치환한다.
 */
function ntsl_shell_part( $tag, $class ) {
	static $cache = array();
	$key = $tag . '.' . $class;
	if ( isset( $cache[ $key ] ) ) {
		return $cache[ $key ];
	}
	$cache[ $key ] = '';

	$file = NTSL_SITE_DIR . 'static/index.html';
	if ( ! file_exists( $file ) ) {
		return '';
	}
	$html = file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions

	$re = '#<' . $tag . '[^>]*class="' . preg_quote( $class, '#' ) . '"[^>]*>.*?</' . $tag . '>#is';
	if ( preg_match( $re, $html, $m ) ) {
		$part = ntsl_rewrite_links( $m[0], 'index.html' );
		// 홈에서 가져온 메뉴의 앵커는 글·목록 페이지에 없으므로 홈 주소로 연결한다.
		if ( 'nav' === $tag ) {
			$part = strtr( $part, array(
				'href="#top"'  => 'href="' . esc_url( home_url( '/' ) ) . '"',
				'href="#apps"' => 'href="' . esc_url( home_url( '/#apps' ) ) . '"',
				'href="#way"'  => 'href="' . esc_url( home_url( '/#way' ) ) . '"',
			) );
		} elseif ( 'footer' === $tag ) {
			// 일반 테마 페이지에서는 현재 페이지의 본문 시작점으로 돌아간다.
			$part = str_replace( 'href="#top"', 'href="#content"', $part );
		}
		$cache[ $key ] = ntsl_add_nav_links( $part );
	}

	return $cache[ $key ];
}

add_action( 'wp_body_open', function () {
	if ( ntsl_is_shell_context() ) {
		echo ntsl_shell_part( 'nav', 'nav' ); // phpcs:ignore WordPress.Security.EscapeOutput
	}
}, 5 );

add_action( 'wp_footer', function () {
	if ( ntsl_is_shell_context() ) {
		echo ntsl_shell_part( 'footer', 'foot' ); // phpcs:ignore WordPress.Security.EscapeOutput
	}
}, 5 );

/* ------------------------------------------------------------------ *
 * 정적 문서 렌더링
 * ------------------------------------------------------------------ */

/**
 * 정적 문서의 <body> 안쪽을 꺼내서 링크를 워드프레스 주소로 바꾼다.
 * 원본 파일은 손대지 않는다 — 깃 저장소가 계속 기준이다.
 */
function ntsl_render_static() {
	$src = ntsl_static_source();
	if ( '' === $src ) {
		return '';
	}

	$file = NTSL_SITE_DIR . 'static/' . $src;
	if ( ! file_exists( $file ) ) {
		return '';
	}

	$html = file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions
	if ( ! preg_match( '#<body[^>]*>(.*)</body>#is', $html, $m ) ) {
		return '';
	}

	return ntsl_add_nav_links( ntsl_rewrite_links( $m[1], $src ) );
}

/**
 * 상대 경로를 워드프레스 주소와 플러그인 자산 주소로 바꾼다.
 * strtr 은 긴 열쇠부터 맞추므로 "../index.html#apps" 가 "../index.html" 보다 먼저 걸린다.
 */
function ntsl_rewrite_links( $html, $src ) {
	$assets = NTSL_SITE_URL . 'static/';
	$home   = trailingslashit( home_url( '/' ) );
	$up     = ( 0 === strpos( $src, 'apps/' ) ) ? '../' : '';

	$map = array(
		'"' . $up . 'index.html#apps"' => '"' . $home . '#apps"',
		'"' . $up . 'index.html#way"'  => '"' . $home . '#way"',
		'"' . $up . 'index.html"'      => '"' . $home . '"',
		'"' . $up . 'privacy.html"'    => '"' . $home . 'privacy/"',
		'"' . $up . 'lab/'             => '"' . NTSL_LAB_BASE,
		'"' . $up . 'img/'             => '"' . $assets . 'img/',
		'"' . $up . 'site.js'          => '"' . $assets . 'site.js',
		'"' . $up . 'app.js'           => '"' . $assets . 'app.js',
		'"' . $up . 'style.css'        => '"' . $assets . 'style.css',
	);

	foreach ( ntsl_apps() as $a ) {
		// 홈에서는 apps/ai.html, 앱 페이지끼리는 ai.html 로 부른다.
		$from = ( '' === $up ) ? 'apps/' . $a . '.html' : $a . '.html';
		$map[ '"' . $from . '"' ] = '"' . $home . 'apps/' . $a . '/"';
	}

	return strtr( $html, $map );
}

/* ------------------------------------------------------------------ *
 * SEO — 정적 문서의 title / description 을 그대로 쓴다
 * ------------------------------------------------------------------ */

function ntsl_static_meta() {
	static $cache = null;
	if ( null !== $cache ) {
		return $cache;
	}
	$cache = array(
		'title'       => '',
		'description' => '',
	);

	$src = ntsl_static_source();
	if ( '' === $src ) {
		return $cache;
	}
	$file = NTSL_SITE_DIR . 'static/' . $src;
	if ( ! file_exists( $file ) ) {
		return $cache;
	}

	// 필요한 건 <head> 앞부분뿐이다.
	$head = file_get_contents( $file, false, null, 0, 4096 ); // phpcs:ignore WordPress.WP.AlternativeFunctions

	if ( preg_match( '#<title>(.*?)</title>#is', $head, $m ) ) {
		$cache['title'] = html_entity_decode( trim( $m[1] ), ENT_QUOTES, 'UTF-8' );
	}
	if ( preg_match( '#<meta\s+name="description"\s+content="([^"]*)"#is', $head, $m ) ) {
		$cache['description'] = html_entity_decode( trim( $m[1] ), ENT_QUOTES, 'UTF-8' );
	}

	return $cache;
}

add_filter( 'rank_math/frontend/title', function ( $title ) {
	$meta = ntsl_static_meta();
	return '' !== $meta['title'] ? $meta['title'] : $title;
} );

add_filter( 'rank_math/frontend/description', function ( $desc ) {
	$meta = ntsl_static_meta();
	return '' !== $meta['description'] ? $meta['description'] : $desc;
} );

foreach ( array(
	'rank_math/opengraph/facebook/og_title',
	'rank_math/opengraph/twitter/twitter_title',
) as $ntsl_hook ) {
	add_filter( $ntsl_hook, function ( $value ) {
		$meta = ntsl_static_meta();
		return '' !== $meta['title'] ? $meta['title'] : $value;
	} );
}

foreach ( array(
	'rank_math/opengraph/facebook/og_description',
	'rank_math/opengraph/twitter/twitter_description',
) as $ntsl_hook ) {
	add_filter( $ntsl_hook, function ( $value ) {
		$meta = ntsl_static_meta();
		return '' !== $meta['description'] ? $meta['description'] : $value;
	} );
}
unset( $ntsl_hook );
