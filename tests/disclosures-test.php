<?php
require __DIR__ . '/../wordpress/ntsl-site/disclosures-core.php';
$count = 0;
function check($condition, $message) { global $count; $count++; if (!$condition) { throw new Exception($message); } }
check(ntsl_d_number('1,234.56%') === 1234.56, 'comma parsing');
foreach (array('', '-', 'N/A', 'NaN', '1e3') as $v) { check(ntsl_d_number($v) === null, 'missing or unsupported number must not become zero'); }
check(ntsl_d_number('0') === 0.0, 'actual zero');
check(ntsl_d_classify(5.0, .01, false)['crossed_five'], '4.99 to exactly 5');
check(!ntsl_d_classify(5.1, .1, false)['crossed_five'], '5 to 5.1 is not a crossing');
check(!ntsl_d_classify(4.99, 1, false)['crossed_five'], 'below threshold');
check(!ntsl_d_classify(7, null, false)['crossed_five'], 'no previous comparison');
check(!ntsl_d_classify(7, 10, false)['crossed_five'], 'negative implied previous ratio');
check(!ntsl_d_classify(7, 3, true)['crossed_five'], 'correction');
check(!ntsl_d_classify(7, 3, false, false)['crossed_five'], 'unavailable record');
check(ntsl_d_classify(6, -1, false)['change'] === 'decrease', 'negative delta');
check(!ntsl_d_classify(101, 3, false)['valid_ratio'], 'out of range ratio');
$meta = array('rcept_no'=>'20260913000001','rcept_dt'=>'20260913','corp_code'=>'00000001','corp_name'=>'검증용 법인','flr_nm'=>'검증용 보고자','stock_code'=>'000001','corp_cls'=>'K','report_nm'=>'대량보유상황보고서','rm'=>'');
$row = array('rcept_no'=>$meta['rcept_no'],'repror'=>'검증용 보고자','stkrt'=>'6.25','stkrt_irds'=>'2.00');
$norm = ntsl_d_normalize($row,$meta);
check($norm['previous'] === 4.25 && $norm['crossed_five'], 'normalization crossing');
$missing=ntsl_d_normalize(array(),$meta);check(!$missing['available'] && $missing['ratio']===null,'missing details');
$withdraw=$meta;$withdraw['rm']='철';check(!ntsl_d_normalize($row,$withdraw)['crossed_five'],'withdrawn');
$correct=$meta;$correct['report_nm']='[기재정정]대량보유';check(ntsl_d_normalize($row,$correct)['change']==='correction','corrected report name');
$old=$norm;$old['date']='20260801';$old['receipt']='20260801000001';
$new=$norm;$new['ratio']=4.5;$new['delta']=-1.75;
check(count(ntsl_d_latest(array($old,$new)))===0,'latest below 5 must suppress old above 5');
check(count(ntsl_d_latest(array($old,$missing)))===0,'missing latest must not reuse old');
$other=$norm;$other['corp_code']='00000002';check(count(ntsl_d_latest(array($norm,$other)))===2,'same reporter on separate companies');

// 워드프레스 없는 환경에서 암호화 저장·기관 요청 경계만 검증한다.
define('ABSPATH',__DIR__.'/');
function add_action(...$v){} function add_filter(...$v){} function add_shortcode(...$v){}
$options=array();
function get_option($k,$d=false){global $options;return $options[$k]??$d;}
function update_option($k,$v,$a=false){global $options;$options[$k]=$v;}
function wp_salt($s){return 'test-only-salt-not-a-live-secret';}
class WP_Error { public $code;function __construct($c,$m){$this->code=$c;} }
function is_wp_error($v){return $v instanceof WP_Error;}
function wp_remote_get($url,$args){global $last_url;$last_url=$url;return new WP_Error('network','DO NOT RETURN secret URL '.$url);}
function wp_remote_retrieve_response_code($v){return 200;}
require __DIR__.'/../wordpress/ntsl-site/disclosures.php';
check(ntsl_d_fetch('https://evil.invalid',array())->code==='path','fixed endpoint allowlist');
check(ntsl_d_key()==='', 'no key');
check(ntsl_d_fetch('majorstock.json',array())->code==='key','key is required');
$secret=str_repeat('a',40);$iv=random_bytes(12);$tag='';
$cipher=openssl_encrypt($secret,'aes-256-gcm',hash('sha256',wp_salt('auth'),true),OPENSSL_RAW_DATA,$iv,$tag);
$options['ntsl_d_key']=json_encode(array(bin2hex($cipher),bin2hex($iv),bin2hex($tag)));
check(strpos($options['ntsl_d_key'],$secret)===false,'encrypted option');
check(ntsl_d_key()===$secret,'encrypted key roundtrip');
$error=ntsl_d_fetch('majorstock.json',array('corp_code'=>'00000001'));
check($error->code==='network' && strpos(json_encode($error),$secret)===false,'network error redaction');
check(strpos($last_url,'https://opendart.fss.or.kr/api/majorstock.json?')===0,'official route');
echo "PASS $count assertions\n";
