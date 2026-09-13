<?php
/** 지분공시의 수치와 분류. API·워드프레스에 의존하지 않아 경계값을 따로 검증한다. */
function ntsl_d_number( $value ) {
    $value = trim( str_replace( array( ',', '%' ), '', (string) $value ) );
    if ( ! preg_match( '/^[+-]?\d+(?:\.\d+)?$/D', $value ) ) { return null; }
    $number = (float) $value;
    return is_finite( $number ) ? $number : null;
}

function ntsl_d_classify( $ratio, $delta, $correction, $available = true ) {
    // 누락값을 0으로 바꾸면 첫 수집이 신규 5% 진입으로 둔갑한다.
    $previous = ( null !== $ratio && null !== $delta ) ? round( $ratio - $delta, 4 ) : null;
    $valid = $available && null !== $ratio && $ratio >= 0 && $ratio <= 100;
    $change = 'unknown';
    if ( $valid && null !== $delta && null !== $previous && $previous >= 0 && $previous <= 100 ) {
        $change = $delta > 0 ? 'increase' : ( $delta < 0 ? 'decrease' : 'unchanged' );
    }
    // 정정공시는 새로운 거래나 신규 진입으로 세지 않는다. 숫자는 원문 확인용으로 표시한다.
    if ( $correction ) { $change = 'correction'; }
    $cross = $valid && ! $correction && 'increase' === $change && $previous < 5 && $ratio >= 5;
    return array( 'previous' => $previous, 'change' => $change, 'crossed_five' => $cross, 'valid_ratio' => $valid );
}

function ntsl_d_normalize( $row, $meta ) {
    $clean = function ( $v ) { return trim( strip_tags( (string) $v ) ); };
    $ratio = ntsl_d_number( $row['stkrt'] ?? '' );
    $delta = ntsl_d_number( $row['stkrt_irds'] ?? '' );
    $correction = false !== strpos( $meta['report_nm'] ?? '', '정정' );
    $withdrawn = false !== strpos( $meta['rm'] ?? '', '철' );
    $superseded = false !== strpos( $meta['rm'] ?? '', '정' );
    $available = isset( $row['rcept_no'] ) && ! $withdrawn && ! $superseded;
    return array_merge( array(
        'receipt' => $clean( $meta['rcept_no'] ?? '' ),
        'date' => $clean( $meta['rcept_dt'] ?? '' ),
        'corp_code' => $clean( $meta['corp_code'] ?? '' ),
        'company' => $clean( $meta['corp_name'] ?? '' ),
        'stock_code' => $clean( $meta['stock_code'] ?? '' ),
        'market' => $clean( $meta['corp_cls'] ?? '' ),
        'reporter' => $clean( $row['repror'] ?? $meta['flr_nm'] ?? '' ),
        'ratio' => $ratio, 'delta' => $delta,
        'quantity' => $clean( $row['stkqy'] ?? '' ),
        'quantity_delta' => $clean( $row['stkqy_irds'] ?? '' ),
        'type' => $clean( $row['report_tp'] ?? '' ),
        'reason' => $clean( $row['report_resn'] ?? '' ),
        'report_name' => $clean( $meta['report_nm'] ?? '' ),
        'correction' => $correction, 'withdrawn' => $withdrawn, 'superseded' => $superseded,
        'available' => $available,
    ), ntsl_d_classify( $ratio, $delta, $correction, $available ) );
}

function ntsl_d_latest( $rows ) {
    usort( $rows, function ( $a, $b ) {
        return strcmp( $b['date'] . $b['receipt'], $a['date'] . $a['receipt'] );
    } );
    $seen = array(); $out = array();
    foreach ( $rows as $row ) {
        // 같은 이름의 보고자가 다른 종목을 보고한 경우는 합치지 않는다.
        $key = $row['corp_code'] . '|' . $row['reporter'];
        if ( isset( $seen[$key] ) ) { continue; }
        $seen[$key] = true;
        // 최신 수치가 없으면 과거 5% 수치로 대체하지 않는다.
        if ( $row['valid_ratio'] && $row['ratio'] >= 5 && ! $row['withdrawn'] && ! $row['superseded'] ) { $out[] = $row; }
    }
    return $out;
}
