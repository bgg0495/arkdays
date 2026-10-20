// W14(QA A9): sub 를 적지 않은 결정 선택지의 효과 한 줄. apply() 의 fx·헬퍼 호출에서 생성한 뒤 손질했다(돈·역량·지위·위험 순).
// 콘텐츠 파일이 선택지에 sub 를 직접 쓰면 그쪽이 우선이고, 여기도 없으면 엔진 fallbackSub(label 낱말 규칙)가 채운다. 혼인 결정(marry_*)은 엔진이 유형 지참금으로 만든다.
// 형식: 결정 id → { 선택지 k: sub }. 생성 하네스: 21개국×80 + 자연 800생에서 sub 없이 열린 선택지(라벨은 주석).
export const SUBS = {
  home_change: { no: '지금 집 그대로 · 돈 그대로' },   // no=임대로 산다
  dur_brew_taste: { mead: '벌꿀주 쪽 사람들과 관계 ▲ · 행복 ▲', spirit: '증류주 쪽 사람들과 관계 ▲ · 행복 ▲', both: '양쪽 미움 · 행복 ▲ · 건강 ▼ 조금' },   // mead=벌꿀주 쪽 / spirit=증류주 쪽 / both=양쪽을 오간다
  urs_work_march: { front: '밀린 급료 전액(돈 +) · 지위 ▲ · 35% 진압(진로 끝 위험)', back: '한 달치만(돈 + 조금) · 행복 ▼', home: '돈 없음 · 행복 ▼ 조금' },   // front=앞줄에 선다 / back=뒷줄에 선다 / home=집에 있는다
  dur_vote_aquapit: { demolish: '행복 ▲ 조금', keep: '행복 ▲ 조금 · 표는 집니다', drink: '행복 ▲ · 결과는 다음 날' },   // demolish=철거에 찬성 / keep=유지에 찬성 / drink=투표 대신 한 잔
  aeg_deep_witness: { report: '지위 ▲ · 행복 ▼', silent: '변화 없음', listen: '행복 ▲ 조금' },   // report=보고한다 / silent=못 본 것으로 한다 / listen=노래를 끝까지 듣는다
  ibe_inq_blockade: { keep: '지위 ▲ · 행복 ▼▼', food: '지위 ▲ 조금 · 행복 ▼ 조금', open: '지위 ▼ · 40% 책임 추궁(지위 ▼▼)' },   // keep=봉쇄를 유지한다 / food=식량만 넣는다 / open=봉쇄를 푼다
  col_insurance_fake: { buy: '돈 −(중위 30%) · 35% 진짜 억제제 · 65% 진통제', no: '지금 그대로' },   // buy=산다 / no=사지 않는다
  ibe_deep_contact: { no: '지금 그대로', report: '행복 ▼ · 마을 사람이 사라집니다', go: '진로 바뀜(심해 교단) · 행복 ▲' },   // no=가지 않는다 / report=재판소에 알린다 / go=간다
  aeg_reassign: { apply: '60% 재배정 심사(다른 길) · 40% 반려(지위 ▼)', no: '지금 배정 그대로' },   // apply=신청한다 / no=지금 배정에 남는다
  col_frontier_loan: { no: '돈 그대로 · 손으로 갑니다' },   // no=빌리지 않는다
  ibe_inq_qa: { order: '지위 ▲', sea: '지위 ▲ · 아츠 ▲', self: '지위 ▼ · 행복 ▲' },   // order=질서를 지키기 위해 / sea=바다에서 온 것을 막기 위해 / self=나 자신을
  urs_off_side: { marshal: '원수파 소속 · 30% 승급 · 지위 ▲ · 15% 숙청(진로 끝 위험)', tsar: '황궁파 소속 · 지위 ▲ · 행복 ▼ · 15% 군법회의', none: '지위 ▼' },   // marshal=원수 쪽 / tsar=황궁 쪽 / none=둘 다 거른다
  col_office_transfer: { stay: '지금 자리 그대로' },   // stay=그대로 있는다
  sar_court_side: { padishah: '55% 지위 ▲▲·관계 ▲ / 아니면 지위 ▼▼ · 숙청 위험', amir: '55% 지위 ▲▲·관계 ▲ / 아니면 지위 ▼▼ · 숙청 위험', none: '지위 ▼ · 양쪽 명부에 이름' },   // padishah=파디샤 쪽에 선다 / amir=아미르 쪽에 선다 / none=어느 쪽에도 서지 않는다
  col_frontier_recruit: { go: '개척민 진로로 · 도시를 떠납니다', no: '지금 그대로' },   // go=간다 / no=도시에 남는다
  ibe_inq_execute: { exec: '지위 ▲ · 행복 ▼▼' },   // exec=집행한다
  min_boat_harvest: { argue: '50% 돈 +(중위 30%)·지위 ▼ / 50% 지위 ▼▼·행복 ▼', temple: '돈 +(중위 30%) · 지위 ▲ 조금', let: '돈 −(중위 10%) · 행복 ▲ 조금' },   // argue=선착장에서 따진다 / temple=치안관에게 올린다 / let=그냥 넘긴다
  hig_yak_inform: { no: '지위 ▲ · 12% 체포(진로 끝 위험)' },   // no=명함을 버린다
  sir_fam_legal_exit: { stay: '지금 자리 그대로' },   // stay=지금 자리에 남는다
  rim_union_join: { card: '관계 ▲ · 지위 ▼ · 명부에 표시', no: '지금 그대로' },   // card=증만 받고 갱도에 남는다 / no=받지 않는다
  aeg_surface: { stay: '지금 그대로 · 바다에 남습니다' },   // stay=바다에 남는다
  rim_rescue_volunteer: { go: '건강 ▼▼ · 지위 ▲▲ · 10% 사망 · 로도스 눈에 띕니다', wait: '행복 ▼' },   // go=들어간다 / wait=구조대를 기다린다
  sir_fam_betray: { no: '지위 ▲' },   // no=거절한다
  col_insurance_dependent: { no: '한 해 더 버팁니다 · 돈 그대로' },   // no=버틴다
  col_slum_join: { yes: '승급 · 지위 ▲▲ · 밥은 나옵니다', no: '지위 ▼' },   // yes=같이 다닌다 / no=거절한다
  col_bsw_eval: { go: '기량에 따라 10~60% 통과(승급·지위 ▲▲) · 실패하면 탈락' },   // go=평가를 받는다
  sir_newvolsinii_leave: { stay: '지금 자리 그대로' },   // stay=남는다
  rim_pitsinker_deep: { no: '지금 그대로' },   // no=뒤에 선다
  urs_pat_old_man: { let: '행복 ▲ · 지위 ▼ · 20% 들켜서 지위 ▼▼' },   // let=돌려보낸다
  min_civic_ostracism: { rival: '지위 ▲ 조금 · 추방 위험(지위 낮으면 30%)', blank: '행복 ▼ 조금 · 추방 위험(지위 낮으면 30%)' },   // rival=경쟁자 이름을 적는다 / blank=빈 조각을 낸다
  hig_off_overtime: { go: '건강 ▲ 조금 · 지위 ▼' },   // go=막차를 탄다
  hig_ru_winter_hunt: { go: '80% 돈 +(중위 30%)·지위 ▲·건강 ▼ / 20% 맹수(진로 끝 위험)', stay: '행복 ▼ 조금' },   // go=산에 든다 / stay=올해는 두고 본다
  col_office_layoff_list: { me: '진로 끝 · 행복 ▲' },   // me=제 이름을 적는다
  rim_share_demand: { demand: '65% 지위 ▲▲·행복 ▲ / 35% 체포·숙청(진로 끝 위험)', wage: '돈 +(중위 10%) · 지위 ▲ 조금' },   // demand=지분을 요구한다 / wage=임금만 요구한다
  lat_curia_posting: { stay: '지금 청 그대로' },   // stay=지금 청에 남는다
  urs_mine_trade: { no: '지금 그대로', yes: '40% 건강 ▲ / 60% 건강 ▼·행복 ▼' },   // no=빵을 지킨다 / yes=바꾼다
  kje_cou_ascent: { stay: '지금 그대로' },   // stay=남는다
  sam_tri_south_goods: { no: '지금 그대로' },   // no=바꾸지 않는다
  col_gov_fire_order: { obey: '지위 ▲ · 행복 ▼▼ · 30% 스캔들(진로 끝 위험)' },   // obey=명령대로 한다
  col_media_casting: { go: '외모 좋으면 50% 승급·지위 ▲▲ / 아니면 행복 ▼', no: '행복 ▲ 조금' },   // go=저녁을 먹는다 / no=거절한다
  sar_farm_tax: { cattle: '돈 −(중위 30%) · 행복 ▼', double: '내년 갑절 · 행복 ▼ 조금' },   // cattle=가축을 내놓는다 / double=내년에 갑절로 낸다
  sar_trade_black: { sell: '70% 돈 +(중위 120%) / 30% 검문(돈 −·지위 ▼▼)', no: '지금 그대로' },   // sell=판다 / no=팔지 않는다
  urs_univ_inform: { no: '지위 ▲ · 15% 체포(진로 끝 위험)' },   // no=적지 않는다
  bol_child_refuse: { join: '진정한 볼리바르인 예비팀 진로 · 행복 ▼' },   // join=예비팀에 간다
  lei_mus_audition: { skip: '지금 그대로' },   // skip=올해는 내지 않는다
  sir_living_protection: { pay: '돈 −(중위 15%, 감염자는 40%) · 행복 ▼ 조금' },   // pay=낸다
  aeg_hunter_apply: { no: '지금 그대로' },   // no=지원하지 않는다
  yan_office_go_home: { renew: '계약 연장 · 지금 자리 그대로' },   // renew=갱신한다
  lat_debt_notice: { cant: '돈 0 · 50% 공증소 관리 대상(타락 공민 진로)' },   // cant=갚지 못한다
  lat_notary_fallen_post: { yes: '타락자 감독관 소속 · 지위 ▲ · 행복 ▼ 조금', no: '지금 그대로' },   // yes=맡는다 / no=맡지 않는다
  rim_self_exile: { stay: '지금 그대로' },   // stay=남는다
  hig_ins_claim: { claim: '돈 +(중위 12%) · 지위 ▼ · 재직 중이면 20% 감염 판정(진로 끝)' },   // claim=청구한다
  lgm_slum_steal: { no: '지금 그대로' },   // no=가지 않는다
  hig_na_loyalty: { obey: '지위 ▲ · 행복 ▼▼' },   // obey=명을 따른다
  bol_cityhall_bribe: { take: '돈 +(중위 90%) · 행복 ▼ · 25% 탄핵(진로 끝 위험)', return: '지금 그대로', report: '50% 지위 ▲ 좋은 전근 / 50% 지위 ▼▼ 나쁜 전근' },   // take=봉투를 받는다 / return=돌려준다 / report=신고한다
  col_frontier_foreclose: { sell: '땅을 잃습니다 · 진로 몰락(ruin)' },   // sell=땅을 넘긴다
  bol_flee_columbia: { stay: '지금 그대로' },   // stay=남는다
  urs_sol_desert: { stay: '지위 ▲ 조금 · 행복 ▼' },   // stay=남는다
  sam_war_eroded_comrade: { stay: '행복 ▼' },   // stay=천막에서 기다린다
  sir_living_front_job: { no: '지금 가게 그대로' },   // no=가게에 남는다
  urs_mine_escape: { stay: '행복 ▼ 조금 · 수용소 그대로' },   // stay=남는다
  kz_au_recruit: { no: '지금 그대로' },   // no=모르는 척한다
  sir_legal_verdict: { follow: '지위 ▲ · 행복 ▼' },   // follow=뜻대로 한다
  lat_cohors_fire: { fire: '지위 ▲ · 행복 ▼▼', hold: '지위 ▼ · 행복 ▲ 조금 · 15% 전사' },   // fire=명령대로 한다 / hold=총을 내린다
  min_athlete_hymnoi: { go: '38% 승급(도시 대표) · 38% 패배(지위 ▼) · 12% 부상(진로 끝 위험)', skip: '지금 그대로' },   // go=선발에 나간다 / skip=올해는 쉰다
  min_civic_priest: { go: '사제 진로로(감염자는 철회·행복 ▼)', stay: '지금 공직 그대로' },   // go=추천을 받는다 / stay=공직에 남는다
  sar_slave_revolt: { join: '70% 반란 단계(지위 ▲·행복 ▲) / 30% 처형', no: '지금 그대로' },   // join=모임에 나간다 / no=자리에 남는다
  lgm_lgd_bribe: { refuse: '지위 ▲ 조금' },   // refuse=돌려준다
  lgm_shop_takeover: { no: '지금 그대로' },   // no=그만둔다
  bol_champion_enter: { no: '지금 그대로' },   // no=구경만 한다
  yan_shanhai_recruit: { no: '지금 그대로' },   // no=가지 않는다
  lgm_slum_ratking: { no: '돈 + 조금 · 지금 그대로' },   // no=지금대로 한다
  lgm_triad_offer: { no: '지금 그대로' },   // no=거절한다
  urs_farm_leave: { stay: '지금 땅 그대로' },   // stay=땅에 남는다
  kje_cla_outsider_shield: { silent: '지위 ▼ 조금' },   // silent=말하지 않는다
  vi_sch_selfexp: { no: '행복 ▼ · 4년을 기다립니다' },   // no=3년을 기다린다
  vi_con_private_offer: { no: '지금 그대로' },   // no=총은 그만 든다
  kz_kn_bet: { no: '지금 그대로' },   // no=문을 닫는다
  lat_cohors_pathfinder: { report: '지위 ▲', ignore: '변화 없음' },   // report=보고한다 / ignore=못 들은 것으로 한다
  lat_legatus_favor: { no: '지위 ▲ 조금' },   // no=거절한다
  urs_univ_join: { no: '지금 그대로' },   // no=어디에도
  yan_tianshi_north: { no: '지위 ▼ 조금' },   // no=올리지 않는다
  lgm_msg_danger: { no: '지위 ▼ 조금' },   // no=거절한다
  rim_infected_hide: { hide: '숨김 · 행복 ▼ · 지위 ▼' },   // hide=검진을 피한다
  rim_medic_resume: { company: '회사 의료부 인턴 · 승급 · 행복 ▲' },   // company=회사 의료부
  kz_lab_pit: { no: '지금 라인 그대로' },   // no=라인에 남는다
  lei_defect_forge: { no: '행복 ▲ 조금 · 지금 그대로' },   // no=그대로 둔다
  lei_far_inspection_child: { leave: '행복 ▼▼' },   // leave=모른 척한다
  rho_office_transfer: { stay: '함선 그대로' },   // stay=함선에 남는다
  ta_wan_amnesty: { stay: '들판 그대로' },   // stay=들판에 남는다
  com_bsx_sign: { no: '지금 회사 그대로' },   // no=회사에 남는다
  col_law_hide: { hide: '돈 −(중위 150%) · 감염 숨김', no: '지위 ▼▼ · 의뢰인이 떠납니다' },   // hide=바꾼다 / no=그대로 둔다
  lat_monastery_guard: { go: '지위 ▲ · 돈 +(중위 20%) · 건강 ▼ 조금', stay: '행복 ▲ 조금' },   // go=함께 나간다 / stay=빵을 굽는다
  ibe_pirate_relic: { sell: '80% 돈 +(중위 150%)·지위 ▲ / 20% 체포', bury: '지위 ▼ 조금' },   // sell=넘긴다 / bury=다시 묻는다
  sar_zhayedan_volunteer: { no: '지금 그대로' },   // no=자원하지 않는다
  bol_draft_buyout: { pay: '돈 −(중위 80%) · 복무 끝(진로 끝)', no: '복무합니다 · 지금 그대로' },   // pay=낸다 / no=복무한다
  rim_mine_closure: { mine: '다른 광산 소속 · 행복 ▼ 조금' },   // mine=다른 광산으로
  sir_truck_night_job: { no: '지금 그대로' },   // no=하지 않는다
  urs_under_rebel: { stay: '지위 ▲ · 남아서 돕습니다' },   // stay=남아서 돕는다
  hig_north_hide: { hide: '숨김 · 행복 ▼ · 관계 ▼', report: '격리 구역 · 행복 ▼▼' },   // hide=숨긴다 / report=신고한다
  yan_wuxia_challenge: { accept: '기량 따라 35%+ 승리(승급·지위 ▲) / 패배 건강 ▼·지위 ▼ · 30% 부상' },   // accept=받는다
  lgm_fire_enter: { wait: '행복 ▼' },   // wait=기다린다
  hig_nin_refuse: { go: '지위 ▲ · 행복 ▼ · 15% 전사' },   // go=받는다
  hig_pol_pressure: { hand: '지위 ▲ 조금 · 행복 ▼' },   // hand=넘긴다
  lei_quar_concert: { no: '지금 그대로' },   // no=하지 않는다
  vi_gang_duel: { wait: '지금 그대로' },   // wait=때를 기다린다
  ta_dublinn_join: { no: '행복 ▼ 조금' },   // no=밭에 나간다
  rho_field_volunteer: { no: '지금 자리 그대로' },   // no=지금 자리에 남는다
  rho_self_experiment: { no: '지금 그대로' },   // no=적지 않는다
  bol_desert: { stay: '건강 ▼ · 지위 ▲ · 배치를 받습니다' },   // stay=배치를 받는다
  yan_river_join_pirates: { no: '지금 그대로' },   // no=거절한다
};
export default SUBS;
