/* ================= المحرّك الإملائي: رسم الهمزة وألف التنوين والتعليل والتصحيح =================
   صيغة الإدخال «النطقية»: الكلمة مشكولة، وكل همزة تُكتب «ء» بحركتها (أو بأي صورة فتُوحَّد).
   ٱ همزة وصل (تُكتب ألفاً). الفواصل: + بعد سابقة (بِ، فَ، وَ، كَ، لِ، سَ، ال، همزة الاستفهام)،
   ~ تركيب تُعامَل فيه الهمزة متوسطة (لِئَلّا، يومَئذٍ)، | قبل لاحقة (ضمير، ألف الاثنين، واو الجماعة، ان، ات، ون، ين).
   مثال: «ءَبْنَاء|ُكُمْ»، «جُزْءًا»، «قَرَء|ُوا»، «بِ+ءَنَّ». */
var IMLA=(function(){
var H={'َ':'a','ُ':'u','ِ':'i','ْ':'o'},TN={'ً':'a','ٌ':'u','ٍ':'i'};
var HC={a:'َ',u:'ُ',i:'ِ',o:'ْ'},TC={a:'ً',u:'ٌ',i:'ٍ'};
var SH='ّ',HAMZ='ءأإؤئ';
var NOCON='اأإآدذرزوؤءة';           /* حروف لا تتصل بما بعدها */
var HN={a:'مفتوحة',u:'مضمومة',i:'مكسورة',o:'ساكنة'},HV={a:'الفتحة',u:'الضمة',i:'الكسرة',o:'السكون'};
var RANK={i:4,u:3,a:2,o:1},SEAT={i:'ئ',u:'ؤ',a:'أ'},SEATN={'أ':'الألف (أ)','إ':'الألف (إ)','ؤ':'الواو (ؤ)','ئ':'النبرة (ئ)','ء':'السطر (ء)','آ':'ألف المدّ (آ)'};
function connects(c){return !!c&&NOCON.indexOf(c)<0;}
/* تحليل النص إلى حروف بحركاتها */
function parse(s){
  s=String(s).replace(/ـ/g,'').replace(/آ/g,'ءَا').replace(/[أإؤئ]/g,'ء').replace(/ٰ/g,'');
  var T=[],sep=null;
  for(var i=0;i<s.length;i++){
    var ch=s.charAt(i);
    if(ch==='+'||ch==='~'||ch==='|'){sep=ch;continue;}
    if(H[ch]){if(T.length){T[T.length-1].h=H[ch];}continue;}
    if(TN[ch]){if(T.length){T[T.length-1].tn=TN[ch];}continue;}
    if(ch===SH){if(T.length){T[T.length-1].sh=true;}continue;}
    if(ch===' '){T.push({c:' ',sp:true});sep=null;continue;}
    T.push({c:ch,h:null,sh:false,tn:null,sep:sep});sep=null;
  }
  /* ألف تنوين النصب يقرّرها المحرّك: تُحذف إن كُتبت، ويُنقل تنوينها إلى الهمزة */
  for(var j=1;j<T.length;j++){
    var x=T[j],p=T[j-1],end=j===T.length-1||T[j+1].sp;
    if(x.c==='ا'&&end&&p.c==='ء'){if(x.tn==='a'){p.tn='a';x.drop=true;}else if(p.tn==='a'&&!x.h){x.drop=true;}}
  }
  return T.filter(function(t){return !t.drop;});
}
function vow(t){if(!t){return null;}if(t.tn){return t.tn;}if(t.h){return t.h;}if(t.c==='ا'||t.c==='ى'){return 'o';}if((t.c==='و'||t.c==='ي')&&!t.h){return 'o';}return null;}
function isMadd(t){return t&&(t.c==='ا'||((t.c==='و'||t.c==='ي')&&(!t.h||t.h==='o')));}
function wordBounds(T,k){var a=k,b=k;while(a>0&&!T[a-1].sp){a--;}while(b<T.length-1&&!T[b+1].sp){b++;}return [a,b];}
/* يحدّد صورة كل همزة */
function analyze(input,o){
  o=o||{};
  var T=parse(input),notes=[],alts=[];
  for(var k=0;k<T.length;k++){
    var t=T[k];if(t.c!=='ء'){continue;}
    var wb=wordBounds(T,k),P=k>wb[0]?T[k-1]:null,N=k<wb[1]?T[k+1]:null,hh=t.tn||t.h,n={k:k,hh:hh};
    var initial=!P||t.sep==='+';
    var sufStart=N&&N.sep==='|',final=!N||sufStart;
    var ph=P?vow(P):null;
    if(initial&&t.sep!=='~'){
      n.pos='i';
      if(hh==='i'){n.seat='إ';n.rule='i-kasr';}else{n.seat='أ';n.rule='i-fath';}
      if(!hh){n.warn='لم تُشكَّل الهمزة الأولى؛ افترضتُ أنها مفتوحة.';}
      if(t.sep==='+'){n.pref=true;}
      /* همزتان: الثانية ساكنة تُقلب مدّاً */
      if(N&&N.c==='ء'&&N.h==='o'&&!N.sep){N.done=true;if(hh==='a'||!hh){n.seat='آ';n.merge=true;n.rule='i-twin-a';N.drop=true;}else if(hh==='u'){N.repl='و';n.rule='i-twin-u';}else{N.repl='ي';n.rule='i-twin-i';}}
      else if(N&&N.c==='ا'&&!N.h&&!N.sep&&(hh==='a'||!hh)){n.seat='آ';n.merge=true;n.rule='i-madd';}
    }else if(t.done){continue;}
    else if(final&&!(sufStart&&N.c!=='ا')){
      n.pos='f';
      var tnA=t.tn==='a'&&!sufStart;
      if(ph==='a'){n.seat='أ';n.rule='f-a';}else if(ph==='u'){n.seat='ؤ';n.rule='f-u';}else if(ph==='i'){n.seat='ئ';n.rule='f-i';}
      else{n.seat='ء';n.rule=P&&P.c==='ا'?'f-alif':(P&&(P.c==='و'||P.c==='ي')&&!P.h?'f-madd':'f-sukun');}
      if(!ph){n.warn='لم يُشكَّل الحرف الذي قبل الهمزة؛ افترضتُ أنه ساكن.';}
      if(tnA||sufStart){ /* ألف التنوين أو لاحقة أولها ألف */
        var ext=sufStart?'suf':'tn';n.ext=ext;
        if(n.seat==='أ'){
          if(ext==='tn'){n.tnRule='tn-alif';}
          else{var sufTxt=sufText(T,k+1,wb[1]);if(sufTxt==='ا'){n.tnRule='suf-verb-dual';n.altSeat='آ';n.altMerge=true;}else{n.seat='آ';n.merge=true;n.tnRule='suf-merge';}}
        }else if(n.seat==='ء'&&P&&P.c==='ا'){n.tnRule=ext==='tn'?'tn-after-alif':'suf-after-alif';}
        else if(n.seat==='ء'){if(connects(P.c)){n.seat='ئ';n.tnRule=ext==='tn'?'tn-con':'suf-con';}else{n.tnRule=ext==='tn'?'tn-nocon':'suf-nocon';if(ext==='suf'&&P.h==='o'&&P.c!=='و'){n.altSeat='آ';n.altMerge=true;n.altSchool='qiyas';}}n.addAlif=ext==='tn';}
        else{n.tnRule=ext==='tn'?'tn-wy':'suf-wy';n.addAlif=ext==='tn';}
      }
    }else{
      n.pos=final?'fm':'m'; /* fm: متطرفة صارت متوسطة باتصال لاحقة */
      if(!hh){n.warn='لم تُشكَّل الهمزة؛ افترضتُ أنها مفتوحة.';hh='a';}
      if(hh==='i'){n.seat='ئ';n.rule='m-i';}
      else if(P&&P.c==='ي'&&ph==='o'){n.seat='ئ';n.rule='m-ya';}
      else if(P&&P.c==='ا'){if(hh==='a'){n.seat='ء';n.rule='m-alif-a';}else if(hh==='u'){n.seat='ؤ';n.rule='m-alif-u';}else{n.seat=SEAT[ph==='o'?'a':ph]||'أ';n.rule='m-strong';}}
      else if(P&&P.c==='و'&&ph==='o'&&(!P.h||hh==='u'||n.pos==='fm')){if(hh==='a'){n.seat='ء';n.rule='m-waw-a';}else{n.seat='ء';n.rule='m-waw-u';n.altSeat='ؤ';n.altSchool='qiyas';}}
      else if(P&&P.c==='و'&&P.h==='o'&&hh==='a'){n.seat='أ';n.rule='m-lin';n.altSeat='ء';n.altSchool='wline';}
      else{
        if(!ph){n.warn='لم يُشكَّل الحرف الذي قبل الهمزة؛ افترضتُ أنه ساكن.';ph='o';}
        var w=RANK[hh]>=RANK[ph]?hh:ph;n.win=w;n.ph=ph;
        if(w==='o'){n.seat='أ';}else{n.seat=SEAT[w];}n.rule='m-strong';
      }
      /* توالي المثلين */
      if(n.seat==='أ'&&N&&N.c==='ا'&&!N.h){n.seat='آ';n.merge=true;n.rule2='twin-alif';}
      if(n.seat==='ؤ'&&N&&N.c==='و'&&(!N.h||N.h==='o')){n.rule2='twin-waw';n.altSeat=connects(P&&P.c)?'ئ':'ء';n.altSchool='egy';if(n.pos==='fm'&&ph==='a'){n.alt2='أ';}}
      else if(n.pos==='fm'&&n.rule==='m-strong'&&ph==='o'&&(hh==='a'||hh==='u')&&P&&!connects(P.c)){n.altSeat='ء';n.altSchool='keep';n.rule3='keep';}
    }
    n.ph=ph;n.P=P?P.c:null;notes.push(n);
  }
  return {T:T,notes:notes};
}
function sufText(T,a,b){var s='';for(var i=a;i<=b;i++){s+=T[i].c;}return s;}
/* بناء النص من التحليل: يعيد النص (مشكولاً أو مجرّداً) ومواضع الهمزات في النص المجرّد */
function render(A,choice,plain){
  choice=choice||{};
  var T=A.T,out='',pl=0,pos={},byK={},skip={};A.notes.forEach(function(n){byK[n.k]=n;});
  for(var k=0;k<T.length;k++){
    var t=T[k];if(t.drop||skip[k]){continue;}
    if(t.sp){out+=' ';pl++;continue;}
    var n=byK[k],c=t.c,h=t.h,tn=t.tn,sh=t.sh,extra='';
    if(c==='ٱ'){c='ا';h=null;}
    if(t.repl){c=t.repl;h=null;}
    if(n){
      var seat=n.seat,merge=n.merge;
      if(choice[k]==='alt'&&n.altSeat){seat=n.altSeat;merge=!!n.altMerge;}
      else if(choice[k]&&choice[k]!=='alt'){seat=choice[k];merge=seat==='آ'&&T[k+1]&&T[k+1].c==='ا';}
      var addA=n.addAlif;if(choice['tn'+k]!=null){addA=choice['tn'+k];}
      c=seat;if(merge){h=null;if(T[k+1]&&T[k+1].c==='ا'){skip[k+1]=1;}}
      if(addA){extra='ا';}
      pos[k]=pl;
    }
    out+=c;pl++;
    if(!plain){if(sh){out+=SH;}if(tn){out+=TC[tn];}else if(h){out+=HC[h];}}
    if(extra){out+=extra;pl++;}
  }
  return {s:out,pos:pos};
}
function strip(s){return String(s).replace(/[ً-ْٰـ]/g,'').replace(/ٱ/g,'ا').replace(/\s+/g,' ').trim();}
/* التعليل بلغة الطالب */
function why(n){
  var s='',seat=SEATN[n.seat]||n.seat;
  switch(n.rule){
    case 'i-fath':s='همزة في أول الكلمة'+(n.pref?' (دخلت عليها سابقة فبقيت في حكم الأولى)':'')+'، وهي '+HN[n.hh||'a']+'؛ والهمزة الأولى تُكتب على الألف دائماً، فوقها مع الفتح والضم: أ.';break;
    case 'i-kasr':s='همزة في أول الكلمة'+(n.pref?' (دخلت عليها سابقة فبقيت في حكم الأولى)':'')+'، وهي مكسورة؛ فتُكتب تحت الألف: إ.';break;
    case 'i-madd':s='همزة مفتوحة بعدها ألف مدّ في أول الكلمة (وأصلها في مثل «آمن، آثر» همزتان: أَأْمَنَ)؛ تجتمع الألفان فتُكتبان مدّة: آ.';break;
    case 'i-twin-a':s='همزتان: الأولى مفتوحة والثانية ساكنة، فتُقلب الثانية ألفاً وتُكتبان مدّة: آ (أَأْمَنَ ← آمَنَ).';break;
    case 'i-twin-u':s='همزتان: الأولى مضمومة والثانية ساكنة، فتُقلب الثانية واواً: أُؤْمِن ← أُومِن.';break;
    case 'i-twin-i':s='همزتان: الأولى مكسورة والثانية ساكنة، فتُقلب الثانية ياء: إِئْمَان ← إِيمَان.';break;
    case 'f-a':s='همزة متطرفة قبلها فتحة؛ فتُكتب على حرف يناسب حركة ما قبلها: الألف (أ).';break;
    case 'f-u':s='همزة متطرفة قبلها ضمة؛ فتُكتب على الواو (ؤ).';break;
    case 'f-i':s='همزة متطرفة قبلها كسرة؛ فتُكتب على النبرة (ئ).';break;
    case 'f-alif':s='همزة متطرفة قبلها ألف ساكنة؛ فتُكتب مفردة على السطر (ء).';break;
    case 'f-madd':s='همزة متطرفة قبلها حرف مدّ ساكن؛ فتُكتب مفردة على السطر (ء).';break;
    case 'f-sukun':s='همزة متطرفة قبلها حرف ساكن؛ فتُكتب مفردة على السطر (ء).';break;
    case 'm-i':s='همزة متوسطة مكسورة؛ والكسرة أقوى الحركات، فتُكتب على النبرة (ئ) أياً كان ما قبلها.';break;
    case 'm-ya':s='همزة متوسطة قبلها ياء ساكنة؛ فتُكتب على النبرة (ئ) دائماً (هَيْئَة، بِيئَة).';break;
    case 'm-alif-a':s='همزة متوسطة مفتوحة بعد ألف؛ فتُكتب مفردة على السطر (ء) كراهة توالي ألفين في الخط.';break;
    case 'm-alif-u':s='همزة متوسطة مضمومة بعد ألف؛ فتُكتب على الواو (ؤ).';break;
    case 'm-waw-a':s='همزة متوسطة مفتوحة بعد واو ساكنة'+(n.P==='و'&&n.pos==='fm'?'':' (واو مدّ)')+'؛ فتُكتب مفردة على السطر (ء).';break;
    case 'm-lin':s='همزة متوسطة مفتوحة بعد واو ساكنة مفتوح ما قبلها (واو لين)؛ فالقياس أن تُعامل كالمفتوحة بعد ساكن فتُكتب على الألف (أ)، ويكتبها بعضهم على السطر (ء).';break;
    case 'm-waw-u':s='همزة متوسطة مضمومة بعد واو ساكنة؛ فتُكتب على السطر (ء) فراراً من توالي واوين.';break;
    case 'm-strong':s='همزة متوسطة '+HN[n.hh]+' وما قبلها '+(n.ph==='o'?'ساكن':HN[n.ph]+'؛ أي عليه '+HV[n.ph])+'. نقارن '+HV[n.hh]+' و'+HV[n.ph]+'، وأقواهما '+HV[n.win]+'، فتُكتب على '+(SEATN[SEAT[n.win==='o'?'a':n.win]])+'. (ترتيب القوة: الكسرة ← الضمة ← الفتحة ← السكون)';break;
  }
  if(n.tnRule==='tn-con'||n.tnRule==='suf-con'){s=s.replace('فتُكتب مفردة على السطر (ء).','فحقّها أن تُكتب مفردة على السطر (ء)،');}
  if(n.pos==='fm'){s='الهمزة متطرفة في أصلها، لكن اتصلت بها لاحقة فصارت متوسطة وتُطبَّق عليها قواعد المتوسطة: '+s;}
  if(n.rule2==='twin-alif'){s+=' وبعدها ألف مدّ، فتجتمع الألفان وتُكتبان مدّة: آ.';}
  if(n.rule3==='keep'){s+=' ويُبقيها بعضهم على السطر كما كانت متطرفة (جزءَه).';}
  if(n.rule2==='twin-waw'){s+=' وبعدها واو مدّ؛ فالقياس كتابتها على الواو (ؤ)، ويكتبها بعضهم '+(n.altSeat==='ئ'?'على نبرة (ئ)':'على السطر (ء)')+' فراراً من توالي واوين'+(n.alt2?'، ويُبقيها آخرون على الألف كما في الفعل (يقرأون)':'')+'.';}
  switch(n.tnRule){
    case 'tn-alif':s+=' وتنوين النصب لا تُزاد له ألف لأن الهمزة على الألف أصلاً: «ـأً».';break;
    case 'tn-after-alif':s+=' وتنوين النصب هنا بلا ألف، كراهة توالي ألفين بينهما همزة: «ـاءً».';break;
    case 'tn-con':s+=' ومع تنوين النصب تُزاد ألف، ولأن ما قبل الهمزة حرف يتصل بما بعده تُكتب الهمزة على نبرة: «ـئًا».';break;
    case 'tn-nocon':s+=' ومع تنوين النصب تُزاد ألف، ولأن ما قبل الهمزة حرف لا يتصل بما بعده تبقى الهمزة على السطر: «ـءًا».';break;
    case 'tn-wy':s+=' ومع تنوين النصب تُزاد ألف بعدها: «'+n.seat+'ًا».';break;
    case 'suf-merge':s+=' واتصلت بها ألف (ألف التثنية أو الاثنين أو جمع المؤنث) فتجتمع الألفان مدّة: «آ».';break;
    case 'suf-verb-dual':s+=' واتصلت بها ألف الاثنين؛ فتُكتب «أا» على الأشهر، ويجيز بعضهم المدّة «آ».';break;
    case 'suf-after-alif':s+=' واتصلت بها ألف؛ فتبقى على السطر بعد الألف: «اءا».';break;
    case 'suf-con':s+=' واتصلت بها ألف، وما قبلها يتصل بما بعده، فتُكتب على نبرة: «ئا».';break;
    case 'suf-nocon':s+=' واتصلت بها ألف، وما قبلها لا يتصل بما بعده، فتبقى على السطر: «ءا».'+(n.altSeat==='آ'?' ويكتبها بعضهم مدّة «جزآن» قياساً على المتوسطة.':'');break;
    case 'suf-wy':s+=' واتصلت بها ألف فتبقى على صورتها: «'+n.seat+'ا».';break;
  }
  return s;
}
var SCHOOL={
  std:{n:'الرسم القياسي',d:'القياس على قاعدة أقوى الحركتين، وعليه أكثر المناهج والمعاجم الحديثة.'},
  egy:{n:'رسم المدرسة المصرية',d:'يُكتب على النبرة أو السطر فراراً من توالي واوين في الخط، وهو شائع في المطبوعات المصرية وكتب التراث المحققة، وعليه رسم المصحف في كلمات مثل «يَقْرَءُونَ» و«رَءُوف».'},
  dual:{n:'وجه جائز',d:'يجيز بعض المصنّفين كتابة ألف الاثنين مع الهمزة مدّة: «قرآ».'},
  qiyas:{n:'القياس على قاعدة الحركات',d:'هو مقتضى القاعدة العامة، لكنه قليل في الاستعمال، والأشهر كتابتها على السطر.'},
  keep:{n:'إبقاء صورة المتطرفة',d:'يُبقي بعضهم الهمزة على السطر كما كانت قبل اتصال الضمير (جزءَه، جزءُه)، وهو مستعمل في مطبوعات كثيرة، والقياس كتابتها متوسطة.'},
  keep2:{n:'إبقاء صورة الهمزة كما في الفعل',d:'يكتبها بعضهم على الألف كما كانت في «قرأ، يقرأ» (قرأوا، يقرأون)، وهو شائع في الصحافة، ويعدّه كثير من المدققين خلاف القياس.'},
  wline:{n:'على السطر (رسم مستعمل)',d:'يكتبها بعضهم على السطر بعد الواو الساكنة مطلقاً، وهو شائع في مطبوعات كثيرة، والقياس على الألف.'},
  mushaf:{n:'رسم المصحف',d:'الرسم العثماني الذي كُتب به المصحف؛ يُلتزم في كتابة القرآن، ولا يُقاس عليه في الكتابة المعتادة.'},
  old:{n:'رسم قديم ما زال مستعملاً',d:''},
  lex:{n:'رسم آخر مستعمل',d:''}
};
/* الواجهة: يكتب الكلمة ويعطي البدائل والتعليل */
function write(input,o){
  var A=analyze(input,o),R0=render(A),out=R0.s,plain=strip(out);
  var alts=[];
  A.notes.forEach(function(n){
    if(n.altSeat){var ch={};ch[n.k]='alt';var ao=render(A,ch).s;
      var sc=n.rule2==='twin-waw'?'egy':(n.tnRule==='suf-verb-dual'?'dual':(n.altSchool&&SCHOOL[n.altSchool]?n.altSchool:'qiyas'));
      alts.push({out:ao,plain:strip(ao),school:sc,k:n.k});}
    if(n.alt2){var c2={};c2[n.k]=n.alt2;var a2=render(A,c2).s;alts.push({out:a2,plain:strip(a2),school:'keep2',k:n.k});}
  });
  A.notes.forEach(function(n){n.why=why(n);n.at=R0.pos[n.k];});
  var primarySchool=A.notes.some(function(n){return n.rule2==='twin-waw';})?'std':null;
  return {input:input,out:out,plain:plain,notes:A.notes,alts:alts,school:primarySchool};
}
/* ---------- الألف اللينة ---------- */
var HARF_YA=['على','إلى','حتّى','بلى'],MABNI_YA=['لدى','متى','أنّى','الألى'],FOREIGN_YA=['موسى','عيسى','كسرى','بخارى','متّى'];
function layyina(o){ /* o:{w (الكلمة مجرّدة بلا الحرف الأخير), k:kind, n:عدد الحروف, org:'و'|'ي', pya:ياء قبلها} */
  if(o.k==='harf'){return HARF_YA.indexOf(o.w+'ى')>=0?{c:'ى',r:'harf-ya'}:{c:'ا',r:'harf'};}
  if(o.k==='mabni'){return MABNI_YA.indexOf(o.w+'ى')>=0?{c:'ى',r:'mabni-ya'}:{c:'ا',r:'mabni'};}
  if(o.k==='foreign'){return FOREIGN_YA.indexOf(o.w+'ى')>=0?{c:'ى',r:'foreign-ya'}:{c:'ا',r:'foreign'};}
  if(o.name==='يحيى'){return {c:'ى',r:'yahya'};}
  if(o.n===3){return o.org==='و'?{c:'ا',r:'tri-w'}:{c:'ى',r:'tri-y'};}
  if(o.pya){return {c:'ا',r:'more-ya'};}
  return {c:'ى',r:'more'};
}
var LYW={
  'harf':'حرف؛ والحروف تُكتب ألفها قائمة إلا أربعة: على، إلى، حتى، بلى.',
  'harf-ya':'من الحروف الأربعة التي تُكتب ألفها مقصورة: على، إلى، حتى، بلى.',
  'mabni':'اسم مبني؛ والأسماء المبنية تُكتب ألفها قائمة إلا: لدى، متى، أنّى، الأُلى.',
  'mabni-ya':'من الأسماء المبنية المستثناة التي تُكتب ألفها مقصورة: لدى، متى، أنّى، الأُلى.',
  'foreign':'اسم أعجمي؛ والأعجمية تُكتب ألفها قائمة إلا: موسى، عيسى، كسرى، بخارى، متّى.',
  'foreign-ya':'من الأسماء الأعجمية المستثناة التي اشتهرت بالألف المقصورة.',
  'yahya':'«يحيى» علماً تُكتب بالمقصورة للتفريق بينه وبين الفعل «يحيا».',
  'tri-w':'ثلاثية أصل ألفها واو؛ فتُكتب قائمة.',
  'tri-y':'ثلاثية أصل ألفها ياء؛ فتُكتب مقصورة.',
  'more':'فوق الثلاثة، وليس قبلها ياء؛ فتُكتب مقصورة أياً كان أصلها.',
  'more-ya':'فوق الثلاثة، لكن قبلها ياء؛ فتُكتب قائمة كراهة اجتماع ياءين في الخط.'
};
/* ---------- المصحّح ---------- */
var HSET='اأإآؤئءى';
function norm(s){s=String(s).replace(/ک/g,'ك').replace(/ی(?=[\u0600-\u06FF])/g,'ي').replace(/ی/g,'ى').replace(/ە/g,'ه');try{s=s.normalize('NFC');}catch(e){}return strip(s).replace(/[‌‍]/g,'').replace(/[.،,؛!؟?"«»]/g,'').trim();}
/* محاذاة حرفية لاستخراج مواضع الاختلاف */
function diff(a,b){
  var n=a.length,m=b.length,L=[],i,j;for(i=0;i<=n;i++){L[i]=[];for(j=0;j<=m;j++){L[i][j]=0;}}
  for(i=n-1;i>=0;i--){for(j=m-1;j>=0;j--){L[i][j]=a[i]===b[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);}}
  var ops=[];i=0;j=0;
  while(i<n||j<m){
    if(i<n&&j<m&&a[i]===b[j]){i++;j++;continue;}
    if(i<n&&j<m&&L[i+1][j+1]===L[i][j]){ops.push({t:'sub',ai:i,bj:j,a:a[i],b:b[j]});i++;j++;continue;}
    if(j<m&&(i>=n||L[i][j+1]>=L[i+1][j])){ops.push({t:'ins',ai:i,bj:j,b:b[j]});j++;}
    else{ops.push({t:'del',ai:i,bj:j,a:a[i]});i++;}
  }
  return ops;
}
/* item: {ans (الرسم الصحيح)، alts:[{plain,school,note}]، notes (من المحرّك)، why} ؛ pref: المدرسة المعتمدة أو 'all' */
function check(student,item,pref){
  var s=norm(student),ok=norm(item.ans),res={ok:false,given:s};
  if(!s){res.msg='لم تكتب شيئاً.';return res;}
  if(s===ok){res.ok=true;var acc=(item.alts||[]).filter(function(a){return a.acc!==false;});if(acc.length){res.note='ويجوز أيضاً: '+acc.map(function(a){return '«'+(a.full||a.plain)+'» ('+(SCHOOL[a.school]?SCHOOL[a.school].n:a.school)+')';}).join('، ')+'.';}return res;}
  var al=(item.alts||[]).filter(function(a){return norm(a.plain)===s;})[0];
  if(al&&al.acc===false){res.ok=false;res.soft=true;res.msg='«'+s+'» '+(SCHOOL[al.school]?'هو '+SCHOOL[al.school].n+': '+SCHOOL[al.school].d:'رسم خاص')+' والصواب في الكتابة المعتادة: «'+ok+'».';return res;}
  if(al){
    var sc=SCHOOL[al.school]||{n:al.school,d:''};
    if(pref&&pref!=='all'&&al.school!==pref&&!(pref==='std'&&al.school==='dual')){res.ok=false;res.soft=true;res.msg='«'+s+'» رسم صحيح في '+sc.n+'، لكنك اخترت في الإعدادات اعتماد '+(SCHOOL[pref]?SCHOOL[pref].n:pref)+'، وعليه تُكتب: «'+ok+'».';return res;}
    res.ok=true;res.note='رسمك صحيح على '+sc.n+': '+sc.d+' والرسم القياسي: «'+ok+'».';return res;
  }
  /* تشخيص الخطأ */
  var ops=diff(s,ok),R=[];
  ops.forEach(function(op){
    var x=op.a||'',y=op.b||'';
    if(op.t==='sub'&&HSET.indexOf(x)>=0&&HSET.indexOf(y)>=0){R.push({k:'seat',at:op.bj,got:x,want:y});}
    else if(op.t==='sub'&&'ةهت'.indexOf(x)>=0&&'ةهت'.indexOf(y)>=0){R.push({k:'taa',got:x,want:y});}
    else if(op.t==='ins'&&y==='ا'&&op.bj===ok.length-1){R.push({k:'tnadd'});}
    else if(op.t==='del'&&x==='ا'&&op.ai===s.length-1){R.push({k:'tnextra'});}
    else if(op.t==='ins'&&y==='ا'){R.push({k:'alifmiss',at:op.bj});}
    else if(op.t==='del'&&x==='ا'){R.push({k:'alifextra'});}
    else if(op.t==='del'&&HSET.indexOf(x)>=0){R.push({k:'hextra',got:x});}
    else if(op.t==='ins'&&HSET.indexOf(y)>=0){R.push({k:'hmiss',want:y});}
    else{R.push({k:'other'});}
  });
  var st=[],ws=[],nn=item.notes||[];
  function nAt(at){return nn.filter(function(q){return q.at===at;})[0]||null;}
  function addW(w){if(w&&ws.indexOf(w)<0){ws.push(w);}}
  var tnN=nn.filter(function(q){return q.tnRule;})[0];
  R.forEach(function(r){
    if(r.k==='seat'){
      var n=nAt(r.at);
      if(r.want==='آ'){st.push('هنا همزة بعدها ألف مدّ فتُكتبان مدّة «آ»');addW(n?n.why:item.why);}
      else if(r.want==='ا'&&'أإآ'.indexOf(r.got)>=0){st.push('هذه همزة وصل تُكتب ألفاً بلا رأس همزة «ا» لا «'+r.got+'»');addW(item.why);}
      else if('أإ'.indexOf(r.want)>=0&&r.got==='ا'){st.push('هذه همزة قطع فتُرسم «'+r.want+'» لا ألفاً مجرّدة');addW(n?n.why:item.why);}
      else if(r.want==='ى'||r.got==='ى'){st.push('الألف في آخر الكلمة تُكتب هنا «'+r.want+'» لا «'+r.got+'»');addW(item.why);}
      else{st.push('كتبتَ الهمزة على '+(SEATN[r.got]||r.got)+'، والصواب على '+(SEATN[r.want]||r.want));addW(n?n.why:item.why);}
    }
    else if(r.k==='taa'){st.push('كتبتَ «'+r.got+'» والصواب «'+r.want+'»');addW(item.why);}
    else if(r.k==='tnadd'){st.push('نسيتَ ألف تنوين النصب');addW(tnN?tnN.why:item.why);}
    else if(r.k==='tnextra'){st.push('زدتَ ألفاً في آخر الكلمة لا موضع لها');addW(tnN?tnN.why:item.why);}
    else if(r.k==='hmiss'){st.push('سقطت الهمزة «'+r.want+'» من كتابتك');addW(item.why);}
    else if(r.k==='hextra'){st.push('زدتَ «'+r.got+'» في غير موضعها');addW(item.why);}
    else if(r.k==='alifmiss'){st.push('سقطت ألف من كتابتك');addW(item.why);}
    else if(r.k==='alifextra'){st.push('زدتَ ألفاً لا موضع لها');addW(item.why);}
  });
  st=uniqS(st);if(st.length>1){st=[st.slice(0,-1).join('، ')+'، و'+st[st.length-1]];}
  res.msg=(st.length?st.join('، ')+'. ':'الصواب: «'+ok+'». ')+ws.join(' ');
  res.kinds=R.map(function(r){return r.k;});
  return res;
}
function y2(a,b){return a===b;}
function uniqS(a){var s={},o=[];a.forEach(function(x){if(!s[x]){s[x]=1;o.push(x);}});return o;}
/* عنصر سؤال جاهز من صيغة نطقية: يحسب الرسم والبدائل ومواضع الهمزات */
function item(input,extra){
  var W=write(input);
  var it={ph:input,ans:W.plain,full:W.out,notes:W.notes,alts:W.alts.map(function(a){return {plain:a.plain,full:a.out,school:a.school};}),why:W.notes.map(function(n){return n.why;}).join(' ')};
  if(extra){for(var k in extra){it[k]=extra[k];}}
  return it;
}
/* صور خاطئة شائعة (مشكولة) لكلمة: تغيير صورة كل همزة، وزيادة ألف التنوين أو حذفها */
function variants(input){
  var A=analyze(input),W=write(input),okP=[W.plain].concat(W.alts.map(function(a){return a.plain;})),out=[],seen={};
  okP.forEach(function(p){seen[p]=1;});
  function add(ch){var r=render(A,ch).s,p=strip(r);if(!seen[p]){seen[p]=1;out.push(r);}}
  A.notes.forEach(function(n){
    var C=n.pos==='i'?['أ','إ','ا','آ']:['أ','ؤ','ئ','ء'];
    C.forEach(function(c){if(c!==n.seat){var ch={};ch[n.k]=c;add(ch);}});
    if(n.ext==='tn'||(n.pos==='f'&&TN&&false)){var ch2={};ch2['tn'+n.k]=!n.addAlif;add(ch2);var ch3={};ch3['tn'+n.k]=!n.addAlif;ch3[n.k]=n.seat==='ئ'?'ء':(n.seat==='ء'?'ئ':n.seat);add(ch3);}
  });
  return out;
}
/* الصيغة النطقية كما يسمعها الطالب: كل همزة «ء»، وهمزة الوصل «ء» بحركتها، وبلا فواصل */
function spoken(input){
  var t=String(input).replace(/[+~|]/g,'').replace(/^ٱ([\u064E\u064F\u0650])/,'ء$1').replace(/^ٱ/,'ءَ').replace(/ٱ[\u064E\u064F\u0650]?/g,'ا');
  return t.replace(/[أإؤئ]/g,'ء').replace(/آ/g,'ءَا');
}
return {variants:variants,render:render,parse:parse,analyze:analyze,write:write,why:why,strip:strip,norm:norm,check:check,item:item,spoken:spoken,layyina:layyina,LYW:LYW,SCHOOL:SCHOOL,SEATN:SEATN,connects:connects,diff:diff,HN:HN,HV:HV};
})();
if(typeof module!=='undefined'){module.exports=IMLA;}
