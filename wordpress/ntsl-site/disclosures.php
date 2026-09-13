<?php
/** 국내주식 지분공시: 공개 화면은 저장된 공개정보만 읽는다. 인증키는 서버 밖으로 보내지 않는다. */
if ( ! defined( 'ABSPATH' ) ) { exit; }
require_once __DIR__ . '/disclosures-core.php';

function ntsl_d_table() { global $wpdb; return $wpdb->prefix . 'ntsl_disclosures'; }
function ntsl_d_key() {
    if ( defined( 'NTSL_DART_KEY' ) && preg_match( '/^[a-f0-9]{40}$/iD', NTSL_DART_KEY ) ) { return NTSL_DART_KEY; }
    $stored = get_option( 'ntsl_d_key', '' );
    if ( ! $stored || ! function_exists( 'openssl_decrypt' ) ) { return ''; }
    $parts = json_decode( $stored, true );
    if ( ! is_array( $parts ) || count( $parts ) !== 3 ) { return ''; }
    foreach ( array( 80, 24, 32 ) as $index => $length ) {
        if ( ! isset( $parts[$index] ) || ! is_string( $parts[$index] ) || strlen( $parts[$index] ) !== $length || ! ctype_xdigit( $parts[$index] ) ) { return ''; }
    }
    $key = openssl_decrypt( hex2bin( $parts[0] ), 'aes-256-gcm', hash( 'sha256', wp_salt( 'auth' ), true ), OPENSSL_RAW_DATA, hex2bin( $parts[1] ), hex2bin( $parts[2] ) );
    return is_string( $key ) && preg_match( '/^[a-f0-9]{40}$/iD', $key ) ? $key : '';
}

function ntsl_d_install() {
    if ( ! current_user_can( 'manage_options' ) || get_option( 'ntsl_d_schema' ) === '1' ) { return; }
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $table = ntsl_d_table(); $collate = $wpdb->get_charset_collate();
    dbDelta( "CREATE TABLE $table (
        receipt varchar(14) NOT NULL,
        corp_code varchar(8) NOT NULL,
        report_date varchar(8) NOT NULL,
        generation bigint(20) NOT NULL DEFAULT 0,
        active tinyint(1) NOT NULL DEFAULT 1,
        meta longtext NOT NULL,
        details longtext NOT NULL,
        PRIMARY KEY  (receipt),
        KEY company (corp_code),
        KEY recent (active,report_date)
    ) $collate;" );
    if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) !== $table ) { return; }
    if ( ! get_page_by_path( 'stock-disclosures' ) ) {
        wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => '국내주식 지분공시', 'post_name' => 'stock-disclosures', 'post_content' => '[ntsl_disclosures]', 'comment_status' => 'closed' ) );
    }
    update_option( 'ntsl_d_schema', '1', false );
}
add_action( 'admin_init', 'ntsl_d_install' );

add_filter( 'cron_schedules', function ( $s ) {
    $s['ntsl_five_minutes'] = array( 'interval' => 300, 'display' => '지분공시 5분 작업' ); return $s;
} );
add_action( 'init', function () {
    if ( get_option( 'ntsl_d_schema' ) && ntsl_d_key() && ! wp_next_scheduled( 'ntsl_d_sync' ) ) {
        wp_schedule_event( time() + 10, 'ntsl_five_minutes', 'ntsl_d_sync' );
    }
} );

function ntsl_d_fetch( $endpoint, $params ) {
    // 고정된 기관·경로만 호출한다. 공개 요청이 임의 URL이나 키를 전달할 수 없다.
    if ( ! in_array( $endpoint, array( 'list.json', 'majorstock.json' ), true ) ) { return new WP_Error( 'path', '허용되지 않은 조회입니다.' ); }
    $key = ntsl_d_key();
    if ( ! $key ) { return new WP_Error( 'key', 'OpenDART 인증키 등록이 필요합니다.' ); }
    $counter = get_option( 'ntsl_d_quota', array() ); $day = gmdate( 'Ymd' );
    if ( ( $counter['day'] ?? '' ) !== $day ) { $counter = array( 'day' => $day, 'count' => 0 ); }
    if ( $counter['count'] >= 5000 ) { return new WP_Error( 'quota', '자체 일일 호출 한도에 도달했습니다.' ); }
    $counter['count']++; update_option( 'ntsl_d_quota', $counter, false );
    $params['crtfc_key'] = $key;
    $response = wp_remote_get( 'https://opendart.fss.or.kr/api/' . $endpoint . '?' . http_build_query( $params ), array( 'timeout' => 8, 'redirection' => 0, 'limit_response_size' => 8 * 1024 * 1024 ) );
    // 네트워크 오류의 원문에는 키가 든 URL이 섞일 수 있어 저장·반환하지 않는다.
    if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) { return new WP_Error( 'network', '금융감독원 응답을 받지 못했습니다. 다음 작업에서 재시도합니다.' ); }
    $data = json_decode( wp_remote_retrieve_body( $response ), true );
    if ( ! is_array( $data ) || ! isset( $data['status'] ) ) { return new WP_Error( 'format', '기관 응답 형식을 확인할 수 없습니다.' ); }
    if ( $data['status'] === '013' ) { return array( 'list' => array(), 'total_page' => 0 ); }
    if ( $data['status'] !== '000' ) {
        $messages = array( '010' => '등록되지 않은 인증키입니다.', '011' => '사용 중지된 인증키입니다.', '012' => '서버 IP 접근을 확인해야 합니다.', '020' => '기관 호출 한도에 도달했습니다.', '901' => '인증키 계정 갱신이 필요합니다.' );
        return new WP_Error( 'dart', $messages[$data['status']] ?? '기관 응답 오류입니다. 관리자 확인이 필요합니다.' );
    }
    return $data;
}

function ntsl_d_sync() {
    if ( ! ntsl_d_key() || ! get_option( 'ntsl_d_schema' ) ) { return; }
    $now = time(); $lock = (int) get_option( 'ntsl_d_lock', 0 );
    if ( $lock && $now - $lock > 180 ) { delete_option( 'ntsl_d_lock' ); }
    if ( ! add_option( 'ntsl_d_lock', $now, '', false ) ) { return; }
    try { ntsl_d_sync_locked(); } finally { delete_option( 'ntsl_d_lock' ); }
}
add_action( 'ntsl_d_sync', 'ntsl_d_sync' );

function ntsl_d_sync_locked() {
    global $wpdb; $table = ntsl_d_table();
    $state = get_option( 'ntsl_d_state', array() ); $now = time();
    if ( empty( $state['phase'] ) || $state['phase'] === 'done' ) {
        if ( ! empty( $state['finished'] ) && $now - $state['finished'] < 3600 ) { return; }
        $state = array( 'phase' => 'discover', 'generation' => $now, 'start' => wp_date( 'Ymd', $now - 89 * DAY_IN_SECONDS, new DateTimeZone( 'Asia/Seoul' ) ), 'end' => wp_date( 'Ymd', $now, new DateTimeZone( 'Asia/Seoul' ) ), 'page' => 1, 'queue' => array(), 'processed' => 0, 'started' => $now, 'error' => '' );
    }
    $state['attempt'] = $now;
    if ( $state['phase'] === 'discover' ) {
        $data = ntsl_d_fetch( 'list.json', array( 'bgn_de' => $state['start'], 'end_de' => $state['end'], 'pblntf_detail_ty' => 'D001', 'last_reprt_at' => 'Y', 'page_no' => $state['page'], 'page_count' => 100, 'sort' => 'date', 'sort_mth' => 'desc' ) );
        if ( is_wp_error( $data ) ) { $state['error'] = $data->get_error_message(); update_option( 'ntsl_d_state', $state, false ); return; }
        foreach ( $data['list'] ?? array() as $m ) {
            if ( ! in_array( $m['corp_cls'] ?? '', array( 'Y', 'K', 'N' ), true ) || ! preg_match( '/^\d{14}$/D', $m['rcept_no'] ?? '' ) || ! preg_match( '/^\d{8}$/D', $m['corp_code'] ?? '' ) ) { continue; }
            $meta = array_intersect_key( $m, array_flip( array( 'rcept_no', 'corp_code', 'corp_name', 'stock_code', 'corp_cls', 'rcept_dt', 'flr_nm', 'report_nm', 'rm' ) ) );
            $meta = array_map( 'sanitize_text_field', $meta );
            $old = $wpdb->get_row( $wpdb->prepare( "SELECT details FROM $table WHERE receipt=%s", $meta['rcept_no'] ), ARRAY_A );
            $saved = $wpdb->replace( $table, array( 'receipt' => $meta['rcept_no'], 'corp_code' => $meta['corp_code'], 'report_date' => $meta['rcept_dt'], 'generation' => $state['generation'], 'active' => 1, 'meta' => wp_json_encode( $meta ), 'details' => $old['details'] ?? '{}' ) );
            if ( false === $saved ) { $state['error'] = '공시 저장에 실패했습니다. 같은 목록을 재시도합니다.'; update_option( 'ntsl_d_state', $state, false ); return; }
            $state['queue'][$meta['corp_code']] = $meta['corp_code'];
        }
        $state['total_pages'] = (int) ( $data['total_page'] ?? 0 );
        if ( $state['page'] >= $state['total_pages'] ) {
            // 최종보고서 목록에서 사라진 정정 전·철회 보고서를 현재 결과에서 제외한다.
            if ( false === $wpdb->query( $wpdb->prepare( "UPDATE $table SET active=0 WHERE generation<>%d", $state['generation'] ) ) ) { $state['error'] = '최종보고서 목록 반영에 실패했습니다.'; update_option( 'ntsl_d_state', $state, false ); return; }
            $state['phase'] = 'details'; $state['queue'] = array_values( $state['queue'] ); $state['companies'] = count( $state['queue'] );
        } else { $state['page']++; }
        $state['error'] = ''; update_option( 'ntsl_d_state', $state, false );
        return;
    }
    for ( $i = 0; $i < 2 && ! empty( $state['queue'] ); $i++ ) {
        $code = $state['queue'][0]; $data = ntsl_d_fetch( 'majorstock.json', array( 'corp_code' => $code ) );
        if ( is_wp_error( $data ) ) { $state['error'] = $data->get_error_message(); update_option( 'ntsl_d_state', $state, false ); return; }
        $mapped = array();
        foreach ( $data['list'] ?? array() as $row ) {
            if ( preg_match( '/^\d{14}$/D', $row['rcept_no'] ?? '' ) ) {
                $mapped[$row['rcept_no']] = array_map( 'sanitize_text_field', array_intersect_key( $row, array_flip( array( 'rcept_no', 'repror', 'stkrt', 'stkrt_irds', 'stkqy', 'stkqy_irds', 'report_tp', 'report_resn' ) ) ) );
            }
        }
        $receipts = $wpdb->get_col( $wpdb->prepare( "SELECT receipt FROM $table WHERE corp_code=%s AND active=1", $code ) );
        foreach ( $receipts as $receipt ) {
            if ( false === $wpdb->update( $table, array( 'details' => wp_json_encode( $mapped[$receipt] ?? array() ) ), array( 'receipt' => $receipt ) ) ) { $state['error'] = '상세 수치 저장에 실패했습니다. 같은 회사를 재시도합니다.'; update_option( 'ntsl_d_state', $state, false ); return; }
        }
        array_shift( $state['queue'] ); $state['processed']++; $state['error'] = '';
    }
    if ( empty( $state['queue'] ) ) { $state['phase'] = 'done'; $state['finished'] = time(); }
    update_option( 'ntsl_d_state', $state, false );
}

function ntsl_d_payload() {
    global $wpdb; $state = get_option( 'ntsl_d_state', array() ); $rows = array();
    if ( get_option( 'ntsl_d_schema' ) ) {
        $table = ntsl_d_table();
        $raw = $wpdb->get_results( "SELECT meta,details FROM $table WHERE active=1 ORDER BY report_date DESC,receipt DESC LIMIT 20001", ARRAY_A );
        foreach ( array_slice( $raw, 0, 20000 ) as $row ) {
            $meta = json_decode( $row['meta'], true ); $details = json_decode( $row['details'], true );
            if ( is_array( $meta ) ) { $rows[] = ntsl_d_normalize( is_array( $details ) ? $details : array(), $meta ); }
        }
    }
    return array( 'rows' => $rows, 'configured' => (bool) ntsl_d_key(), 'phase' => $state['phase'] ?? 'unconfigured', 'start' => $state['start'] ?? '', 'end' => $state['end'] ?? '', 'finished' => empty( $state['finished'] ) ? '' : wp_date( 'Y-m-d H:i', $state['finished'], new DateTimeZone( 'Asia/Seoul' ) ), 'collecting' => ! empty( $state['phase'] ) && $state['phase'] !== 'done', 'error' => ! empty( $state['error'] ), 'truncated' => isset( $raw ) && count( $raw ) > 20000 );
}
add_action( 'rest_api_init', function () {
    register_rest_route( 'ntsl/v1', '/disclosures', array( 'methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => function () {
        $response = new WP_REST_Response( ntsl_d_payload() ); $response->header( 'Cache-Control', 'public, max-age=60' ); return $response;
    } ) );
} );

add_action( 'admin_menu', function () { add_options_page( '지분공시 연결', '지분공시 연결', 'manage_options', 'ntsl-disclosures', 'ntsl_d_admin' ); } );
function ntsl_d_admin() {
    if ( ! current_user_can( 'manage_options' ) ) { return; }
    $message = '';
    if ( $_SERVER['REQUEST_METHOD'] === 'POST' ) {
        check_admin_referer( 'ntsl_d_admin' );
        if ( isset( $_POST['ntsl_save_key'] ) ) {
            $key = trim( wp_unslash( $_POST['ntsl_dart_key'] ?? '' ) );
            if ( ! preg_match( '/^[a-f0-9]{40}$/iD', $key ) ) { $message = '40자리 OpenDART 인증키를 입력하세요. 기존 키는 유지됩니다.'; }
            elseif ( ! function_exists( 'openssl_encrypt' ) ) { $message = '서버의 OpenSSL 지원 확인이 필요합니다. 키를 저장하지 않았습니다.'; }
            else {
                $iv = random_bytes( 12 ); $tag = '';
                $cipher = openssl_encrypt( $key, 'aes-256-gcm', hash( 'sha256', wp_salt( 'auth' ), true ), OPENSSL_RAW_DATA, $iv, $tag );
                if ( $cipher === false ) { $message = '인증키 암호화에 실패했습니다.'; }
                else { update_option( 'ntsl_d_key', wp_json_encode( array( bin2hex( $cipher ), bin2hex( $iv ), bin2hex( $tag ) ) ), false ); $message = '키를 서버에 저장했습니다. 브라우저와 저장소에는 공개하지 않습니다.'; }
            }
        }
        if ( isset( $_POST['ntsl_sync'] ) ) { ntsl_d_sync(); $message = '수집 작업 한 회를 실행했습니다.'; }
    }
    $state = get_option( 'ntsl_d_state', array() );
    ?>
    <div class="wrap"><h1>지분공시 연결</h1>
    <?php if ( $message ) { ?><div class="notice notice-info"><p><?php echo esc_html( $message ); ?></p></div><?php } ?>
    <p>사용 데이터: 금융감독원 대량보유 상황보고. 금융위원회 주식시세정보는 사용하지 않습니다.</p>
    <p><strong>인증키 상태: <?php echo ntsl_d_key() ? '등록됨' : '미등록'; ?></strong> · 키 값은 다시 표시하지 않습니다.</p>
    <form method="post"><?php wp_nonce_field( 'ntsl_d_admin' ); ?>
        <p><label for="ntsl-dart-key">OpenDART 인증키 (40자리)</label><br><input id="ntsl-dart-key" name="ntsl_dart_key" type="password" autocomplete="new-password" size="48" maxlength="40" value=""></p>
        <p><button class="button button-primary" name="ntsl_save_key" value="1">인증키 저장</button></p>
    </form>
    <h2>수집 상태</h2><p>최근 90일의 상장사 대량보유 공시를 수집합니다. 목록 한 페이지 또는 회사 두 곳씩 나누어 처리합니다.</p>
    <p>현재 단계: <?php echo esc_html( $state['phase'] ?? '연결 대기' ); ?> · 목록 페이지: <?php echo (int) ( $state['page'] ?? 0 ); ?> / <?php echo (int) ( $state['total_pages'] ?? 0 ); ?> · 상세 처리: <?php echo (int) ( $state['processed'] ?? 0 ); ?> / <?php echo (int) ( $state['companies'] ?? 0 ); ?></p>
    <p><?php echo esc_html( $state['error'] ?? '' ); ?></p>
    <form method="post"><?php wp_nonce_field( 'ntsl_d_admin' ); ?><button class="button" name="ntsl_sync" value="1" <?php disabled( ! ntsl_d_key() ); ?>>다음 수집 작업 실행</button></form>
    <p>자동 작업은 방문 시 실행되는 워드프레스 예약 작업입니다. 방문이 없으면 갱신이 늦어질 수 있습니다. 공개 화면에 마지막 완료 시각을 표시합니다.</p>
    <p><a href="<?php echo esc_url( home_url( '/stock-disclosures/' ) ); ?>">공개 화면 보기</a> · <a href="https://opendart.fss.or.kr/mng/userApiKeyListView.do" target="_blank" rel="noopener">OpenDART 인증키 관리</a></p></div>
    <?php
}

add_action( 'wp_enqueue_scripts', function () {
    if ( ! is_page( 'stock-disclosures' ) ) { return; }
    wp_enqueue_style( 'ntsl-disclosures', NTSL_SITE_URL . 'disclosures.css', array( 'ntsl-shell' ), NTSL_SITE_VER );
    wp_enqueue_script( 'ntsl-disclosures', NTSL_SITE_URL . 'disclosures.js', array(), NTSL_SITE_VER, true );
}, 60 );
add_filter( 'body_class', function ( $classes ) { if ( is_page( 'stock-disclosures' ) ) { $classes[] = 'ntsl-disclosure-page'; } return $classes; } );
add_shortcode( 'ntsl_disclosures', function () {
    ob_start(); require __DIR__ . '/disclosures-view.php'; return ob_get_clean();
} );
