document.addEventListener('DOMContentLoaded', () => {

  /* ---------------- 状態管理 ---------------- */
  const state = {
    gender: null,
    birthday: null,
    job: '',
    jobMatchedCandidate: null, // true: 提示した候補から選んだ(想定内) / false: その他で自由入力(想定外)
    feeling: null,
    wish: '',
    priority: null,
  };

  const screens = {
    landing: document.getElementById('screen-landing'),
    step1: document.getElementById('screen-step1'),
    step2: document.getElementById('screen-step2'),
    step3: document.getElementById('screen-step3'),
    result: document.getElementById('screen-result'),
  };

  function goTo(name) {
    Object.values(screens).forEach((el) => el.classList.remove('is-active'));
    screens[name].classList.add('is-active');
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  document.getElementById('btn-start').addEventListener('click', () => goTo('step1'));
  document.getElementById('btn-back-1').addEventListener('click', () => goTo('step1'));
  document.getElementById('btn-back-2').addEventListener('click', () => goTo('step2'));

  /* ---------------- STEP 1: 性別・誕生日 ---------------- */
  const genderButtons = document.querySelectorAll('#q-gender .choice-pill');
  const birthdayInput = document.getElementById('q-birthday');
  const toStep2Btn = document.getElementById('btn-to-step2');

  // カレンダーにあらかじめ入っているデフォルト日付を、初期状態にも反映しておく
  state.birthday = birthdayInput.value || null;

  function checkStep1() {
    toStep2Btn.disabled = !(state.gender && state.birthday);
  }

  genderButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      genderButtons.forEach((b) => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      state.gender = btn.dataset.value;
      checkStep1();
    });
  });

  birthdayInput.addEventListener('change', () => {
    state.birthday = birthdayInput.value || null;
    checkStep1();
  });

  toStep2Btn.addEventListener('click', () => {
    renderJobChoices();
    goTo('step2');
  });

  /* ---------------- STEP 2: 仕事・気持ち ---------------- */
  const jobChoicesContainer = document.getElementById('q-job-choices');
  const jobOtherInput = document.getElementById('q-job-other');
  const jobLabelEl = document.getElementById('q-job-label');
  const feelingButtons = document.querySelectorAll('#q-feeling .choice-card');
  const toStep3Btn = document.getElementById('btn-to-step3');

  function checkStep2() {
    toStep3Btn.disabled = !(state.job.trim() && state.feeling);
  }

  /* 誕生日から星座を判定し、星座傾向にひもづく職業候補を提示する */
  const zodiacRanges = [
    { name: '山羊座', from: [12, 22], to: [1, 19] },
    { name: '水瓶座', from: [1, 20], to: [2, 18] },
    { name: '魚座', from: [2, 19], to: [3, 20] },
    { name: '牡羊座', from: [3, 21], to: [4, 19] },
    { name: '牡牛座', from: [4, 20], to: [5, 20] },
    { name: '双子座', from: [5, 21], to: [6, 21] },
    { name: '蟹座', from: [6, 22], to: [7, 22] },
    { name: '獅子座', from: [7, 23], to: [8, 22] },
    { name: '乙女座', from: [8, 23], to: [9, 22] },
    { name: '天秤座', from: [9, 23], to: [10, 23] },
    { name: '蠍座', from: [10, 24], to: [11, 22] },
    { name: '射手座', from: [11, 23], to: [12, 21] },
  ];

  function getZodiac(birthdayStr) {
    const d = new Date(birthdayStr);
    if (isNaN(d.getTime())) return null;
    const m = d.getMonth() + 1;
    const day = d.getDate();
    for (const z of zodiacRanges) {
      const [fm, fd] = z.from;
      const [tm, td] = z.to;
      if (fm === tm) {
        if (m === fm && day >= fd && day <= td) return z.name;
      } else if (fm > tm) {
        if ((m === fm && day >= fd) || (m === tm && day <= td)) return z.name;
      } else {
        if ((m === fm && day >= fd) || (m === tm && day <= td) || (m > fm && m < tm)) return z.name;
      }
    }
    return null;
  }

  /* デカン(星座を前期・中期・後期の3つに分割)を判定し、職業候補にさらにバリエーションを持たせる */
  function dayOfYearRef(month, day) {
    // うるう年の影響を避けるため、基準年(2001年)に統一して日数を計算する
    return Math.floor((Date.UTC(2001, month - 1, day) - Date.UTC(2001, 0, 1)) / 86400000);
  }

  function getDecan(birthdayStr) {
    const d = new Date(birthdayStr);
    if (isNaN(d.getTime())) return null;
    const m = d.getMonth() + 1;
    const day = d.getDate();

    for (const z of zodiacRanges) {
      const [fm, fd] = z.from;
      const [tm, td] = z.to;
      const wraps = fm > tm; // 山羊座のように年をまたぐ場合

      const inRange = wraps
        ? ((m === fm && day >= fd) || (m === tm && day <= td))
        : ((m === fm && day >= fd) || (m === tm && day <= td) || (m > fm && m < tm));

      if (!inRange) continue;

      let startDoy = dayOfYearRef(fm, fd);
      let endDoy = dayOfYearRef(tm, td);
      let curDoy = dayOfYearRef(m, day);

      if (wraps) {
        // 年またぎ: 12/22始まり基準で計算し直す(12/22を0とする通算日数に変換)
        const toOffset = (doy) => (doy >= startDoy ? doy - startDoy : doy + 365 - startDoy);
        endDoy = toOffset(endDoy);
        curDoy = toOffset(curDoy);
        startDoy = 0;
      }

      const totalLen = endDoy - startDoy + 1;
      const offset = curDoy - startDoy;
      const third = totalLen / 3;

      if (offset < third) return 1;
      if (offset < third * 2) return 2;
      return 3;
    }
    return null;
  }

  const decanLabel = { 1: '前期', 2: '中期', 3: '後期' };

  const zodiacJobHints = {
    牡羊座: ['営業', 'アスリート・スポーツ関連', '土木・建設'],
    牡牛座: ['飲食店勤務', '経理・総務・人事', '美容師'],
    双子座: ['営業', '販売・接客', '教師'],
    蟹座: ['保育士', '医療・介護', '主婦・主夫'],
    獅子座: ['営業', '教師', '芸能・エンターテインメント'],
    乙女座: ['経理・総務・人事', '医療・介護', '保育士'],
    天秤座: ['販売・接客', '美容師', '公務員'],
    蠍座: ['医療・介護', '工場勤務・製造', 'エンジニア・IT'],
    射手座: ['運送・配達・タクシー', '土木・建設', '営業'],
    山羊座: ['公務員', '経営者・自営業', 'エンジニア・IT'],
    水瓶座: ['エンジニア・IT', '教師', '公務員'],
    魚座: ['保育士', '医療・介護', '美容師'],
  };

  /* デカン(前期/中期/後期)ごとに1つ、追加の職業候補を持たせてバリエーションを増やす */
  const zodiacDecanExtra = {
    牡羊座: ['スポーツインストラクター', '起業家', 'イベント企画'],
    牡牛座: ['伝統工芸の職人', '農業関連', 'パティシエ'],
    双子座: ['ライター', '通訳・翻訳', 'ラジオ関連の仕事'],
    蟹座: ['カフェ経営', '福祉関連の仕事', '家庭教師'],
    獅子座: ['舞台・エンタメ関連', '広報・PR', 'イベントプロデューサー'],
    乙女座: ['品質管理の専門職', '編集者', '栄養士'],
    天秤座: ['インテリアコーディネーター', 'ギャラリー運営', '渉外・広報関連'],
    蠍座: ['リサーチャー(調査・分析)', '心理関連の仕事', '醸造・発酵関連'],
    射手座: ['旅行・観光関連', '海外関連の仕事', 'スポーツ関連'],
    山羊座: ['不動産関連', '経営企画', '建築関連の職人'],
    水瓶座: ['NPO運営', 'IT系の新規事業', 'サイエンス関連'],
    魚座: ['アート関連の仕事', 'セラピスト', '写真・映像関連'],
  };

  /* ---------------- 職業の予想エンジン(星座・干支・数秘術・九星気学の複合占い) ---------------- */

  const etoOrder = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  function getEto(year) {
    const idx = ((year - 4) % 12 + 12) % 12;
    return etoOrder[idx];
  }

  const etoJobHints = {
    子: ['営業', '販売・接客'],
    丑: ['経理・総務・人事', '公務員'],
    寅: ['工場勤務・製造', '土木・建設'],
    卯: ['保育士', '美容師'],
    辰: ['エンジニア・IT', '営業'],
    巳: ['医療・介護', 'エンジニア・IT'],
    午: ['運送・配達・タクシー', '営業'],
    未: ['保育士', '医療・介護'],
    申: ['販売・接客', '美容師'],
    酉: ['経理・総務・人事', '公務員'],
    戌: ['土木・建設', '工場勤務・製造'],
    亥: ['工場勤務・製造', '飲食店勤務'],
  };

  function digitSumReduce(numStr) {
    let n = numStr.split('').reduce((a, c) => a + Number(c), 0);
    while (n > 9) n = String(n).split('').reduce((a, c) => a + Number(c), 0);
    return n;
  }

  function getNumerology(birthdayStr) {
    const digits = birthdayStr.replace(/[^0-9]/g, '');
    const n = digitSumReduce(digits);
    return n === 0 ? 9 : n;
  }

  const numerologyJobHints = {
    1: ['営業', '経営者・自営業'],
    2: ['医療・介護', '保育士'],
    3: ['販売・接客', '芸能・エンターテインメント'],
    4: ['経理・総務・人事', 'エンジニア・IT'],
    5: ['運送・配達・タクシー', '営業'],
    6: ['保育士', '医療・介護'],
    7: ['エンジニア・IT', '医療・介護'],
    8: ['工場勤務・製造', '経営者・自営業'],
    9: ['教師', '主婦・主夫'],
  };

  const kyuseiNames = ['一白水星', '二黒土星', '三碧木星', '四緑木星', '五黄土星', '六白金星', '七赤金星', '八白土星', '九紫火星'];
  const kyuseiJobHints = {
    1: ['販売・接客', '営業'],
    2: ['主婦・主夫', '保育士'],
    3: ['営業', 'アスリート・スポーツ関連'],
    4: ['教師', '経理・総務・人事'],
    5: ['土木・建設', '経営者・自営業'],
    6: ['公務員', 'エンジニア・IT'],
    7: ['販売・接客', '芸能・エンターテインメント'],
    8: ['医療・介護', '経理・総務・人事'],
    9: ['教師', '医療・介護'],
  };

  function getKyuseiNumber(birthdayStr) {
    const d = new Date(birthdayStr);
    if (isNaN(d.getTime())) return null;
    let y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    // 節分(2/3〜2/4)より前に生まれた場合は前年の九星気学の年として扱う(簡易的に2/4を境目とする)
    if (m === 1 || (m === 2 && day < 4)) y -= 1;
    const s = digitSumReduce(String(y));
    let starNum = y < 2000 ? 11 - s : 2 - s;
    while (starNum <= 0) starNum += 9;
    while (starNum > 9) starNum -= 9;
    return starNum;
  }

  function getAgeBracket(birthdayStr) {
    const d = new Date(birthdayStr);
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const monthDiff = now.getMonth() - d.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) age -= 1;
    if (age < 30) return '20代以下';
    if (age < 40) return '30代';
    if (age < 50) return '40代';
    return '50代以上';
  }

  /* 年代・性別のゆるやかな傾向による補正(統計データの引用ではなく、あくまで占いの一要素) */
  function getStatsHint(ageBracket, gender) {
    const table = {
      '20代以下_男性': ['営業', '運送・配達・タクシー'],
      '20代以下_女性': ['販売・接客', '保育士'],
      '30代_男性': ['営業', 'エンジニア・IT'],
      '30代_女性': ['販売・接客', '保育士'],
      '40代_男性': ['営業', 'エンジニア・IT'],
      '40代_女性': ['経理・総務・人事', '販売・接客'],
      '50代以上_男性': ['公務員', 'エンジニア・IT'],
      '50代以上_女性': ['主婦・主夫', '医療・介護'],
    };
    return table[`${ageBracket}_${gender}`] || [];
  }

  function computeJobScores(zodiac, birthdayStr, gender) {
    if (!zodiac || !birthdayStr) return [];
    const year = new Date(birthdayStr).getFullYear();
    const eto = getEto(year);
    const numerology = getNumerology(birthdayStr);
    const kyuseiNum = getKyuseiNumber(birthdayStr);
    const ageBracket = getAgeBracket(birthdayStr);
    const statsHint = getStatsHint(ageBracket, gender);

    const scores = {};
    function addVotes(list, weights) {
      (list || []).forEach((job, i) => {
        scores[job] = (scores[job] || 0) + (weights[i] !== undefined ? weights[i] : 1);
      });
    }

    addVotes(zodiacJobHints[zodiac], [3, 2, 1]);
    addVotes(etoJobHints[eto], [2, 1]);
    addVotes(numerologyJobHints[numerology], [2, 1]);
    addVotes(kyuseiJobHints[kyuseiNum], [2, 1]);
    addVotes(statsHint, [1, 1]);

    return Object.entries(scores).sort((a, b) => b[1] - a[1]);
  }

  /* 候補が題材の投票だけでは足りない場合に補充する、全カテゴリの一覧 */
  const allJobCategories = ['エンジニア・IT', '経理・総務・人事', '営業', '販売・接客', '運送・配達・タクシー', '工場勤務・製造', '飲食店勤務', '土木・建設', '医療・介護', '公務員', '保育士', '教師', '主婦・主夫', '美容師', '経営者・自営業', '芸能・エンターテインメント', 'アスリート・スポーツ関連'];

  function getTopJobCandidates(zodiac, birthdayStr, gender, topN) {
    const voted = computeJobScores(zodiac, birthdayStr, gender).map((entry) => entry[0]);
    const result = [...voted];
    for (const cat of allJobCategories) {
      if (result.length >= topN) break;
      if (!result.includes(cat)) result.push(cat);
    }
    return result.slice(0, topN);
  }

  function renderJobChoices() {
    const zodiac = getZodiac(state.birthday);
    const candidates = getTopJobCandidates(zodiac, state.birthday, state.gender, 8);

    jobLabelEl.textContent = '今のお仕事を教えてください';
    document.getElementById('q-job-hint').textContent = '近いものがあれば選んでください';

    let options = [...candidates];
    options.push('その他(自分で入力する)');
    if (options.length === 1) options = ['その他(自分で入力する)'];

    jobChoicesContainer.innerHTML = options.map((label) => `
      <button type="button" class="choice-card" data-value="${label}">${label}</button>
    `).join('');

    jobOtherInput.style.display = 'none';
    jobOtherInput.value = '';
    state.job = '';
    checkStep2();

    jobChoicesContainer.querySelectorAll('.choice-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        jobChoicesContainer.querySelectorAll('.choice-card').forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');

        if (btn.dataset.value === 'その他(自分で入力する)') {
          jobOtherInput.style.display = '';
          jobOtherInput.focus();
          state.job = jobOtherInput.value.trim();
          state.jobMatchedCandidate = false;
        } else {
          jobOtherInput.style.display = 'none';
          state.job = btn.dataset.value;
          state.jobMatchedCandidate = true;
        }
        checkStep2();
      });
    });
  }

  jobOtherInput.addEventListener('input', () => {
    state.job = jobOtherInput.value;
    state.jobMatchedCandidate = false;
    checkStep2();
  });

  feelingButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      feelingButtons.forEach((b) => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      state.feeling = btn.dataset.value;
      checkStep2();
    });
  });

  toStep3Btn.addEventListener('click', () => {
    renderWishChoices();
    goTo('step3');
  });

  /* ---------------- STEP 3: やってみたい仕事 ---------------- */
  const wishChoicesContainer = document.getElementById('q-wish-choices');
  const wishOtherInput = document.getElementById('q-wish-other');
  const wishLabelEl = document.getElementById('q-wish-label');

  /* 星座からの「気になる分野」候補(現職とは違う、少し夢のある方向性) */
  const zodiacDreamJobs = {
    牡羊座: ['起業家', 'スポーツ関連の仕事', 'ツアーガイド', '海外進出関連の仕事'],
    牡牛座: ['パン職人', '陶芸家', '農業', 'ワイン・日本酒に関わる仕事'],
    双子座: ['ライター', 'ラジオパーソナリティ', '通訳・翻訳', '配信・動画関連の仕事'],
    蟹座: ['カフェ経営', '子育て支援の仕事', 'ゲストハウス運営', '料理教室の先生'],
    獅子座: ['舞台・エンタメ関連の仕事', '講演家', 'ブランドオーナー', 'イベントプロデューサー'],
    乙女座: ['整理収納アドバイザー', '図書館司書', '品質管理の専門職', '編集者・校正の仕事'],
    天秤座: ['フラワーショップ経営', 'インテリアコーディネーター', 'ギャラリー運営', 'ブライダル関連の仕事'],
    蠍座: ['リサーチャー', '心理カウンセラー', '醸造家(ワイン・日本酒)', '調査関連の仕事'],
    射手座: ['旅行関連の仕事', 'ダイビングインストラクター', '海外関連の仕事', '登山・アウトドアガイド'],
    山羊座: ['不動産関連の仕事', '伝統工芸の職人', '経営コンサルタント', '老舗店舗の再生・経営'],
    水瓶座: ['NPO運営', '新規事業の立ち上げ', 'サイエンスライター', 'スタートアップ関連の仕事'],
    魚座: ['写真家', 'ヨガインストラクター', 'アートセラピスト', '音楽関連の仕事'],
  };

  /* 今の気持ち(Q4)ごとの、より具体的な「やってみたい仕事」の方向性(4つずつ) */
  const feelingDreamJobs = {
    continue: ['海外拠点での仕事', 'ワーケーション型のフリーランス', '週3日勤務のパートタイム管理職', '地方に移住して働く仕事'],
    unrewarded: ['成果報酬型の営業代行', '独立してのコンサルティング業', '実力主義のベンチャー企業', '自分の名前で仕事をするフリーランス'],
    repetition: ['プロジェクト単位で働く仕事', '季節ごとに違う仕事をする複業', 'イベント関連の仕事', '海外を飛び回る仕事'],
    'other-desire': ['ずっと気になっていた趣味を仕事にする', 'クリエイティブ関連の仕事', '自分の店を持つ', '好きな分野の専門家になる'],
    vague: ['自然の中で働く仕事', '人の役に立つボランティア関連の仕事', 'じっくり学び直してからの転身', '今と全く違う業界を見てみる'],
  };

  function renderWishChoices() {
    const zodiac = getZodiac(state.birthday);
    const dreamJobs = zodiac ? zodiacDreamJobs[zodiac] : [];
    const feelingJobs = feelingDreamJobs[state.feeling] || [];

    wishLabelEl.textContent = 'ちょっとやってみたい仕事は、ありますか？';
    document.getElementById('q-wish-hint').textContent = '気になるものがあれば選んでください。近いものがなければ「その他」へ';

    // 気持ち(Q4)由来4つ + 星座由来4つ = 8択。重複があれば取り除く
    const combined = [...feelingJobs, ...dreamJobs];
    const options = [...new Set(combined)].slice(0, 8);
    options.push('その他(自分で入力する)');
    options.push('特にない');

    wishChoicesContainer.innerHTML = options.map((label) => `
      <button type="button" class="choice-card" data-value="${label}">${label}</button>
    `).join('');

    wishOtherInput.style.display = 'none';
    wishOtherInput.value = '';
    state.wish = '';

    wishChoicesContainer.querySelectorAll('.choice-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        wishChoicesContainer.querySelectorAll('.choice-card').forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');

        if (btn.dataset.value === 'その他(自分で入力する)') {
          wishOtherInput.style.display = '';
          wishOtherInput.focus();
          state.wish = wishOtherInput.value.trim();
        } else if (btn.dataset.value === '特にない') {
          wishOtherInput.style.display = 'none';
          state.wish = '';
        } else {
          wishOtherInput.style.display = 'none';
          state.wish = btn.dataset.value;
        }
      });
    });
  }

  wishOtherInput.addEventListener('input', () => { state.wish = wishOtherInput.value; });

  /* ---------------- 「これから先、大事にしたいこと」(任意) ---------------- */
  const priorityButtons = document.querySelectorAll('#q-priority .choice-card');
  priorityButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      priorityButtons.forEach((b) => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      state.priority = btn.dataset.value;
    });
  });

  /* 「大事にしたいこと」の回答を、提案プール(6件)が持つ既存のtag(気持ちに対応するラベル)に
     マッピングし、selectSuggestions()での優先度ボーナスに再利用する */
  const priorityTagMap = {
    comfort: 'continue',       // 心と時間の余裕 → 無理のない選択を示すcontinueタグ
    reward: 'unrewarded',      // 収入・評価 → 正当な対価を示すunrewardedタグ
    stimulation: 'repetition', // 挑戦・刺激 → 変化を示すrepetitionタグ
    contribution: 'neutral',   // 人の役に立つ実感 → 助言・指導系が多いneutralタグ
    autonomy: 'other-desire',  // 自分の裁量・自由 → 独立志向のother-desireタグ
    none: null,
  };

  document.getElementById('btn-diagnose').addEventListener('click', () => {
    goTo('result');
    runDiagnosis();
  });

  /* ---------------- 職業の翻訳辞書 ---------------- */
  /* 「これまでの経験の本質」を言語化し、意外性のある新しい道につなげる */
  const occupationDictionary = [
    {
      keywords: ['看護師', 'ナース', '看護', '介護', '介護士', '介護福祉士', '医療事務', 'ヘルパー'],
      essence: '人の弱さに寄り添い、支え続ける力',
      peopleFacing: true,
      suggestions: [
        { job: 'キャリアカウンセラー', reason: '相手の状態を見立て、必要な支えを差し出す力は、仕事の悩みに寄り添う場面でも活きます。', episode: '患者さんの状態を見立て、必要な言葉をかけてきた経験は、キャリアに悩む人の話を聞く場面でも活きます。', tag: 'continue',
          detail: {
            points: [
              '看護や介護の現場で身につけた、相手の状態を見立ててから言葉をかけるアセスメント力は、相談者の状況を整理し次の一手を提案するキャリアコンサルティングの土台とそのまま重なります。',
              '国家資格キャリアコンサルタントは専門知識以上に相談者との信頼関係構築力が評価される資格で、対人援助の実務経験がある人ほど現場で早く通用しやすいとされています。',
              '心身の状態に配慮しながら話を引き出す姿勢は、キャリアという繊細なテーマを扱ううえでも安心感につながり、他業種出身者との差別化になります。',
            ],
            links: [
              { title: 'キャリアコンサルタントの仕事内容・なり方・年収・資格などを解説 | 職業情報サイト キャリアガーデン', url: 'https://careergarden.jp/career-counsellor/' },
              { title: 'キャリアカウンセラーは未経験でもなれる？仕事内容や必要な資格をわかりやすく解説｜天職ヒント', url: 'https://ten.1049.cc/magazine/00084/' },
            ],
          },
        },
        { job: '産業保健スタッフ', reason: '医療の知識と、人に寄り添う姿勢を、企業で働く人たちのために使う道があります。', episode: '医療の知識だけでなく、忙しい人に無理なく寄り添ってきた経験が、働く人の健康管理という仕事に直結します。', tag: 'unrewarded',
          detail: {
            points: [
              '産業保健は保健師資格が前提となる求人が多い一方、看護師としての臨床経験は「体調不良の背景を見抜く力」として、健康相談やメンタル不調の早期発見の場面で直接評価されます。',
              '産業保健分野は法定の健康診断対応やストレスチェック制度の運用など企業側の対応義務が広がっており、医療知識を持つ人材の採用ニーズが安定して存在しています。',
              '病棟や在宅の現場で培った「症状の重さを見極めて対応を切り替える判断力」は、産業医と従業員の間に立つ調整役としての立ち位置でも活きます。',
            ],
            links: [
              { title: '産業保健師は辛い？仕事内容や看護師から転職するメリットを解説｜レバウェル看護 お役立ち情報', url: 'https://kango-oshigoto.jp/media/article/42723/' },
              { title: '産業看護師とは？企業の仕事内容や保健師との違い、転職のメリットを解説｜レバウェル看護 お役立ち情報', url: 'https://kango-oshigoto.jp/media/article/2948/' },
            ],
          },
        },
              { job: '終活カウンセラー', reason: '人生の終わりに向き合ってきた経験は、終活を考える人の伴走役になれます。', episode: '命の終わりに寄り添ってきた経験は、これからの人生を整理したい人の背中を押す仕事に、静かに活きます。', tag: 'repetition',
                detail: {
                  points: [
                    '終末期医療や介護の現場で、本人やご家族の「死」への不安に向き合ってきた経験は、終活相談で最も求められる「重いテーマを落ち着いて扱う姿勢」にそのまま直結します。',
                    '終活カウンセラーは実務経験による説得力が重視される資格で、看取りの現場を知っている人材は取得後すぐに相談者からの信頼を得やすい立場にあります。',
                    '高齢化に伴い終活関連サービスの市場は拡大しており、医療・介護の内側を知る相談員への需要は葬儀社や終活関連企業の間で高まっています。',
                  ],
                  links: [
                    { title: '終活カウンセラーとはどういう職業？仕事内容や資格取得の方法についてご紹介', url: 'https://www.sougi.info/column/column_180' },
                    { title: '終活カウンセラーの仕事内容、やりがい、転職理由、年収について', url: 'https://smartsougi-job.jp/contents/column/funeral_counselor' },
                  ],
                },
              },
        { job: '健康経営アドバイザー', reason: '医療知識を、企業の健康経営という予防の視点で活かす道があります。', episode: '病気になった人を見てきた経験は、病気になる前に防ぐ仕組みを企業に提案する仕事でも役立ちます。', tag: 'other-desire',
          detail: {
            points: [
              '健康経営アドバイザーは、医療知識のない人事担当者に代わって「従業員の健康リスクを読み解く目」を持つ人材が評価される資格で、臨床経験がそのまま説得力になります。',
              '企業の健康経営は人的資本経営の一環として国の施策とも連動しており、健康診断結果の見方や保健指導の実務を知る人材へのニーズが年々広がっています。',
              '現場で培った「症状が悪化する前のサインを見抜く感覚」は、休職・離職を未然に防ぐ社内提案の場面で、数値だけでは出せない具体性を加えられます。',
            ],
            links: [
              { title: '健康経営アドバイザーとは？企業側の取得メリットや役割も解説', url: 'https://mediment.jp/blog/health-management-advisor' },
              { title: '健康経営アドバイザーとは？必要性とメリット、資格取得の流れ｜RIZAP法人', url: 'https://business.rizap.jp/column/316/' },
            ],
          },
        },
        { job: '訪問看護でのゆるやかな働き方', reason: '焦らず、これまでのペースを保ちながら関わり方を変える選択もあります。', episode: '今の働き方をすぐに手放さなくても、訪問看護のような形で関わり方を少しずつ変えていく道もあります。', tag: 'vague',
          detail: {
            points: [
              '訪問看護は1件ごとに単独で判断・対応する場面が多く、病棟での多職種連携や急変対応の経験がそのまま「一人で状況を見極める力」として活かせます。',
              '直行直帰やパート勤務など働き方の選択肢が病棟勤務より広く、体力やライフスタイルの変化に合わせて勤務日数や訪問件数を調整しやすい構造になっています。',
              '利用者やご家族と長期的な関係を築く仕事のため、これまで培ってきた「相手のペースに合わせて関わり続ける力」が短期的な成果以上に評価される環境です。',
            ],
            links: [
              { title: '訪問看護で働くメリットとデメリット～魅力・やりがい・働き方は？', url: 'https://www.kango-roo.com/career/guide/article/65/' },
              { title: '訪問看護に転職したい！仕事内容やメリット・デメリットを解説 | キャリアバンクメディカル', url: 'https://www.career-bank.jp/medical/column/column013/' },
            ],
          },
        },
        { job: '医療機器メーカーのサポート担当', reason: '医療知識を、現場を離れた形で活かす道もあります。', episode: '臨床の知識は、医療機器の使い方をサポートする仕事でも、確かな信頼につながります。', tag: 'neutral',
          detail: {
            points: [
              '医療機器メーカーのサポート職では、実際に医療現場で機器を使ってきた経験が「臨床の言葉で使い方を説明できる」強みとなり、営業や技術者だけでは埋められない役割を担えます。',
              'フィールドナースなど臨床経験者を前提とした求人枠が業界内に存在しており、未経験からの異業種転職より門戸が広い傾向にあります。',
              '手術室や病棟で機器トラブルに立ち会ってきた経験は、医療者側が本当に困っている場面を想定したサポート設計に直結し、開発側との橋渡し役としても重宝されます。',
            ],
            links: [
              { title: '看護師から医療機器メーカーへの転職！仕事内容や必要なスキルを紹介 | リフレッシュナース', url: 'https://refresh-nurse.com/85/' },
              { title: 'フィールドナース(クリニカルスペシャリスト）ってどんな仕事？メリット・デメリットから年収まで公開｜看護師ワーカー', url: 'https://tryt-worker.jp/column/iryou/detail/ir42/' },
            ],
          },
        },
],
      uniqueSuggestion: { job: '遺品整理士', reason: '人生の最期に寄り添ってきた経験は、遺されたご家族の気持ちに寄り添う仕事でも活きます。', episode: '命と向き合う現場で培った静かな眼差しは、故人の暮らしの痕跡と丁寧に向き合う仕事において、かけがえのない力になります。',
        detail: {
          points: [
            '遺品整理は単なる片付けではなく、遺されたご家族の心情に配慮しながら作業を進める仕事であり、看取りの現場で悲嘆に寄り添ってきた経験がそのまま信頼につながります。',
            '遺品の中には医療・介護用品や生活歴を物語る品も多く、療養生活を支えてきた視点があると、ご家族への説明や仕分けの判断に実感のこもった言葉を添えられます。',
            '遺品整理士は実務経験がなくても取得できる資格ですが、実際の現場では「人の最期に関わってきた経験」の有無が依頼者からの信頼度を大きく左右します。',
          ],
          links: [
            { title: '遺品整理士とは？国家資格なの？誕生の背景や仕事内容、メリットまで | みんなの遺品整理', url: 'https://m-ihinseiri.jp/article-1/ihinseiri/seirishi/' },
            { title: '遺品整理士とはどんな仕事？取得方法や学べる知識、資格の活かし方などを解説！', url: 'https://www.kaigo-kyuujin.com/oyakudachi/skill/65464' },
          ],
        },
      },
    },
    {
      keywords: ['教師', '教員', '学校の先生'],
      essence: '複雑なことを、相手に合わせてわかりやすく伝える力',
      peopleFacing: true,
      suggestions: [
        { job: '企業研修講師', reason: '教えることのプロとしての経験は、大人向けの研修にもそのまま応用できます。', episode: '同じ内容でも相手のレベルに合わせて説明を変えてきた経験は、社会人研修の現場でそのまま武器になります。', tag: 'continue',
          detail: {
            points: [
              '研修講師の評価軸は知識量ではなく「相手の理解度に合わせて説明の粒度を変える技術」であり、これは日々異なる理解度の生徒に向き合ってきた授業経験そのものです。',
              '教育業界専門の転職市場でも研修講師は独立した職種として求人が存在し、社会人教育のニーズ拡大とともに体系立てて教えられる人材への需要が高まっています。',
              '板書や授業計画で培った「限られた時間で要点を伝える構成力」は、企業研修のカリキュラム設計でもそのまま活かせる実務スキルです。',
            ],
            links: [
              { title: '研修講師の求人・転職情報一覧 | 教育業界専門の転職エージェント「Education Career」', url: 'https://education-career.jp/jp_training' },
              { title: '教員や教師から異業種へ転職は厳しい？後悔する？おすすめの転職先＆攻略法', url: 'https://morejob.co.jp/mirai/teacher-jobchange/' },
            ],
          },
        },
        { job: 'ライター', reason: '伝わる言葉を選ぶ力は、文章という形に置き換えても発揮できます。', episode: '難しいことをかみ砕いて伝えてきた積み重ねは、文章という形に変えても十分に通用します。', tag: 'unrewarded',
          detail: {
            points: [
              '生徒の理解度に応じて説明を組み立て直してきた経験は、読み手を想定して情報の順序や言葉を選ぶライティングの基礎技術とそのまま重なります。',
              '教材や学級通信、進路資料などを日常的に作成してきた経験は、「伝わる文章を締め切りまでに仕上げる」実務力としてそのまま評価対象になります。',
              'フリーランスライターは未経験からでも参入しやすい一方、専門分野の知識を持つ書き手は教育・子育て系など単価の高い分野で重宝される傾向にあります。',
            ],
            links: [
              { title: 'フリーランスライターになるには？仕事の探し方や必要スキルを紹介', url: 'https://freelance-hub.jp/column/detail/610/' },
              { title: '【ライターになるには】仕事内容と年収 | Indeed', url: 'https://jp.indeed.com/career-advice/careers/what-does-a-writer-do' },
            ],
          },
        },
              { job: 'オンライン講座の講師', reason: '教える技術を、場所を選ばない形で多くの人に届けられます。', episode: '教室というひとつの場所で培ってきた伝え方は、画面の向こうの見えない生徒にも通じる普遍的な技術です。', tag: 'repetition',
                detail: {
                  points: [
                    'オンライン講座は対面以上に説明の分かりやすさが評価に直結するため、板書や発問を工夫しながら授業を組み立ててきた経験がそのまま強みになります。',
                    '場所や時間に縛られず教える経験を活かせる働き方で、体力面の負担を抑えながら、これまでの専門知識をより多くの受講者に届けられます。',
                    'プラットフォーム側が講師の実務経験や指導歴を重視する傾向があり、教員としての指導実績はそのまま信頼材料として提示できます。',
                  ],
                  links: [
                    { title: 'オンライン講師の副業の始め方5ステップ｜スキルを活かして在宅で稼ぐコツ | @SOHO', url: 'https://atsoho.com/blog/5-steps-to-start-online-tutor-side-jobs' },
                    { title: 'オンライン講師の副業ってどうなの？仕事内容や魅力、メリットを徹底解説！｜塾講師ステーション情報局', url: 'https://www.juku.st/info/entry/2851' },
                  ],
                },
              },
        { job: 'PTA・地域教育コーディネーター', reason: '学校現場を知っているからこそ、家庭と地域をつなぐ役割ができます。', episode: '教育の現場を見てきた経験は、学校の外で子どもたちを支える仕組みづくりにも活かせます。', tag: 'other-desire',
          detail: {
            points: [
              '学校現場の仕組みや教員の動き方を内側から理解していることは、家庭・地域・学校の三者をつなぐ調整役として、外部の人にはない信頼と説得力を生みます。',
              '学校と地域の協働体制の整備は国の施策としても進められており、学校事情に詳しい人材のニーズは制度面から後押しされています。',
              '保護者対応や行事運営で培ってきた「立場の異なる大人同士をまとめる調整力」は、地域コーディネーターの実務そのものです。',
            ],
            links: [
              { title: '① PTAの基本的な考え方と役割｜一般社団法人 全国PTA連絡協議会', url: 'https://zen-p.net/tp/p271.html' },
            ],
          },
        },
        { job: '図書館司書・学習支援員', reason: '焦らず、教育に関わり続けながら働き方を変える選択もあります。', episode: 'すぐに大きく舵を切らなくても、学びを支える別の立場から関わり続ける道もあります。', tag: 'vague',
          detail: {
            points: [
              '学校図書館や学習支援は教員免許がなくても働ける入り口があり、これまでの授業経験を「学びをサポートする仕事」という形に置き換えながら教育に関わり続けられます。',
              '司書教諭や学校司書は選書や読書指導など専門性が求められる一方、生徒の発達段階を理解している教員経験者は現場に馴染みやすい強みがあります。',
              '学習支援員は個別対応が中心のため、一斉授業とは異なる「一人ひとりのペースに合わせて教える」力を発揮できる働き方です。',
            ],
            links: [
              { title: '図書館司書とは？仕事内容、資格を働きながら取る方法、給与についても解説！', url: 'https://www.brush-up.jp/theme/childcare/librarian' },
              { title: '学校の図書館で働きたい！司書を目指すなら 知っておきたい採用の特徴 | 教員採用、教員募集のE-Staff', url: 'https://www.e-staff.jp/reading/18374' },
            ],
          },
        },
        { job: '教材制作・出版関連の仕事', reason: '教える経験を、教材という形に残す仕事に活かせます。', episode: '教室で培った「伝わる工夫」は、教材を作る仕事にも、そのまま活きます。', tag: 'neutral',
          detail: {
            points: [
              '教材制作の現場では「生徒がどこでつまずくか」を具体的に想像できる人材が重宝され、実際に授業をしてきた経験は企画段階から執筆・編集の強みになります。',
              '教育出版社や教材制作会社では教員経験者を対象にした執筆・監修の求人が一定数存在し、現場感覚を反映した教材開発への需要は継続的にあります。',
              '単元をどう構成すれば理解が積み上がるかという「授業設計の感覚」は、教材の目次立てや問題配列を考えるうえでそのまま活かせます。',
            ],
            links: [
              { title: '教材開発・教材制作への転職でよくある募集職種・必要なスキル・経験 | Education Career', url: 'https://education-career.jp/magazine/career/2018/kyouzai-kaihatu/' },
              { title: '教材執筆・問題作成者の求人・募集まとめ（フリー・在宅・業務委託） | ハロワカ？', url: 'https://www.harowaka.com/kyozai/sippitsu/' },
            ],
          },
        },
],
      uniqueSuggestion: { job: 'キャンプ場運営・野外教育インストラクター', reason: '教える経験を、教室の外、自然の中の学びの場に置き換える道もあります。', episode: '相手のレベルに合わせて伝え方を変えてきた力は、天候も反応も読めない自然の中でこそ、真価を発揮します。',
        detail: {
          points: [
            '野外教育は「安全管理をしながら子どもの学びを引き出す」仕事であり、教室の内外を問わず子どもの様子を見ながら指導してきた経験がそのまま基盤になります。',
            '日本キャンプ協会などが認定するキャンプ指導者資格は教育や保育に携わった経験者が取得しやすい設計になっており、実務に近い形で挑戦できます。',
            '自然の中での体験学習は学校教育の枠外でも需要が高まっており、教育的な視点を持って活動を設計できる指導者は施設側から求められています。',
          ],
          links: [
            { title: 'キャンプ指導者資格について - 日本キャンプ協会', url: 'https://camping.or.jp/leader' },
            { title: 'キャンプインストラクター - 日本キャンプ協会', url: 'https://camping.or.jp/leader/instructor' },
          ],
        },
      },
    },
    {
      keywords: ['経理', '会計', '総務', '事務', '人事'],
      essence: '細部を見落とさず、正確に積み上げていく力',
      peopleFacing: false,
      suggestions: [
        { job: 'ファイナンシャルプランナー', reason: '数字と誠実に向き合ってきた姿勢は、個人のお金の相談に乗る仕事でも信頼につながります。', episode: '数字のズレを見逃さず、こつこつ確認してきた姿勢は、お金の相談に乗る仕事で大きな信頼につながります。', tag: 'continue',
          detail: {
            points: [
              'FP資格そのものより「数字を正確に扱ってきた実務経験」が相談者からの信頼を左右するため、経理での実務年数は資格取得後すぐに説得力として活きます。',
              'FPは資格単体では仕事につながりにくいとも言われますが、企業の数字を見てきた経験と組み合わせることで、保険・不動産会社などの相談業務で優位に働くケースがあります。',
              '家計や資産という「他人のお金」を扱う仕事のため、経理で培った誠実な数字管理の姿勢が、相談者との継続的な信頼関係の土台になります。',
            ],
            links: [
              { title: 'ファイナンシャルプランナーの資格を転職時に活かすには？ 有利な転職先は？ | HUPRO MAGAZINE', url: 'https://hupro-job.com/articles/191' },
              { title: 'ファイナンシャルプランナー（FP3級）は転職・就職に有利？資格を活かせる仕事を紹介', url: 'https://www.career-adv.jp/recruit_info/career/860/' },
            ],
          },
        },
        { job: '士業事務所のアシスタント', reason: '正確さと粘り強さが求められる仕事との相性が良い傾向にあります。', episode: '正確な処理を積み重ねてきた実績は、専門家のそばで仕事をする際に、そのまま評価されるポイントになります。', tag: 'unrewarded',
          detail: {
            points: [
              '税理士・社労士事務所では複数クライアントの書類を正確かつ期限内に処理し続ける実務力が最も評価され、経理での月次・年次業務の経験がそのまま実務適性として見られます。',
              '簿記の知識や伝票処理の経験があると未経験からの応募でも書類選考の通過率が上がりやすく、経理経験者向けの求人枠が士業事務所には一定数存在します。',
              '細部のミスが顧客の税務・労務リスクに直結する仕事のため、これまで数字と誠実に向き合ってきた姿勢そのものが採用の決め手になりやすい業界です。',
            ],
            links: [
              { title: '未経験で税理士事務所に転職できる？仕事内容や向いている人の特徴など | MS-Japan', url: 'https://www.jmsc.co.jp/knowhow/topics/11816.html' },
              { title: '簿記2級で経理や会計事務所に転職できる？未経験から採用されるコツを解説 | MS-Japan', url: 'https://www.jmsc.co.jp/knowhow/topics/11740.html' },
            ],
          },
        },
              { job: '補助金・助成金の申請サポート', reason: '書類の正確さと制度理解を、事業者支援という形で活かせます。', episode: '細かい書類仕事を積み重ねてきた経験は、複雑な申請書類を代行する仕事にそのまま直結します。', tag: 'repetition',
                detail: {
                  points: [
                    '補助金申請は書類の記載ミスや期限管理の甘さが不採択に直結するため、経理で培った「正確に書類を積み上げる力」がそのまま成果に結びつく仕事です。',
                    '国や自治体の補助金・助成金制度は年々増加しており、申請書類の作成を代行・支援する専門人材への需要は中小企業を中心に高まっています。',
                    '制度の細かな要件を正しく読み解き、事業者の実情に落とし込む作業は、経理で複雑な規程や税制を扱ってきた経験と親和性が高い業務です。',
                  ],
                  links: [],
                },
              },
        { job: '家計相談アドバイザー', reason: '数字を扱ってきた誠実さを、個人の家計という身近な相談に活かせます。', episode: '会社のお金と誠実に向き合ってきた姿勢は、家庭のお金の悩みに寄り添う仕事にも通じます。', tag: 'other-desire',
          detail: {
            points: [
              '家計相談は家庭という小さな組織の経理をサポートする仕事とも言え、企業の帳簿を正確に管理してきた経験がそのまま家計の見える化という相談内容に応用できます。',
              '家計アドバイザーは民間資格で、数字を扱う実務経験がある人ほど相談者の状況を素早く整理し、具体的な改善提案につなげやすい傾向があります。',
              '節約テクニックではなく「収支の構造を見抜く力」が求められる仕事のため、経理として損益を読み解いてきた視点がそのまま相談の質を高めます。',
            ],
            links: [
              { title: '家計アドバイザーとは | NPO法人日本家計アドバイザー協会', url: 'http://www.kakei-adviser.jp/wp/adviser' },
              { title: '家計整理アドバイザー２級講座（基礎コース） | 日本ホームアドバイザー協会', url: 'https://homeadv.jp/level2-2/' },
            ],
          },
        },
        { job: '在宅での経理代行', reason: '焦らず、今のスキルを活かしながら働き方だけを変える選択もあります。', episode: '大きく分野を変えなくても、働く場所や時間を変えるだけで、見える景色が変わることがあります。', tag: 'vague',
          detail: {
            points: [
              'クラウド会計の普及により複数の中小企業やフリーランスの経理業務を在宅で請け負う働き方が広がっており、実務経験者への需要はクラウドソーシングを中心に安定しています。',
              '経理代行は「言われたことをやる」だけでなく記帳から月次試算表の作成まで一人称で回せる実務力が求められるため、経験年数がそのまま単価に反映されやすい仕事です。',
              '出社や勤務時間の制約が少なく、これまでの専門性を活かしながら、体力やライフスタイルの変化に合わせて働き方だけを変えられる選択肢です。',
            ],
            links: [
              { title: 'フリーランス経理とは？仕事内容・年収相場・必要スキルとメリット・デメリット | MS-Japan', url: 'https://www.jmsc.co.jp/knowhow/topics/12469.html' },
              { title: 'フリーランス経理として働くには？必要スキルや資格、月収目安を紹介 | ITプロマガジン', url: 'https://itpropartners.com/blog/22915/' },
            ],
          },
        },
        { job: '経理・総務のコンサルタント', reason: '培ってきた実務知識を、他社の仕組みづくりに活かせます。', episode: '自社で積み上げてきた経理の型は、他の会社の仕組みを整える仕事でも、そのまま価値になります。', tag: 'neutral',
          detail: {
            points: [
              '経理コンサルタントは自社の業務を「仕組みとして言語化し、他社に再現可能な形で伝える力」が求められ、長年の実務経験そのものが提供価値になります。',
              'バックオフィスの効率化や内部統制の整備は多くの企業にとって継続的な課題であり、実務を知る人材によるコンサルティング需要は管理部門特化型の業界で安定しています。',
              '制度変更や税制改正に対応し続けてきた経験は、他社の経理・総務体制を診断し改善提案するうえで、机上の知識だけでは出せない説得力を持ちます。',
            ],
            links: [
              { title: '経理コンサルタントとは？仕事内容と求められるスキル - 転職サービスのムービン', url: 'https://www.movin.co.jp/column/column168.html' },
              { title: '経理コンサルタントとは？業務内容・依頼先・必要なスキルを解説', url: 'https://bizneko.jp/column/accounting-consultant/' },
            ],
          },
        },
],
      uniqueSuggestion: { job: '骨董品・古物の鑑定士', reason: '数字の細部を見逃さない目は、物の真贋を見極める仕事にも通じます。', episode: '小さな不整合も見逃さず確認し続けてきた姿勢は、真贋を分ける微細な違いを見抜く仕事において、そのまま武器になります。',
        detail: {
          points: [
            '鑑定士の仕事は「わずかな違いを見逃さず、正確に見極める目」が本質であり、伝票や数字の細部にこだわってきた経理の仕事の姿勢とそのまま重なります。',
            '骨董品鑑定は経験の蓄積がものを言う世界で、資格取得後も地道な実物確認の積み重ねが評価につながる点は、日々の記帳や照合業務と似た構造を持っています。',
            '感覚ではなく根拠に基づいて真贋を判断する姿勢が求められるため、数字という客観的根拠に基づいて仕事をしてきた経験が、鑑定業務への説得力ある土台になります。',
          ],
          links: [
            { title: '鑑定士ってどんな仕事？ | 吉岡美術', url: 'https://www.kottou-kaitori.jp/blog-detail/895/' },
            { title: '骨董品鑑定士というお仕事とは？鑑定士になるには？', url: 'https://fk-vintage.com/an-antique-appraiser/' },
          ],
        },
      },
    },
    {
      keywords: ['営業'],
      essence: '人との関係を築き、数字という結果に落とし込む力',
      peopleFacing: true,
      suggestions: [
        { job: '独立系の営業代行・コンサルタント', reason: 'これまで培った関係構築力を、特定の会社ではなく自分の看板で活かす道があります。', episode: '特定の商品を売る力ではなく、人との関係を築く力そのものを、自分の看板で使う道があります。', tag: 'continue',
          detail: {
            points: [
              '営業代行は、扱う商品知識よりも「初対面の相手と短期間で信頼関係を築く力」が最も評価される仕事です。日々新しい商談相手に向き合ってきた経験が、そのまま強みになります。',
              '成果報酬型の契約が主流のため、数字で結果を示すことに慣れている点は大きな武器になります。',
              '会社の看板に頼らず、自分の実績で契約を獲得する働き方のため、これまでの営業成績や紹介実績が、そのまま自分自身の価値になります。',
            ],
            links: [
              { title: '営業代行フリーランスってどんな働き方？必要スキルや案件獲得方法を解説！', url: 'https://coeteco.jp/articles/13133' },
              { title: 'フリーランス営業代行の始め方！仕事内容や年収、案件獲得のコツを解説', url: 'https://freeconsultant.jp/column/c441/' },
            ],
          },
        },
        { job: 'カスタマーサクセス', reason: '売ることだけでなく、相手を成功に導く力として応用できます。', episode: '契約を取るまでで終わらせず、その後の関係を大切にしてきた姿勢は、顧客の成功を支える仕事にそのまま向いています。', tag: 'unrewarded',
          detail: {
            points: [
              'カスタマーサクセスで評価されるのは新規開拓力より「契約後も顧客と伴走し、解約の兆候を早期に察知する力」です。長年の関係構築経験がそのまま活きます。',
              '成果が個人の売上ではなく顧客の継続率で測られる仕事のため、目先の数字より信頼を積み上げてきた営業スタイルほど評価されやすい構造です。',
              'SaaS企業を中心に導入が進み、専任のカスタマーサクセス職は人材の絶対数が追いついていない分野のため、現場感覚を持つ人材への需要が続いています。',
            ],
            links: [
              { title: '未経験からSaaSカスタマーサクセス転職に挑戦！【仕事内容/必要なスキル/向いている人】', url: 'https://careerladder.jp/salesladder/blog/1676/' },
              { title: 'カスタマーサクセスへの転職は未経験でも可能？仕事内容や向かない人の特徴も解説', url: 'https://consulgo.jp/article/customer-success-inexperienced-recruitment/' },
            ],
          },
        },
              { job: 'クラウドファンディングの企画運営', reason: '人を巻き込み、共感を集める力を、プロジェクト単位で発揮できます。', episode: '商品を売るのではなく想いを伝えてきた経験は、共感を資金に変えるクラウドファンディングの仕事と相性が良いです。', tag: 'repetition',
                detail: {
                  points: [
                    '成否を分けるのは商品力以上に「なぜ応援したくなるのか」を言語化し、支援者との対話を積み重ねる力で、対人折衝の経験がそのまま活きます。',
                    'プロジェクト単位の短期集中型のため、長期の関係構築より「限られた期間で信頼を獲得する」営業スキルとの相性が良い仕組みです。',
                    '個人・中小事業者の資金調達手段として定着しており、企画から広報までを一人で伴走できる人材へのニーズが増えています。',
                  ],
                  links: [
                    { title: '【個人向け】クラウドファンディングのやり方を徹底解説！成功事例も紹介', url: 'https://camp-fire.jp/academy/articles/crowdfunding-personal-method-success-tips' },
                    { title: 'クラウドファンディングの始め方｜初心者向けに種類・仕組み・おすすめサイト・成功のコツを解説', url: 'https://stores.fun/magazine/articles/how-to-start-crowdfunding' },
                  ],
                },
              },
        { job: '講演・研修講師', reason: '説得力のある話し方を、営業以外の場でも伝える仕事に活かせます。', episode: '商談で鍛えてきた「伝わる話し方」は、研修やセミナーの講師業でもそのまま武器になります。', tag: 'other-desire',
          detail: {
            points: [
              '研修講師に必要なのは知識量ではなく、自分の営業経験を「他者が再現できる型」に翻訳する力で、数字を作ってきた経験の厚みがそのまま説得力になります。',
              '座学より体験談を交えた実践型研修の需要が高く、現場で結果を出してきた人材でなければ語れない内容が、そのまま商品価値になる仕事です。',
              '企業の人材育成投資が拡大する中、理論だけでなく実務経験に基づいて教えられる講師は不足しており、独立してもニーズを見つけやすい分野です。',
            ],
            links: [
              { title: 'フリーランス研修講師の実態！年収と仕事内容を徹底解説', url: 'https://artiencecorp.com/column/articleID=11285/' },
              { title: '研修講師として独立できる人とは？独立するための５ステップと成功の鍵', url: 'https://artiencecorp.com/column/articleID=11238/' },
            ],
          },
        },
        { job: '地域の特産品を紹介する仕事', reason: '焦らず、人と関わる力を活かせる場所を探る時間を持つのも良い選択です。', episode: 'すぐに答えを出さなくても、人と話す力を活かせる別の場所を、少しずつ探ってみる道もあります。', tag: 'vague',
          detail: {
            points: [
              '特産品の魅力を伝える仕事で求められるのは商品説明力より「初対面の相手に興味を持ってもらい、行動を促す力」で、対人スキルがそのまま応用できます。',
              '生産者と消費者の間に立つ仕事のため、双方の言い分を汲み取りながら着地点を探ってきた交渉経験が、そのまま橋渡し役としての強みになります。',
              '地域産品のブランド化・販路拡大に力を入れる自治体や事業者が増えており、営業経験を持つ外部人材への需要が広がっています。',
            ],
            links: [
              { title: '「地域おこし協力隊」の制度や具体的な仕事内容を紹介します', url: 'https://historica-web.com/column/corps/' },
              { title: '総務省｜地域力の創造・地方の再生｜地域おこし協力隊', url: 'https://www.soumu.go.jp/main_sosiki/jichi_gyousei/c-gyousei/02gyosei08_03000066.html' },
            ],
          },
        },
        { job: '営業研修・OJTトレーナー', reason: '培ってきた営業スキルを、後進の育成という形で活かせます。', episode: '数字を作ってきた経験は、次の世代に営業の型を伝える仕事でも、確かな説得力を持ちます。', tag: 'neutral',
          detail: {
            points: [
              'OJTトレーナーに必要なのは知識量ではなく「自分がやってきたことを、後輩が再現できる形に翻訳する力」です。長年現場で培った営業の勘所を、言葉と型に落とし込める人材は多くありません。',
              '新人育成の説得力は、教える側の実体験の厚みに左右されます。実際に数字を作ってきた経験は、理論だけでは出せない重みを持ちます。',
              '近年、多くの企業が体系的なOJT体制の構築に力を入れており、現場経験者による育成人材へのニーズが高まっています。',
            ],
            links: [
              { title: 'OJTトレーナー研修とは？目的・カリキュラム・効果まで徹底解説', url: 'https://workhappiness.co.jp/blog/training/ojt-trainer-training/' },
              { title: '【現場任せから脱却】新人・若手が定着する「OJTトレーナー研修」', url: 'https://www.bcon.jp/%E3%82%B3%E3%83%A9%E3%83%A0/%E3%82%B3%E3%83%A9%E3%83%A0%E4%B8%80%E8%A6%A7/ojt-trainer-training/' },
            ],
          },
        },
],
      uniqueSuggestion: { job: '司会業・MC', reason: '人前で場を盛り上げ、相手の反応を見ながら話を組み立てる力は、司会業でも活きます。', episode: '商談の場の空気を読み、間合いを取ってきた経験は、大勢の前で場を回す仕事にも意外なほどなじみます。',
        detail: {
          points: [
            '司会業で評価されるのは台本の読み上げ力ではなく「相手の反応を見ながら、その場で話す内容を組み立て直す力」で、商談で培った即応力がそのまま活きます。',
            '一度きりの場を成功させる単発型の仕事のため、長期関係構築より「限られた時間で場の空気を掴む」営業スキルとの相性が良い構造です。',
            '式典やイベントのMC需要は業種を問わず安定しており、話し方に説得力のある人材は紹介を通じて仕事が広がりやすい分野です。',
          ],
          links: [
            { title: '司会になるには│仕事内容や資格、おすすめの学校を紹介！', url: 'https://korekarashinro.jp/special/consult/work/moderator/' },
            { title: '司会者になるには？仕事内容や向いてる人も解説！', url: 'https://www.best-shingaku.net/s-matome/entertainment/c002980.php' },
          ],
        },
      },
    },
    {
      keywords: ['販売', '接客', '店員', 'ショップ'],
      essence: '目の前の人の反応を読み、瞬時に対応を変える力',
      peopleFacing: true,
      suggestions: [
        { job: '接客・接遇の講師業', reason: '現場で培った感覚は、言葉にして人に教えるという形でも価値を持ちます。', episode: 'お客様の顔色を見て、対応を変えてきた感覚は、言葉にして人に伝えることでさらに価値を持ちます。', tag: 'continue',
          detail: {
            points: [
              '接遇講師に求められるのは接客経験の年数ではなく「無意識にやっている所作や気配りを、言葉と手順に分解して伝える力」で、現場感覚を持つ人材ほど説得力があります。',
              '座学中心の研修より、実際の接客現場を知る講師によるロールプレイ型研修の評価が高く、現場出身であること自体が差別化要因になります。',
              'サービス業の人材育成投資が続いており、マニュアルだけでは伝わらない接遇の勘所を教えられる人材への需要は安定しています。',
            ],
            links: [
              { title: '講師として独立するために準備すること', url: 'https://sensei-biz.com/lecturer_independence/' },
              { title: '接遇マナーインストラクター養成講座｜NPO法人 日本接遇教育協会', url: 'https://www.setugu.org/instructor/index.html' },
            ],
          },
        },
        { job: 'カスタマーサクセス', reason: 'お客様に寄り添ってきた経験が、契約後の関係づくりに活かせます。', episode: '目の前の一人に向き合ってきた経験は、契約後も長く関わる仕事において強みになります。', tag: 'unrewarded',
          detail: {
            points: [
              'カスタマーサクセスで重視されるのは営業トークではなく「相手の状況を観察し、次に困ることを先回りして提案する力」で、接客で培った観察力がそのまま活きます。',
              '対面一回限りの接客と異なり契約後も継続的に関わる仕事のため、目の前のお客様に丁寧に向き合ってきた経験が、長期的な信頼構築の土台になります。',
              'SaaS企業を中心にカスタマーサクセス職の採用が拡大しており、接客業出身者の「相手に合わせて対応を変える力」が評価される場面が増えています。',
            ],
            links: [
              { title: '未経験でカスタマーサクセスに転職は可能？仕事内容と必要なスキル', url: 'https://studio-tale.co.jp/career-stories/guide/customer-success-job-change/' },
              { title: '未経験でカスタマーサクセスに転職できる？仕事内容や向いている人は？', url: 'https://job-cs.com/contents/1444/' },
            ],
          },
        },
              { job: 'ショップ開業・EC運営', reason: 'お客様目線を知り尽くした経験を、自分の店づくりに活かせます。', episode: '現場で培った「お客様が本当に求めているもの」を見る目は、自分の店を構える時の一番の武器になります。', tag: 'repetition',
                detail: {
                  points: [
                    '自分の店を持つ仕事で最も活きるのは商品知識ではなく「お客様がどこで迷い、何が決め手になるかを肌感覚で知っている」経験で、接客現場の視点がそのまま強みになります。',
                    '売上を自分で設計する立場になるため、日々の接客で見てきた「売れる理由・売れない理由」を仕入れや商品構成の判断にそのまま反映できる構造です。',
                    'EC運営の参入ハードルは下がっており、現場を知る個人が小規模から始めやすい環境が整っている分野です。',
                  ],
                  links: [
                    { title: 'セレクトショップ開業ガイド！未経験から成功する方法と仕入れのコツ', url: 'https://squareup.com/jp/ja/townsquare/opening-a-select-store' },
                    { title: 'ネットショップを一人で運営・開業する流れ｜個人の仕事内容も紹介', url: 'https://corekara.co.jp/contents/sales-up/onlineshop-unei/' },
                  ],
                },
              },
        { job: 'クレーム対応・CS研修の講師', reason: '難しい対応をこなしてきた経験を、他のスタッフに教える立場で活かせます。', episode: '怒っているお客様と向き合ってきた経験は、他の人に「対応のコツ」として伝える仕事に、そのまま活きます。', tag: 'other-desire',
          detail: {
            points: [
              'この講師業で評価されるのは知識量ではなく「実際に難しい場面をどう切り抜けたか」という具体的な対応経験で、現場で培った判断力がそのまま教材になります。',
              '座学だけの研修より、実体験に基づくケーススタディ型の研修の方が現場スタッフの納得感が高く、経験者であること自体が講師としての価値になる構造です。',
              '顧客対応の難易度が上がる中、スタッフのメンタル面も含めて教えられる現場出身の講師へのニーズは各業種で高まっています。',
            ],
            links: [],
          },
        },
        { job: '地域の直売所・マルシェ運営', reason: '焦らず、人と接する力を活かせる場所を探る時間を持つのも良い選択です。', episode: '大きく仕事を変えなくても、直売所のような小さな現場から、新しい関わり方を試すこともできます。', tag: 'vague',
          detail: {
            points: [
              '直売所やマルシェの運営で求められるのは商品を並べる力ではなく「お客様との会話から、次に何を仕入れるべきかを読み取る力」で、接客経験がそのまま活きます。',
              '生産者と来場者の間に立つ仕事のため、双方の要望を汲み取りながら場を回してきた接客経験が、そのまま調整役としての強みになります。',
              '地産地消や小規模流通への関心が高まっており、現場感覚を持つ運営人材への需要は地域を問わず広がっています。',
            ],
            links: [
              { title: 'マルシェとは？出店の流れや費用、成功させるポイントまで解説', url: 'https://ja.komoju.com/blog/payment-agency/marche/' },
              { title: '【イベント】マルシェを主催する方法を5ステップでかんたん解説', url: 'https://kake84.net/5859/marche_organizer/' },
            ],
          },
        },
        { job: '店舗運営コンサルタント', reason: '現場で培った接客の視点を、店舗全体の改善提案に活かせます。', episode: 'お客様の反応を見てきた経験は、店舗運営そのものを見直す仕事でも、そのまま活きます。', tag: 'neutral',
          detail: {
            points: [
              '店舗コンサルティングで評価されるのは理論ではなく「実際に現場で何が売上を左右するかを見てきた経験」で、接客現場での気づきがそのまま提案の説得力になります。',
              '本部の指示だけでは解決しない現場特有の課題に向き合ってきた経験が、他店舗への改善提案でも通用する具体性を生む構造です。',
              '人手不足で現場改善の優先度が上がる中、机上の理論より現場を知るコンサルタントへの評価が高まっています。',
            ],
            links: [
              { title: '流通コンサルタントとは？将来性や年収、業務内容、必要なスキルや資格、なる方法を解説', url: 'https://professional-agent.lancers.jp/column/consultant/distributionconsultant_distributionconsultant01/' },
              { title: '店舗コンサルタントで起業するには【メリット～手順】まで解説', url: 'https://houjin-consul.com/post-5999/' },
            ],
          },
        },
],
      uniqueSuggestion: { job: '旅館の女将・宿の看板役', reason: 'お客様一人ひとりに合わせたおもてなしの感覚を、宿という舞台で発揮する道があります。', episode: '目の前の人の様子を読み、対応を変えてきた感覚は、一晩の滞在に心を尽くすもてなしの仕事と、静かに重なります。',
        detail: {
          points: [
            '女将役に求められるのは接客マナーの知識ではなく「一人ひとりの表情や仕草から、何を求めているかを察する力」で、長年の接客経験がそのまま活きます。',
            '宿泊業は一期一会の対応が評価に直結する仕事のため、その場その場で相手に合わせて対応を変えてきた接客経験との相性が良い構造です。',
            '個人経営の宿や小規模旅館では、看板となる人材の存在が集客に直結するため、経験豊富な人材への需要は根強く残っています。',
          ],
          links: [
            { title: '女将とは？仕事内容や必要なスキルなど徹底解説！', url: 'https://inthehotel.jp/magazine/okami/' },
            { title: '旅館の女将の仕事/年収/女将になるには(方法)/給料/修行/心得', url: 'https://hoteljinzai.com/contents/ryokanjob/r1' },
          ],
        },
      },
    },
    {
      keywords: ['エンジニア', 'SE', 'プログラマ', 'システム', 'IT'],
      essence: '複雑な問題を分解し、順序立てて解決する力',
      peopleFacing: false,
      suggestions: [
        { job: '小さな事業の立ち上げ', reason: '仕組みを設計する力は、自分の事業を組み立てる際の土台になります。', episode: '複雑な要件を整理し、動くものに落とし込んできた経験は、自分の事業を一から組み立てる際の土台になります。', tag: 'continue',
          detail: {
            points: [
              '事業を立ち上げる際に最も問われるのは資金力ではなく「仕組みを分解し、抜け漏れなく組み立てる力」で、システム設計で培った思考プロセスがそのまま活きます。',
              'エンジニアは要件定義から実装、運用まで一人で完結させる訓練を積んでいるため、事業立ち上げに必要な工程を自走できる構造的な強みがあります。',
              '少人数・低コストで事業を始められる環境が整っており、技術を自ら実装できる人材は外注コストを抑えて動ける点で有利です。',
            ],
            links: [
              { title: 'ITエンジニアの起業は1人でもできる！失敗しないコツを税理士視点で解説', url: 'https://bring-consulting.co.jp/it-engineer-starting-a-business-alone/' },
              { title: 'ITエンジニアが独立・起業に向いている理由と成功に必要なスキル', url: 'https://itpropartners.com/blog/141/' },
            ],
          },
        },
        { job: '技術顧問・アドバイザー', reason: '積み上げてきた専門知識を、現場を離れた形で伝える道もあります。', episode: '現場で培った知識は、実際に手を動かさなくても、助言という形で十分な価値を持ちます。', tag: 'unrewarded',
          detail: {
            points: [
              '技術顧問に求められるのはコードを書く速さではなく「積み上げてきた経験から、この設計判断が将来どう響くかを見通す力」で、実務経験がそのまま価値になります。',
              '常駐せず週数時間の関与で成果を出す働き方のため、経験に基づく的確な判断力さえあれば、稼働時間に依存しない働き方が可能な構造です。',
              '技術系スタートアップや中小企業でCTO人材が不足しており、経験豊富なエンジニアが外部から技術面を支える案件は増加傾向にあります。',
            ],
            links: [
              { title: 'フリーランスの技術顧問とはどんな役割？案件例や始め方を解説します', url: 'https://freelance.levtech.jp/guide/detail/1582/' },
              { title: '技術顧問とは？年収からフリーランスの実態・なり方までを徹底解説！', url: 'https://arcward-c.co.jp/note/technical-advisor/' },
            ],
          },
        },
              { job: 'プログラミング講師', reason: '複雑な技術を分かりやすく伝える力を、教育の場で発揮できます。', episode: '難解な仕様をチームに説明してきた経験は、初心者にプログラミングを教える仕事でも活きます。', tag: 'repetition',
                detail: {
                  points: [
                    'プログラミング講師に必要なのは知識の広さではなく「自分がつまずいた経験を、初心者がつまずくポイントとして先回りして教える力」で、実務経験がそのまま教材になります。',
                    '独学者向けオンライン講師の仕事は、複雑な概念を平易な言葉に翻訳する力が評価軸のため、技術力の高さ以上に説明力が問われる構造です。',
                    'プログラミング学習需要は継続的に拡大しており、実務経験を持つ講師は未経験の講師より高い信頼を得やすい状況です。',
                  ],
                  links: [
                    { title: 'プログラミング講師になるには？必要なスキルや資格、求人を探す方法を紹介', url: 'https://freelance.levtech.jp/guide/detail/707/' },
                    { title: 'プログラミング講師とは？仕事内容や収入について解説！', url: 'https://freelance-hub.jp/column/detail/186/' },
                  ],
                },
              },
        { job: 'IT導入支援コンサルタント', reason: '現場の課題を技術で解決してきた経験を、中小企業のIT化支援に活かせます。', episode: '技術と現場をつないできた経験は、ITに詳しくない企業の導入支援において、何よりの武器になります。', tag: 'other-desire',
          detail: {
            points: [
              'IT導入支援で評価されるのは最新技術への精通よりも「現場の業務課題を分解し、技術で解決可能な範囲を見極める力」で、実務で鍛えた課題解決力がそのまま活きます。',
              '中小企業のIT化は大企業のような専任担当者を置けないケースが多く、技術と現場業務の両方が分かる人材が仲介役として重宝される構造です。',
              '国の補助金政策もあり中小企業のDX投資は増加傾向にあり、実装経験を持つ支援人材への需要は今後も拡大が見込まれます。',
            ],
            links: [
              { title: 'ITコンサルタントが中小企業に必要な理由と活用方法', url: 'https://www.asckk.co.jp/archives/column/small-and-medium-corp-it-consulting' },
              { title: 'ITコンサルタントの仕事内容は？具体的な業務とプロジェクト事例', url: 'https://my-vision.co.jp/consultant/it/work' },
            ],
          },
        },
        { job: '田舎でのリモートエンジニア', reason: '焦らず、働く場所だけを変えてみるという選択もあります。', episode: 'スキルはそのままに、暮らす場所を変えるだけで、働き方の景色が変わることもあります。', tag: 'vague',
          detail: {
            points: [
              'この働き方で問われるのは新しい技術力ではなく「オフィスにいなくても成果を出せる自己管理力」で、これまで培った開発スキルをそのまま生かせます。',
              '成果物と進捗さえ明確に共有できれば評価が変わらない職種特性上、勤務地を変えても仕事の価値を落とさずに済む構造です。',
              'フルリモート求人を持つIT企業は増えており、地方在住でも都市部と同水準の案件に関われる環境が整いつつあります。',
            ],
            links: [
              { title: '地方からエンジニアとして働くためには？フルリモート専門のエージェントもご紹介', url: 'https://remoters.work/remocari/freelance-engineer-local/' },
              { title: 'エンジニア転職における地方移住のメリット・デメリット完全ガイド', url: 'https://www.tech-job-finder.co.jp/articles/engineer-local-relocation-guide/' },
            ],
          },
        },
        { job: 'ITヘルプデスク・サポート業務', reason: '技術知識を、困っている人を助ける形で日常的に活かせます。', episode: '複雑な技術を分かりやすく伝えてきた経験は、サポート業務でも変わらず力になります。', tag: 'neutral',
          detail: {
            points: [
              'ヘルプデスクで評価されるのは専門知識の深さより「専門用語を使わず、相手が理解できる言葉に置き換えて説明する力」で、技術的な素養があるほど有利になる仕事です。',
              '困っている人に一つずつ手順を確認しながら対応する仕事のため、複雑な問題を分解して順序立てて考えてきた経験がそのまま生きる構造です。',
              '社内のIT環境が複雑化する中、専門部署だけでなく現場に近い立場で対応できる人材への需要は業種を問わず安定しています。',
            ],
            links: [
              { title: 'ヘルプデスクは未経験でもなれる！求人例や志望動機のコツを紹介', url: 'https://career.levtech.jp/guide/knowhow/article/545/' },
              { title: 'ヘルプデスク・テクニカルサポートの仕事内容、やりがい、向いている人、未経験からなるには？', url: 'https://type.jp/tensyoku-knowhow/ready/catalog/helpdesk/' },
            ],
          },
        },
],
      uniqueSuggestion: { job: '謎解きゲーム・体験型イベントの制作者', reason: '論理的な仕組みを組み立てる力を、遊びの設計に転用する道もあります。', episode: '複雑な仕様を一つずつ組み上げてきた力は、人を楽しませる仕掛けを設計する仕事でも、そのまま活きます。',
        detail: {
          points: [
            '謎解き制作で評価されるのはひらめきの奇抜さより「参加者が迷わず解ける難易度と手順を論理的に設計する力」で、システム設計の思考プロセスがそのまま活きます。',
            'プレイヤーの行動パターンを想定し、例外的な操作にも矛盾なく対応できる仕組みを組む必要があるため、網羅的に考える技術者的な発想が強みになります。',
            '体験型エンターテインメント市場は拡大しており、遊びの設計に論理性を持ち込める制作者へのニーズが増えています。',
          ],
          links: [
            { title: 'プロじゃなくても作れる！？謎解きイベントの作り方', url: 'https://note.com/riddle_hashimoto/n/na247573573c1' },
            { title: '謎解きの作り方完全ガイド｜初心者でも楽しめる謎が作れる', url: 'https://www.lostproduct.jp/knowhow/riddles/12513/' },
          ],
        },
      },
    },
    {
      keywords: ['公務員', '市役所', '区役所', '行政', '役場'],
      essence: '立場の異なる人たちの利害を調整する力',
      peopleFacing: false,
      suggestions: [
        { job: 'NPO・地域団体の運営', reason: '公共のために動いてきた経験は、地域の課題解決の現場でそのまま活きます。', episode: '立場の異なる人たちの意見を聞き、間を取り持ってきた経験は、地域活動の現場でそのまま活きます。', tag: 'continue',
          detail: {
            points: [
              'NPO運営に求められるのは事業の華やかさより、行政・企業・住民という立場の異なる主体の間で合意点を探り続ける調整力です。',
              '補助金や助成金の申請・報告業務は行政文書に近い形式知が必要で、行政と接してきた経験がそのまま実務の速さにつながります。',
              '地域課題は年々複雑化しており、複数の利害関係者をまとめられる運営人材への需要は、担い手不足を背景に高まっています。',
            ],
            links: [
              { title: '基礎知識・Q&A | 日本NPOセンター', url: 'https://www.jnpoc.ne.jp/activity/npo-supporter/to-know/faq/' },
              { title: 'NPO職員の仕事内容・なり方・年収・資格などを解説 | キャリアガーデン', url: 'https://careergarden.jp/nposhokuin/' },
            ],
          },
        },
        { job: '地域コーディネーター', reason: '行政と住民の間に立ってきた経験が、橋渡し役として力を発揮します。', episode: '制度と現場の両方を知っているからこそ、住民と行政の橋渡し役として重宝されます。', tag: 'unrewarded',
          detail: {
            points: [
              '地域コーディネーターの本質は、学校・行政・住民など異なる立場の要望を聞き取り、実行可能な形に落とし込む翻訳者的な機能です。',
              '多くの自治体で制度化が進む背景には、単独の組織では解決できない地域課題が増え、橋渡し役の専門人材が不足している事情があります。',
              '対立を力任せに解決せず、板挟みの中で粘り強く落としどころを探ってきた経験が、この役割では直接的な強みになります。',
            ],
            links: [
              { title: '地域学校協働活動推進員（コーディネーター）の方 | 学校と地域でつくる学びの未来（文部科学省）', url: 'https://manabi-mirai.mext.go.jp/user/coordinator.html' },
              { title: 'オモシロい地域のつくりかた！「地域コーディネーター」という新しい仕事', url: 'https://drive.media/posts/831' },
            ],
          },
        },
              { job: '防災士・地域防災アドバイザー', reason: '行政の仕組みを知る立場から、地域の防災体制づくりに関われます。', episode: '制度の内側を知ってきた経験は、地域の防災計画を住民目線で見直す仕事に活かせます。', tag: 'repetition',
                detail: {
                  points: [
                    '防災士に求められるのは知識量以上に、行政の避難計画と住民の実感の間にあるズレを調整し、現場で動ける形に落とし込む実務力です。',
                    '資格取得後の実践の場は地域の自主防災組織や自治体との連携が中心で、行政の意思決定プロセスを理解している人ほど早く役割を担えます。',
                    '自然災害の増加を受けて自治体は地域防災の担い手確保を課題としており、行政経験者への期待は具体的な制度ニーズに基づいています。',
                  ],
                  links: [
                    { title: '防災士になるには｜日本防災士機構', url: 'https://bousaisi.jp/license/' },
                  ],
                },
              },
        { job: '行政書士等の士業', reason: '行政手続きへの理解を、資格を通じて個人や事業者の支援に活かせます。', episode: '書類と制度を扱ってきた経験は、行政書士として独立する際の、大きなアドバンテージになります。', tag: 'other-desire',
          detail: {
            points: [
              '行政書士の仕事は許認可や届出など行政手続きの専門知識が核であり、行政の内部プロセスを知る経験がそのまま実務理解の速さに直結します。',
              '顧客の多くは行政窓口とのやり取りに不慣れな個人事業主や中小企業で、手続きを代行・説明する役割にはわかりやすい伝え方が求められます。',
              '独立開業型の資格のため、これまで培った行政対応の信頼感や説明力が、顧客からの信頼獲得にそのまま反映されます。',
            ],
            links: [
              { title: '行政書士として独立・開業するために必ず知っておきたい資金や手続き | STUDYing', url: 'https://studying.jp/gyousei/about-more/start-practice.html' },
              { title: '行政書士になるには？仕事内容や年収、将来性を解説 | Indeed', url: 'https://jp.indeed.com/career-advice/careers/what-does-an-administrative-scrivener-do' },
            ],
          },
        },
        { job: '地域おこし協力隊への参加', reason: '焦らず、公共への意識を持ちながら新しい環境を試す選択もあります。', episode: 'すぐに答えを出さなくても、任期付きの活動から新しい関わり方を試してみる道もあります。', tag: 'vague',
          detail: {
            points: [
              '地域おこし協力隊は自治体の委嘱を受けて活動する制度のため、行政の意思決定の仕組みを理解している人は着任後の合意形成を進めやすい立場にあります。',
              '任期中は地域住民と行政の橋渡し役を担う活動が中心となり、これまでの調整役としての経験が活動内容に直接結びつきます。',
              '国の交付税措置により全国の自治体が受け入れ枠を拡大しており、行政経験を持つ人材への期待は制度面からも後押しされています。',
            ],
            links: [
              { title: '地域おこし協力隊とは／ニッポン移住・交流ナビ JOIN', url: 'https://www.iju-join.jp/chiikiokoshi/about.html' },
              { title: '地域おこし協力隊とは？給料・活動内容・任期後の進路を現役・元隊員のリアルな声で解説 | LOCAL LETTER', url: 'https://localletter.jp/articles/chiikiokoshi_about' },
            ],
          },
        },
        { job: '許認可申請サポートの専門職', reason: '行政手続きへの理解を、事業者支援という形で活かせます。', episode: '制度を扱ってきた経験は、複雑な申請をサポートする仕事にも、そのまま応用できます。', tag: 'neutral',
          detail: {
            points: [
              '許認可申請は建設業・飲食業・古物商など業種ごとに審査基準が細かく定められており、行政の審査プロセスを内側から理解している経験は実務上の強みになります。',
              '書類作成だけでなく行政窓口との事前相談や修正対応が業務の大半を占めるため、行政とのやり取りに慣れている点が評価されます。',
              '開業や許認可更新のタイミングで発生する業務のため、独立開業の増加とともに専門サポートへのニーズは安定的に存在します。',
            ],
            links: [
              { title: '行政書士の主要業務「許認可申請業務」とは？具体的な実務内容を紹介 | 行政書士試験コラム', url: 'https://www.agaroot.jp/gyosei/column/permission/' },
              { title: '行政書士が行う許認可申請業務とは？許認可の種類や報酬額の相場を解説 | マネーフォワード クラウド会社設立', url: 'https://biz.moneyforward.com/establish/basic/69041/' },
            ],
          },
        },
],
      uniqueSuggestion: { job: '古民家再生・空き家活用プロデューサー', reason: '制度と現場をつなぐ調整力を、地域資源の再生に活かす道もあります。', episode: '立場の異なる人たちの間に立ってきた経験は、古い建物と新しい使い手をつなぐ仕事でも、静かに力を発揮します。',
        detail: {
          points: [
            '空き家活用は所有者・自治体・地域住民という利害の異なる関係者の合意形成が事業化の最大の壁であり、行政の仕組みと地域事情の両方を理解している人材が重宝されます。',
            '自治体の空き家バンク制度や補助金の活用には行政手続きの知識が不可欠で、制度を熟知していることがプロジェクトを前に進める推進力になります。',
            '全国的に空き家が社会課題化する中、制度と現場をつなぐ調整役への需要は地域再生分野で年々高まっています。',
          ],
          links: [
            { title: '空き家・古民家再生業 | 起業支援 | J-Net21（中小企業基盤整備機構）', url: 'https://j-net21.smrj.go.jp/startup/guide/service/kominka.html' },
            { title: '成功する空き家活用事例とビジネスモデルを集めました | 全国古家再生推進協議会', url: 'https://zenko-kyo.or.jp/blog/11472/' },
          ],
        },
      },
    },
    {
      keywords: ['飲食', '調理', 'ホール', '料理人', 'シェフ', 'コック'],
      essence: '限られた時間の中で、複数のことを同時にこなす力',
      peopleFacing: true,
      suggestions: [
        { job: '食育インストラクター', reason: '食への知識と経験を、次の世代に伝える形に翻訳できます。', episode: '毎日の調理で培った知識は、伝える相手を変えるだけで、新しい価値になります。', tag: 'continue',
          detail: {
            points: [
              '食育インストラクターに求められるのは栄養知識そのものより、現場で培った調理の勘所を家庭や教育の場で再現できる言葉に翻訳する力です。',
              '民間資格であるため実務経験が信頼の裏付けになり、実際に厨房を回してきた経験は座学だけの取得者との明確な差別化になります。',
              '学校・保育施設・企業などで食育への関心が高まっており、現場経験を持つ講師への需要は教育分野を中心に広がっています。',
            ],
            links: [
              { title: '食育インストラクターとは？資格の特徴や活かし方をわかりやすく解説 | レバウェル保育士', url: 'https://hoiku.levwell.jp/article/39/' },
              { title: '食育インストラクターとは？資格の活かし方や取得方法について解説します！ | FONTE', url: 'https://fontefonte.jp/dietary-education/dietaryeducation-instructor/' },
            ],
          },
        },
        { job: '小さな宿・ゲストハウスの運営', reason: 'おもてなしの感覚と現場力を、宿泊という形で発揮する道があります。', episode: '限られた時間で複数のことを回してきた現場力は、宿泊業の忙しい時間帯でもそのまま活きます。', tag: 'unrewarded',
          detail: {
            points: [
              'ゲストハウス運営は接客・清掃・仕入れ・予約管理を一人で同時にこなす業務であり、忙しい厨房で複数の作業を並行してきた経験がそのまま強みになります。',
              '開業に必要な旅館業法の許可取得や保健所対応など、飲食店運営で培った許認可手続きの経験が開業準備を後押しします。',
              '個人経営の小規模宿泊施設は初期投資を抑えて始めやすく、地域資源を活かした宿への需要は観光需要の回復とともに拡大しています。',
            ],
            links: [
              { title: 'ゲストハウスの開業方法から資金調達まで。ゲストハウスの経営ポイントをご紹介', url: 'https://sogyotecho.jp/guesthouse/' },
              { title: 'ゲストハウス開業マニュアル｜必要な準備や資金、繁盛の秘訣、年収は？ | 起業ログ', url: 'https://kigyolog.com/article.php?id=610' },
            ],
          },
        },
              { job: '食品ロス削減の企画・コンサルタント', reason: '食材を扱ってきた現場感覚を、社会課題の解決に活かせます。', episode: '食材を無駄にしないための工夫を重ねてきた経験は、食品ロス削減の仕組みづくりにそのまま活きます。', tag: 'repetition',
                detail: {
                  points: [
                    '食品ロス削減の現場では、仕入れ量の見極めや在庫の使い切りなど、厨房で日常的に行ってきた判断がそのまま専門知識として評価されます。',
                    '企業や自治体が対策を進める際、机上の理論だけでなく現場での運用経験を持つ人材の方が、具体的な改善提案の説得力を高めます。',
                    '食品リサイクル法の改正や企業のSDGs対応強化を背景に、食品ロス分野への取り組みは制度面からも後押しされています。',
                  ],
                  links: [],
                },
              },
        { job: '出張シェフ・ケータリング', reason: '現場で培った調理技術を、自分の看板で届ける働き方ができます。', episode: '厨房で鍛えた技術は、会場を選ばず腕を振るう出張シェフという働き方にも、無理なくつながります。', tag: 'other-desire',
          detail: {
            points: [
              '出張シェフは決められた時間内で仕込みから提供までを一人で完結させる仕事であり、厨房で並行作業をこなしてきた経験が即戦力として評価されます。',
              '店舗を持たず個人の技術を看板に働くため、これまでの調理歴や得意料理がそのまま顧客への訴求力になります。',
              '家庭でのプロの味への需要が高まっており、出張シェフサービスを仲介するプラットフォームの拡大が独立のハードルを下げています。',
            ],
            links: [
              { title: '出張シェフとは？サービス内容・利用シーン・費用感をまるごと解説 | シェフくるマガジン', url: 'https://chefkuru.jp/media/useful/learn-food/558/' },
              { title: '出張シェフってなに？利用シーンとサービスの紹介 | シェアダイン', url: 'https://sharedine.me/shokuiku-media/traveling-chef/' },
            ],
          },
        },
        { job: '地方の宿や農家での住み込み手伝い', reason: '焦らず、暮らし方ごと変えてみるという選択もあります。', episode: 'すぐに大きな決断をしなくても、環境を変えて働く経験から、次の道が見えてくることがあります。', tag: 'vague',
          detail: {
            points: [
              '住み込みでの手伝いは、限られた人手と時間の中で複数の作業を回す現場感覚がそのまま求められる働き方で、飲食の経験がすぐに役立ちます。',
              '住居と仕事が一体になった働き方のため、生活基盤を保ちながら環境を変えられる点が、次のキャリアを考える猶予期間として機能します。',
              '農閑期・繁忙期に応じた短期の受け入れ先が全国に多くあり、経験や資格を問わず始めやすい間口の広さも特徴です。',
            ],
            links: [
              { title: 'ふるさとワーキングホリデー ポータルサイト', url: 'https://furusato-work.jp/worklist/' },
              { title: '新農業×短期アルバイト 魅力とシーズン解説！ | あぐりナビ', url: 'https://www.agri-navi.com/contents/time_limited_part_time' },
            ],
          },
        },
        { job: '飲食店の開業コンサルタント', reason: '現場を知り尽くした経験を、これから開業する人の支援に活かせます。', episode: '現場で培った勘所は、新しく店を始める人にとって、何より実践的なアドバイスになります。', tag: 'neutral',
          detail: {
            points: [
              '開業コンサルタントの提案の説得力は、実際に店舗運営で数字を作ってきた経験の厚みに比例し、理論だけの助言とは重みが異なります。',
              '物件選定から仕入れ交渉、人員配置まで、現場を回してきた経験があるからこそ具体的で実行可能な計画に落とし込めます。',
              '飲食業界は開業後数年での廃業率が高いとされ、現場を知る人材による開業前の伴走支援へのニーズは年々高まっています。',
            ],
            links: [
              { title: '飲食店コンサルタントのフリーランスとして独立するには？年収相場や成功のコツを解説', url: 'https://freeconsul.co.jp/cs/freelance-restaurant-consultant/' },
              { title: '飲食店コンサルタントの役割と業務内容14項目を解説｜飲食店健全化', url: 'https://wahoo-deco.co.jp/w/jobrole/' },
            ],
          },
        },
],
      uniqueSuggestion: { job: '移動販売車(キッチンカー)のオーナー', reason: '限られた環境で回してきた現場力を、自分の看板で発揮する道があります。', episode: '狭い厨房で複数のことを同時にこなしてきた経験は、小さな車の中で店を営む仕事にも、そのまま活きます。',
        detail: {
          points: [
            'キッチンカーは限られた車内スペースと時間で仕込み・調理・提供を同時にこなす業態で、忙しい厨房を経験した現場力がそのまま活きます。',
            '店舗を借りるより初期投資を抑えられるため、これまでの調理技術を元手に独立できる現実的な選択肢になっています。',
            '出店場所の確保やイベント出店など営業活動も自分で担うため、現場で培った段取り力と対応力が経営の安定に直結します。',
          ],
          links: [
            { title: 'キッチンカーの始め方完全ガイド プロが教える開業資金・許可・失敗対策 | モビマル', url: 'https://mobimaru.com/magazines/104' },
            { title: 'キッチンカー・移動販売の開業ガイド｜必要な許可・費用・出店方法を解説 | STORES Magazine', url: 'https://stores.fun/magazine/articles/food-truck-opening' },
          ],
        },
      },
    },
    {
      keywords: ['保育士', '幼稚園', '保育'],
      essence: '小さな変化に気づき、根気強く向き合う力',
      peopleFacing: true,
      suggestions: [
        { job: '企業内保育・子育て支援の企画', reason: '現場で培った視点を、より大きな仕組みづくりに活かす道があります。', episode: '現場の子どもたちを見てきた視点は、より大きな仕組みを作る立場になったときに活きます。', tag: 'continue',
          detail: {
            points: [
              '企業内保育所の運営設計には、現場での保育経験に基づいた安全基準や保育の質の理解が不可欠で、制度設計だけでは見えない実務の勘所が評価されます。',
              '福利厚生としての保育施設導入は企業の人事・労務部門と連携する仕事のため、現場の視点を経営側の言葉に翻訳できる人材が求められます。',
              '少子化対策として企業主導型保育事業への国の助成が続いており、現場を知る企画人材への需要は制度的な後押しを受けています。',
            ],
            links: [
              { title: '【人気急上昇！】企業内保育所で働く意外なメリット | マイナビ保育士', url: 'https://hoiku.mynavi.jp/feature/corporate_childcare/' },
              { title: '企業内保育所とはどんな施設？保育士として働くメリットや仕事内容、転職先の選び方 | 保育士バンク！', url: 'https://www.hoikushibank-column.com/column/post_1102' },
            ],
          },
        },
        { job: '絵本作家・児童向けコンテンツ制作', reason: '子どもの心の動きを見てきた経験が、表現の土台になります。', episode: '子どもの反応を間近で見てきた経験は、表現を作る上での確かな判断材料になります。', tag: 'unrewarded',
          detail: {
            points: [
              '絵本や児童コンテンツの説得力は、子どもの反応や発達段階を実際に見てきた経験の厚みに支えられ、想像だけで作る作品とは解像度が異なります。',
              '出版社への持ち込みやコンクール応募が主な入口であり、審査で評価されるのは技法以上に子どもの心理描写のリアリティです。',
              '電子書籍や動画配信など児童向けコンテンツの流通経路が広がっており、現場経験を持つ作り手が参入できる機会は増えています。',
            ],
            links: [
              { title: '絵本作家の仕事内容・なり方・年収・資格などを解説 | キャリアガーデン', url: 'https://careergarden.jp/ehonsakka/' },
              { title: '絵本作家のお仕事内容を先輩が語る | 憧れクリエーターのお仕事図鑑', url: 'https://www.tca.ac.jp/creative/job/publication/picturebook/' },
            ],
          },
        },
              { job: 'ベビーシッター・家庭訪問保育', reason: '一人ひとりに向き合う力を、より密度の高い関わり方で活かせます。', episode: '集団の中で個を見てきた経験は、一対一で向き合う仕事でも、変わらず活きます。', tag: 'repetition',
                detail: {
                  points: [
                    '家庭訪問保育は集団保育と異なり、一人の子どもの小さな体調や気分の変化に継続的に向き合う仕事で、保育現場での観察力がそのまま活きます。',
                    '保護者との信頼関係が受注継続の鍵となるため、日々の様子を丁寧に言語化して伝えてきた経験がサービスの評価に直結します。',
                    '共働き世帯の増加や急な預け先ニーズの高まりを背景に、個別対応できるベビーシッターへの需要は都市部を中心に拡大しています。',
                  ],
                  links: [
                    { title: 'ベビーシッターになるには？働き方のバリエーションと仕事内容を解説 | キッズライン', url: 'https://kidsline.me/magazine/article/1073' },
                    { title: 'ベビーシッターの仕事内容・なり方・年収・資格などを解説 | キャリアガーデン', url: 'https://careergarden.jp/babysitter/' },
                  ],
                },
              },
        { job: '子育て相談の専門家', reason: '現場で見てきた子どもの発達を、悩む親のための相談業に活かせます。', episode: '多くの子どもを見てきた経験の蓄積は、一人で悩む親にとって、何より心強い専門知識になります。', tag: 'other-desire',
          detail: {
            points: [
              '子育て相談で信頼されるのは資格の有無以上に、実際に子どもの発達の個人差を数多く見てきた経験に基づく具体的な助言です。',
              '保育の現場で得た知見を、悩みを抱える保護者にもわかる言葉に翻訳する力が、相談業務における専門性の核になります。',
              '児童福祉分野での相談支援体制の拡充が進んでおり、現場経験を持つ相談員への行政・民間双方からの需要が高まっています。',
            ],
            links: [
              { title: '子育て支援センターで働くには？職員になるための資格や保育士の役割・仕事内容をわかりやすく解説！ | 保育士バンク！', url: 'https://www.hoikushibank-column.com/column/post_2293' },
              { title: '子育て支援員とは？資格の取得方法・仕事内容・メリットデメリットを解説 | なるほど！ジョブメドレー', url: 'https://job-medley.com/tips/detail/808/' },
            ],
          },
        },
        { job: '地域の子育てサロン運営', reason: '焦らず、子どもと関わる力を活かせる場所を探る時間を持つのも良い選択です。', episode: '大きく仕事を変えなくても、地域のサロンのような小さな場から、新しい関わり方を試せます。', tag: 'vague',
          detail: {
            points: [
              '子育てサロンの運営は、少人数の親子一組ずつの小さな変化を見逃さず声をかけ続ける根気強さが求められる仕事です。',
              '保育の現場で培った安全管理や場づくりの感覚は、自宅や地域拠点を使った小規模運営でもそのまま活かせます。',
              '孤立しがちな在宅子育て家庭の居場所づくりへの関心が高まっており、地域単位での運営者へのニーズが広がっています。',
            ],
            links: [
              { title: '子育てサロンを自宅で開業する！成功のポイントと運営ノウハウ | minoriba media', url: 'https://media.minoriba.jp/start/1684.html' },
              { title: '子育てサロンの立ち上げ方法｜個人で開業するには何が必要？', url: 'https://salonstaff.mother-natures.com/blog/babysalon/start-parenting-salon/' },
            ],
          },
        },
        { job: '保育施設のコンサルタント', reason: '現場で培った視点を、複数の施設運営の改善提案に活かせます。', episode: '現場を知っているからこそ気づける改善点は、施設全体を見る立場になったときに強みになります。', tag: 'neutral',
          detail: {
            points: [
              '保育施設コンサルタントの助言の説得力は、複数の現場で実際に子どもと向き合ってきた経験の厚みに比例し、制度知識だけでは代替できません。',
              '保育士配置基準や安全管理体制の改善提案には、現場を回してきた者にしか気づけない運用上の細部への視点が求められます。',
              '保育士不足と施設運営の複雑化を背景に、現場出身のコンサルタントへの需要は開業支援・運営改善の両面で高まっています。',
            ],
            links: [
              { title: '【プロ解説】コンサルタントとは？未経験から挑戦できる「保育園コンサルタント」の仕事内容とやりがい | いちたす', url: 'https://ichitasu.co.jp/recruit/blog/about-consultants' },
              { title: '保育園コンサルタントの選び方とは？業務内容や費用相場、成功事例を徹底解説 | チポーレ', url: 'https://column.chipotle.co.jp/column/054/' },
            ],
          },
        },
],
      uniqueSuggestion: { job: '玩具デザイナー・おもちゃ作家', reason: '子どもの反応を見てきた経験を、ものづくりに活かす道があります。', episode: '小さな変化に気づき続けてきた観察眼は、子どもが夢中になる仕掛けを形にする仕事に、そのまま息づきます。',
        detail: {
          points: [
            '玩具づくりで評価されるのは造形の巧みさ以上に、子どもが実際にどう手に取り、どこで飽きるかという反応を見てきた具体的な観察経験です。',
            'メーカーの商品企画では安全基準やユーザーテストの結果を踏まえた改良が重視され、保育現場での経験がそのまま設計の説得力になります。',
            '知育要素を重視した玩具市場が拡大しており、子どもの発達段階を理解した作り手への需要は企画・デザイン双方で高まっています。',
          ],
          links: [
            { title: '玩具メーカー社員の仕事内容・なり方・年収・資格などを解説 | キャリアガーデン', url: 'https://careergarden.jp/gangumaker/' },
            { title: 'エンタメ職業紹介：トイデザイナー | アミューズメントメディア総合学院', url: 'https://www.amgakuin.co.jp/gakuin/job/toy-designer/' },
          ],
        },
      },
    },
    {
      keywords: ['主婦', '主夫', '専業', '子育て'],
      essence: '見えないたくさんの仕事を、同時に回し続けてきたマネジメント力',
      peopleFacing: false,
      suggestions: [
        { job: 'ライフオーガナイザー', reason: '家庭というシステムを回してきた工夫は、他の家庭にとっても価値ある知恵になります。', episode: '家庭という複雑なシステムを回してきた工夫の数々は、他の家庭にとって具体的なヒントになります。', tag: 'continue',
          detail: {
            points: [
              'ライフオーガナイザーの仕事は片付けの技術そのものより、「なぜ散らかるのか」という生活動線や家族の行動パターンを読み解く観察力が評価されます。長年家庭を回してきた人はこの視点をすでに持っています。',
              '資格制度が整備されており、家庭運営の経験を体系立てて言語化すれば、未経験からでも専門職として認定を受けやすい構造になっています。',
              '個人宅への訪問が働き方の中心のため、家事や育児の実体験に基づく共感的な提案ができることが、外部の整理収納業者との差別化要因になります。',
            ],
            links: [
              { title: 'ライフオーガナイザーとは | 一般社団法人 日本ライフオーガナイザー協会', url: 'https://jalo.jp/life-organizer/' },
              { title: 'ライフオーガナイザーとは？どんな仕事？整理収納アドバイザーとは違う？', url: 'https://optlife.jp/lifeorganizer/' },
            ],
          },
        },
        { job: '地域コミュニティの運営', reason: '人と人をつなぎ、日々の暮らしを支えてきた力がそのまま活きます。', episode: '日々のやり取りの中で築いてきた人とのつながりは、地域活動の場でそのまま力になります。', tag: 'unrewarded',
          detail: {
            points: [
              '地域コーディネーターに求められるのは専門知識より、立場の違う人々(自治会・行政・企業)の間を調整し合意形成へ導く力です。家庭内外で調整役を担ってきた経験が直接活きます。',
              '自治体による地域づくり事業は年々増えており、住民目線を持つ人材を外部人材として登用する動きが広がっている業界背景があります。',
              '長年その土地で生活してきた人ならではの土地勘や人脈は、外部のコンサルタントには再現できない実務上の強みになります。',
            ],
            links: [
              { title: 'オモシロい地域のつくりかた!「地域コーディネーター」という新しい仕事 | DRIVEメディア', url: 'https://drive.media/posts/831' },
              { title: '地域デザイン・まちづくり | 人生とキャリアのサポート ハローライフ', url: 'https://hellolife.jp/special/machi-design' },
            ],
          },
        },
              { job: '家事代行サービスの提供者', reason: '家庭を回してきた実践的なスキルを、そのまま仕事にできます。', episode: '毎日当たり前にこなしてきた家事の工夫は、他の家庭にとっては十分にお金を払う価値のある技術です。', tag: 'repetition',
                detail: {
                  points: [
                    '家事代行業界では、料理・掃除・整理整頓の効率的な段取りを組む力が、実技試験や研修なしにすぐ評価される数少ない職種のひとつです。',
                    '共働き世帯の増加を背景に需要が拡大しており、資格の有無より「実生活での再現性」が採用時に重視される業界構造があります。',
                    '独立開業する場合も初期投資が小さく、これまでの家事の工夫がそのままサービスの付加価値として料金に転嫁できます。',
                  ],
                  links: [
                    { title: '家事代行サービスを開業するには？方法や注意点を徹底解説！', url: 'https://sogyotecho.jp/housekeeping-service/' },
                    { title: '家事代行で起業するには何が必要？開業方法や資格の有無をわかりやすく解説 | マネーフォワード クラウド会社設立', url: 'https://biz.moneyforward.com/establish/basic/69220/' },
                  ],
                },
              },
        { job: 'オンラインでの暮らしの相談役', reason: '長年の生活の知恵を、悩んでいる人へのアドバイスとして届けられます。', episode: '家庭を切り盛りしてきた経験は、同じように悩む人にとって、何よりの実践的なヒントになります。', tag: 'other-desire',
          detail: {
            points: [
              'スキルシェア型のオンライン相談サービスでは、資格よりも「実際に経験した人にしか話せない具体性」が支持される評価軸になっています。',
              '家事・育児など生活領域の相談は再現性の高い体験談が求められ、長年の家庭運営で積み重ねてきた判断の引き出しがそのまま商品になります。',
              '対面ではなく文章や音声でのやり取りが中心のため、家庭の予定を優先しながら空いた時間で始めやすい働き方です。',
            ],
            links: [],
          },
        },
        { job: '地域のシェアキッチン参加者', reason: '焦らず、今の暮らしを活かせる小さな一歩を試す選択もあります。', episode: '大きく仕事を始めなくても、地域の場に少しずつ関わることから、次の一歩が見えてくることがあります。', tag: 'vague',
          detail: {
            points: [
              'シェアキッチンは飲食店営業許可を持つ設備を時間単位で借りられる仕組みで、初期投資を抑えて家庭で培った料理の腕を試せる環境です。',
              '週末や単発の営業から始められるため、家庭の予定を優先しながら少しずつ規模を調整できる柔軟性があります。',
              '家庭料理として磨いてきた味やレシピは、専門店にはない「作り手の背景が伝わる商品」として評価されやすい傾向があります。',
            ],
            links: [
              { title: 'シェアキッチンとは 営業許可の取り方の解説', url: 'https://sharedine.me/media/know-how/share-kitchen' },
              { title: 'シェアキッチンとは？ 特徴や利用方法、運営事例について | シェアキッチン「CLOCK KITCHEN」', url: 'https://clock-kitchen.com/columns/3451' },
            ],
          },
        },
        { job: '家事・育児サポートの派遣スタッフ', reason: '培ってきた家事のスキルを、そのまま仕事として活かせます。', episode: '毎日当たり前にこなしてきたことが、他の家庭にとっては十分に頼れる専門性になります。', tag: 'neutral',
          detail: {
            points: [
              '家事代行の派遣スタッフは調理・掃除・洗濯といった基本スキルの再現性が最も重視され、実生活での経験年数がそのまま信頼につながります。',
              'シフトの融通が利きやすい業界のため、自身の生活サイクルに合わせて働く時間や日数を選びやすい構造があります。',
              '利用者の多くが子育てや介護と両立する世帯であり、同じ立場を経験してきたことへの共感が単なる作業以上の価値として受け取られます。',
            ],
            links: [
              { title: '家事代行の仕事内容とは？仕事の流れや向いている人の特徴を解説！ | キッズライン', url: 'https://kidsline.me/housekeeping/magazine/article/1075' },
              { title: 'お仕事紹介 | 家事代行サービスのベアーズ', url: 'https://bears-saiyou.net/info/info02/' },
            ],
          },
        },
],
      uniqueSuggestion: { job: '民泊・シェアハウスの運営', reason: '家庭を切り盛りしてきた力を、他人同士が集う場の運営に活かす道があります。', episode: '見えない仕事を同時に回し続けてきたマネジメント力は、様々な人が出入りする場を整える仕事にも、静かに活きます。',
        detail: {
          points: [
            '民泊運営では清掃・リネン管理・ゲスト対応など家事の延長にある業務が中心で、家庭で培った段取り力がそのまま運営品質に直結します。',
            '運営代行という形態が一般化しており、物件を所有していなくても運営ノウハウを提供する側として関わる選択肢があります。',
            '複数のゲストや住人の生活リズムを同時に把握し調整する必要があり、家庭内で複数人の予定を回してきた経験が実務的な強みになります。',
          ],
          links: [
            { title: '民泊運営の始め方と注意点を解説！MujInnで始めるスマートな運営術', url: 'https://mujinn.com/column/trend/minpaku-kaigyo/' },
            { title: '民泊運営代行に必要な資格とは？法律と運営の基本を解説', url: 'https://pqd.co.jp/minpakudaiko-shikaku/' },
          ],
        },
      },
    },
    {
      keywords: ['ドライバー', '運送', '配送', 'トラック', 'タクシー', '配達', '宅配'],
      essence: '決まった時間の中で、決まった仕事を確実にやり遂げる力',
      peopleFacing: false,
      suggestions: [
        { job: '地方移住・二拠点生活のコーディネーター', reason: '土地勘と、人と接してきた経験を、暮らしの提案という形で活かせます。', episode: '各地を回って培った土地勘は、暮らしの提案をする際の説得力になります。', tag: 'continue',
          detail: {
            points: [
              '運送業で培った各地の道路事情や地域特性への土地勘は、移住希望者への具体的な生活提案において、パンフレットにはない実務的な説得力を持ちます。',
              '地方創生の文脈で移住や二拠点生活の相談ニーズが拡大しており、行政・不動産・地域住民をつなぐ実務経験者が求められています。',
              '時間厳守で多くの地域を訪れてきた経験は、移住先の候補地を比較し生活動線まで含めて具体的に提案できる強みになります。',
            ],
            links: [
              { title: '二地域居住とは？魅力や体験談、メリット・デメリットをご紹介！ | TURNS（ターンズ）', url: 'https://turns.jp/52116' },
              { title: '今、注目の新しいライフスタイル「二拠点生活（デュアルライフ）」の実現方法は？ | マドリーム', url: 'https://madream.jp/town/0470-migration_duallife/' },
            ],
          },
        },
        { job: '物流まわりのコンサルタント', reason: '現場を知っているからこそ見える改善点を、仕組みづくりに活かせます。', episode: '現場を知っているからこそ気づける改善点は、仕組みを作る立場になったときに強みになります。', tag: 'unrewarded',
          detail: {
            points: [
              '物流コンサルタントに最も求められるのは理論より現場実態の把握であり、実際に荷物を運んできた経験は机上の改善提案にはない説得力を持ちます。',
              'EC市場の拡大により物流の効率化ニーズは高まり続けており、現場を知る人材へのコンサル需要が構造的に増えています。',
              'ドライバー時代に見えていた「非効率な積み込み」「無駄な待機時間」といった具体的な課題は、そのままコンサルティングの提案材料になります。',
            ],
            links: [
              { title: '物流コンサルタントとは？仕事内容と必要なスキル｜将来性がある理由', url: 'https://x-work.jp/journal/logistics/7485' },
              { title: '物流コンサルタントとは？仕事内容・年収・必要スキル・将来性を徹底解説 | マイビジョン', url: 'https://my-vision.co.jp/consultant/scm' },
            ],
          },
        },
              { job: '引っ越し・物流の効率化アドバイザー', reason: '現場を知っているからこその改善提案が、そのまま価値になります。', episode: '長年の運転経験で見えてきた無駄は、物流全体を効率化する仕事において、貴重な視点になります。', tag: 'repetition',
                detail: {
                  points: [
                    '荷物の積載効率やルート設計は現場経験がなければ再現しづらい暗黙知であり、実際に運んできた人の提案は数字だけの分析より現実的です。',
                    '引っ越し業界・物流業界は人手不足を背景に効率化のニーズが強く、現場出身のアドバイザーを外部登用する動きが広がっています。',
                    '長年の実務で培った「時間内に確実に終わらせる」段取り力は、そのままオペレーション改善の提案軸になります。',
                  ],
                  links: [
                    { title: '2025年版：物流コンサルタント徹底ガイド ― 企業が今すぐ相談できる課題と解決策', url: 'https://www.logizard-zero.com/columns/consulting02.html' },
                    { title: '物流コンサルティングとは？導入メリットや選び方のポイントをご紹介！', url: 'https://www.ryutsu.co.jp/column/a26' },
                  ],
                },
              },
        { job: '観光タクシー・ガイドドライバー', reason: '運転技術に、地域の魅力を伝える案内役という付加価値を加えられます。', episode: '安全に走らせる技術に、土地の物語を語る力を加えれば、観光ドライバーという新しい仕事になります。', tag: 'other-desire',
          detail: {
            points: [
              '観光タクシーは運転技術に加え、地域の歴史や見どころを案内する会話力が評価軸に加わる職種で、長年の運転経験に付加価値を乗せられます。',
              'インバウンド需要の回復により、地域に詳しく安全運転ができるドライバーへの需要が観光地を中心に増加しています。',
              '決まった時間内で目的地に確実に届けてきた経験は、観光ルートの時間配分やスケジュール管理にそのまま活かせます。',
            ],
            links: [
              { title: '観光タクシー運転手（ドライバー）の仕事内容 | なるわ交通', url: 'https://naruwa.jp/recruit/tourism0823-0824016/' },
              { title: '観光案内・観光タクシー運転手の仕事内容とは？ ｜タクノート', url: 'https://www.drivers-work.com/column/taxi-kind/tourism/' },
            ],
          },
        },
        { job: '地方でのキャンピングカー暮らしの実践', reason: '焦らず、今の暮らし方を変えてみるという選択もあります。', episode: 'すぐに仕事を変えなくても、暮らし方そのものを変えることで、見える景色が変わることがあります。', tag: 'vague',
          detail: {
            points: [
              '長距離運転や車内での待機を伴う仕事で培った車両管理や生活動線の工夫は、キャンピングカーでの暮らしをそのまま実践できる技術的な土台になります。',
              '決まったルートを時間内にこなしてきた計画性は、限られた設備の中で移動と生活を両立させる暮らし方と相性が良い働き方です。',
              '拠点を固定しない生き方を試すことで、これまでの働き方を大きく変えずに暮らし方だけを変えるという選択肢を持てます。',
            ],
            links: [],
          },
        },
        { job: '配送ルートの最適化アドバイザー', reason: '現場を知っているからこその改善提案が、そのまま価値になります。', episode: '長年の運転で培った土地勘と効率感覚は、ルート設計を見直す仕事でも、そのまま活きます。', tag: 'neutral',
          detail: {
            points: [
              '配送ルート最適化は近年AIツールの導入が進む一方、現場の道路事情や時間帯特有の混雑を知る人材の知見が精度を左右する要素として重視されています。',
              '物流業界全体で効率化のニーズが強まっており、現場経験者がツール導入や運用改善を支援する役割の需要が増えています。',
              '毎日異なる条件下で最短ルートを判断してきた経験は、そのままルート設計のロジックとして言語化できます。',
            ],
            links: [
              { title: '配送ルートを最適化！｜現状の課題や効率化できるツールを紹介 | 株式会社ゼンリンデータコム', url: 'https://www.zenrin-datacom.net/solution/blog/deliveryroutes-optimization' },
              { title: '配送ルート最適化×AIで効率化。新しい物流の姿を実現するには | 株式会社Laboro.AI', url: 'https://laboro.ai/activity/column/laboro/delivery-route-optimisation/' },
            ],
          },
        },
],
      uniqueSuggestion: { job: 'ラジオパーソナリティ', reason: '一人で長時間過ごす中で培った、間の取り方や語り口を活かす道もあります。', episode: '運転中に一人で言葉を紡いできた時間は、リスナーの隣に座るような語り口を持つ仕事と、意外なほど近いところにあります。',
        detail: {
          points: [
            'ラジオパーソナリティに必要なのは一人で長時間、適度な間合いとリズムを保って話し続ける力で、車内で一人で過ごす時間が長い仕事の経験と重なります。',
            '地域密着型のコミュニティFM局は語り手の実体験や土地の話題を重視しており、各地を回ってきた経験がそのままトークの素材になります。',
            '決まった時間枠の中で情報を過不足なく伝える進行感覚は、時間管理を徹底してきた運転業務と共通する部分があります。',
          ],
          links: [
            { title: 'ラジオパーソナリティとは？仕事内容や向いている人の特徴、プロへのルートを解説', url: 'https://otonal.co.jp/blog/51994' },
            { title: 'ラジオパーソナリティーになるには？その方法と必要なスキルについて | 学校法人東放学園', url: 'https://www.tohogakuen.ac.jp/seiyu_job/radio-personality-skill/' },
          ],
        },
      },
    },
    {
      keywords: ['美容師', '理容師', '美容室', 'ヘアサロン'],
      essence: '人の見た目だけでなく、気持ちの機微にも触れてきた感性',
      peopleFacing: true,
      suggestions: [
        { job: 'パーソナルスタイリスト', reason: '人をよく見て似合うものを見立てる力は、他の分野でも応用できます。', episode: 'お客様に似合うものを見立ててきた感覚は、他のジャンルに置き換えても十分に通用します。', tag: 'continue',
          detail: {
            points: [
              'パーソナルスタイリストは骨格や顔立ちを見て似合うものを提案する力が核であり、美容師として培った「人をよく観察して似合わせる」技術がそのまま応用できます。',
              '個人の悩みに合わせた提案が仕事の中心のため、資格よりも実際のカウンセリング経験や提案の引き出しの多さが信頼につながる業界です。',
              '美容業界での接客経験は、初対面の相手の好みや悩みを短時間で引き出す会話力として、そのままスタイリング相談に活かせます。',
            ],
            links: [
              { title: 'パーソナルスタイリストの仕事内容・なるには | キャリアガーデン', url: 'https://careergarden.jp/stylist/personal-stylist/' },
              { title: 'スタイリストの仕事内容とは？なるための方法や有利な資格を解説 | 生涯学習のユーキャン', url: 'https://www.u-can.co.jp/course/data/in_html/1399/column/column01.html' },
            ],
          },
        },
        { job: 'セラピスト', reason: '施術中の会話で人の悩みに触れてきた経験が、傾聴を軸にした仕事につながります。', episode: '施術中の会話で悩みに触れてきた経験は、聞くことを中心にした仕事にそのままつながります。', tag: 'unrewarded',
          detail: {
            points: [
              'セラピストの仕事は技術と同じくらい会話中の傾聴力が評価される分野で、施術中に自然と人の悩みを聞いてきた経験がそのまま強みになります。',
              '美容師免許や接客経験を活かせる転職先として業界内で認識されており、未経験からでも美容分野出身者は歓迎される傾向があります。',
              '人の体や見た目に直接触れる仕事という共通点があり、相手の緊張をほぐす距離感の取り方を新しい技術の上に乗せて活かせます。',
            ],
            links: [
              { title: 'セラピストとは？4つの種類や仕事内容について詳しく解説 | 原宿ベルエポック美容専門学校', url: 'https://www.belle.ac.jp/archives/column/17815' },
              { title: '美容師免許が活かせる仕事は？資格や経験が役立つ転職先を解説 | 美眉総研', url: 'https://www.anastasiamiaray.jp/article/work-174/' },
            ],
          },
        },
              { job: 'ブライダル美容の専門職', reason: '特別な日に寄り添う技術を、より専門性の高い形で発揮できます。', episode: '日々のお客様に向き合ってきた技術は、人生の特別な一日を支える仕事でも、確かな力になります。', tag: 'repetition',
                detail: {
                  points: [
                    'ブライダルヘアメイクは技術力に加えて、限られた時間で緊張した新郎新婦の気持ちを整える対応力が重視される仕事です。',
                    '一生に一度の特別な日に寄り添ってきた美容師としての接客経験は、より専門性の高い現場でもそのまま評価軸になります。',
                    '挙式のスケジュールに合わせて正確に仕上げる時間管理能力は、現場での実務経験がなければ身につきにくいスキルです。',
                  ],
                  links: [
                    { title: 'ブライダル美容師・ヘアメイクとは？ 仕事内容と必要な資格・スキルを紹介 | モアリジョブ', url: 'https://relax-job.com/more/90691' },
                    { title: 'ブライダルヘアメイクアーティストになるには？仕事内容や給料、資格まで徹底解説', url: 'https://work.beauty.hotpepper.jp/guide/article/00238/' },
                  ],
                },
              },
        { job: 'メイク・ヘア講師', reason: '技術を教える立場になることで、より多くの人に影響を与えられます。', episode: '自分の手で磨いてきた技術を、後進に伝える仕事に変えることで、影響力の輪を広げられます。', tag: 'other-desire',
          detail: {
            points: [
              '講師業では技術そのものより、自分の手順や判断基準を言語化して他者に伝えられるかが問われ、現場での再現性の高い経験がそのまま教材になります。',
              '美容専門学校やスクールでは即戦力となる現場出身の講師が求められており、実務経験の長さがそのまま採用時の評価につながります。',
              '技術を一人で提供する立場から多くの受講生に影響を与える立場に変わることで、これまでの経験の届く範囲を広げられます。',
            ],
            links: [
              { title: 'ヘアメイクアーティストになるには美容師の資格が必要！なり方や仕事内容・気になる給料事情を紹介 | 原宿ベルエポック美容専門学校', url: 'https://www.belle.ac.jp/archives/column/14407' },
              { title: 'ヘアメイクアップアーティストになるには？必要な資格は | 東京総合美容専門学校', url: 'https://www.tsbs.jp/support/make' },
            ],
          },
        },
        { job: '地方でのゆったりとした個人サロン開業', reason: '焦らず、今の技術を活かせる働き方の形を探る選択もあります。', episode: '都会のペースを離れて、自分のペースで技術を活かす場所を探すのも、一つの道です。', tag: 'vague',
          detail: {
            points: [
              '個人サロンの開業は大型店舗に比べて初期投資を抑えられ、これまで培った技術と顧客対応力をそのまま収益に変えられる構造です。',
              '地方では美容師の担い手不足が続いており、経験豊富な人材が独立する際に一定の顧客基盤を築きやすい環境があります。',
              '予約制・少人数対応にすることで、これまでの経験で培った一人ひとりへの丁寧な対応をそのまま強みにできる働き方です。',
            ],
            links: [
              { title: '美容師の独立完全ガイド！1年前からの費用・準備・タイミング・失敗回避まで徹底解説 | EMANONシェアサロン', url: 'https://emanon-sharesalon.com/beautician-independence-guide/' },
              { title: '美容師・理容師が1人で独立するときの流れを解説！開業資金の組み立て方や売上・費用・収入のシミュレーション', url: 'https://kaigyou.tb-net.jp/column/001.html' },
            ],
          },
        },
        { job: '美容ディーラー・商品開発担当', reason: '現場で培った技術知識を、商品を作る側から活かせます。', episode: 'お客様の反応を見てきた経験は、次に求められる商品を考える仕事でも、そのまま強みになります。', tag: 'neutral',
          detail: {
            points: [
              '美容ディーラーは商品知識だけでなく現場で実際に使ってきた立場からの提案力が評価される仕事で、施術経験がそのまま営業トークの説得力になります。',
              '美容師からのキャリアチェンジ先として業界内で確立されたルートがあり、現場出身者が歓迎されやすい構造があります。',
              '商品開発の現場でも「現場で本当に使いやすいか」という視点は開発者だけでは得られず、施術経験者ならではの価値になります。',
            ],
            links: [
              { title: '美容ディーラーの仕事内容を紹介！ 美容師からの転職におすすめな3つの理由とは | モアリジョブ', url: 'https://relax-job.com/more/118795' },
              { title: '美容ディーラーの仕事内容とは？未経験からの転職方法や年収・やりがいを解説', url: 'https://work.beauty.hotpepper.jp/guide/article/00206/' },
            ],
          },
        },
],
      uniqueSuggestion: { job: '舞台・映像の特殊メイクアーティスト', reason: '人の見た目を変える技術を、映画や舞台の世界で発揮する道があります。', episode: 'お客様の魅力を引き出す技術は、物語の中の人物を作り上げる仕事でも、そのまま強みになります。',
        detail: {
          points: [
            '特殊メイクは通常のメイク技術に加え、人の顔立ちの構造を理解した上で別人に見せる立体的な技術が求められ、美容師としての土台がその応用力になります。',
            '映像・舞台業界では専門養成校出身者に加え、現場での実務技術を積んだ人材が評価される分業構造があり、美容の基礎技術は参入時の強みになります。',
            '人の見た目を大きく変える仕事という点で共通しており、これまでの技術を非日常の表現の世界で発揮する道があります。',
          ],
          links: [
            { title: '特殊メイクアーティストとは？平均年収・仕事内容・転職方法を解説！なるにはどうすればいい？', url: 'https://agaroot.co.jp/job/special-effects-makeup-artist/' },
            { title: '特殊メイクアップアーティストの仕事内容-資格・年収・やりがいを解説', url: 'https://www.sanko.ac.jp/job/research/special_effects_makeup.html' },
          ],
        },
      },
    },
    {
      keywords: ['工場', '製造', '製造業', 'ライン', '組立', '工員'],
      essence: '決められた工程を、正確に・安全に積み重ねる力',
      peopleFacing: false,
      suggestions: [
        { job: '品質管理・検査の専門職', reason: '細部への注意力を、より責任のある立場で活かせます。', episode: '工程のわずかな異常に気づいてきた目は、品質管理という仕事でそのまま評価されます。', tag: 'unrewarded',
          detail: {
            points: [
              '品質管理は「なぜ不良が起きたか」を工程にさかのぼって特定する仕事で、現場作業を体で理解している人ほど原因の見立てが早くなります。',
              'ISOなど品質保証の枠組みは、細部を見逃さず記録を積み重ねる姿勢と相性がよく、検査経験の長さがそのまま信頼につながります。',
              '製造業では熟練の検査人材が不足しており、現場感覚を持つ人材への需要は今も根強く残っています。',
            ],
            links: [
              { title: '品質管理に未経験から転職！仕事内容や年収など徹底解説 | すべらない転職', url: 'https://axxis.co.jp/magazine/58218' },
              { title: '品質管理エンジニアの仕事内容、未経験からなるには|職種図鑑|転職ならtype', url: 'https://type.jp/tensyoku-knowhow/ready/catalog/quality-control-engineer/' },
            ],
          },
        },
        { job: '生産管理・工程改善のコンサルタント', reason: '現場を知っているからこその改善提案が、そのまま価値になります。', episode: '現場で感じてきた「ここが非効率」という感覚は、工程を見直す仕事において貴重な視点になります。', tag: 'repetition',
          detail: {
            points: [
              '工程改善の提案力は、机上の理論より「実際に手を動かしてボトルネックを体感した経験」に裏打ちされている方が現場に響きます。',
              '生産管理はコスト・納期・品質のバランスを取る仕事で、長年数字と工程の両方を見てきた経験がそのまま判断基準になります。',
              '人手不足に悩む中小製造業では、外部の理論家より「現場を知る内部出身者」による改善提案の方が受け入れられやすい傾向があります。',
            ],
            links: [
              { title: '【工場の効率化を支える！】生産管理・生産事務・工程管理の仕事内容と働くための大切なポイント | 工場キャリアラボ', url: 'https://04510.jp/columns/work/seisankanri/' },
              { title: '生産技術コンサルティング｜コンサルティング・サービス｜日本能率協会コンサルティング（JMAC）', url: 'https://www.jmac.co.jp/consulting/category/production/production_strategy.html' },
            ],
          },
        },
        { job: '技能継承の指導員', reason: '培った技術を、次の世代に伝える立場で活かせます。', episode: '手を動かして覚えてきた技術は、言葉と実演で伝える仕事に変えることで、新しい価値を持ちます。', tag: 'other-desire',
          detail: {
            points: [
              '技能継承は、優れた技術を持つことより「言語化されていない暗黙知を、手順として説明できる力」が問われる仕事です。',
              '多くの中小製造業がベテランの引退による技術断絶に直面しており、現場出身の指導人材の必要性は年々高まっています。',
              '若手への指導では、失敗談や工夫の背景まで語れる実体験の厚みが、マニュアルにはない説得力を生みます。',
            ],
            links: [
              { title: '【成功事例】技術継承とは？できない課題と解決策を解説！デジタル活用の方法も', url: 'https://tebiki.jp/genba/useful/technology-inheritance/' },
              { title: '中小企業の「技術伝承」はなぜ進まない？ベテラン社員の技術を若手に引き継ぐ最適な方法とは | 弥報Online', url: 'https://media.yayoi-kk.co.jp/18405/' },
            ],
          },
        },
        { job: '工場の安全管理担当', reason: '現場で培った危機管理の意識を、日常的な安全管理に活かせます。', episode: '毎日同じ工程と向き合ってきた集中力は、安全を守る仕事でも、そのまま強みになります。', tag: 'continue',
          detail: {
            points: [
              '安全管理は法令知識だけでなく「どこで事故が起きやすいか」を肌感覚で察知する経験がものを言う仕事です。',
              '労働安全衛生法により一定規模の事業場には安全管理者の選任が義務付けられており、現場経験者への需要は制度的にも支えられています。',
              'ヒヤリハットの兆候に気づく感度は、長年現場に立ってきた人だからこそ持てる強みです。',
            ],
            links: [
              { title: '安全管理者の役割とは？仕事内容、資格の取り方から巡視頻度までわかりやすく解説', url: 'https://biz.moneyforward.com/payroll/basic/98225/' },
              { title: '安全管理者とは事業場の安全全般の管理者！取得方法など解説', url: 'https://www.sat-co.info/blog/anzenkanri210001/' },
            ],
          },
        },
        { job: '地方の小規模工房での物づくり', reason: '焦らず、今の技術を活かせる働き方の形を探る選択もあります。', episode: '大きな工場を離れても、手に馴染んだ技術を活かせる小さな現場は、いくつも存在します。', tag: 'vague',
          detail: {
            points: [
              '小規模工房は分業された量産ラインと違い一人で工程全体に関わるため、これまで断片的に担ってきた作業の知識を統合して活かせます。',
              '地方では後継者不在の工房が増えており、経験ある人材を求める動きが各地の移住・就業支援の現場で見られます。',
              '生産量より品質や物語性が評価される市場のため、長年培った丁寧な仕事ぶりがそのまま強みになります。',
            ],
            links: [
              { title: '工房を持つ夢と豊かな生き方を叶えた移住先｜田舎暮らし特集｜ニッポン移住・交流ナビ JOIN', url: 'https://www.iju-join.jp/feature_cont/introduction/003/02.html' },
            ],
          },
        },
        { job: '設備保守・メンテナンス業務', reason: '現場を知っているからこそ気づける不具合の兆候を活かせます。', episode: '日々の作業で培った「機械の調子を見る目」は、保守点検の仕事でもそのまま通用します。', tag: 'neutral',
          detail: {
            points: [
              '設備保守は、稼働中の異音や振動といった「普段と違う予兆」に気づく感覚が最大の武器になる仕事です。',
              '老朽化した設備を抱える工場は多く、機械の癖まで把握できるベテラン人材への需要は構造的に高い状態が続いています。',
              'トラブル対応の経験は、マニュアル通りにいかない現場判断力として、そのまま次の職場でも評価されます。',
            ],
            links: [
              { title: '設備保全／保守／設備メンテナンスとはどんな職種？仕事内容／給料／転職事情を解説【doda職種図鑑】', url: 'https://doda.jp/guide/zukan/070.html' },
              { title: '設備保守とは？仕事内容や向いている人について解説｜タイズマガジン｜メーカー転職エージェント「タイズ」', url: 'https://www.ee-ties.com/magazine/2273/' },
            ],
          },
        },
      ],
      uniqueSuggestion: { job: '伝統工芸の職人', reason: '決められた工程を正確にこなしてきた集中力は、手仕事の世界でも変わらず強みになります。', episode: '同じ作業を繰り返し正確にこなしてきた経験は、一つのものを丁寧に仕上げる伝統工芸の世界と、深いところで重なります。',
        detail: {
          points: [
            '伝統工芸の修業は、決められた手順を繰り返し正確に再現する訓練が中心で、工程を守り抜いてきた集中力がそのまま土台になります。',
            '多くの産地で後継者不足が深刻化しており、年齢を問わず弟子入りを受け入れる工房が各地で増えています。',
            '大量生産の現場で培った「均一な品質を保つ意識」は、一点ものの手仕事においても精度の高さとして活きます。',
          ],
          links: [
            { title: '伝統工芸職人に未経験でもなれる！？伝統工芸職人の世界に一歩踏み出そう | 伝統工芸品ならBECOS', url: 'https://journal.thebecos.com/syokunin-naruhouhou/' },
            { title: '伝統工芸職人の求人、後継者募集情報【随時更新】 | 四季の美', url: 'https://shikinobi.com/job/' },
          ],
        },
      },
    },
    {
      keywords: ['土木', '建設', '建築', '現場', '施工', '土建', '大工'],
      essence: '体を動かしながら、確実に形あるものを作り上げる力',
      peopleFacing: false,
      suggestions: [
        { job: '現場監督・施工管理者', reason: '現場を知り尽くした経験を、管理する立場から活かせます。', episode: '一つひとつの作業を見てきた経験は、複数の現場を管理する立場になったときに、そのまま強みになります。', tag: 'unrewarded',
          detail: {
            points: [
              '施工管理は技術力そのものより「工程・予算・安全を同時に管理する調整力」が問われる仕事で、現場を知る人ほど段取りの勘所を押さえられます。',
              '建設業では技術者の高齢化が進み、現場経験を持つ人材の確保が業界全体の課題となっています。',
              '職人との信頼関係は現場言葉と作業の実情を理解しているかどうかで決まるため、現場出身であること自体が強みになります。',
            ],
            links: [
              { title: '未経験でも施工管理（現場監督）になるために必要なスキルとは？｜施工管理.キャリア', url: 'https://sekou-kanri.careers/archives/blog/5091' },
              { title: '現場監督とは？現場監督の仕事内容と必要な資格やスキルを解説 | 建設現場マガジン | Buildee', url: 'https://service.buildee.jp/blog/mag059/' },
            ],
          },
        },
        { job: 'リフォーム・古民家再生の職人', reason: '培った技術を、新しい形の建築ニーズに活かせます。', episode: '現場で鍛えた技術は、古い建物を活かす仕事においても、確かな価値を持ちます。', tag: 'repetition',
          detail: {
            points: [
              '古民家再生は規格化された新築工法と異なり、建物ごとの劣化状態を見極めて対応する現場判断力が求められる仕事です。',
              '空き家の増加を背景に、古い工法や素材の扱いを理解した職人への需要は各地で高まっています。',
              '木材や左官など従来工法への理解はマニュアル化されにくい分、経験の蓄積がそのまま技術的な差になります。',
            ],
            links: [
              { title: '空き家・古民家再生業 | 起業支援 | J-Net21[中小企業ビジネス支援サイト]', url: 'https://j-net21.smrj.go.jp/startup/guide/service/kominka.html' },
              { title: '古民家再生リフォーム（改修）の種類と注意点、費用は？｜リフォーム会社紹介サイト「ホームプロ」', url: 'https://www.homepro.jp/kominka/kominka-basic/617' },
            ],
          },
        },
        { job: '防災・耐震診断の専門職', reason: '建築の知識を、安全を守る仕事に転用できます。', episode: '建物を作ってきた経験は、建物の弱点を見抜く診断の仕事にも、そのまま活きます。', tag: 'other-desire',
          detail: {
            points: [
              '耐震診断は図面上の計算だけでなく、実際の建物の劣化や施工の癖を見抜く現場感覚が診断の精度を左右します。',
              '大規模地震への備えとして自治体の耐震化補助制度が拡充されており、診断できる人材への需要は制度面からも後押しされています。',
              '数多くの建物を現場で見てきた経験は、教科書的な知識だけでは判断できない微妙な劣化のサインを読み取る力につながります。',
            ],
            links: [
              { title: '耐震の資格「耐震技術認定者」｜木耐協は耐震診断・耐震補強・耐震リフォームの工務店ネットワーク', url: 'https://www.mokutaikyo.com/ninteisya/' },
              { title: '耐震診断士とはどんな資格？診断内容・業者の選び方も解説 – 構造設計.com', url: 'https://an-sd.jp/%E8%80%90%E9%9C%87%E8%A8%BA%E6%96%AD%E5%A3%AB%E3%81%A8%E3%81%AF%E3%81%A9%E3%82%93%E3%81%AA%E8%B3%87%E6%A0%BC%EF%BC%9F%E8%A8%BA%E6%96%AD%E5%86%85%E5%AE%B9%E3%83%BB%E6%A5%AD%E8%80%85%E3%81%AE%E9%81%B8/' },
            ],
          },
        },
        { job: '建設コンサルタント', reason: '現場を知っているからこその視点を、計画段階から活かせます。', episode: '現場で培った勘所は、図面だけでは分からない部分を補う仕事において、貴重な視点になります。', tag: 'continue',
          detail: {
            points: [
              '建設コンサルタントは計画段階から関わる仕事のため、施工現場の制約を知っている人ほど実現可能な提案ができます。',
              'インフラの老朽化対策や防災工事の需要が拡大しており、現場を知る技術者への発注ニーズは公共・民間ともに高まっています。',
              '図面と実際の施工のズレを予見できる力は、現場経験がなければ身につかない実務的な価値です。',
            ],
            links: [
              { title: '建設コンサルタントとは？業務内容から求められる能力まで徹底解説 | 建設転職ナビ', url: 'https://kensetsutenshokunavi.jp/c/content/job_guide/job_guide_27/' },
              { title: '建設工事の全体をサポートする「建設コンサルタント」ってどんな職業?｜コンキャリ建築土木', url: 'https://const-career.com/blog/about-construction-consultant/' },
            ],
          },
        },
        { job: '地方でのDIY・小規模建築の請負', reason: '焦らず、今の技術を活かせる働き方の形を探る選択もあります。', episode: '大きな現場を離れても、地域に根ざした小さな仕事から、次の形を探ることができます。', tag: 'vague',
          detail: {
            points: [
              '小規模な請負仕事は、大規模現場では分業化されていた工程を一人で完結させる必要があり、幅広い経験がそのまま総合力になります。',
              '地方では大手が手掛けにくい小口の改修・修繕ニーズが根強く残っており、小回りの利く個人への依頼が増えています。',
              '施主と直接やり取りする働き方のため、現場を知る立場からの分かりやすい説明がそのまま信頼につながります。',
            ],
            links: [],
          },
        },
        { job: '建設業界向けの安全管理担当', reason: '現場を知っているからこそ気づける危険への感度を活かせます。', episode: '現場で培った「危ないという勘」は、安全管理という仕事でもそのまま通用します。', tag: 'neutral',
          detail: {
            points: [
              '建設現場は業種の中でも労働災害リスクが高く、法令で安全管理者の選任が義務付けられているため専門人材への需要が常に存在します。',
              '危険箇所を事前に察知する感覚は、実際に現場で作業してきた人でなければ身につきにくい実務知です。',
              '元請け・下請けが複雑に絡む建設現場では、現場の力関係や慣習を理解した上での安全指導が特に効果を発揮します。',
            ],
            links: [
              { title: '施工の神様 | 安全管理者とはどんな資格？役割や選任要件、難易度まで徹底解説', url: 'https://sekokan-navi.jp/magazine/52027' },
              { title: '安全管理者とは？職務や選任要件などについて詳しく解説 - 安全管理者能力向上教育 - | CIC日本建設情報センター', url: 'https://www.cic-ct.co.jp/column/noryokuanzenk-column/noryokuanzenk-column-column01/' },
            ],
          },
        },
      ],
      uniqueSuggestion: { job: '木工作家・家具職人', reason: 'ものを作り上げる手の技術を、より小さく丁寧な形で発揮する道もあります。', episode: '大きな建物を作ってきた技術と感覚は、一つの家具を丁寧に仕上げる仕事にも、無理なくつながります。',
        detail: {
          points: [
            '家具づくりは寸法通りに正確に加工する工程の積み重ねであり、決められた手順を丁寧にこなしてきた経験がそのまま精度に直結します。',
            '量産品にはない「素材の癖を見極めて調整する判断力」は、現場でものづくりに関わってきた人ほど早く身につきます。',
            '一点ものの家具や木工品は、作り手の丁寧な仕事ぶりが価格や評価に直接反映されるため、地道な技術の積み重ねが正当に評価されます。',
          ],
          links: [
            { title: '家具職人になるには？仕事内容・向いている人や未経験から目指すルートを解説 | 旭川木工センター', url: 'https://asahikawa-mokkocenter.com/?p=7406' },
            { title: '家具職人になるには | 大学・専門学校の【スタディサプリ 進路】', url: 'https://shingakunet.com/bunnya/w0016/x0338/' },
          ],
        },
      },
    },
    {
      keywords: ['経営者', '自営業', '社長', '起業家', '個人事業主', 'オーナー'],
      essence: 'リスクを引き受けながら、自分の裁量で物事を前に進める力',
      peopleFacing: true,
      suggestions: [
        { job: '事業承継・M&Aアドバイザー', reason: '経営の実情を知っているからこそ、他の経営者に寄り添った助言ができます。', episode: '数字だけでなく現場の空気まで読んできた経験は、他社の経営判断を支える仕事でも、そのまま活きます。', tag: 'unrewarded',
          detail: {
            points: [
              '事業承継の助言では、財務知識以上に「経営者が何を不安に思っているか」を理解できる経営経験の有無が信頼を左右します。',
              '中小企業経営者の高齢化に伴い後継者不在企業が急増しており、実務を知るアドバイザーへの需要は今後も拡大が見込まれます。',
              '自ら意思決定を重ねてきた経験は、譲る側・譲り受ける側双方の心理的な機微を理解する土台になります。',
            ],
            links: [
              { title: '事業承継アドバイザーとは？相談するメリットや他の資格との違いを解説 | マネーフォワード クラウド会社設立', url: 'https://biz.moneyforward.com/establish/basic/70251/' },
              { title: 'M&Aアドバイザリーとは？業務内容や必要な資格など徹底解説｜成長M&A/承継M&A総合サイト｜タナベコンサルティング', url: 'https://www.tanabeconsulting.co.jp/en/manda/ma_info/column54.html' },
            ],
          },
        },
        { job: '中小企業向けの経営コンサルタント', reason: '自ら意思決定してきた経験は、助言する立場になったときに説得力を持ちます。', episode: '自分のお金とリスクで判断してきた経験は、机上の理論だけのコンサルタントにはない重みを持ちます。', tag: 'repetition',
          detail: {
            points: [
              '中小企業向けのコンサルティングでは、大企業の理論より「限られた人員と資金でどう回すか」という実践知が重視されます。',
              '中小企業診断士などの資格に加え、自ら経営してきた実績があることで助言の説得力は大きく変わります。',
              '後継者不足や人手不足に悩む中小企業は多く、現場を知る経営経験者への相談ニーズは各地の商工団体でも高まっています。',
            ],
            links: [
              { title: '中小企業診断士 | 起業支援 | J-Net21[中小企業ビジネス支援サイト]', url: 'https://j-net21.smrj.go.jp/startup/guide/proservice/c_consultant.html' },
              { title: '中小企業診断士が独立開業に成功！独立割合・年収・事前準備を解説', url: 'https://44jyuku.com/shindanshi-dokuritsu-kaigyo/' },
            ],
          },
        },
        { job: '起業家向けのメンター・投資家', reason: '経営の実体験を、次の世代の挑戦を支える形で活かせます。', episode: '自ら道を切り拓いてきた経験は、これから挑戦する人の背中を押す言葉に、そのまま変わります。', tag: 'other-desire',
          detail: {
            points: [
              '起業家支援では、成功体験より「自分が実際に失敗し、どう乗り越えたか」を語れることの方が若い経営者の信頼を得やすいものです。',
              'エンジェル投資には資金力だけでなく投資先の事業運営に助言できる経験が求められるため、経営経験者の存在価値は資金以上のものになります。',
              'スタートアップ支援の裾野が広がる中、実務経験を持つメンター人材は各地の起業支援拠点で求められています。',
            ],
            links: [
              { title: 'エンジェル投資家ってどんな人？起業を目指す人は知っておきたいエンジェル投資家の存在 | 事業承継・M&AならBATONZ（バトンズ）', url: 'https://batonz.jp/learn/8532/' },
              { title: 'エンジェル投資家とは？出資を受けるメリットや流れ、選ぶポイントを解説 | freee', url: 'https://www.freee.co.jp/kb/kb-launch/angel-investorl/' },
            ],
          },
        },
        { job: '業界団体・商工会議所の役員', reason: '経営者としての視点を、業界全体のために活かす道もあります。', episode: '一つの会社を見てきた視点は、業界全体を俯瞰する立場になったときに、新しい価値を持ちます。', tag: 'continue',
          detail: {
            points: [
              '商工会議所などの業界団体は会員事業者の意見を取りまとめる役割を担うため、自ら経営してきた立場からの発言が重みを持ちます。',
              '地域経済の政策提言には現場の実情を知る声が不可欠で、経営経験者は行政と事業者をつなぐ橋渡し役として求められています。',
              '同業者からの信頼は理論より実績で積み上がるため、長年の経営実績そのものが役職への推薦理由になります。',
            ],
            links: [
              { title: '商工会議所とは？活動内容、商工会との違いを解説 ｜M&Aコラム', url: 'https://www.nihon-ma.co.jp/columns/2023/x20231024/' },
            ],
          },
        },
        { job: '地方での小さな商いの再スタート', reason: '焦らず、これまでの経験を活かせる規模から始め直す選択もあります。', episode: '大きな決断をしなくても、身の丈に合った商いから、次の形を探ることができます。', tag: 'vague',
          detail: {
            points: [
              '地方の小規模な商いは、大きな資本力より「地域の人との信頼関係」で成り立つため、経営者として培った対人経験がそのまま資産になります。',
              '地方では空き店舗を活用した小規模開業への補助制度が整いつつあり、小さく始めるハードルは以前より下がっています。',
              '一度経営の全体像を経験している人は、規模を縮小しても収支管理や意思決定の勘所を見失わずに済みます。',
            ],
            links: [
              { title: '田舎の起業で儲かるスモールビジネス成功例｜地方起業アイデア12選', url: 'https://sogyotecho.jp/inaka-smallbusiness/' },
              { title: '地方で起業するメリット──静かな環境で、自分らしいビジネスを育てるという選択', url: 'https://v-spirits.com/nakano/%E5%9C%B0%E6%96%B9%E3%81%A7%E8%B5%B7%E6%A5%AD%E3%81%99%E3%82%8B%E3%83%A1%E3%83%AA%E3%83%83%E3%83%88%E2%94%80%E2%94%80%E9%9D%99%E3%81%8B%E3%81%AA%E7%92%B0%E5%A2%83%E3%81%A7%E3%80%81%E8%87%AA%E5%88%86' },
            ],
          },
        },
        { job: '講演家・経営者向けの研修講師', reason: '経営の実体験を、伝える仕事として届けられます。', episode: '修羅場を乗り越えてきた経験そのものが、他の経営者にとって価値ある教材になります。', tag: 'neutral',
          detail: {
            points: [
              '経営者向けの研修や講演では、理論を教えるより「実際に何を判断し、何を失敗したか」という一次情報が最も求められます。',
              '講師としての説得力は経歴の華やかさではなく、修羅場を乗り越えた具体的なエピソードの厚みで決まります。',
              '事業承継や人材育成に悩む経営者は多く、同じ立場を経験した人物の話を聞きたいという需要は各地の経営者団体で根強くあります。',
            ],
            links: [
              { title: 'プロの研修講師になるためには？／研修講師への道(1) | 研修講師になるには（社）人財開発支援協会', url: 'https://www.hrdsa.or.jp/koushienomichi1.html' },
            ],
          },
        },
      ],
      uniqueSuggestion: { job: '飲食店・宿の経営', reason: '人を巻き込み、場を作ってきた経験を、もてなしの場という形で発揮する道もあります。', episode: '数字と人の両方を見ながら経営してきた感覚は、お客様をもてなす場を作る仕事にも、意外なほど自然に重なります。',
        detail: {
          points: [
            '飲食店や宿の経営は、料理や接客の技術以上に「日々の仕入れ・人繰り・資金繰りを回し続ける経営力」が生死を分けます。',
            '異業種から飲食業へ参入する例は増えており、経営管理の経験を持つ人材は現場の職人肌の経営者より数字に強いという評価を受けやすい傾向があります。',
            '人を巻き込みながら組織を動かしてきた経験は、スタッフのマネジメントや常連客との関係づくりにそのまま応用できます。',
          ],
          links: [
            { title: '異業種からの飲食店参入｜成功のために知っておくべきポイント - ナシエル', url: 'https://naciel.jp/restaurant-industry/different_industries_entrants_success/' },
            { title: '【異業種から飲食の道へ】５人の先輩オーナーからみる異業種開業の可能性｜居抜き店舗ABC', url: 'https://www.abc-tenpo.com/contents/blog/20269' },
          ],
        },
      },
    },
    {
      keywords: ['芸能', 'タレント', '俳優', '女優', '歌手', 'お笑い', 'エンターテインメント', '芸能人'],
      essence: '人前に立ち、注目を集めながら表現し続けてきた力',
      peopleFacing: true,
      suggestions: [
        { job: 'イベント・舞台の企画プロデューサー', reason: '表舞台での経験を、裏方として場を作る立場に活かせます。', episode: '見られる側だった経験は、見せる側になったときに、他にはない説得力を持ちます。', tag: 'unrewarded',
          detail: {
            points: [
              'プロデューサーに求められるのは企画力以上に「限られた予算と時間の中で、多職種の人間を動かして本番に間に合わせる」進行管理力で、現場での経験がそのまま実務に直結します。',
              '出演者・スタッフ・会場・スポンサーなど利害の異なる関係者を調整する力は、舞台裏で人と接してきた経験がある人ほど発揮しやすい能力です。',
              '本番に絶対の失敗が許されない緊張感の中で動いてきた経験は、トラブル発生時に冷静に代替案を出す判断力として高く評価されます。',
            ],
            links: [
              { title: 'イベントプロデューサーになるには？仕事内容や必要な資格などを解説！', url: 'https://kids.gakken.co.jp/shinro/shigoto/work137/' },
              { title: 'イベント プロデューサーになるには？仕事内容や年収・向いている人の特徴も解説', url: 'https://sho-in.ed.jp/column/1388/' },
            ],
          },
        },
        { job: '話し方・表現力の講師', reason: '培った表現力を、人に教える仕事として届けられます。', episode: '人前で表現し続けてきた技術は、言葉にして教えることで、さらに多くの人に届きます。', tag: 'repetition',
          detail: {
            points: [
              '話し方講師の市場価値は理論知識よりも「自分が長年実践し、結果を出してきた型」を持っているかどうかで決まり、現場で鍛えた表現力はそのまま教材になります。',
              '研修やスクールの受講生が最も求めているのは再現性のあるコツであり、体系立てて言語化できる実演経験者は同業の中でも希少です。',
              'ビジネス研修から自己啓発講座まで話し方教育の市場は幅広く、実績に裏づけられた講師は独立してもオンライン講座やセミナーで収益化しやすい分野です。',
            ],
            links: [],
          },
        },
        { job: 'タレント・アーティストのマネジメント業', reason: '現場を知っているからこそ、若い世代を支える立場になれます。', episode: '表現者として歩んできた道のりは、次の世代を支えるマネジメント業に、そのまま活かせます。', tag: 'other-desire',
          detail: {
            points: [
              'マネジメント業で最も重視されるのは業界特有の商習慣とスケジュール感を体で理解していることで、現場出身者は即戦力として扱われます。',
              '事務所・広告代理店・メディア関係者との交渉や調整は、業界内の人脈と信頼関係がものを言う仕事であり、長年の現場経験がそのまま資産になります。',
              '若手の育成やメンタルケアには、自分自身が表舞台でプレッシャーと向き合ってきた実体験に基づくアドバイスが説得力を持ちます。',
            ],
            links: [
              { title: '芸能マネージャーの仕事内容・なり方・年収・資格などを解説', url: 'https://careergarden.jp/geinoumanager/' },
            ],
          },
        },
        { job: '地域イベントの企画・司会', reason: '経験を、より身近な場で発揮する道もあります。', episode: '大きな舞台で培った力は、地域のイベントのような小さな場でも、変わらず輝きます。', tag: 'continue',
          detail: {
            points: [
              '地域イベントでは大規模な予算やスタッフを持たない分、進行台本の作成から当日の仕切りまで一人で対応できる経験値が重宝されます。',
              '地元の自治体や商店会との調整は、業界の大小を問わず「関係者に丁寧に段取りを説明し、動いてもらう」対人スキルが土台になっており、これまでの現場経験がそのまま生きます。',
              '司会進行は台本通りに進まない場面での対応力が評価される仕事で、本番慣れしている経験者ほどアクシデントに強い傾向があります。',
            ],
            links: [],
          },
        },
        { job: '田舎での創作活動中心の暮らし', reason: '焦らず、表現を続けながら暮らし方を変える選択もあります。', episode: '華やかな場を離れても、表現し続けることそのものは、形を変えて続けられます。', tag: 'vague',
          detail: {
            points: [
              '表現の仕事を長く続けてきた人は、収入を都市部の仕事に依存しない働き方を選んでも創作の技術そのものは失われないため、暮らし方を変える選択がしやすい立場にあります。',
              '地方では空き家や古民家を活用した工房・アトリエ需要があり、都市部より低コストで制作環境を整えられる点は移住を後押しする現実的な要因です。',
              'オンライン販売や動画配信の普及により、住む場所を問わず作品や表現を発信して収入源を作れる環境が整ってきています。',
            ],
            links: [],
          },
        },
        { job: '企業のCM・広報関連の仕事', reason: '表現の技術を、企業のブランディングという形で活かせます。', episode: '人の心を動かしてきた経験は、企業が伝えたいことを形にする仕事でも、そのまま力になります。', tag: 'neutral',
          detail: {
            points: [
              'CMや広報の現場では、伝わる表現を作るために「どう見せれば相手に届くか」を体で理解している人材が重宝され、出演経験はその感覚を裏付ける材料になります。',
              '企業広報は社内外への発信を一手に担うため、人前での立ち居振る舞いやメディア対応に慣れている経験は実務に直結する強みです。',
              '広告・PR業界は演出や見せ方のノウハウを持つ人材の需要が根強く、制作サイドとしての参画にも表現の現場経験が評価されます。',
            ],
            links: [],
          },
        },
      ],
      uniqueSuggestion: { job: '声優・ナレーター', reason: '人前での表現力を、声というまた別の形で発揮する道があります。', episode: '表現者として培ってきた抑揚や間合いは、姿を見せずとも伝わる声の仕事にも、無理なくつながります。',
        detail: {
          points: [
            'ナレーションは演技力そのものより「情報を正確かつ聞き取りやすく伝える技術」が評価軸であり、人前での表現経験がある人ほど習得が早い分野です。',
            'CMやナレーション案件は年齢や声質のバリエーションが求められる市場のため、若手中心の声優業界とは異なる層で需要があります。',
            '現場で培った表現の引き出しの多さは、感情表現から淡々とした説明調まで求められるナレーション案件で強みとして機能します。',
          ],
          links: [
            { title: 'ナレーターになるには？仕事内容から必要スキル、目指す方法まで徹底解説', url: 'https://www.yoani.co.jp/gyokainavi-top/voice-actor/vo-works/na-how-to/' },
          ],
        },
      },
    },
    {
      keywords: ['アスリート', 'スポーツ選手', 'プロ選手', '運動選手', 'スポーツトレーナー'],
      essence: '自分の体と向き合い、限界を更新し続けてきた力',
      peopleFacing: true,
      suggestions: [
        { job: 'スポーツトレーナー・コーチ', reason: '自らの経験を、次の世代の指導に活かせます。', episode: '体を鍛え抜いてきた経験は、教える立場になったときに、何よりの説得力になります。', tag: 'unrewarded',
          detail: {
            points: [
              'トレーナー業界で最も評価されるのは資格の有無以上に「実際に体を追い込んできた経験に基づく指導の説得力」で、競技経験者はこの点で信頼を得やすい立場にあります。',
              '選手のコンディション管理やケガのリスク判断は、自身の体で限界と回復を繰り返してきた感覚が実践的な知見として活きる領域です。',
              '指導対象は競技者だけでなく健康志向の一般層にも広がっており、体づくりの経験を持つ人材への需要は競技引退後も継続的にあります。',
            ],
            links: [
              { title: 'スポーツトレーナーになるには？仕事内容・資格・スキルを徹底解説', url: 'https://athlete-live.com/category_taiikukai/sportstrainer/' },
              { title: 'スポーツトレーナーとは？仕事内容、種類、なり方、資格、年収・給料、将来性について解説', url: 'https://job-medley.com/tips/detail/1173/' },
            ],
          },
        },
        { job: '健康経営アドバイザー', reason: '体づくりの知識を、企業で働く人の健康支援に活かせます。', episode: '自分の体を管理してきた経験は、働く人たちの健康を支える仕事でも、そのまま役立ちます。', tag: 'repetition',
          detail: {
            points: [
              '健康経営アドバイザーは、企業が「社員の健康を経営課題として扱う」流れの中で生まれた比較的新しい資格で、自身の体づくりの経験を理論と結びつけて語れる人材が求められています。',
              '資格取得のハードルが比較的低く、体を鍛えてきた実体験を土台にすることで短期間で専門知識を補い、説得力のある提案ができる立場になれます。',
              '健康経営の推進が企業の人事評価や採用広報とも結びついてきており、体づくりの知見を持つアドバイザーへの需要は継続的に高まっています。',
            ],
            links: [
              { title: '健康経営アドバイザーとは？試験・仕事内容などをご紹介', url: 'https://media.healthcare-tech.co.jp/health_management_advisor/' },
              { title: '健康経営アドバイザー｜東京商工会議所', url: 'https://www.tokyo-cci.or.jp/kenkokeiei-club/adviser/' },
            ],
          },
        },
        { job: 'スポーツ解説者・キャスター', reason: '競技を知り尽くした経験を、伝える仕事に活かせます。', episode: '現場で感じてきた駆け引きは、解説という言葉にすることで、新しい価値を持ちます。', tag: 'other-desire',
          detail: {
            points: [
              '解説者に求められるのは実況の巧みさよりも「競技の文脈を視聴者にわかりやすく翻訳する力」で、これは長年その競技を内側から見てきた経験者だけが持つ強みです。',
              'プレーの意図や選手の駆け引きを言語化できる解説は、専門的な訓練を受けたアナウンサーでは代替しにくい部分であり、競技経験そのものが差別化要因になります。',
              '地上波に限らずネット配信やスポーツ専門チャンネルの増加により、解説者としての活躍の場は以前より広がっています。',
            ],
            links: [
              { title: 'スポーツ解説者について、仕事内容、年収、やりがいなどを解説', url: 'https://joboon.jp/job/7288/' },
            ],
          },
        },
        { job: '地域のスポーツ教室運営', reason: '経験を、より身近な場で子どもたちに伝える道もあります。', episode: 'トップレベルで培った技術は、地域の子どもたちに教えることで、また違う喜びに変わります。', tag: 'continue',
          detail: {
            points: [
              '地域のスポーツ教室では有名選手としての肩書きより「初心者や子どもに合わせて丁寧に教えられるか」が保護者からの信頼を左右し、指導経験の積み重ねがそのまま評価につながります。',
              '自治体の体育施設や学校の部活動支援など、地域スポーツを支える指導者の受け皿は年々広がっており、競技経験者への需要は安定しています。',
              '教室運営は指導力に加えて集客や保護者対応といった実務も伴うため、現役時代に培った対人経験の幅がそのまま強みになります。',
            ],
            links: [],
          },
        },
        { job: '田舎での自然と関わる仕事', reason: '焦らず、体を使う仕事という共通点を活かして次を探る選択もあります。', episode: '体を動かすことが染みついてきた生活は、自然の中で働く仕事にも、無理なくつながります。', tag: 'vague',
          detail: {
            points: [
              '長年体を鍛え、自分のコンディションと向き合ってきた経験は、天候や地形に左右される農業・林業・アウトドア関連の仕事でも生きる体力的な土台になります。',
              '移住先の地域おこしや観光関連の仕事では、体を動かすことに抵抗がなく地域の子どもや高齢者と関わることに慣れている人材が重宝されます。',
              '都市部での競争から離れ、自然の中で体を動かしながら収入を得る働き方は、体づくりを軸にキャリアを積んできた人にとって無理のない移行先です。',
            ],
            links: [],
          },
        },
        { job: 'スポーツ用品の企画・開発', reason: '現場で感じてきた「ここが使いにくい」という感覚を、商品開発に活かせます。', episode: '選手として使ってきた経験は、より良い道具を作る仕事において、何よりの財産になります。', tag: 'neutral',
          detail: {
            points: [
              'スポーツ用品メーカーの企画職では、実際に競技を経験した人材の「ここが使いにくい」という現場感覚が、机上のマーケティング調査だけでは得られない開発の起点になります。',
              '商品テストやモニタリングの段階でも、競技経験者の評価は説得力を持ち、開発チーム内での意見が採用されやすい傾向があります。',
              '企画職は営業・マーケティング・開発など複数部署との連携が前提のため、競技を通じて培った対人調整力も実務で活きる場面が多くあります。',
            ],
            links: [
              { title: '【スポーツ用品】企画・開発職に就くには？', url: 'https://sposuru.com/contents/sportsindustry-jobs/planning-sportsgoods/' },
            ],
          },
        },
      ],
      uniqueSuggestion: { job: '整体師・ボディケアの専門家', reason: '自分の体と向き合ってきた経験を、他人の体を整える仕事に活かす道もあります。', episode: '自らのコンディションを管理してきた感覚は、人の体の不調を見抜き整える仕事にも、意外なほど自然に重なります。',
        detail: {
          points: [
            '整体師の施術には国家資格が必須ではない領域も多く、自身の体を長年ケアしてきた実体験に基づく身体感覚が、施術の説得力に直結します。',
            '利用者の多くは「体を追い込んだ経験がある人ほど痛みや不調への理解が深い」と感じる傾向があり、競技経験は信頼獲得の材料になります。',
            '自分の体のケアを通じて培った解剖学的な理解や姿勢への意識は、専門スクールでの学習を短期間で実践に結びつけやすい土台になります。',
          ],
          links: [
            { title: '整体師はどんな仕事？仕事内容や資格、スクールや求人の探し方、将来性など整体師について徹底解説', url: 'https://relax-job.com/more/40345' },
            { title: '整体師になるには資格はいらない？仕事内容・勤務先・年収も解説', url: 'https://work.beauty.hotpepper.jp/guide/article/00003/' },
          ],
        },
      },
    },
  ];

  const genericTranslation = {
    essence: 'ひとつの持ち場を、長く支え続けてきた継続力',
    peopleFacing: null,
    suggestions: [
      { job: '今の分野に近い専門アドバイザー', reason: '長く関わってきたからこそ見える視点は、教える・助言する立場になったときに強みになります。', episode: '同じ現場に長くいたからこそ気づける改善点は、助言する立場になったときに初めて価値を発揮します。', tag: 'continue',
        detail: {
          points: [
            'アドバイザー業は専門知識の量よりも「現場でしか得られない失敗と改善の経験」を持っているかどうかで説得力が変わり、長年の実務経験がそのまま武器になります。',
            '同じ業界の後輩や取引先からの相談に応じる立場は、資格の有無以前に実績に基づく信頼で成り立つため、経験年数がそのまま評価軸になります。',
            '業界特有の商習慣や現場の暗黙知は外部のコンサルタントでは埋めきれない部分で、内部出身者だからこそ提供できる助言に価値があります。',
          ],
          links: [],
        },
      },
      { job: '複業・小さな挑戦から始める道', reason: 'いきなり職業を変えるのではなく、まず小さく試してみることで、次の力が見えてくることがあります。', episode: '大きく舵を切る前に、まず小さく試してみることで、これまで気づかなかった自分の力が見えてくることがあります。', tag: 'unrewarded',
        detail: {
          points: [
            '複業やスモールスタートは、いきなり大きな投資や転身をせずに市場の反応を確かめられるため、これまで積んできた経験を活かせる分野を見極める手段として有効です。',
            'クラウドソーシングやスキルシェアサービスの普及により、本業を続けながら少額から自分の経験を切り売りできる仕組みが整ってきています。',
            '小さく始めることで失敗のリスクを抑えつつ、実際に対価を得られるかどうかを検証できる点が、次の本格的な一歩を踏み出す判断材料になります。',
          ],
          links: [],
        },
      },
      { job: 'キャリア相談員', reason: '自分自身が転機を考えてきた経験を、同じ悩みを持つ人の支えに変えられます。', episode: '長く同じ場所で働いてきたからこそ分かる「動くことの怖さ」は、同じ立場の人に寄り添う言葉になります。', tag: 'repetition',
        detail: {
          points: [
            'キャリアコンサルタントは国家資格として制度化されており、相談者の悩みに寄り添う姿勢だけでなく、自身の転機の経験を裏付けとして語れる人材が信頼を得やすい仕事です。',
            '資格取得には養成講習と試験が必要ですが、実務経験を積んだ社会人であれば知識面のキャッチアップと実体験を組み合わせやすい立場にあります。',
            '企業の人材育成やハローワークなど活躍の場が幅広く、自身の経験してきた業界に近い相談者を担当できれば説得力のある助言につながります。',
          ],
          links: [
            { title: '「キャリアコンサルタントのなり方」とは？資格の取得方法・初心者でも最短ルートで目指せる秘訣', url: 'https://www.recurrent.co.jp/career/howto-become-careerconsultant/' },
            { title: 'キャリアコンサルタントの仕事内容・なり方・年収・資格などを解説', url: 'https://careergarden.jp/career-counsellor/' },
          ],
        },
      },
      { job: '副業から始める新しい分野への挑戦', reason: '本業を保ちながら、新しい分野に少しずつ足を踏み入れることができます。', episode: 'いきなり全てを変えなくても、副業という小さな一歩から、新しい可能性を試すことができます。', tag: 'other-desire',
        detail: {
          points: [
            '本業の収入を維持しながら新分野に挑戦できるため、これまで積んできた経験とは異なるスキルを、リスクを抑えて試すことができます。',
            '副業を通じて得た小さな実績や顧客とのやり取りは、そのまま次のキャリアの実務経験として積み上げていくことができます。',
            '働き方改革や副業解禁の流れを受けて企業側の許容度も上がっており、本業を保ったまま新しい分野に足を踏み入れやすい環境が整っています。',
          ],
          links: [],
        },
      },
      { job: '地域活動やボランティアからの再出発', reason: '焦らず、これまでの経験を地域に還元しながら次の道を探る選択もあります。', episode: 'すぐに答えを出さなくても、地域との関わりの中から、次に進みたい方向が見えてくることがあります。', tag: 'vague',
        detail: {
          points: [
            '地域活動は収入を前提としない分、これまでのキャリアで培ったスキルを無理なく試し、次にどの分野で対価を得られそうかを見極める場として機能します。',
            '自治体や地域団体は担い手不足に悩んでいるケースが多く、社会人経験のある人材が持つ段取り力や調整力はすぐに重宝されます。',
            'ボランティアで築いた人脈や信頼関係が、後にNPOや地域事業の有償の役割につながるケースも少なくありません。',
          ],
          links: [],
        },
      },
      { job: '今の経験を活かした指導・研修的な役割', reason: '積み重ねてきた経験を、後進を育てる立場から活かす道もあります。', episode: '長く続けてきたからこそ持っている勘所は、教える立場になったときに初めて言葉にできる価値になります。', tag: 'neutral',
        detail: {
          points: [
            '研修講師や指導役に求められるのは知識の量ではなく「自分の経験を、後進が再現できる形に言語化する力」で、現場を長く経験してきた人ほどこの翻訳作業に強みを持ちます。',
            '実体験に基づく指導は、教科書的な研修よりも説得力を持ち、受講者の納得感や行動変容につながりやすい傾向があります。',
            '多くの企業が人材育成の体系化に力を入れており、現場経験者による研修・指導人材へのニーズは業種を問わず高まっています。',
          ],
          links: [],
        },
      },
    ],
    uniqueSuggestion: { job: '地域おこし協力隊', reason: '長く一つの場所や役割に尽くしてきた経験を、まったく新しい土地のために使う道もあります。', episode: '一つの持ち場を支え続けてきた継続力は、縁もゆかりもない土地に根を張り、信頼を積み直す仕事でも、静かな強みになります。',
      detail: {
        points: [
          '地域おこし協力隊は総務省の制度に基づき自治体から委嘱される仕組みで、年齢制限のない自治体も多く、社会人経験を積んだ人材の応募が増えています。',
          '活動内容は地域の特産品開発や観光振興、高齢者支援など幅広く、これまでの職種を問わず「地域の課題に段取りをつけて動く」実務経験が生きる場面が多くあります。',
          '任期中は自治体から活動費や報酬が支給される仕組みがあり、移住のリスクを抑えながら新しい土地での暮らしと仕事を試せる制度になっています。',
        ],
        links: [
          { title: '地域おこし協力隊は40代・50代・60代も可能｜年齢制限無しのおすすめ移住先13選', url: 'https://dual-life-iju.com/magazine/category/emigration/tiikiokoshi-3/' },
          { title: '「地域おこし協力隊員」の仕事とは？シニアでも挑戦できる新しい働き方を徹底解説', url: 'https://career65.net/article/2024/11/28/0634/' },
        ],
      },
    },
  };

  const feelingSupport = {
    continue: 'これ以上無理を重ねたくないという気持ちは、決してわがままではありません。積み重ねてきた力を、負担の少ない場所で発揮するという選択も十分にあり得ます。',
    unrewarded: '頑張りが正しく評価されていないと感じるのは、能力の問題ではなく、今いる場所との相性の問題であることが多いものです。',
    repetition: '毎日に代わり映えを感じないのは、怠けているからではなく、物事を安定してこなせるようになった証でもあります。刺激は、環境を変えることで自然と入ってくることがあります。',
    'other-desire': '心のどこかで別の道を意識できているというのは、実はとても大きな一歩です。多くの人は、その気持ちにすら気づかないまま日々を過ごしています。',
    vague: 'はっきりした不満はないのに「なんとなく違う」と感じるのは、とても繊細な感覚です。今すぐ動くべきという合図ではなく、一度棚卸しをしてもいい時期という合図かもしれません。',
  };

  function findOccupationMatch(jobText) {
    if (!jobText) return null;
    for (const entry of occupationDictionary) {
      if (entry.keywords.some((kw) => jobText.includes(kw))) return entry;
    }
    return null;
  }

  function calcActualAge(birthdayStr) {
    if (!birthdayStr) return null;
    const birth = new Date(birthdayStr);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
    return age > 0 ? age : null;
  }

  /* ---------------- マッチ度(擬似スコア、入力から決定的に算出) ---------------- */
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  function matchScores(seed) {
    const h = hashStr(seed);
    const primary = 80 + (h % 15); // 80-94
    const secondary = 62 + ((h >>> 3) % 18); // 62-79
    const third = 48 + ((h >>> 6) % 14); // 48-61
    const fourth = 35 + ((h >>> 9) % 13); // 35-47
    return [primary, secondary, third, fourth];
  }

  /* プール(6件)から、回答内容(気持ち・大事にしたいこと)に重みをつけつつ、
     入力内容をシードにした擬似ランダムで4件を選ぶ。同じ回答なら毎回同じ4件になる(決定的)。 */
  function selectSuggestions(pool, seed, feeling, priorityTag) {
    const h = hashStr(seed);
    const scored = pool.map((item, i) => {
      let score = (h >>> (i * 4)) % 100; // 0-99の擬似ランダム基礎点(項目ごとに異なるビット位置を参照)
      if (item.tag === feeling) score += 45; // 今の気持ちに合う提案を優先しやすくする
      if (priorityTag && item.tag === priorityTag) score += 25; // 大事にしたいことに合う提案も、控えめに優先する
      if (item.tag === 'neutral') score += 15; // 汎用的な提案の底上げ
      return { item, score };
    });
    scored.sort((a, b) => b.score - a.score);

    // 上位3件(気持ちに合う・無難な提案)+ 残りから1件を「あえての意外な提案」として混ぜる。
    // こうすることで、無難な提案だけで結果が埋まらないようにする
    const top3 = scored.slice(0, 3);
    const rest = scored.slice(3);
    let wildcardPick = null;
    if (rest.length > 0) {
      const wildcardIndex = (h >>> 20) % rest.length;
      wildcardPick = rest[wildcardIndex];
    }
    const finalList = wildcardPick ? [...top3, wildcardPick] : scored.slice(0, 4);
    return finalList.map((s) => s.item);
  }

  /* ---------------- 傾向レーダーチャート ---------------- */
  /* 星座ごとの8軸ベーススコア(0-100)。挑戦志向・人との関わり・新しい刺激・行動の速さ・
     芸術性・思考性・リーダーシップ性・起業家性を、占星術的なイメージでバランス良く配分 */
  /* 星座ごとの4つの核となるスコア(0-100)。それぞれの対極(安定志向・単独集中力・
     感受性共感力・職人気質)は 100-値 として自動的に導出する */
  const zodiacTraitBase = {
    牡羊座: { challenge: 80, leadership: 75, connection: 55, logic: 45 },
    牡牛座: { challenge: 35, leadership: 40, connection: 50, logic: 55 },
    双子座: { challenge: 60, leadership: 50, connection: 65, logic: 70 },
    蟹座: { challenge: 40, leadership: 45, connection: 80, logic: 35 },
    獅子座: { challenge: 75, leadership: 85, connection: 70, logic: 45 },
    乙女座: { challenge: 40, leadership: 45, connection: 55, logic: 80 },
    天秤座: { challenge: 45, leadership: 55, connection: 75, logic: 60 },
    蠍座: { challenge: 65, leadership: 60, connection: 60, logic: 65 },
    射手座: { challenge: 80, leadership: 60, connection: 60, logic: 55 },
    山羊座: { challenge: 55, leadership: 70, connection: 45, logic: 65 },
    水瓶座: { challenge: 65, leadership: 55, connection: 55, logic: 80 },
    魚座: { challenge: 40, leadership: 40, connection: 70, logic: 30 },
  };

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function computeTraitAxes(zodiac, feeling, occupationEntry) {
    const base = zodiacTraitBase[zodiac];
    let core = base ? { ...base } : { challenge: 50, leadership: 50, connection: 50, logic: 50 };

    const feelingAdjust = {
      continue: { challenge: +20 },
      unrewarded: { leadership: +10 },
      repetition: { challenge: +10, logic: +5 },
      'other-desire': { challenge: +15, leadership: +5 },
      vague: { logic: -10 },
    };
    const fa = feelingAdjust[feeling] || {};
    Object.keys(fa).forEach((k) => { core[k] += fa[k]; });

    if (occupationEntry && occupationEntry.peopleFacing === true) core.connection += 15;
    if (occupationEntry && occupationEntry.peopleFacing === false) core.connection -= 15;

    Object.keys(core).forEach((k) => { core[k] = clamp(core[k], 10, 90); });

    // 4つの核スコアから、対になる4項目(安定志向・単独集中力・感受性共感力・職人気質)を導出
    return {
      challenge: core.challenge,
      stability: 100 - core.challenge,
      leadership: core.leadership,
      craft: 100 - core.leadership,
      connection: core.connection,
      solo: 100 - core.connection,
      logic: core.logic,
      empathy: 100 - core.logic,
    };
  }

  function renderRadarSVG(axis) {
    const viewW = 440;
    const viewH = 440;
    const centerX = viewW / 2;
    const centerY = viewH / 2;
    const maxR = 100;

    // 8軸を均等配置(上から時計回り)。行動系と内面・思考系を交互に並べてバランスを取る
    // 4つの対(挑戦⇔安定、リーダー⇔職人、関わり⇔単独、論理⇔感受性)が
    // それぞれ真反対(180度)に来るよう配置する
    const order = ['challenge', 'leadership', 'connection', 'logic', 'stability', 'craft', 'solo', 'empathy'];
    const labelText = {
      challenge: '挑戦志向',
      leadership: 'リーダーシップ性',
      connection: '人との関わり',
      logic: '論理的思考力',
      stability: '安定志向',
      craft: '職人気質',
      solo: '単独集中力',
      empathy: '感受性・共感力',
    };
    const angleStep = 360 / order.length;
    const angles = order.map((_, i) => -90 + i * angleStep); // -90を上端(12時)として時計回り

    function pointFor(value, angleDeg) {
      const r = (value / 100) * maxR;
      const rad = (angleDeg * Math.PI) / 180;
      return [centerX + r * Math.cos(rad), centerY + r * Math.sin(rad)];
    }

    const pts = order.map((key, i) => pointFor(axis[key], angles[i]));
    const polyPoints = pts.map((p) => p.join(',')).join(' ');

    // 目盛りの多角形(25/50/75/100%)
    const gridLevels = [25, 50, 75, 100];
    const gridPolys = gridLevels.map((lvl) => {
      const gp = angles.map((a) => pointFor(lvl, a).join(',')).join(' ');
      return `<polygon points="${gp}" fill="none" stroke="#D9E1EA" stroke-width="1" />`;
    }).join('');

    const axisLines = angles.map((a) => {
      const [x, y] = pointFor(100, a);
      return `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="#D9E1EA" stroke-width="1" />`;
    }).join('');

    // ラベル配置: 各軸の角度方向に沿って外側に置き、水平方向の位置に応じてtext-anchorを切り替える
    const labelGap = 16;
    const labelHtml = order.map((key, i) => {
      const a = angles[i];
      const rad = (a * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const lx = centerX + (maxR + labelGap) * cos;
      let ly = centerY + (maxR + labelGap) * sin;

      let anchor = 'middle';
      if (cos > 0.35) anchor = 'start';
      else if (cos < -0.35) anchor = 'end';

      // 上下方向の微調整(真上・真下のラベルが図形に近づきすぎないように)
      if (sin < -0.85) ly -= 4;
      if (sin > 0.85) ly += 10;

      return `<text x="${lx}" y="${ly}" text-anchor="${anchor}" font-size="15" fill="#16233F" font-family="'Zen Old Mincho', serif">${labelText[key]}</text>`;
    }).join('');

    return `
      <svg viewBox="0 0 ${viewW} ${viewH}" class="radar-svg">
        ${gridPolys}
        ${axisLines}
        <polygon points="${polyPoints}" fill="rgba(22,35,63,0.16)" stroke="#16233F" stroke-width="1.6" />
        ${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#16233F" />`).join('')}
        ${labelHtml}
      </svg>
    `;
  }

  /* ---------------- 星座占い(性別はここでのみ使用、職業提案には使わない) ---------------- */
  const zodiacFortune = {
    牡羊座: {
      base: '直感で動き、思い立ったらすぐに試してみたくなるタイプ。少々せっかちなところはありますが、その行動力が結果的に道を切り拓きます。',
      男性: '特にリーダー役を任されると、持ち前の勢いが一層発揮されます。',
      女性: '自分の意志をはっきり持っているぶん、頼れる存在として周囲から見られることが多いタイプです。',
    },
    牡牛座: {
      base: '変化よりも積み重ねを好み、じっくりと物事に向き合う安定感のあるタイプ。一度心を決めたら、簡単には揺らぎません。',
      男性: '地に足のついた判断力が、周囲からの厚い信頼につながります。',
      女性: '穏やかな佇まいの奥に、芯の強さを秘めているタイプです。',
    },
    双子座: {
      base: '好奇心が旺盛で、複数のことに同時に興味を持つタイプ。情報のアンテナが広く、話題が豊富です。',
      男性: '場の空気を読みながら、軽やかに立ち回る器用さを持っています。',
      女性: '話し上手なぶん、聞き役に回ったときの気配りにも定評があるタイプです。',
    },
    蟹座: {
      base: '身近な人との関係を大切にする、情に厚いタイプ。過去の思い出や積み重ねを大事にする傾向があります。',
      男性: '家族や仲間を守ろうとする責任感が、人一倍強く表れます。',
      女性: '包み込むような優しさで、周囲から頼られることが多いタイプです。',
    },
    獅子座: {
      base: '存在感があり、自然と人の中心になりやすいタイプ。誇りを持って物事に取り組みます。',
      男性: '堂々とした振る舞いが、周囲を惹きつける最大の魅力になっています。',
      女性: '華やかさの中に、面倒見の良さを併せ持つタイプです。',
    },
    乙女座: {
      base: '細やかな気配りができ、物事を丁寧に仕上げるタイプ。完璧を求めるあまり、自分に厳しくなりがちな一面もあります。',
      男性: '誠実さと几帳面さが、周囲からの高い評価に直結します。',
      女性: '気配り上手な反面、頑張りすぎてしまうこともあるタイプです。',
    },
    天秤座: {
      base: 'バランス感覚に優れ、周囲との調和を大切にするタイプ。美しいものやスマートなものを好みます。',
      男性: '公平な立場を保とうとする姿勢が、揺るぎない信頼を生みます。',
      女性: '上品な物腰の中に、しっかりとした判断軸を持つタイプです。',
    },
    蠍座: {
      base: '物事を深く掘り下げる集中力を持つタイプ。一度決めた目標や関係は、簡単に手放しません。',
      男性: '寡黙に見えても、内側には熱い情熱を秘めています。',
      女性: '静かな佇まいの奥に、強い意志を秘めているタイプです。',
    },
    射手座: {
      base: '自由を愛し、新しい世界に飛び込むことを恐れないタイプ。楽観的で、失敗をも糧に変えていきます。',
      男性: '束縛を嫌い、自分のペースを何より大切にします。',
      女性: '好奇心の赴くままに行動する、フットワークの軽さが魅力のタイプです。',
    },
    山羊座: {
      base: '着実に、地道に物事を積み上げていくタイプ。責任感が強く、周囲から頼られる存在になりやすい傾向があります。',
      男性: '目標に向かって粘り強く努力する姿勢が、確かな評価につながります。',
      女性: 'しっかり者に見られがちですが、内側では努力家な一面を持つタイプです。',
    },
    水瓶座: {
      base: '独自の視点を持ち、常識にとらわれない発想をするタイプ。人とは違う道を選ぶことに抵抗がありません。',
      男性: '自由な発想力で、周囲から一目置かれる存在になります。',
      女性: 'マイペースに見えて、実は先を見通す洞察力を持っているタイプです。',
    },
    魚座: {
      base: '感受性が豊かで、人の気持ちに寄り添うことが得意なタイプ。想像力に富み、芸術的な感性を持っています。',
      男性: '優しさの中に、繊細な芸術的センスを併せ持っています。',
      女性: '共感力の高さから、周囲の相談役になることが多いタイプです。',
    },
  };

  /* 干支・数秘術・九星気学それぞれの「気質」の一言(職業ヒントとは別に、性格描写として保持) */
  const etoTraits = {
    子: '機転の利く社交性',
    丑: '誠実な粘り強さ',
    寅: '大胆なリーダー気質',
    卯: '温和な協調性',
    辰: '大きな発想力',
    巳: '深い洞察力',
    午: '情熱的な行動力',
    未: '調和を重んじる思いやり',
    申: 'そつない器用さ',
    酉: '几帳面さ',
    戌: '義理堅い正義感',
    亥: 'まっすぐな情熱',
  };

  const numerologyTraits = {
    1: '自立心',
    2: '調和を大切にする協調性',
    3: '豊かな表現力',
    4: '堅実さ',
    5: '自由な行動力',
    6: '面倒見の良さ',
    7: '探求心',
    8: '実行力',
    9: '博愛精神',
  };

  const kyuseiTraits = {
    1: '柔軟な適応力',
    2: '縁の下の献身性',
    3: '若々しい行動力',
    4: '調和を重んじる信用力',
    5: '強い意志',
    6: '誇り高いリーダー気質',
    7: '華やかな社交性',
    8: '変化に強い粘り強さ',
    9: '知的な情熱',
  };

  function getFortuneText(zodiac, gender, eto, numerology, kyuseiNum) {
    const entry = zodiacFortune[zodiac];
    if (!entry) return null;

    const etoTrait = etoTraits[eto];
    const numTrait = numerologyTraits[numerology];
    const kyuseiName = kyuseiNames[kyuseiNum - 1];
    const kyuseiTrait = kyuseiTraits[kyuseiNum];

    let combo = '';
    if (etoTrait && numTrait && kyuseiName && kyuseiTrait) {
      combo = `また、${etoTrait}や${numTrait}、${kyuseiTrait}も併せ持っています。`;
    }

    const addOn = (gender === '男性' || gender === '女性') ? entry[gender] : '';
    return entry.base + combo + (addOn ? addOn : '');
  }

  /* 提案カードの「もっと詳しく知る」パネル。
     detail(根拠の深掘り・参考記事リンク)を持つ提案にのみボタンを表示する。
     参考記事リンクは、実在する記事のみを厳選して掲載している(架空の体験談は作らない方針)。 */
  function renderSuggestionDetail(s) {
    if (!s.detail) return '';
    const pointsHtml = (s.detail.points || [])
      .map((p) => `<li>${p}</li>`)
      .join('');
    const linksHtml = (s.detail.links || [])
      .map((l) => `<li><a href="${l.url}" target="_blank" rel="noopener noreferrer">${l.title}</a></li>`)
      .join('');
    return `
      <button type="button" class="suggestion-detail-toggle" aria-expanded="false">
        もっと詳しく知る
      </button>
      <div class="suggestion-detail" hidden>
        <p class="suggestion-detail-heading">なぜ向いているか、もう少し詳しく</p>
        <ul class="suggestion-detail-points">${pointsHtml}</ul>
        ${linksHtml ? `
          <p class="suggestion-detail-heading">この仕事についてもっと知る</p>
          <ul class="suggestion-detail-links">${linksHtml}</ul>
        ` : ''}
      </div>
    `;
  }

  // 提案カードの「もっと詳しく知る」ボタンは、結果画面ごとに動的に生成されるため、
  // 親要素(result-body)にイベント委譲で1度だけリスナーを登録する
  document.getElementById('result-body').addEventListener('click', (e) => {
    const toggle = e.target.closest('.suggestion-detail-toggle');
    if (!toggle) return;
    const panel = toggle.nextElementSibling;
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    toggle.setAttribute('aria-expanded', String(!isOpen));
    toggle.classList.toggle('is-open', !isOpen);
    toggle.textContent = isOpen ? 'もっと詳しく知る' : '閉じる';
  });

  function runDiagnosis() {

    const loadingEl = document.getElementById('result-loading');
    const contentEl = document.getElementById('result-content');
    contentEl.classList.remove('is-visible');
    loadingEl.style.display = '';

    setTimeout(() => {
      const job = state.job.trim();
      const wish = state.wish.trim();
      const age = calcActualAge(state.birthday);
      const zodiac = getZodiac(state.birthday);

      const match = findOccupationMatch(job);
      const translation = match || genericTranslation;

      const paragraphs = [];

      if (age) {
        paragraphs.push(`${age}年の人生の中で、数えきれないほどの経験を積み重ねてこられたはずです。`);
      }

      paragraphs.push(
        `${job || '今のお仕事'}として積み重ねてきたのは、<strong>${translation.essence}</strong>です。`
      );

      paragraphs.push(feelingSupport[state.feeling] || feelingSupport.vague);

      if (wish) {
        paragraphs.push(`気になっているという「${wish}」も、これから見ていく力の使い道と、どこかで重なっているかもしれません。`);
      }

      document.getElementById('result-tag').textContent = '可能性診断・結果';
      document.getElementById('result-title').textContent = 'あなたの経験は、こう翻訳できます';
      document.getElementById('result-body').innerHTML = paragraphs.map((p) => `<p>${p}</p>`).join('');

      // 星座占い(性別はここでのみ反映。職業提案のロジックには使用しない)
      const eto = getEto(new Date(state.birthday).getFullYear());
      const numerology = getNumerology(state.birthday);
      const kyuseiNum = getKyuseiNumber(state.birthday);
      const fortuneText = getFortuneText(zodiac, state.gender, eto, numerology, kyuseiNum);
      if (fortuneText) {
        document.getElementById('result-body').innerHTML += `
          <div class="fortune-block">
            <p class="fortune-heading">生まれ持った気質</p>
            <p class="fortune-text">${fortuneText}</p>
          </div>
        `;
      }

      // 傾向レーダーチャート
      const axis = computeTraitAxes(zodiac, state.feeling, match);
      document.getElementById('result-body').innerHTML += `
        <div class="radar-block">
          <p class="radar-title">あなたの傾向</p>
          ${renderRadarSVG(axis)}
        </div>
      `;

      // マッチ度つきの提案カード(6件のプールから、気持ち・大事にしたいことの回答で重み付けした4件を選ぶ)
      const priorityTag = priorityTagMap[state.priority] || null;
      const seed = `${job}|${state.feeling}|${zodiac}|${wish}|${state.priority || ''}`;
      const scores = matchScores(seed);
      const selectedSuggestions = selectSuggestions(translation.suggestions, seed, state.feeling, priorityTag);
      let suggestionHtml = selectedSuggestions.map((s, i) => `
        <div class="suggestion-card">
          <div class="suggestion-head">
            <span class="suggestion-job">${s.job}</span>
            <span class="suggestion-score">適合度 ${scores[i]}%</span>
          </div>
          <span class="suggestion-reason">${s.reason}</span>
          <span class="suggestion-episode">${s.episode}</span>
          ${renderSuggestionDetail(s)}
        </div>
      `).join('');

      // 意外性のある提案は、全員に表示する(想定内タイプだけの限定ではなく)
      if (translation.uniqueSuggestion) {
        const u = translation.uniqueSuggestion;
        suggestionHtml += `
          <div class="suggestion-card suggestion-card-wildcard">
            <div class="suggestion-head">
              <span class="suggestion-job">${u.job}</span>
              <span class="suggestion-score suggestion-score-wildcard">意外性のある提案</span>
            </div>
            <span class="suggestion-reason">${u.reason}</span>
            <span class="suggestion-episode">${u.episode}</span>
            ${renderSuggestionDetail(u)}
          </div>
        `;
      }

      document.getElementById('result-body').innerHTML += `<div class="suggestion-list">${suggestionHtml}</div>`;

      if (!match) {
        document.getElementById('result-body').innerHTML += `<p style="color:var(--muted); font-size:0.88rem;">※ 今回は具体的な職種の候補が見つからなかったため、一般的な提案を表示しています。</p>`;
      }

      const shareJob = selectedSuggestions[0].job;
      const shareScore = scores[0];
      const shareText = `私の経験は「${shareJob}」に翻訳されました。｜えもの運命堂`;
      // 結果ごとに異なるOGP画像を出すため、シェア用のURLは診断ページ自身ではなく、
      // 職種名・適合度をcrawlerにも伝えられる中継ページ(Vercel)に向ける
      const shareUrl = `https://emonounmeido-ogp.vercel.app/api/share?job=${encodeURIComponent(shareJob)}&score=${shareScore}`;

      document.getElementById('share-x').href =
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
      document.getElementById('share-line').href =
        `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;

      loadingEl.style.display = 'none';
      contentEl.classList.add('is-visible');
    }, 1400);
  }

  /* ---------------- リスタート ---------------- */
  document.getElementById('btn-restart').addEventListener('click', () => {
    state.gender = null;
    state.birthday = '1980-04-02';
    state.job = '';
    state.jobMatchedCandidate = null;
    state.feeling = null;
    state.wish = '';
    state.priority = null;

    genderButtons.forEach((b) => b.classList.remove('is-selected'));
    feelingButtons.forEach((b) => b.classList.remove('is-selected'));
    priorityButtons.forEach((b) => b.classList.remove('is-selected'));
    birthdayInput.value = '1980-04-02';
    jobChoicesContainer.querySelectorAll('.choice-card').forEach((b) => b.classList.remove('is-selected'));
    jobOtherInput.style.display = 'none';
    jobOtherInput.value = '';
    wishChoicesContainer.querySelectorAll('.choice-card').forEach((b) => b.classList.remove('is-selected'));
    wishOtherInput.style.display = 'none';
    wishOtherInput.value = '';
    toStep2Btn.disabled = true;
    toStep3Btn.disabled = true;

    goTo('landing');
  });

});
