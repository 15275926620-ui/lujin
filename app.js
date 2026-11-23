(() => {
  'use strict';

  const { facts, platforms, themes, tones } = window.LUJIN_DATA;
  const factMap = new Map(facts.map(fact => [fact.id, fact]));
  const API_ENDPOINT = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const state = {
    route: 'home', platform: 'xiaohongshu', theme: 'history', tone: 'warm',
    visualStyle: 'editorial', variant: 0, category: 'all', query: '',
    result: null, prompt: '', imageUrl: ''
  };

  let imageRequest = 0;
  let heroRequest = 0;
  let toastTimer;

  const toneCopy = {
    warm: {
      openers: ['有些美，要靠近经纬，才看得清。', '当目光落在纱线与纹样上，一门手艺便有了温度。'],
      closings: ['如果你也被这份经纬之美打动，就把鲁锦的故事继续讲下去。', '愿每一次注视，都让这门手艺被多一个人看见。'],
      sectionNote: '把目光落在这一处细节里，鲁锦的质感也变得具体起来。'
    },
    knowledge: {
      openers: ['这份鲁锦笔记，只保留文档里能核对的事实。', '想系统了解鲁锦，可以从下面几条资料开始。'],
      closings: ['收藏这份资料，也欢迎把准确的知识分享给更多人。', '以上信息均可在事实库定位原文，适合继续查阅与整理。'],
      sectionNote: '这条资料可以作为理解鲁锦的一个清晰入口。'
    },
    concise: {
      openers: ['认识鲁锦，从这几条事实开始。', '一根线，一层信息。一起读懂鲁锦。'],
      closings: ['看懂事实，再分享鲁锦。', '让准确的信息，沿着经纬继续传递。'],
      sectionNote: '事实很短，经纬很清楚。'
    }
  };

  const anchors = {
    history: ['F02', 'F03'], heritage: ['F04', 'F05'], craft: ['F14', 'F13'],
    dye: ['F10', 'F11'], pattern: ['F17', 'F15']
  };

  const themeTags = {
    history: ['#鲁锦', '#千年经纬', '#传统纺织'],
    heritage: ['#鲁锦', '#非物质文化遗产', '#传统手工艺'],
    craft: ['#鲁锦', '#纯手工织造', '#慢工出细活'],
    dye: ['#鲁锦', '#天然植物染', '#三染九晒'],
    pattern: ['#鲁锦', '#传统纹样', '#几何之美']
  };

  const themeVisuals = {
    history: 'traditional Lu Jin handwoven cotton textile from southwest Shandong China, red blue and yellow geometric patterned cloth draped over a traditional wooden loom, warm ivory rice-paper background, quiet heritage atmosphere, realistic cotton fibers',
    heritage: 'traditional Chinese wooden loom with colorful handwoven pure cotton Lu Jin cloth, red yellow blue geometric patterns, cotton threads and wooden shuttle, warm ivory gallery setting, authentic handmade texture',
    craft: 'artisan hands weaving colorful pure cotton threads on a traditional wooden loom, heddle frames pedals and wooden shuttle, red yellow blue green yarns, intricate warp and weft, realistic traditional craftsmanship',
    dye: 'handwoven pure cotton Lu Jin textile in madder red indigo blue and golden yellow, cotton yarn skeins with botanical dye materials indigo plant madder and yellowwood, traditional dyeing and drying atmosphere, warm ivory background',
    pattern: 'macro view of handwoven pure cotton Lu Jin textile with geometric checks diamonds diagonal stripes and traditional meander motifs, vivid red yellow blue green purple, clear warp and weft texture, warm ivory backdrop'
  };

  const shotVisuals = {
    F01: '全景：鲁锦织物搭在木织机上，镜头缓慢推近',
    F02: '特写：木织机与经纬线，柔和侧光掠过织物',
    F03: '特写：丰富色彩与几何纹样依次切换',
    F04: '中近景：匠人手部与木织机交替出现',
    F05: '微距：纯棉纱线与柔软织物表面',
    F06: '微距：红、黄、蓝、绿、紫经纬交织',
    F07: '跟拍：双手完成织造动作，突出手部细节',
    F08: '近景：传统纺车与均匀纱线',
    F09: '特写：纱线浆化处理后整齐排列',
    F10: '俯拍：植物染料与蓝、红、黄纱线',
    F11: '切换：浸染与晾晒中的纱线细节',
    F12: '近景：经线依次穿过综框',
    F13: '分切：脚踏踏板、手拉综框、投梭引纬',
    F14: '固定镜头：木织机与织物纹理缓慢叠化',
    F15: '微距：方格、菱形、条纹等几何结构',
    F16: '特写：几何纹样的连续秩序',
    F17: '俯拍：方格纹理与经纬交错',
    F18: '微距：菱形纹样的边缘与色彩',
    F19: '斜向运镜：沿斜纹方向展示织物表面'
  };

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function rich(text) {
    return escapeHTML(text).replace(/\[(F\d{2})\]/g, (_, id) => {
      if (!factMap.has(id)) return `[${id}]`;
      return `<button type="button" class="citation" data-fact="${id}" aria-label="查看事实 ${id} 原文">${id}</button>`;
    });
  }

  function factSentence(fact) {
    return `${fact.short}[${fact.id}]`;
  }

  function rotateFacts(themeId, variant, count = 4) {
    const pool = facts.filter(fact => fact.themes.includes(themeId));
    return Array.from({ length: Math.min(count, pool.length) }, (_, index) => pool[(index + variant) % pool.length]);
  }

  function selectedWithAnchor() {
    const anchorId = anchors[state.theme][state.variant % 2];
    const anchor = factMap.get(anchorId);
    const rest = rotateFacts(state.theme, state.variant, 4).filter(fact => fact.id !== anchorId);
    return [anchor, ...rest].slice(0, 4);
  }

  function buildResult() {
    const platform = platforms[state.platform];
    const theme = themes[state.theme];
    const tone = toneCopy[state.tone];
    const selected = selectedWithAnchor();
    const title = theme.titles[state.platform][state.variant % 2];
    const opener = tone.openers[state.variant % 2];
    const closing = tone.closings[state.variant % 2];
    const tags = themeTags[state.theme];
    const base = { kind: state.platform, title, tags, factsUsed: selected };

    if (state.platform === 'xiaohongshu') {
      return {
        ...base,
        factsUsed: selected.slice(0, 3),
        paragraphs: [opener, ...selected.slice(0, 3).map(factSentence), closing]
      };
    }

    if (state.platform === 'douyin') {
      const shotFacts = [...selected];
      while (shotFacts.length < 4) shotFacts.push(selected[shotFacts.length % selected.length]);
      const times = ['00–03s', '03–07s', '07–12s', '12–15s'];
      const shots = shotFacts.slice(0, 4).map((fact, index) => ({
        time: times[index],
        visual: shotVisuals[fact.id] || '特写：鲁锦织物与木织机细节',
        voice: index === 0 ? `${title}[${fact.id}]` : factSentence(fact)
      }));
      return {
        ...base,
        hook: `${title}[${selected[0].id}]`,
        shots,
        caption: `${factSentence(selected[0])} 一起从经纬间认识鲁锦。`
      };
    }

    return {
      ...base,
      summary: `${opener}${factSentence(selected[0])}`,
      sections: selected.map((fact, index) => ({
        number: String(index + 1).padStart(2, '0'),
        heading: fact.title,
        text: `${factSentence(fact)}${tone.sectionNote}`
      })),
      closing
    };
  }

  function renderResult() {
    const result = state.result;
    const platform = platforms[state.platform];
    const theme = themes[state.theme];
    let html = '';

    if (result.kind === 'xiaohongshu') {
      html = `
        <p class="content-label">NOTE TITLE / 笔记标题</p>
        <h2 class="note-title">${rich(result.title)}</h2>
        <p class="content-label">NOTE CONTENT / 正文</p>
        <div class="note-body">${result.paragraphs.map(text => `<p>${rich(text)}</p>`).join('')}</div>
        <p class="content-label">TOPICS / 话题</p>
        <div class="hashtag-list">${result.tags.map(tag => `<span class="hashtag">${escapeHTML(tag)}</span>`).join('')}</div>`;
    } else if (result.kind === 'douyin') {
      html = `
        <p class="content-label">0–3S HOOK / 开场钩子</p>
        <h2 class="script-hook">${rich(result.hook)}</h2>
        <p class="content-label">15S STORYBOARD / 分镜与口播</p>
        <div class="shot-list">${result.shots.map(shot => `
          <div class="shot-item">
            <span class="shot-time">${shot.time}</span>
            <div class="shot-content"><strong>${escapeHTML(shot.visual)}</strong><p>${rich(shot.voice)}</p></div>
          </div>`).join('')}</div>
        <p class="content-label">CAPTION / 发布文案</p>
        <p class="publish-caption">${rich(result.caption)}</p>
        <div class="hashtag-list">${result.tags.map(tag => `<span class="hashtag">${escapeHTML(tag)}</span>`).join('')}</div>`;
    } else {
      html = `
        <p class="content-label">ARTICLE TITLE / 文章标题</p>
        <h2 class="article-title">${rich(result.title)}</h2>
        <p class="content-label">ABSTRACT / 摘要</p>
        <p class="article-summary">${rich(result.summary)}</p>
        <p class="content-label">ARTICLE BODY / 分节正文</p>
        ${result.sections.map(section => `
          <section class="article-section"><h3><span>${section.number}</span>${escapeHTML(section.heading)}</h3><p>${rich(section.text)}</p></section>`).join('')}
        <p class="article-summary">${rich(result.closing)}</p>`;
    }

    const container = $('#generated-content');
    container.innerHTML = html;
    container.style.animation = 'none';
    void container.offsetWidth;
    container.style.animation = '';

    const platformMarks = { xiaohongshu: '红', douyin: '音', wechat: '文' };
    $('#output-platform-mark').textContent = platformMarks[state.platform];
    $('#output-platform-name').textContent = `${platform.name}传播方案`;
    $('#output-theme-name').textContent = `主题：${theme.name} · ${tones[state.tone].name}`;
    $('#content-variant').textContent = `VERSION ${String(state.variant + 1).padStart(2, '0')}`;
    $('#visual-theme-label').textContent = theme.name;
    $('#visual-platform-label').textContent = `${platform.name} · ${platform.description}`;
    $('#image-ratio').textContent = platform.ratio;
    $('.output-grid').classList.toggle('is-wide', state.platform === 'wechat');

    const { factsUsed, ...generatedCopy } = result;
    const references = JSON.stringify(generatedCopy).match(/F\d{2}/g) || [];
    const invalid = references.filter(id => !factMap.has(id));
    $('#validation-badge').innerHTML = invalid.length ? `发现 ${invalid.length} 个异常引用` : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>事实校验通过';
    $('#source-summary').textContent = `${references.length} 处引用 · ${factsUsed.length} 项事实`;
    $('#used-facts').innerHTML = result.factsUsed.map(fact => `
      <button type="button" class="used-fact" data-fact="${fact.id}"><strong>${fact.id}</strong><span>${escapeHTML(fact.title)}</span><span>↗</span></button>`).join('');
  }

  function buildImagePrompt() {
    const platform = platforms[state.platform];
    const styles = {
      editorial: 'three-quarter view, refined Chinese craft editorial photography, warm natural side light',
      macro: 'extreme close-up of textile fibers and handmade details, shallow depth of field, documentary macro photography',
      overhead: 'top-down flat lay with ordered warp and weft lines, balanced geometric composition, soft diffused daylight'
    };
    const variants = ['quiet balanced framing', 'intimate diagonal framing', 'spacious asymmetrical framing'];
    return `${themeVisuals[state.theme]}, ${platform.promptStyle}, ${styles[state.visualStyle]}, ${variants[state.variant % 3]}, museum-quality realistic photography, no text, no letters, no numbers, no logo, no watermark`;
  }

  function imageUrl(prompt, size) {
    return `${API_ENDPOINT}?prompt=${encodeURIComponent(prompt)}&image_size=${size}`;
  }

  function loadGeneratedImage() {
    const image = $('#generated-image');
    const loading = $('#image-loading');
    const error = $('#image-error');
    const platform = platforms[state.platform];
    const request = ++imageRequest;

    state.prompt = buildImagePrompt();
    state.imageUrl = imageUrl(state.prompt, platform.size);
    $('#image-prompt').textContent = state.prompt;
    $('#open-image').href = state.imageUrl;
    $('#generated-image-frame').className = `generated-image-frame ${state.platform === 'wechat' ? 'ratio-landscape' : state.platform === 'douyin' ? 'ratio-story' : 'ratio-portrait'}`;
    image.alt = `${themes[state.theme].name}主题鲁锦AI示意图，适配${platform.name}${platform.ratio}画幅`;
    loading.hidden = false;
    error.hidden = true;
    image.style.opacity = '0';

    image.onload = () => {
      if (request !== imageRequest) return;
      loading.hidden = true;
      error.hidden = true;
      image.style.opacity = '1';
    };
    image.onerror = () => {
      if (request !== imageRequest) return;
      loading.hidden = true;
      error.hidden = false;
      image.style.opacity = '0';
    };
    image.src = state.imageUrl;
  }

  function loadHeroImage() {
    const image = $('#hero-image');
    const loading = $('#hero-loading');
    const error = $('#hero-error');
    const request = ++heroRequest;
    const prompt = 'Luxurious editorial photograph of traditional Lu Jin handwoven cotton textile from Shandong China, vivid cinnabar red indigo blue and golden yellow geometric patterned fabric draped diagonally over a traditional wooden loom, wooden shuttle with red cotton thread, warm ivory rice-paper background, soft morning window light, realistic woven fibers, quiet elegant Chinese heritage atmosphere, vertical 3:4 composition, no text, no letters, no numbers, no logo, no watermark';
    loading.hidden = false;
    error.hidden = true;
    image.style.opacity = '0';
    image.onload = () => {
      if (request !== heroRequest) return;
      loading.hidden = true;
      image.style.opacity = '1';
    };
    image.onerror = () => {
      if (request !== heroRequest) return;
      loading.hidden = true;
      error.hidden = false;
    };
    image.src = imageUrl(prompt, 'portrait_4_3');
  }

  function generate(increment = false) {
    if (increment) state.variant += 1;
    state.result = buildResult();
    renderResult();
    loadGeneratedImage();
  }

  function syncPressed(containerSelector, dataKey, value) {
    $$(`${containerSelector} [data-${dataKey}]`).forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset[dataKey] === value));
    });
  }

  function syncControls() {
    syncPressed('#platform-options', 'platform', state.platform);
    syncPressed('#theme-options', 'theme', state.theme);
    syncPressed('#tone-options', 'tone', state.tone);
    $('#visual-style').value = state.visualStyle;
    $('#theme-description').textContent = themes[state.theme].description;
  }

  function plainTextResult() {
    const result = state.result;
    const platform = platforms[state.platform];
    const theme = themes[state.theme];
    const lines = [`鲁锦·织声｜${platform.name}传播方案`, `主题：${theme.name}｜风格：${tones[state.tone].name}`, ''];

    if (result.kind === 'xiaohongshu') {
      lines.push(`【标题】${result.title}`, '', '【正文】', ...result.paragraphs, '', `【话题】${result.tags.join(' ')}`);
    } else if (result.kind === 'douyin') {
      lines.push(`【3秒钩子】${result.hook}`, '', '【15秒分镜与口播】');
      result.shots.forEach(shot => lines.push(`${shot.time}｜${shot.visual}`, `口播：${shot.voice}`, ''));
      lines.push(`【发布文案】${result.caption}`, `【话题】${result.tags.join(' ')}`);
    } else {
      lines.push(`【文章标题】${result.title}`, '', `【摘要】${result.summary}`, '', '【正文】');
      result.sections.forEach(section => lines.push(`${section.number} ${section.heading}`, section.text, ''));
      lines.push(result.closing);
    }

    lines.push('', '—— 事实来源 ——');
    result.factsUsed.forEach(fact => {
      lines.push(`${fact.id}｜${fact.title}`, fact.quote, `来源：《鲁锦.docx》第${fact.paragraph}段`, '');
    });
    lines.push('配图说明：页面配图为AI示意图，不作为史料照片。', '生成方式：事实约束生成 · 本地交互原型');
    return lines.join('\n');
  }

  async function copyText(text, successMessage) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('copy failed');
      }
      showToast(successMessage);
    } catch (error) {
      showToast('复制未完成，请手动选择文本复制');
    }
  }

  function downloadResult() {
    const blob = new Blob(['\ufeff', plainTextResult()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `鲁锦_${platforms[state.platform].name}_${themes[state.theme].name}_V${state.variant + 1}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('TXT 已导出，完整事实来源一并附上');
  }

  function showFact(id) {
    const fact = factMap.get(id);
    if (!fact) return;
    $('#dialog-id').textContent = fact.id;
    $('#dialog-category').textContent = fact.category;
    $('#dialog-title').textContent = fact.title;
    $('#dialog-quote').textContent = fact.quote;
    $('#dialog-source').textContent = `《鲁锦.docx》第 ${fact.paragraph} 段 · 用户提供资料`;
    const dialog = $('#fact-dialog');
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }

  function showToast(message) {
    const toast = $('#toast');
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function renderFacts() {
    const query = state.query.trim().toLowerCase();
    const filtered = facts.filter(fact => {
      const categoryMatch = state.category === 'all' || fact.category === state.category;
      const haystack = `${fact.id} ${fact.title} ${fact.text} ${fact.quote} ${fact.tags.join(' ')}`.toLowerCase();
      return categoryMatch && (!query || haystack.includes(query));
    });

    $('#library-result-count').textContent = `显示 ${filtered.length} 条事实`;
    $('#fact-empty').hidden = filtered.length > 0;
    $('#fact-grid').hidden = filtered.length === 0;
    $('#fact-grid').innerHTML = filtered.map(fact => `
      <article class="fact-card">
        <div class="fact-card-top"><span class="fact-id">${fact.id}</span><span class="fact-category">${escapeHTML(fact.category)}</span></div>
        <h2>${escapeHTML(fact.title)}</h2>
        <p class="fact-text">${escapeHTML(fact.text)}</p>
        <div class="fact-tags">${fact.tags.map(tag => `<span># ${escapeHTML(tag)}</span>`).join('')}</div>
        <div class="fact-card-footer"><span>《鲁锦.docx》第 ${fact.paragraph} 段</span><button type="button" data-fact="${fact.id}">查看原文 <span>↗</span></button></div>
      </article>`).join('');
  }

  function resetFilters() {
    state.category = 'all';
    state.query = '';
    $('#fact-search').value = '';
    syncPressed('#category-filters', 'category', 'all');
    renderFacts();
  }

  function route() {
    const requested = location.hash.replace('#', '') || 'home';
    state.route = ['home', 'studio', 'library'].includes(requested) ? requested : 'home';
    $$('.view').forEach(view => { view.hidden = view.dataset.view !== state.route; });
    $$('.nav-link').forEach(link => {
      if (link.dataset.route === state.route) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = `${state.route === 'home' ? '鲁锦·织声' : state.route === 'studio' ? '智能创作' : '事实库'}｜鲁锦·织声`;
    window.scrollTo(0, 0);
  }

  function bindEvents() {
    window.addEventListener('hashchange', route);

    document.addEventListener('click', event => {
      const factButton = event.target.closest('[data-fact]');
      if (factButton) showFact(factButton.dataset.fact);
      if (event.target.closest('[data-go-library]')) location.hash = 'library';
      const themeLink = event.target.closest('[data-theme-link]');
      if (themeLink) {
        state.theme = themeLink.dataset.themeLink;
        state.variant = 0;
        syncControls();
        generate();
        location.hash = 'studio';
      }
    });

    $('#platform-options').addEventListener('click', event => {
      const button = event.target.closest('[data-platform]');
      if (!button) return;
      state.platform = button.dataset.platform;
      state.variant = 0;
      syncControls();
      generate();
    });

    $('#theme-options').addEventListener('click', event => {
      const button = event.target.closest('[data-theme]');
      if (!button) return;
      state.theme = button.dataset.theme;
      state.variant = 0;
      syncControls();
      generate();
    });

    $('#tone-options').addEventListener('click', event => {
      const button = event.target.closest('[data-tone]');
      if (!button) return;
      state.tone = button.dataset.tone;
      syncControls();
      generate();
    });

    $('#visual-style').addEventListener('change', event => {
      state.visualStyle = event.target.value;
      loadGeneratedImage();
    });
    $('#generate-button').addEventListener('click', () => generate(true));
    $('#copy-content').addEventListener('click', () => copyText(plainTextResult(), '完整文案与事实来源已复制'));
    $('#download-content').addEventListener('click', downloadResult);
    $('#copy-prompt').addEventListener('click', () => copyText(state.prompt, '配图提示词已复制'));
    $('#retry-image').addEventListener('click', loadGeneratedImage);
    $('#retry-hero').addEventListener('click', loadHeroImage);

    $('#category-filters').addEventListener('click', event => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      state.category = button.dataset.category;
      syncPressed('#category-filters', 'category', state.category);
      renderFacts();
    });
    $('#fact-search').addEventListener('input', event => {
      state.query = event.target.value;
      renderFacts();
    });
    $('#reset-filters').addEventListener('click', resetFilters);

    $('#close-dialog').addEventListener('click', () => $('#fact-dialog').close());
    $('#fact-dialog').addEventListener('click', event => {
      if (event.target === event.currentTarget) event.currentTarget.close();
    });
    $('#fact-dialog').addEventListener('close', () => document.body.classList.remove('dialog-open'));

    document.addEventListener('keydown', event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        location.hash = 'library';
        setTimeout(() => $('#fact-search').focus(), 0);
      }
    });
  }

  function init() {
    $('#header-fact-count').textContent = facts.length;
    $('#metric-fact-count').textContent = facts.length;
    $('#library-total').textContent = facts.length;
    syncControls();
    renderFacts();
    generate();
    loadHeroImage();
    bindEvents();
    route();
  }

  init();
})();
