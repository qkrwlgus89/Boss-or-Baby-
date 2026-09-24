/* Original in-world documents and surface art. Canvas assets stay crisp up close. */
(function(root){
  'use strict';
  function texture(T,kind,playerName='신입사원'){
    const name=String(playerName||'신입사원');
    const c=document.createElement('canvas');c.width=1600;c.height=1000;const p=c.getContext('2d');
    const rect=(x,y,w,h,color)=>{p.fillStyle=color;p.fillRect(x,y,w,h);};
    const text=(s,x,y,size=28,color='#35434c',weight=400)=>{p.fillStyle=color;p.font=`${weight} ${size}px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;p.fillText(s,x,y);};
    const line=(y,x=65,w=1470)=>rect(x,y,w,2,'#dfe4e5');
    const logo=(x,y)=>{rect(x,y,33,33,'#2b6868');rect(x+8,y+8,17,17,'#d6e7de');text('HANMAEUM',x+48,y+27,26,'#2b6868',800);};
    rect(0,0,1600,1000,'#f8f8f4');
    if(['mailList','offerArrived','offer','inbox'].includes(kind)){
      const night=kind==='inbox',list=kind==='mailList'||kind==='offerArrived',arrived=kind==='offerArrived';rect(0,0,1600,58,'#243541');text('●  ●  ●',24,36,20,'#98acb2');text('한마음 메일',710,38,23,'#dee7e7');text(night?'23:47':'09:41',1485,38,22,'#dee7e7');
      rect(0,58,250,942,'#e8eeea');logo(25,93);rect(20,173,210,58,'#2b6868');text('메일 쓰기',74,212,28,'#fff',700);
      ['받은 메일함','중요 메일','보낸 메일함','임시 보관함'].forEach((s,i)=>text(s,34,296+i*62,27,i===0?'#266766':'#78848a',i===0?700:400));
      text(night?'27':kind==='mailList'?'':'1',209,295,26,'#b35f45',800);line(562,25,200);text('내 폴더',34,615,22,'#899695');text('취업 준비',34,667,26);text('휴지통',34,910,25,'#85918e');
      rect(250,58,1350,87,'#fff');text('받은 메일함  /  '+(night?'안 읽은 메일 27':kind==='mailList'?'전체 메일 12':'새 메일 1'),298,112,27,'#6c7c82');
      if(list){
        const rows=arrived
          ? [['한마음컴퍼니 인사팀','[최종 합격] 함께하게 되어 기쁩니다','방금 전'],['커리어 알림','이번 주 채용 공고 모아보기','08:12'],['스터디 모임','면접 스터디 일정 안내','어제'],['도서관','예약 도서 대출 안내','9월 20일'],['나에게','면접 답변 최종 정리','9월 18일']]
          : [['커리어 알림','이번 주 채용 공고 모아보기','08:12'],['스터디 모임','면접 스터디 일정 안내','어제'],['도서관','예약 도서 대출 안내','9월 20일'],['나에게','면접 답변 최종 정리','9월 18일'],['한마음컴퍼니','지원서 접수가 완료되었습니다','9월 12일']];
        rows.forEach((r,i)=>{const y=174+i*136,isNew=arrived&&i===0;rect(278,y,1286,118,isNew?'#fff2d8':i%2?'#f3f5f2':'#fafaf7');if(isNew){rect(278,y,8,118,'#d39a4e');p.strokeStyle='#d39a4e';p.lineWidth=3;p.strokeRect(280,y+2,1282,114);rect(1347,y+27,119,42,'#c17e32');text('NEW',1377,y+58,25,'#fff',800);}rect(308,y+48,11,11,isNew?'#d28b3b':'#aeb9b6');text(r[0],344,y+49,29,isNew?'#255e5e':'#53666a',isNew?800:600);text(r[1],630,y+49,isNew?34:30,isNew?'#203c42':'#526268',isNew?800:400);text(r[2],1468,y+91,24,isNew?'#ad6f2c':'#879390',isNew?700:400);text(isNew?`${name}님, 최종 전형 결과를 안내드립니다.`:'',630,y+91,24,'#8a744f');});
        line(886,278,1286);text(arrived?'새로운 시작이 도착했습니다.':'새 메일을 기다리는 중입니다.',304,944,27,arrived?'#9b6a30':'#8a9794',arrived?700:400);
      }else if(!night){
        text('[최종 합격] 함께하게 되어 기쁩니다',302,222,51,'#213e43',800);
        text('한마음컴퍼니 인사팀',304,286,29,'#2e6364',700);text(`people@hanmaeum.example  →  ${name}`,304,327,24,'#879291');line(361,302,1228);
        text(`안녕하세요, ${name}님.`,306,435,37,'#31464b',600);
        text('한마음컴퍼니의 최종 합격을 진심으로 축하드립니다.',306,505,34);
        text('오래 기다린 첫 출근, 저희가 함께하겠습니다.',306,561,34);
        rect(305,608,1190,167,'#edf2ed');rect(305,608,5,167,'#487c70');
        text('첫 출근 안내',332,653,28,'#306b61',700);text('월요일 오전 9시  /  7층 안내 데스크',332,704,33,'#314c4d',600);text('준비물  신분증 · 통장 사본 · 설레는 마음',332,751,27,'#667773');
        text('작은 팀, 더 큰 가능성. 당신의 시작을 응원합니다.',306,831,31,'#566a67');
        rect(305,874,532,71,'#e9ece9');text(`▤  입사안내_${name}.pdf   248 KB`,326,920,27,'#456462');text('HANMAEUM PEOPLE TEAM',1055,929,24,'#81918c',600);
      }else{
        text('오늘 안에 확인 부탁드립니다.',301,222,49,'#253e46',800);text('안 읽은 메일 27건   ·   업무 종료 기록 없음',303,280,27,'#aa654b');
        const rows=[['전략팀장','RE: 주간 실적 보고서_최종_진짜최종','23:46'],['운영팀장','내일 9시 회의 자료도 같이요','23:32'],['기획팀장','방향만 조금 바꿔봅시다 (전면 수정)','23:18'],['관리팀장','이건 담당자가 없어서 부탁드려요','22:57']];
        rows.forEach((r,i)=>{const y=323+i*92;rect(282,y,1282,86,i===0?'#e7efea':'#f4f5f1');rect(306,y+32,9,9,'#c78259');text(r[0],336,y+39,27,'#2c595c',700);text(r[1],521,y+39,28,'#344950',i===0?700:400);text(r[2],1466,y+39,24,'#86928e');});
        rect(302,746,1195,187,'#e8eee8');rect(302,746,6,187,'#b17953');text('총괄팀장  ·  방금 전',330,792,26,'#946643',700);text(`${name}님 없으면 회사가 안 돌아가.`,330,852,42,'#30454a',700);text('이것만 하고 퇴근해.  읽음 1',330,900,29,'#647974');
      }
    }else if(kind==='badge'){
      logo(92,76);rect(0,190,1600,9,'#327572');text('EMPLOYEE IDENTIFICATION',94,258,29,'#7a898a',700);
      const seed=Array.from(name).reduce((v,ch)=>(v*31+ch.codePointAt(0))>>>0,17),skins=['#efc09b','#dba47e','#c98e67'],hairs=['#2c3038','#4a342e','#222b3b'],skin=skins[seed%skins.length],hair=hairs[(seed>>3)%hairs.length];
      p.save();p.beginPath();p.roundRect(92,316,410,442,22);p.clip();rect(92,316,410,442,'#dce8e2');rect(92,620,410,138,'#9eb9ae');p.fillStyle='#405f68';p.beginPath();p.ellipse(297,740,188,168,0,Math.PI,Math.PI*2);p.fill();rect(266,555,62,92,skin);p.fillStyle=skin;p.beginPath();p.ellipse(297,477,108,137,0,0,Math.PI*2);p.fill();p.fillStyle=hair;p.beginPath();p.ellipse(297,402,111,79,0,Math.PI,Math.PI*2);p.fill();p.beginPath();p.moveTo(190,423);p.quadraticCurveTo(216,330,315,342);p.quadraticCurveTo(392,348,405,433);p.quadraticCurveTo(354,390,297,402);p.quadraticCurveTo(238,388,190,423);p.fill();p.fillStyle='#fff9ec';p.beginPath();p.moveTo(224,636);p.lineTo(297,705);p.lineTo(370,636);p.lineTo(349,758);p.lineTo(245,758);p.closePath();p.fill();p.fillStyle='#2d7070';p.beginPath();p.moveTo(284,667);p.lineTo(310,667);p.lineTo(321,758);p.lineTo(273,758);p.closePath();p.fill();p.strokeStyle='#3c3637';p.lineWidth=9;p.lineCap='round';p.beginPath();p.moveTo(247,476);p.lineTo(273,474);p.moveTo(321,474);p.lineTo(347,476);p.stroke();p.fillStyle='#27343a';p.beginPath();p.arc(261,479,7,0,Math.PI*2);p.arc(333,479,7,0,Math.PI*2);p.fill();p.strokeStyle='#a9635f';p.lineWidth=6;p.beginPath();p.arc(297,531,30,.18,Math.PI-.18);p.stroke();p.restore();p.strokeStyle='#c2d2cd';p.lineWidth=4;p.beginPath();p.roundRect(92,316,410,442,22);p.stroke();
      text(name,580,418,Array.from(name).length>7?66:Array.from(name).length>4?79:94,'#254b4e',800);text('경영지원팀  ·  사원',586,500,38,'#627978',600);line(548,580,865);text('EMPLOYEE  001',586,612,35,'#2d6665',700);text('입사일',586,681,28,'#8a9792');text('2026. 09. 24',734,681,30,'#536e6c',600);text('HANMAEUM COMPANY',586,744,25,'#91a19d',700);
      rect(92,817,1416,2,'#dce3df');text('작은 팀에서 시작하는 큰 첫걸음',94,886,32,'#2e6261',600);for(let i=0;i<70;i++)rect(1110+i*5.2,842,2+(i%3),82,'#30494a');text('HM · 0001',1220,958,24,'#657b76');
    }else if(kind==='report'){
      logo(90,60);text('대외비  /  INTERNAL ONLY',1130,90,27,'#aa7559',700);line(140);
      text('주간 경영 실적 보고서',91,237,67,'#243e47',800);text(`2026년 09월 4주  ·  작성: ${name}  ·  검토: 팀장님 전원`,96,297,29,'#7b8887');
      const heads=['작성','검토','승인'];heads.forEach((h,i)=>{rect(1040+i*155,335,149,120,'#e8eeea');text(h,1080+i*155,371,24);text(i===0?'완료':'대기',1080+i*155,421,29,i===0?'#4e7d65':'#b67954',700);});
      text('01   업무 현황',97,390,34,'#2e6866',800);
      ['진행 중인 업무  27건','금주 완료 업무  18건','추가 요청 사항  수시 접수'].forEach((t,i)=>text(t,100,464+i*49,29));
      line(605);text('02   주요 지표',95,670,34,'#2e6866',800);
      for(let i=0;i<6;i++){const h=55+i*24;rect(100+i*125,907-h,75,h,i===5?'#b8895b':'#68918a');text(['월','화','수','목','금','야근'][i],118+i*125,948,23,'#82908b');}
      text('검토 의견',1000,680,31,'#a77555',700);text('“방향은 좋은데 다시 해보죠.”',1000,736,28);text('최종_v7_수정본.pdf',1000,920,25,'#85968f');
    }else if(kind==='phone'){
      rect(0,0,1600,1000,'#b4c6af');text('HANMAEUM  /  OFFICE LINE',94,145,52,'#3d5947',700);line(198);text('001',91,495,250,'#304b3b',600);text('사장실',94,703,100,'#36503f',700);text('내선 연결 대기',97,861,57,'#5b735d');
    }
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;
  }
  root.IntroArt={texture};
})(window);
