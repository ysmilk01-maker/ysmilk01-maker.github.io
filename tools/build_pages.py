# -*- coding: utf-8 -*-
"""
apps/*.html 상세 페이지를 한 틀에서 뽑는다.

  python tools/build_pages.py

내용은 아래 APPS 에만 있다. apps/*.html 은 생성 파일이라 손으로 고치지 않는다 —
이 파일을 고치고 다시 돌린다. style.css 는 「상세 페이지 · 본문」 표식 아래를
tools/detail.css 로 갈아 끼우므로, 상세 전용 CSS 는 detail.css 에 쓴다.
끝나면 cache_bust.py 가 메인·개인정보·상세의 공통 파일 버전까지 갱신한다.
"""
import io, os, shutil, sys
from cache_bust import update_asset_versions

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)

APPS = {
  'coin': dict(
    slug='coin', name='해외 코인 선물 챌린지', tint='coin', glow='var(--coin-glow)',
    title='해외 코인 선물 챌린지 · 나인투식스랩',
    meta='비트코인·이더리움·솔라나·리플의 실시간 시세로 레버리지 롱과 숏을 연습합니다. 돈만 가상입니다.',
    og='잃어도 계좌는 그대로. 실시간 시세로 롱과 숏을 연습합니다.',
    badge='출시됨 · 토스 미니앱',
    h1='잃어도<br>계좌는 그대로',
    desc='비트코인·이더리움·솔라나·리플의 실시간 시세로 레버리지 롱과 숏을 연습합니다. 수수료와 펀딩비, 청산까지 무기한 선물 규칙 그대로 계산하고 돈만 가상입니다.',
    hero_img='coin.png', hero_alt='해외 코인 선물 챌린지 거래 화면. 비트코인 캔들 차트와 호가창, 롱과 숏 버튼.',
    how=['실시간 시세', '최대 125배', '롱 · 숏', '이지 · 거래소 모드', '수익률 랭킹'],
    open_href='intoss://coin-futures-sim', open_label='토스에서 열기',
    hint='토스 앱에서 열립니다. 검색창에 ‘해외 코인 선물 챌린지’',
    shots=[('coin-1', '가상 자금 1만 달러로 시작하는 거래 화면'), ('coin-2', '레버리지를 고르면 청산가가 바로 보이는 주문 화면'),
           ('coin-3', '진입가가 차트 위에 표시된 보유 포지션'), ('coin-4', '이번 주 수익률 랭킹')],
    feats_h2='선물 거래의 규칙을<br>돈 잃기 전에 익힙니다',
    feats_lead='실시간 시세를 보며 수수료와 펀딩비, 청산이 어떻게 계산되는지 익힙니다. 거래에는 가상 자금을 씁니다.',
    feats=[('4종목', '실시간 시세', '비트코인·이더리움·솔라나·리플. 차트도 호가도 지금 값입니다.'),
           ('125배', '레버리지', '배수를 올리면 청산가가 그 자리에서 바뀝니다. 몇 %만 반대로 가면 끝나는지 미리 봅니다.'),
           ('그대로', '수수료 · 펀딩비 · 청산', '무기한 선물 계산식을 그대로 씁니다. 8시간마다 펀딩비가 빠지고, 증거금이 바닥나면 청산됩니다.'),
           ('2가지', '이지 · 거래소 모드', '처음엔 롱·숏 버튼 둘. 익숙해지면 지정가와 호가창이 있는 거래소 화면.'),
           ('주간', '수익률 랭킹', '이번 주 수익률로 줄을 섭니다. 닉네임은 자동으로 정해져서 누구인지 드러나지 않습니다.'),
           ('1일 1회', '무료 초기화', '잃으면 처음으로. 하루 한 번은 그냥, 그 이상은 광고 한 편을 보고.')],
    rank_view='ranking', rank_h2='랭킹 상위 5', rank_lead='앱이 읽는 것과 같은 표를 같은 자리에서 읽습니다. 숫자는 이 페이지를 연 순간의 값입니다.',
    rank_note='닉네임은 앱이 자동으로 지어 준 것이고, 서버에는 익명 키와 닉네임·성적만 있습니다.',
    steps=[('토스 앱을 엽니다', '따로 설치할 게 없습니다. 토스가 이미 있으면 끝입니다.'),
           ('검색창에 이름을 칩니다', '‘해외 코인 선물 챌린지’ 또는 ‘코인 선물’.'),
           ('바로 시작합니다', '회원가입도 로그인도 없이 가상 1만 달러가 들어와 있습니다.')],
    notes=['<strong>가상 자금입니다.</strong> 실제 돈이 오가지 않고, 실제 거래소 계좌와 연결되지 않습니다.',
           '<strong>투자 조언이 아닙니다.</strong> 랭킹의 수익률은 연습 계좌의 결과일 뿐입니다.',
           '시세는 거래소가 공개하는 값을 그대로 받습니다. 표시가 잠깐 늦어질 수 있습니다.',
           '서버에 저장되는 것은 토스가 주는 익명 키, 닉네임, 성적뿐입니다. 이름·전화번호·생년월일은 받지 않습니다.'],
    others=['beatwave', 'shooter', 'krx', 'ai', 'sudoku'],
  ),
  'krx': dict(
    slug='krx', name='국내주식 롱숏 챌린지', tint='krx', glow='var(--krx-glow)',
    title='국내주식 롱숏 챌린지 · 나인투식스랩',
    meta='코스피·코스닥 전 종목에 롱과 숏을 걸어봅니다. 가상 자금 1,000만원, 시세는 최근 영업일 종가입니다.',
    og='국장에서 숏을 쳐봅니다. 코스피·코스닥 전 종목, 가상 1,000만원.',
    badge='출시됨 · 토스 미니앱',
    h1='국장에서<br>숏을 쳐봅니다',
    desc='코스피·코스닥 종목의 상승과 하락, 두 방향을 가상 자금 1,000만원으로 연습합니다. 시세는 실시간이 아닌 최근 영업일 종가입니다.',
    hero_img='krx.png', hero_alt='국내주식 롱숏 챌린지 주문 화면. 삼성전자 일봉 차트와 롱·숏 버튼, 레버리지 선택과 청산가.',
    how=['코스피 · 코스닥 전 종목', '최대 100배', '롱 · 숏', '수익률 랭킹', '게시판'],
    open_href='intoss://krx-sim', open_label='토스에서 열기',
    hint='시세는 최근 영업일 종가이며 실시간이 아닙니다. 검색창에 ‘국내주식 롱숏 챌린지’',
    shots=[('krx-1', '종목을 검색해 고르는 화면'), ('krx-2', '레버리지 5배로 삼성전자에 숏을 거는 주문 화면'),
           ('krx-3', '보유 포지션과 계좌 현황')],
    feats_h2='오르는 쪽도, 내리는 쪽도<br>가상 자금으로 연습합니다',
    feats_lead='종목과 방향, 레버리지를 직접 고릅니다. 선택에 따라 수익과 손실이 어떻게 달라지는지 살펴보세요.',
    feats=[('전 종목', '코스피 · 코스닥', '이름으로 검색해서 고릅니다. 상장된 종목은 다 있습니다.'),
           ('숏', '내리는 쪽에도', '오를 것으로 보는 롱과 내릴 것으로 보는 숏. 두 방향을 모의 거래로 연습합니다.'),
           ('100배', '레버리지', '배율을 고르면 청산 예상가가 함께 표시됩니다. 배율이 커질수록 손실도 크게 변합니다.'),
           ('종가', '하루 한 번 갱신', '시세는 금융위원회 공개 데이터의 최근 영업일 종가입니다. 장중 값이 아닙니다.'),
           ('주간', '수익률 랭킹', '이번 주 수익률로 줄을 섭니다. 닉네임은 자동으로 정해집니다.'),
           ('짧게', '게시판', '한 줄씩 남깁니다. 신고가 쌓이면 자동으로 가려집니다.')],
    rank_view='krx_ranking', no_last=True, rank_h2='랭킹 상위 5', rank_lead='앱이 읽는 것과 같은 표를 같은 자리에서 읽습니다. 숫자는 이 페이지를 연 순간의 값입니다.',
    rank_note='닉네임은 앱이 자동으로 지어 준 것이고, 서버에는 익명 키와 닉네임·성적만 있습니다.',
    steps=[('토스 앱을 엽니다', '따로 설치할 게 없습니다. 토스가 이미 있으면 끝입니다.'),
           ('검색창에 이름을 칩니다', '‘국내주식 롱숏 챌린지’ 또는 ‘롱숏’.'),
           ('바로 시작합니다', '회원가입도 로그인도 없이 가상 1,000만원이 들어와 있습니다.')],
    notes=['<strong>시세는 실시간이 아닙니다.</strong> 최근 영업일 종가로 하루 한 번 갱신됩니다. 장중에 낸 주문은 그날 종가로 계산됩니다.',
           '<strong>가상 자금입니다.</strong> 실제 증권 계좌와 연결되지 않고, 실제 공매도가 일어나지 않습니다.',
           '<strong>투자 조언이 아닙니다.</strong> 종목·방향·배수는 전부 사용자가 고르는 연습입니다.',
           '서버에 저장되는 것은 토스가 주는 익명 키, 닉네임, 성적, 게시판에 쓴 글뿐입니다.'],
    others=['beatwave', 'shooter', 'coin', 'ai', 'sudoku'],
  ),
  'saju': dict(
    slug='saju', name='사주 여덟 글자', tint='saju', glow='var(--saju-glow)',
    title='사주 여덟 글자 · 나인투식스랩',
    meta='생년월일만 있으면 5초. 절기 기준 만세력으로 사주를 세우고 오늘의 운·옷차림·궁합까지. 계산은 기기 안에서 끝납니다.',
    og='생년월일은 폰 밖으로 안 나갑니다. 오늘의 운, 오늘의 옷차림, 궁합까지.',
    badge='출시됨 · 토스 미니앱',
    h1='생년월일은<br>폰 밖으로 안 나갑니다',
    desc='태양황경으로 절기를 계산해 사주 여덟 글자를 세웁니다. 오늘의 운과 궁합, 그리고 기상청 날씨에 내 사주의 기운을 겹친 오늘의 옷차림까지. 사주 계산은 전부 기기 안에서 끝납니다.',
    hero_img='saju.png', hero_alt='사주 여덟 글자 시작 화면. 오늘의 일진과 절기 기준 만세력 설명.',
    how=['절기 기준 만세력', '오늘의 운', '오늘의 코디', '이번 주 흐름', '궁합'],
    open_href='intoss://saju-eight', open_label='토스에서 열기',
    hint='생년월일은 기기에 저장됩니다. 날씨 조회와 광고 요청은 별도로 발생합니다. 검색창에 ‘사주 여덟 글자’',
    shots=[('saju-1', '생년월일을 넣는 시작 화면'), ('saju-2', '여덟 글자가 세워진 나의 명식'), ('saju-3', '재물·애정·일·건강 오늘의 운세와 옷차림')],
    feats_h2='절기로 세우고<br>기기 안에서 끝냅니다',
    feats_lead='사주는 태어난 순간의 하늘을 여덟 글자로 적는 것입니다. 그 계산에 서버가 필요하지 않아서, 보내지 않습니다.',
    feats=[('5초', '생년월일만', '시간을 모르면 몰라도 됩니다. 여덟 글자가 바로 세워집니다.'),
           ('절기', '만세력 기준', '태양황경으로 절기를 계산합니다. 1987·1988년 서머타임과 1954~1961년 표준시 차이까지 보정합니다.'),
           ('오늘', '재물 · 애정 · 일 · 건강', '오늘의 일진과 내 명식을 겹쳐 네 갈래로 봅니다. 이번 주 흐름도 같이.'),
           ('날씨', '오늘의 옷차림', '기상청 예보에 내 사주의 기운을 얹어 오늘 뭘 입을지 색과 소재로 권합니다.'),
           ('둘', '궁합', '상대 생년월일을 넣으면 두 명식을 나란히 놓고 봅니다. 상대 정보도 기기 안에만 있습니다.'),
           ('기기 안', '사주 입력과 계산', '생년월일·명식·궁합 상대 정보는 기기에 남습니다. 날씨 조회와 토스 광고 요청은 별도로 발생합니다.')],
    inout=True,
    steps=[('토스 앱을 엽니다', '따로 설치할 게 없습니다. 토스가 이미 있으면 끝입니다.'),
           ('검색창에 이름을 칩니다', '‘사주 여덟 글자’ 또는 ‘사주’.'),
           ('생년월일을 넣습니다', '입력한 값은 이 폰에만 저장됩니다. 지우면 끝입니다.')],
    notes=['<strong>재미로 보세요.</strong> 운세는 결정을 대신하지 않습니다.',
           '날씨는 기상청 공개 예보를 받습니다. 위치 정보는 쓰지 않고, 지역은 사용자가 고릅니다.',
           '생년월일·명식·궁합 상대 정보는 서버로 보내지 않습니다. 앱을 지우면 같이 지워집니다.',
           '광고는 배너 하나뿐이고, 어떤 기능도 광고를 봐야 열리지 않습니다.'],
    others=['beatwave', 'shooter', 'coin', 'krx', 'ai', 'sudoku'],
  ),
  'ai': dict(
    slug='ai', name='내 AI 활용 점수는?', tint='ai', glow='var(--ai-glow)',
    title='내 AI 활용 점수는? · 나인투식스랩',
    meta='열여덟 문항으로 AI 를 어디까지 쓰고 있는지 재고, 오늘 30분 안에 해볼 일을 짚어 줍니다. 답은 기기 안에만 남습니다.',
    og='쓰긴 쓰는데 잘 쓰고 있는 걸까. 열여덟 문항, 4분, 점수 말고 처방.',
    badge='출시됨 · 토스 미니앱',
    h1='점수만<br>주지 않습니다',
    desc='쓰긴 쓰는데 잘 쓰고 있는 건지 모르겠다면. 열여덟 문항으로 지금 어디쯤인지 재고, 어느 칸에서 막혀 있는지 짚고, 오늘 30분 안에 뭘 해보면 되는지까지 적어 드립니다.',
    hero_img='ai.png', hero_alt='내 AI 활용 점수는? 시작 화면. 여섯 영역 — 묻기·읽히기·확인·잇기·굴리기·만들기.',
    how=['18문항 · 4분', '여섯 영역', '여섯 단계', '오늘 할 일 3가지', '기기 안에만'],
    open_href='intoss://ai-level', open_label='토스에서 열기',
    hint='토스 앱에서 열립니다. 검색창에 ‘AI 활용 점수’',
    shots=[('ai-1', '열여덟 문항으로 재는 시작 화면'), ('ai-2', '맞히는 시험이 아니라 어떻게 시키는지를 묻는 문항'),
           ('ai-3', '여섯 영역 · 여섯 단계 결과 — 어느 칸에서 막혀 있는지'), ('ai-4', '오늘 30분 안에 할 일 세 가지')],
    feats_h2='맞히는 시험이 아닙니다<br>어디까지 해봤는지만 묻습니다',
    feats_lead='「당신은 3레벨입니다」는 듣고 나서 할 일이 없습니다. 이 앱의 값어치는 진단이 아니라 처방에 있습니다.',
    feats=[('18', '문항 · 4분', '「복잡한 일을 시킬 때 어떻게 적나요」 같은 질문입니다. 정답은 없고, 해본 것만 고릅니다.'),
           ('6', '영역', '묻기 · 읽히기 · 확인 · 잇기 · 굴리기 · 만들기. 앞이 안 되면 뒤도 흔들리는 순서입니다.'),
           ('6', '단계', '구경꾼부터 여럿 굴리기까지. 사람이 얼마나 감독해야 하는지를 기준으로 나눈 공개 연구 틀을 참고했습니다.'),
           ('처음', '막힌 칸을 짚습니다', '제일 낮은 영역이 아니라, 순서에서 처음 막힌 영역을 찾습니다. 거기부터 풀어야 뒤가 따라옵니다.'),
           ('3', '오늘 할 일', '오늘 해볼 일을 처방 카드 세 장으로 안내합니다. 일부 처방은 보상형 광고를 시청한 뒤 열립니다.'),
           ('0', '서버로 가는 답', '답한 내용은 이 기기 안에만 남습니다. 어디로도 보내지 않습니다.')],
    inout_ai=True,
    steps=[('토스 앱을 엽니다', '따로 설치할 게 없습니다. 토스가 이미 있으면 끝입니다.'),
           ('검색창에 이름을 칩니다', '‘내 AI 활용 점수는’ 또는 ‘AI 활용 점수’.'),
           ('열여덟 문항에 답합니다', '4분이면 끝나고, 결과는 이 폰에만 남습니다.')],
    notes=['<strong>점수는 자기 보고입니다.</strong> 해봤다고 고른 만큼 나옵니다. 후하게 고르면 후하게 나옵니다.',
           '답한 내용은 기기 안에만 저장되고 서버로 보내지 않습니다. 앱을 지우면 같이 지워집니다.',
           '일부 처방은 보상형 광고를 시청한 뒤 열립니다. 열리는 조건은 앱 안의 안내를 확인해 주세요.',
           '단계 이름은 공개 연구(arXiv 2608.07779)의 틀을 참고했고, 이 앱이 정한 것입니다.'],
    others=['beatwave', 'shooter', 'coin', 'krx', 'sudoku'],
  ),
  'sudoku': dict(
    slug='sudoku', name='오늘도 무료 스도쿠', tint='sudoku', glow='var(--sudoku-glow)',
    title='오늘도 무료 스도쿠 · 나인투식스랩',
    meta='답이 하나뿐인 판만 냅니다. 판은 기기 안에서 만들어서 연결이 끊겨도 계속 풀립니다. 웹에서 바로, 스토어 출시 준비 중.',
    og='답이 하나뿐인 판만. 연결이 끊겨도 계속 풀립니다.',
    badge='웹에서 바로 · 스토어 준비 중',
    h1='찍어서 맞히는<br>자리가 없습니다',
    desc='답이 하나뿐인 판만 내보냅니다. 논리만으로 끝까지 풀립니다. 판은 기기 안에서 만들어서, 연결이 끊겨도 계속 풀 수 있습니다.',
    hero_img='sudoku.png', hero_alt='오늘도 무료 스도쿠 시작 화면. 3x3 미니 격자와 특징 세 가지.',
    how=['유일해 보장', '오늘의 퍼즐', '풀던 판 이어하기', '오프라인', '광고로 안 막음'],
    open_href='../lab/sudoku/', open_label='브라우저에서 풀기',
    hint='설치도 로그인도 없이 바로 풀립니다. 원스토어·구글플레이 출시를 준비하고 있습니다.',
    shots=[],
    feats_h2='답은 하나,<br>내 속도로 풀어보세요',
    feats_lead='기기 안에서 문제를 만들고 다시 풀어 확인합니다. 답이 하나인 판을 골라 내보냅니다.',
    feats=[('1개', '답은 하나뿐', '만든 판을 다시 풀어서 답이 하나임을 확인한 것만 내보냅니다. 찍어야 하는 자리가 없습니다.'),
           ('이어하기', '풀던 판 그대로', '잠깐 멈췄다가 다시 열어도 이어집니다. 같은 브라우저에서 하던 판을 계속 풀어보세요.'),
           ('오늘', '오늘의 퍼즐', '날짜가 씨앗입니다. 같은 날에는 누구나 같은 판을 받습니다.'),
           ('기기 안', '퍼즐 생성', '판은 기기 안에서 만듭니다. 지하철에서 연결이 끊겨도 하던 판이 그대로 이어집니다.'),
           ('꽉', '격자가 화면 전체', '상단 바를 없애고 격자를 화면 끝까지 채웠습니다. 숫자 하나하나가 큽니다.'),
           ('0', '판을 막는 광고', '퍼즐은 광고 없이 끝까지 풀립니다. 힌트와 이어풀기만 광고 한 편이고, 안 보면 그냥 내 힘으로 풉니다.')],
    status=[('웹', '지금 바로', '이 페이지의 버튼으로 브라우저에서 풀 수 있습니다. 기록은 그 브라우저에 남습니다.'),
            ('원스토어', '준비 중', '게임 등록 절차를 밟고 있습니다. 끝나면 안드로이드 앱으로 나옵니다.'),
            ('토스', '그 다음', '스토어 출시가 확인되면 토스 미니앱으로도 올립니다.')],
    steps=[('아래 버튼을 누릅니다', '설치 없이 브라우저에서 열립니다.'),
           ('난이도를 고릅니다', '오늘의 퍼즐이나 새 판. 처음이면 쉬움부터.'),
           ('풀다 나가도 됩니다', '다시 열면 하던 판이 그대로 있습니다.')],
    notes=['<strong>웹 버전은 앱과 판이 같습니다.</strong> 토스 광고와 랭킹은 지원하지 않습니다. 진동은 Android Chrome 등 지원하는 브라우저에서만 동작합니다.',
           '기록은 이 브라우저에만 남습니다. 브라우저 데이터를 지우면 같이 지워집니다.',
           '앱은 원스토어와 구글플레이에 순서대로 냅니다. 이 페이지가 먼저 알려드립니다.'],
    others=['beatwave', 'shooter', 'coin', 'krx', 'ai'],
  ),
  'beatwave': dict(
    slug='beatwave',
    name='비트웨이브',
    tint='beatwave',
    glow='var(--beatwave-glow)',
    title='비트웨이브 · 나인투식스랩',
    meta='음악에 맞춰 내려오는 노트를 누르는 리듬게임. 4~8레인과 난이도를 고르고 브라우저에서 바로 플레이합니다. 웹 체험 버전입니다.',
    og='비트를 따라, 나만의 한 판. 브라우저에서 즐기는 리듬게임 비트웨이브.',
    badge='웹 체험 · 개발 중',
    h1='비트를 따라,<br>나만의 한 판.',
    desc='음악에 맞춰 내려오는 노트를 눌러보세요. 레인 수와 난이도를 고르고, 익숙해질 때까지 연습합니다.',
    hero_img='games/beatwave.webp',
    hero_alt='비트웨이브 실제 시작 화면. 초록빛 노트와 게임 시작 버튼.',
    hero_width=780,
    hero_height=1688,
    how=['리듬게임', '4~8레인', '터치 · 키보드', '연습 모드'],
    open_href='https://beatwave-james-k.wjpeain.chatgpt.site/',
    open_label='비트웨이브 플레이',
    hint='설치·로그인 없이 외부 웹 플레이 페이지로 이동합니다. 개발 중인 체험 버전입니다.',
    shots=[('beatwave-select', '비트웨이브 실제 곡 선택 화면. 레인과 난이도, 노트 낙하 속도를 고릅니다.'),
           ('beatwave-play', '비트웨이브 실제 연습 플레이 화면. 음악에 맞춰 내려오는 노트를 누릅니다.')],
    shot_width=780,
    shot_height=1688,
    feats_h2='내 손에 맞는 속도로<br>리듬을 익혀보세요',
    feats_lead='레인과 난이도를 직접 고르고, 연습한 뒤 같은 곡에 다시 도전합니다.',
    feats=[('4~8', '레인을 고릅니다', '이지·노멀·하드 중 난이도를 고릅니다. 노트 낙하 속도도 따로 조절합니다.'),
           ('연습', '끝까지 들어보세요', '실패 없이 수록 구간을 끝까지 연습합니다. 도전 모드에서는 게이지가 소진되면 종료됩니다.'),
           ('기록', '다시 도전할 이유', '단계·레인·난이도별 개인 기록을 남깁니다. 웹 기록은 플레이한 브라우저에 저장됩니다.')],
    steps=[('플레이 버튼을 누릅니다', '웹 페이지에서 ‘게임 시작’을 누릅니다.'),
           ('레인과 난이도를 고릅니다', '처음이라면 이지와 연습 모드부터 시작해 보세요.'),
           ('박자에 맞춰 누릅니다', '터치나 화면에 안내된 키보드 키로 노트를 맞힙니다.')],
    notes=['<strong>개발 중인 웹 체험 버전입니다.</strong> 기능과 화면은 업데이트에 따라 바뀔 수 있습니다. 토스·스토어 정식 출시 버전은 아닙니다.',
           '웹 기록과 설정은 이용한 브라우저에 저장됩니다. 기기 간 동기화는 없으며 브라우저 데이터를 지우면 기록도 지워집니다.',
           '현재 웹 버전에는 실제 광고·유료 결제가 연결되어 있지 않습니다.',
           '기기와 오디오 환경에 따라 입력감이 다를 수 있습니다. 앱 안의 입력 타이밍 보정 설정을 확인해 주세요.'],
    others=['shooter', 'sudoku', 'coin', 'krx', 'ai'],
  ),
  'shooter': dict(
    slug='shooter',
    name='오늘도 출격',
    tint='shooter',
    glow='var(--shooter-glow)',
    title='오늘도 출격 · 나인투식스랩',
    meta='기체를 움직여 적의 탄을 피하고 자동 사격으로 전선을 돌파하는 편대 슈팅게임. 브라우저에서 바로 시작하는 웹 체험 버전입니다.',
    og='피하고, 맞히고. 오늘도 출격. 브라우저에서 바로 시작하는 편대 슈팅게임.',
    badge='웹 체험 · 개발 중',
    h1='피하고, 맞히고.<br>오늘도 출격.',
    desc='기체를 움직여 적의 탄을 피하고, 자동 사격으로 전선을 돌파합니다. 보유한 기체를 골라 나만의 편대를 꾸려보세요.',
    hero_img='games/shooter.webp',
    hero_alt='오늘도 출격 실제 시작 화면. 비행 편대와 부대 문장, 출격 버튼.',
    hero_width=780,
    hero_height=1688,
    how=['편대 슈팅', '드래그 이동', '자동 사격', '기체 성장'],
    open_href='../lab/shooter.html',
    open_label='오늘도 출격 플레이',
    hint='설치 없이 이 사이트의 게임 화면에서 열립니다. 개발 중인 웹 체험 버전입니다.',
    shots=[('shooter-play', '오늘도 출격 실제 전투 화면. 바다 위 기체와 적탄, 자동 사격.'),
           ('shooter-squad', '오늘도 출격 실제 편대 준비 화면. 기체 편성과 출격 버튼.')],
    shot_width=780,
    shot_height=1688,
    feats_h2='손끝으로 피하고,<br>편대로 돌파합니다',
    feats_lead='먼저 출격해 움직임을 익혀보세요. 보유 기체를 바꾸고 강화하며 다시 도전합니다.',
    feats=[('이동', '드래그로 조종', '화면을 누른 채 손가락을 움직여 조종합니다. PC에서는 방향키도 지원합니다.'),
           ('자동', '사격은 맡기세요', '기체가 자동으로 사격합니다. 적의 탄과 이동 경로를 보며 피해 보세요.'),
           ('편대', '기체를 고르는 재미', '보유 기체를 편성하고 강화합니다. 진행에 따라 편대 구성을 넓혀갑니다.')],
    steps=[('플레이 버튼을 누릅니다', '게임 시작 화면에서 ‘출격’을 누릅니다.'),
           ('준비 화면에서 출격합니다', '보유한 기체를 확인하고 아래 ‘출격’ 버튼을 누릅니다.'),
           ('기체를 움직입니다', '손가락으로 드래그하거나 방향키로 이동합니다. 사격은 자동입니다.')],
    notes=['<strong>개발 중인 웹 체험 버전입니다.</strong> 난이도·보상·화면은 업데이트에 따라 바뀔 수 있습니다.',
           '게임 진행과 설정은 이용한 브라우저에 저장됩니다. 브라우저 데이터를 지우면 함께 지워집니다.',
           '체험 버전의 광고·보상 표시는 테스트용입니다. 실제 광고 수익이나 유료 결제가 발생하는 정식 서비스가 아닙니다.'],
    others=['beatwave', 'sudoku', 'coin', 'krx', 'ai'],
  ),
}

BLURB = {
  'beatwave': ('비트웨이브', '비트를 따라, 나만의 한 판'),
  'shooter': ('오늘도 출격', '피하고, 맞히고. 오늘도 출격'),
  'coin': ('해외 코인 선물 챌린지', '잃어도 계좌는 그대로'),
  'krx': ('국내주식 롱숏 챌린지', '국장에서 숏을 쳐봅니다'),
  'saju': ('사주 여덟 글자', '생년월일은 폰 밖으로 안 나갑니다'),
  'ai': ('내 AI 활용 점수는?', '점수 말고 처방'),
  'sudoku': ('오늘도 무료 스도쿠', '답이 하나뿐인 판만'),
}

def esc(s): return s

def page(a):
  tint = 'var(--%s)' % a['tint']
  how = '\n'.join('      <li>%s</li>' % h for h in a['how'])

  shots = ''
  if a['shots']:
    items = '\n'.join(
      '      <li class="rise"><img src="../img/shots/%s.webp" width="%s" height="%s" alt="%s" loading="lazy" decoding="async"></li>'
      % (f, a.get("shot_width", 636), a.get("shot_height", 1048), alt) for f, alt in a['shots'])
    shots = '''
<!-- 화면 둘러보기. 실제 앱 화면 — 옆으로 넘긴다 -->
<section class="sec shots" style="--tint:%s">
  <div class="inner">
    <div class="shots-head">
      <p class="eyebrow rise">화면 둘러보기</p>
      <h2 class="rise">앱 안은 이렇게 생겼습니다</h2>
    </div>
    <ul class="strip">
%s
    </ul>
    <p class="strip-hint rise">옆으로 넘기세요</p>
  </div>
</section>
''' % (tint, items)

  feats = '\n'.join(
    '      <li class="rise"><b>%s</b><h3>%s</h3><p>%s</p></li>' % f for f in a['feats'])

  mid = ''
  if a.get('rank_view'):
    mid = '''
<!--
  지금 숫자. app.js 가 Supabase 공개 뷰에서 읽어 채운다. 읽기 전에는 숨겨 두고,
  못 읽으면 통째로 뺀다 — 빈 표를 남기지 않는다.
-->
<section class="sec" data-rank="%s"%s hidden style="--tint:%s">
  <div class="inner">
    <p class="eyebrow">지금 이 순간</p>
    <h2>%s</h2>
    <p class="lead">%s</p>
    <div class="live">
      <div><b data-n="players">—</b><span>명이 랭킹에 올라 있습니다</span></div>
      <div><b data-n="top">—</b><span>1위 수익률</span></div>
      <div><b data-n="last">—</b><span>마지막 거래</span></div>
    </div>
    <table class="rank">
      <thead><tr><th>순위</th><th>닉네임</th><th style="text-align:right">수익률</th><th style="text-align:right">거래</th></tr></thead>
      <tbody></tbody>
    </table>
    <p class="rank-note">%s</p>
  </div>
</section>
''' % (a['rank_view'], ' data-last="no"' if a.get('no_last') else '', tint, a['rank_h2'], a['rank_lead'], a['rank_note'])
  elif a.get('inout'):
    mid = '''
<!-- 사주는 랭킹 대신 "무엇이 나가고 무엇이 남는지"를 보여준다. 이 앱의 약속이다 -->
<section class="sec" style="--tint:%s">
  <div class="inner">
    <p class="eyebrow rise">약속</p>
    <h2 class="rise">폰 밖으로 나가는 것,<br>안 나가는 것</h2>
    <div class="inout rise">
      <div>
        <h3 class="stay">폰 안에만</h3>
        <ul>
          <li>생년월일과 태어난 시간</li>
          <li>세워진 여덟 글자(명식)</li>
          <li>궁합 상대의 생년월일</li>
          <li>오늘의 운·옷차림 결과</li>
        </ul>
      </div>
      <div>
        <h3>밖으로 나가는 것</h3>
        <ul>
          <li>기상청 날씨 요청 <span>— 사용자가 고른 지역명만</span></li>
          <li>광고 배너 요청 <span>— 토스 광고 SDK 가 보냄</span></li>
          <li>그 외 <span>— 없음</span></li>
        </ul>
      </div>
    </div>
  </div>
</section>
''' % tint
  elif a.get('inout_ai'):
    mid = '''
<!-- AI 진단은 결과의 모양을 보여준다 — 여섯 단계 사다리 -->
<section class="sec" style="--tint:%s">
  <div class="inner">
    <p class="eyebrow rise">여섯 단계</p>
    <h2 class="rise">지금 어느 칸에<br>서 있는지</h2>
    <p class="lead rise">사람이 얼마나 감독해야 하는지로 나눕니다. 매일 에이전트를 돌리는 분은 맨 위 두 칸에서 갈립니다.</p>
    <ol class="ladder rise">
      <li><b>L6</b><h3>여럿 굴리기</h3><p>역할을 쪼개 여러 개를 동시에 맡기고, 어디부터 볼지 선을 그어 둡니다.</p></li>
      <li><b>L5</b><h3>맡기고 검증</h3><p>반복되는 일을 통째로 맡기고, 확인 지점을 문서로 옮겼습니다.</p></li>
      <li><b>L4</b><h3>흐름 설계</h3><p>일을 쪼개서 순서대로 시킬 줄 압니다. 아직 단계마다 내가 붙어 있어야 합니다.</p></li>
      <li><b>L3</b><h3>초안 맡기기</h3><p>초안을 맡기고 고쳐 씁니다. 여기서 대부분 멈춥니다.</p></li>
      <li><b>L2</b><h3>검색 대신</h3><p>검색창에 치던 걸 대화창에 칩니다.</p></li>
      <li><b>L1</b><h3>구경꾼</h3><p>써 보긴 했는데 다시 열 이유를 못 찾았습니다.</p></li>
    </ol>
  </div>
</section>
''' % tint
  elif a.get('status'):
    items = '\n'.join('      <li class="rise"><b>%s</b><h3>%s</h3><p>%s</p></li>' % s for s in a['status'])
    mid = '''
<!-- 스도쿠는 아직 스토어에 없다. 어디까지 왔는지를 숨기지 않는다 -->
<section class="sec" style="--tint:%s">
  <div class="inner">
    <p class="eyebrow rise">지금 어디까지</p>
    <h2 class="rise">웹은 열려 있고<br>스토어는 준비 중입니다</h2>
    <ul class="feats">
%s
    </ul>
  </div>
</section>
''' % (tint, items)

  steps = '\n'.join(
    '      <li class="rise"><i>%d</i><h3>%s</h3><p>%s</p></li>' % (i + 1, t, d) for i, (t, d) in enumerate(a['steps']))
  notes = '\n'.join('      <li class="rise">%s</li>' % n for n in a['notes'])
  others = '\n'.join(
    '    <li><a href="%s.html" style="--tint:var(--%s)"><b><i></i>%s</b><span>%s</span></a></li>'
    % (o, o, BLURB[o][0], BLURB[o][1]) for o in a['others'])

  appjs = '\n<script src="../app.js"></script>' if a.get('rank_view') else ''

  return '''<!doctype html>
<!-- 생성 파일. tools/build_pages.py 가 만든다. 손으로 고치지 말고 그 파일을 고친 뒤 다시 돌릴 것 -->
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s</title>
<meta name="description" content="%(meta)s">
<meta name="theme-color" content="#000000">
<meta property="og:title" content="%(name)s">
<meta property="og:description" content="%(og)s">
<meta property="og:type" content="website">
<meta property="og:image" content="https://ysmilk01-maker.github.io/img/og.png">
<link rel="icon" href="../favicon.png" type="image/png">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<link rel="stylesheet" href="../style.css">
<noscript><style>.rise, .phone.rise { opacity: 1; transform: none; }</style></noscript>
</head>
<body>

<a class="skip" href="#main">본문으로 건너뛰기</a>

<nav class="nav">
  <a class="mark" href="../index.html" aria-label="나인투식스랩 홈">
    <img src="../img/logo.png" width="501" height="78" alt="NINE TO SIX LAB">
  </a>
  <ul>
    <li><a href="../index.html#apps">앱</a></li>
    <li><a href="../index.html#way">만드는 방식</a></li>
    <li><a href="../privacy.html">개인정보</a></li>
  </ul>
</nav>

<main id="main">
<!-- 설명과 실행 버튼을 먼저 읽고, 실제 화면으로 이어진다. -->
<section class="stage app-stage" style="--tint:%(tintvar)s; --glow:%(glow)s">
  <div class="inner">
    <div class="app-intro">
      <a class="back rise" href="../index.html#apps">← 모든 앱</a>
      <p class="badge rise"><i></i> %(badge)s</p>
      <h1 class="rise">%(h1)s</h1>
      <p class="desc rise">%(desc)s</p>
      <a class="open rise" href="%(open_href)s">%(open_label)s <span aria-hidden="true">↗</span></a>
      <p class="hint rise">%(hint)s</p>
      <ul class="how rise">
%(how)s
      </ul>
    </div>
    <div class="phone rise">
      <img src="../img/%(hero_img)s" width="%(hero_width)s" height="%(hero_height)s" alt="%(hero_alt)s" decoding="async">
    </div>
  </div>
</section>
%(shots)s
<!-- 특징. 숫자 하나 + 제목 + 두 줄. 길게 쓰면 안 읽는다 -->
<section class="sec" style="--tint:%(tintvar)s">
  <div class="inner">
    <p class="eyebrow rise">특징</p>
    <h2 class="rise">%(feats_h2)s</h2>
    <p class="lead rise">%(feats_lead)s</p>
    <ul class="feats">
%(feats)s
    </ul>
  </div>
</section>
%(mid)s
<!-- 여는 법 — 밝은 구간 -->
<section class="stage light-stage" style="--tint:%(tintvar)s">
  <div class="inner">
    <p class="eyebrow rise" style="color:var(--muted-light)">여는 법</p>
    <h2 class="rise">세 번이면 됩니다</h2>
    <ol class="steps">
%(steps)s
    </ol>
    <a class="open rise" href="%(open_href)s">%(open_label)s</a>
  </div>
</section>

<!-- 알아둘 것. 작게 쓰지만 빼지 않는다 -->
<section class="sec" style="--tint:%(tintvar)s">
  <div class="inner">
    <p class="eyebrow rise">알아둘 것</p>
    <h2 class="rise">먼저 말씀드립니다</h2>
    <ul class="notes">
%(notes)s
    </ul>
  </div>
</section>

<section class="others">
  <p class="eyebrow">다른 앱</p>
  <ul>
%(others)s
  </ul>
</section>
</main>

<footer class="foot">
  <div class="inner">
    <img class="foot-mark" src="../img/mark.png" width="141" height="78" alt="">
    <dl class="biz">
      <div><dt>상호</dt><dd>나인투식스랩</dd></div>
      <div><dt>대표</dt><dd>김정민</dd></div>
    </dl>
    <div class="foot-links">
      <a href="../privacy.html">개인정보처리방침</a>
      <a href="../index.html">홈</a>
    </div>
    <p class="copy">© 2026 나인투식스랩</p>
  </div>
</footer>

<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js"></script>
<script src="../site.js"></script>%(appjs)s
</body>
</html>
''' % dict(a, hero_width=a.get("hero_width", 1170), hero_height=a.get("hero_height", 2532), tintvar=tint, how=how, shots=shots, feats=feats, mid=mid, steps=steps, notes=notes, others=others, appjs=appjs)


def main():
  os.chdir(SITE)
  for k, a in APPS.items():
    io.open('apps/%s.html' % k, 'w', encoding='utf-8', newline='\n').write(page(a))
    print('wrote apps/%s.html' % k)
  css = io.open('style.css', encoding='utf-8').read()
  add = io.open(os.path.join(HERE, 'detail.css'), encoding='utf-8').read()
  marker = '/* ---------- 상세 페이지 · 본문 ---------- */'
  if marker in css:
    css = css[:css.index(marker)].rstrip('\n') + '\n'
  io.open('style.css', 'w', encoding='utf-8', newline='\n').write(css.rstrip('\n') + '\n' + add)
  print('css appended')
  # 상세 CSS까지 반영한 최종 파일로 해시를 계산해야 이전 버전이 붙지 않는다.
  update_asset_versions(SITE)

if __name__ == '__main__':
  main()
