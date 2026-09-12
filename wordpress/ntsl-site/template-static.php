<?php
/**
 * 나인투식스랩 정적 페이지 템플릿.
 *
 * 테마의 header/footer 를 쓰지 않는다 — 정적 문서가 자기 네비게이션과
 * 푸터를 가지고 있기 때문이다. wp_head()/wp_footer() 만 끼워서 Rank Math
 * 메타와 관리자 표시줄은 그대로 동작하게 둔다.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// 부팅 연출 스크립트는 .boot 가 있는 문서(홈)에서만 내보낸다.
$ntsl_body = ntsl_render_static();
$ntsl_boot = ( false !== strpos( $ntsl_body, 'id="boot"' ) );
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#000000">
<?php if ( $ntsl_boot ) : ?>
<script>
/* 첫 화면 로고 연출. 움직임을 줄여 달라고 한 사람과 JS 가 막힌 사람은 건너뛴다.
 * head 에서 클래스를 미리 붙여야 히어로가 한 번 번쩍이지 않는다. */
(function () {
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    document.documentElement.className += ' boot-on'
  } catch (e) {}
})()
</script>
<?php endif; ?>
<noscript><style>.rise, .phone.rise { opacity: 1; transform: none; }</style></noscript>
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php echo $ntsl_body; // phpcs:ignore WordPress.Security.EscapeOutput ?>
<?php wp_footer(); ?>
</body>
</html>
