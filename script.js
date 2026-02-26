/* script.js */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // Header scroll effect
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Mobile Menu Toggle
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('.nav');
    const navLinks = document.querySelectorAll('.nav-link');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        nav.classList.toggle('open');
        const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
        hamburger.setAttribute('aria-expanded', !isExpanded);
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = hamburger.classList.contains('active') ? 'hidden' : '';
    });

    // Close mobile menu on link click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            nav.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        });
    });

    // Intersection Observer for fade-in animations
    const fadeElements = document.querySelectorAll('.fade-in');
    
    const fadeObserverOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const fadeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Stop observing once visible
            }
        });
    }, fadeObserverOptions);

    fadeElements.forEach(el => {
        fadeObserver.observe(el);
    });

    // ========== Hearing System ==========
    const hearingQuestions = {
        'Web開発': [
            { key: 'type', question: 'どのようなWebサイト・アプリを検討されていますか？', options: ['コーポレートサイト', 'ECサイト', 'SaaS / Webアプリ', 'LP / キャンペーンサイト', 'その他'], allowText: true },
            { key: 'target', question: 'ターゲットユーザーを教えてください。', options: ['一般消費者(BtoC)', '企業(BtoB)', '社内利用', 'その他'], allowText: true },
            { key: 'features', question: '必要な機能や要件があれば教えてください。', options: null, allowText: true, placeholder: '例: ログイン機能、決済、管理画面など' },
            { key: 'design', question: 'デザインについてご要望はありますか？', options: ['おまかせ', '参考サイトあり', 'デザインデータあり', '既存サイトのリニューアル'], allowText: true },
            { key: 'budget', question: 'ご予算の目安を教えてください。', options: ['〜50万円', '50〜100万円', '100〜300万円', '300万円〜', '要相談'], allowText: false },
            { key: 'timeline', question: 'ご希望の納期はありますか？', options: ['1ヶ月以内', '3ヶ月以内', '半年以内', '急ぎではない'], allowText: true },
        ],
        'AI導入支援': [
            { key: 'purpose', question: 'AIを導入したい業務や目的を教えてください。', options: ['業務自動化・効率化', 'データ分析・予測', 'チャットボット・問い合わせ対応', 'コンテンツ生成', 'その他'], allowText: true },
            { key: 'current', question: '現在の業務フローや課題を教えてください。', options: null, allowText: true, placeholder: '例: 手作業での集計に時間がかかっている' },
            { key: 'data', question: '活用できるデータはありますか？', options: ['社内ドキュメントがある', '構造化データ(CSV/DB)がある', 'これからデータを整備したい', 'わからない'], allowText: true },
            { key: 'scale', question: '利用規模を教えてください。', options: ['個人・少人数', '部署単位(〜50人)', '全社(50人以上)', '顧客向けサービス'], allowText: false },
            { key: 'budget', question: 'ご予算の目安を教えてください。', options: ['〜50万円', '50〜100万円', '100〜300万円', '300万円〜', '要相談'], allowText: false },
            { key: 'timeline', question: 'ご希望のスケジュール感を教えてください。', options: ['すぐにでも', '3ヶ月以内', '半年以内', '情報収集段階'], allowText: false },
        ],
        'ITインフラ構築': [
            { key: 'current', question: '現在のインフラ環境を教えてください。', options: ['オンプレミス', 'AWS', 'GCP / Azure', 'レンタルサーバー', '新規構築'], allowText: true },
            { key: 'purpose', question: 'どのような構築・改善をお考えですか？', options: ['クラウド移行', 'インフラ新規構築', 'パフォーマンス改善', 'セキュリティ強化', 'コスト最適化'], allowText: true },
            { key: 'scale', question: '想定される規模感を教えてください。', options: ['小規模(月数千PV程度)', '中規模(月数万PV)', '大規模(月数十万PV以上)', 'わからない'], allowText: true },
            { key: 'requirements', question: 'その他の要件があれば教えてください。', options: null, allowText: true, placeholder: '例: 24時間監視、自動スケーリング、CI/CD構築など' },
            { key: 'budget', question: 'ご予算の目安を教えてください。', options: ['〜50万円', '50〜100万円', '100〜300万円', '300万円〜', '要相談'], allowText: false },
            { key: 'timeline', question: 'ご希望の納期はありますか？', options: ['1ヶ月以内', '3ヶ月以内', '半年以内', '急ぎではない'], allowText: false },
        ],
        '技術顧問': [
            { key: 'challenge', question: '現在の技術的な課題を教えてください。', options: ['技術選定に悩んでいる', 'アーキテクチャの見直し', '開発プロセスの改善', 'チームの技術力向上', 'その他'], allowText: true },
            { key: 'stack', question: '現在の技術スタックを教えてください。', options: null, allowText: true, placeholder: '例: React, Rails, AWS, PostgreSQL...' },
            { key: 'team', question: '開発チームの規模を教えてください。', options: ['1〜3人', '4〜10人', '11〜30人', '30人以上'], allowText: false },
            { key: 'engagement', question: 'どのような関わり方をご希望ですか？', options: ['定期MTG(月数回)', '週1〜2日稼働', 'スポット相談', 'プロジェクト単位'], allowText: true },
            { key: 'budget', question: '月額ご予算の目安を教えてください。', options: ['〜10万円/月', '10〜30万円/月', '30〜50万円/月', '50万円〜/月', '要相談'], allowText: false },
            { key: 'timeline', question: 'いつ頃から開始をお考えですか？', options: ['すぐにでも', '1ヶ月以内', '3ヶ月以内', '情報収集段階'], allowText: false },
        ],
    };

    const serviceIcons = {
        'Web開発': 'layout',
        'AI導入支援': 'brain-circuit',
        'ITインフラ構築': 'lightbulb',
        '技術顧問': 'lightbulb',
    };

    const modal = document.getElementById('hearingModal');
    const messagesEl = document.getElementById('hearingMessages');
    const optionsEl = document.getElementById('hearingOptions');
    const textInputEl = document.getElementById('hearingTextInput');
    const inputEl = document.getElementById('hearingInput');
    const sendBtn = document.getElementById('hearingSend');
    const summaryEl = document.getElementById('hearingSummary');
    const summaryContentEl = document.getElementById('summaryContent');
    const inputAreaEl = document.getElementById('hearingInputArea');
    const bodyEl = document.getElementById('hearingBody');
    const progressBar = modal.querySelector('.hearing-progress-bar');

    let currentService = '';
    let currentStep = 0;
    let answers = {};

    function openHearing(serviceName) {
        currentService = serviceName;
        currentStep = 0;
        answers = {};

        modal.querySelector('.hearing-service-name').textContent = serviceName;
        const iconEl = modal.querySelector('.hearing-service-icon');
        iconEl.innerHTML = `<i data-lucide="${serviceIcons[serviceName] || 'layout'}"></i>`;

        messagesEl.innerHTML = '';
        summaryEl.style.display = 'none';
        inputAreaEl.style.display = 'block';
        bodyEl.style.display = 'block';
        progressBar.style.width = '0%';

        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        lucide.createIcons();

        setTimeout(() => askQuestion(), 300);
    }

    function closeHearing() {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }

    function addMessage(text, type) {
        const msg = document.createElement('div');
        msg.className = `hearing-msg ${type}`;
        msg.textContent = text;
        messagesEl.appendChild(msg);
        bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    function updateProgress() {
        const questions = hearingQuestions[currentService];
        const pct = ((currentStep) / questions.length) * 100;
        progressBar.style.width = pct + '%';
    }

    function askQuestion() {
        const questions = hearingQuestions[currentService];
        if (currentStep >= questions.length) {
            showSummary();
            return;
        }

        updateProgress();
        const q = questions[currentStep];
        addMessage(q.question, 'bot');

        optionsEl.innerHTML = '';
        textInputEl.style.display = 'none';

        if (q.options) {
            q.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'hearing-option-btn';
                btn.textContent = opt;
                btn.addEventListener('click', () => handleAnswer(opt, q));
                optionsEl.appendChild(btn);
            });
            if (q.allowText) {
                const otherBtn = document.createElement('button');
                otherBtn.className = 'hearing-option-btn';
                otherBtn.textContent = '自由入力';
                otherBtn.addEventListener('click', () => {
                    optionsEl.innerHTML = '';
                    textInputEl.style.display = 'flex';
                    inputEl.placeholder = q.placeholder || '入力してください...';
                    inputEl.value = '';
                    inputEl.focus();
                });
                optionsEl.appendChild(otherBtn);
            }
        } else if (q.allowText) {
            textInputEl.style.display = 'flex';
            inputEl.placeholder = q.placeholder || '入力してください...';
            inputEl.value = '';
            inputEl.focus();
        }

        bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    function handleAnswer(answer, question) {
        addMessage(answer, 'user');
        answers[question.key] = { label: question.question, value: answer };
        currentStep++;
        optionsEl.innerHTML = '';
        textInputEl.style.display = 'none';
        setTimeout(() => askQuestion(), 400);
    }

    function handleTextSubmit() {
        const val = inputEl.value.trim();
        if (!val) return;
        const q = hearingQuestions[currentService][currentStep];
        handleAnswer(val, q);
    }

    sendBtn.addEventListener('click', handleTextSubmit);
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleTextSubmit();
    });

    function showSummary() {
        progressBar.style.width = '100%';
        inputAreaEl.style.display = 'none';
        bodyEl.style.display = 'none';

        let html = `<div class="summary-item"><div class="summary-label">サービス</div><div class="summary-value">${currentService}</div></div>`;
        for (const key of Object.keys(answers)) {
            const a = answers[key];
            html += `<div class="summary-item"><div class="summary-label">${a.label}</div><div class="summary-value">${a.value}</div></div>`;
        }
        summaryContentEl.innerHTML = html;
        summaryEl.style.display = 'block';
        lucide.createIcons();
    }

    // Copy summary
    document.getElementById('summaryCopy').addEventListener('click', () => {
        let text = `【${currentService} ヒアリング結果】\n\n`;
        for (const key of Object.keys(answers)) {
            const a = answers[key];
            text += `■ ${a.label}\n${a.value}\n\n`;
        }
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('summaryCopy');
            btn.textContent = 'コピーしました！';
            setTimeout(() => { btn.textContent = '内容をコピー'; }, 2000);
        });
    });

    // Send to contact form
    document.getElementById('summaryContact').addEventListener('click', () => {
        let text = `【${currentService}のご相談】\n\n`;
        for (const key of Object.keys(answers)) {
            const a = answers[key];
            text += `■ ${a.label}\n${a.value}\n\n`;
        }
        closeHearing();
        setTimeout(() => {
            const messageField = document.getElementById('message');
            if (messageField) messageField.value = text;
        }, 300);
    });

    // Close modal
    modal.querySelector('.hearing-close').addEventListener('click', closeHearing);
    modal.querySelector('.hearing-backdrop').addEventListener('click', closeHearing);

    // Contact Form Submission
    const CONTACT_API_URL = 'https://holly-hazardous-rca-something.trycloudflare.com/contact';
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button[type="submit"]');
            const original = btn.textContent;
            btn.textContent = '送信中...';
            btn.disabled = true;

            const data = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                message: document.getElementById('message').value,
            };

            try {
                const res = await fetch(CONTACT_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const json = await res.json();
                if (json.ok) {
                    btn.textContent = '送信しました！';
                    contactForm.reset();
                    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 3000);
                } else {
                    throw new Error(json.error || 'Error');
                }
            } catch (err) {
                btn.textContent = '送信に失敗しました';
                btn.disabled = false;
                setTimeout(() => { btn.textContent = original; }, 3000);
            }
        });
    }

    // Service card click
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            const name = card.querySelector('.service-name').textContent;
            if (hearingQuestions[name]) {
                openHearing(name);
            }
        });
    });
});
