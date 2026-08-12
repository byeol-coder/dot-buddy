/* Dot Buddy session layer. It works offline first and can be connected to a CRM,
   booking system, or analytics collector by assigning window.DotBuddyIntegration. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = { seen:new Set(), replays:0, startedAt:0, lastPage:'', events:[] };
  const adapter = window.DotBuddyIntegration || {};
  const emit = (type, detail={}) => {
    const event = { type, detail, at:new Date().toISOString(), sessionId: sessionStorage.getItem('dotbuddy.session') || crypto.randomUUID() };
    sessionStorage.setItem('dotbuddy.session', event.sessionId);
    state.events.push(event);
    try { localStorage.setItem('dotbuddy.session.events', JSON.stringify(state.events)); } catch (_) {}
    if (typeof adapter.track === 'function') Promise.resolve(adapter.track(event)).catch(()=>{});
  };
  const captureLead = async lead => {
    const payload = { ...lead, sessionId: sessionStorage.getItem('dotbuddy.session'), capturedAt:new Date().toISOString() };
    if (typeof adapter.captureLead === 'function') return adapter.captureLead(payload);
    if (adapter.leadEndpoint) {
      const response = await fetch(adapter.leadEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if (!response.ok) throw new Error('lead_capture_failed');
      return true;
    }
    return false;
  };
  const padText = () => $('dpLbl') ? $('dpLbl').textContent : '연결 전';
  const cueFor = () => {
    const coach = $('coachText')?.textContent || '';
    return coach === '—' ? '사용자가 손으로 충분히 탐색할 수 있도록, 안내 후 잠시 기다려 주세요.' : coach;
  };
  function update() {
    const label = $('pageLabel')?.textContent || '슬라이드 준비 중';
    const line = $('line')?.textContent || '곧 첫 안내를 시작해요';
    const match = label.match(/(\d+)\s*\/\s*(\d+)/);
    const n = match ? Number(match[1]) : 0, total = match ? Number(match[2]) : 0;
    $('consoleProgress').textContent = total ? `슬라이드 ${n} / ${total}` : '슬라이드 준비 중';
    $('consoleTitleText').textContent = line.length > 55 ? line.slice(0,55) + '…' : line;
    $('consoleRail').style.width = total ? `${n / total * 100}%` : '0%';
    $('consoleCue').textContent = cueFor();
    $('padState').textContent = padText();
    if (label && label !== state.lastPage && n) { state.lastPage = label; state.seen.add(n); emit('slide_viewed',{slide:n,total}); }
    $('seenSlides').textContent = state.seen.size;
    $('replayedSlides').textContent = state.replays;
    if (state.startedAt) $('sessionMinutes').textContent = String(Math.floor((Date.now()-state.startedAt)/60000)).padStart(2,'0') + ':' + String(Math.floor((Date.now()-state.startedAt)/1000)%60).padStart(2,'0');
  }
  function startConsole() {
    $('sessionConsole').hidden = false;
    if (!state.startedAt) { state.startedAt = Date.now(); emit('session_started'); }
    $('serviceStatus').textContent = '체험 진행 중'; update();
  }
  $('consolePrev').addEventListener('click',()=>{ $('prevBtn')?.click(); emit('operator_previous'); });
  $('consoleNext').addEventListener('click',()=>{ $('nextBtn')?.click(); emit('operator_next'); });
  $('consoleSpeak').addEventListener('click',()=>{ state.replays++; $('replayBtn')?.click(); emit('slide_replayed'); update(); });
  $('openSupport').addEventListener('click',()=>{ $('helpBtn')?.click(); emit('parent_help_requested'); });
  $('shareSummary').addEventListener('click',()=>{
    const summary = { exportedAt:new Date().toISOString(), durationSeconds:Math.round((Date.now()-state.startedAt)/1000), slidesViewed:state.seen.size, replays:state.replays, dotpad:padText(), events:state.events };
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(summary,null,2)],{type:'application/json'})); a.download='dot-buddy-session-summary.json'; a.click(); URL.revokeObjectURL(a.href); emit('summary_exported');
  });
  $('serviceHelp').addEventListener('click',()=>{ if(!$('serviceDialog').open) $('serviceDialog').showModal(); });
  const leadDialog=$('leadDialog'), leadForm=$('leadForm'), leadResult=$('leadResult');
  $('openLead').addEventListener('click',()=>{ if(!leadDialog.open) leadDialog.showModal(); emit('lead_nudge_opened',{placement:'header'}); });
  $('leadClose').addEventListener('click',()=>leadDialog.close());
  leadForm.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const email=$('leadEmail').value.trim();
    if (!email || !$('marketingConsent').checked) return;
    const submit=leadForm.querySelector('.lead-submit'); submit.disabled=true; submit.textContent='신청 처리 중…';
    try {
      const delivered=await captureLead({email, marketingConsent:true, source:'dot-buddy-experience'});
      emit('lead_submitted',{source:'dot-buddy-experience',delivered});
      $('leadResultTitle').textContent = delivered ? '신청을 받았습니다.' : '파트너 정보를 확인해 보세요.';
      $('leadResultText').textContent = delivered ? '가까운 공식 파트너도 바로 확인할 수 있어요.' : '리드 저장 시스템이 연결되기 전에는 이메일을 외부로 전송하지 않습니다.';
      leadForm.querySelector('.lead-label').hidden=true; $('leadEmail').hidden=true; $('marketingConsent').closest('label').hidden=true; submit.hidden=true; leadForm.querySelector('.lead-privacy').hidden=true; leadResult.hidden=false;
    } catch (_) { submit.disabled=false; submit.textContent='다시 시도하기'; emit('lead_submit_failed'); }
  });
  document.querySelectorAll('.purchase-link').forEach(link=>link.addEventListener('click',()=>emit('purchase_link_clicked',{destination:link.href,label:link.textContent.trim()})));
  window.addEventListener('pagehide',()=>emit('session_ended',{slidesViewed:state.seen.size,replays:state.replays,currentSlide:state.lastPage}));
  const observer = new MutationObserver(()=>{
    if (!$('main').hidden) startConsole();
    else if (state.startedAt) $('serviceStatus').textContent='체험 준비 중';
    update();
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});
  setInterval(update,1000);
  window.DotBuddySession = { getEvents:()=>state.events.slice(), export:()=>JSON.stringify(state.events), track:emit };
})();
