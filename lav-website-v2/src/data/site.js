/* ============================================================================
   ALL site content lives here. Nothing in the views is hard-coded.

   To post an update: add an entry to `updates` (newest anywhere, it's sorted).
   To run a new course batch: add it to `course.batches`. Status (upcoming /
   running / completed) is worked out from the dates in Mauritius time, both
   at build and again in the visitor's browser, so it can never go stale.

   Dates: 'YYYY-MM-DD' for a day, 'YYYY-MM' for a whole month, 'YYYY' for a
   year. A batch takes a list of session days, or a single month while the
   exact days are not fixed.
   ========================================================================= */

export const site = {
  meta: {
    url: 'https://laveshbabooram.github.io/',
    title: 'Lavesh Babooram · Telecom engineer, AI automation, author',
    description:
      'Network engineer at Mauritius Telecom building AI-driven monitoring and automation for broadband, internet and video services. Author of books on machine learning for networks. Trainer in generative and agentic AI.',
    themeColor: '#070A0F',
  },

  /* CV requests are posted here. Leave '' to fall back to a pre-filled email.
     Formspree setup (5 minutes) is in README.md. */
  cvRequest: {
    endpoint: 'https://formspree.io/f/xbgooeqy',
  },

  person: {
    first: 'Lavesh',
    last: 'Babooram',
    email: 'laveshbabooram@gmail.com',
    location: 'Mauritius',
    coords: '20.16°S 57.50°E',
    links: {
      linkedin: 'https://mu.linkedin.com/in/lavesh-babooram',
      orcid: 'https://orcid.org/0000-0001-6403-3395',
    },
    roles: [
      'Network Engineer · Autonomous Networks',
      'QoE / QoS analytics',
      'AI automation builder',
      'Author · Apress & Springer',
      'Trainer · University of Mauritius',
    ],
    pitch:
      'I build the eyes, reflexes and a bit of the brain for autonomous networks, so problems get caught before customers notice. Then I write and teach about it.',
    credentials: [
      { label: 'RPEM', tip: 'Registered Professional Engineer of Mauritius, Council of Registered Professional Engineers (2026).' },
      { label: 'MSc', tip: 'MSc by Applied Research in Telecommunications Engineering, University of Mauritius. Thesis 2022–2024, awarded 2025.' },
      { label: 'BEng (Hons)', tip: 'Telecommunications Engineering with Networking, University of Mauritius (2021). First Class, plus the Faculty Gold Medal for the best final-year project.' },
      { label: 'Author', tip: '3 books and 3 book chapters with Apress (Springer), Nova Science, Taylor & Francis (incl. CRC Press) and Emerald.' },
    ],
  },

  /* ---------------------------------------------------------------------- */
  course: {
    title: 'Generative & Agentic AI Automation for Professionals',
    org: 'University of Mauritius',
    venue: 'Réduit campus',
    format: '3 days · 21 hours',
    trainers: 'Dr T. P. Fowdur & L. Babooram',
    hrdc: true,
    link: 'https://lnkd.in/p/dSszUS9Y',
    batches: [
      { name: 'Batch 1', sessions: ['2026-08-01', '2026-08-08', '2026-08-22'] },
      { name: 'Batch 2', sessions: ['2026-09-19', '2026-09-26', '2026-10-03'] },
      { name: 'Batch 3', sessions: ['2026-11'] },
    ],
    modules: [
      { icon: 'message', title: 'Customer enquiries', text: 'Agents that read and answer support requests.' },
      { icon: 'mail', title: 'Email triage', text: 'Sort, label and prioritise inboxes automatically.' },
      { icon: 'chart', title: 'Market research', text: 'Collect and summarise competitor intelligence.' },
      { icon: 'phone', title: 'WhatsApp assistant', text: 'Conversational agents on business channels.' },
      { icon: 'camera', title: 'Vision automation', text: 'Detect, read and act on images and documents.' },
      { icon: 'activity', title: 'Network analytics', text: 'Monitor performance and predict issues.' },
    ],
  },

  /* Dated log. Course batches add their own entries; don't duplicate them. */
  updates: [
    { date: '2026', tag: 'Milestone', text: 'Registered as a Professional Engineer (RPEM) with the CRPE council of Mauritius.' },
    { date: '2026-07', tag: 'Teaching', text: 'Back at the University of Mauritius as a short-course trainer in generative and agentic AI.' },
    { date: '2026', tag: 'Project', text: 'MiniFactory3D goes live: a custom e-commerce platform with a 3D product configurator.', link: 'https://www.minifactory3d.com' },
    { date: '2026-08', tag: 'Chapter', text: 'Chapter on network QoS monitoring in 6G non-terrestrial networks published by CRC Press (Taylor & Francis).', link: 'https://www.taylorfrancis.com/chapters/edit/10.1201/9781003674801-3/network-qos-monitoring-6g-non-terrestrial-networks-lavesh-babooram-tulsi-pawan-fowdur' },
    { date: '2025', tag: 'Study', text: 'Awarded the MSc by Applied Research in Telecommunications Engineering (thesis 2022–2024).' },
    { date: '2024-10', tag: 'Book', text: 'AI Solutions for the United Nations Sustainable Development Goals published by Apress.', link: 'https://link.springer.com/book/10.1007/979-8-8688-0536-3' },
    { date: '2024-06', tag: 'Book', text: 'Machine Learning for Network Traffic and Video Quality Analysis published by Apress.', link: 'https://link.springer.com/book/10.1007/979-8-8688-0354-3' },
    { date: '2024', tag: 'Award', text: 'Team Gold at ICQCC 2024 in Sri Lanka for AI-based service monitoring in telecoms.' },
    { date: '2024-04', tag: 'Paper', text: 'Collaborative real-time video QoS prediction published in Springer IJDSA.', link: 'https://link.springer.com/article/10.1007/s41060-024-00548-3' },
  ],

  /* ---------------------------------------------------------------------- */
  projectFilters: [
    { id: 'all', label: 'All' },
    { id: 'production', label: 'In production' },
    { id: 'research', label: 'Research' },
    { id: 'personal', label: 'Personal' },
    { id: 'teaching', label: 'Teaching' },
  ],

  projects: [
    {
      id: 'atlas', kind: 'production', featured: true, icon: 'globe', visual: 'latency',
      name: 'Atlas', kicker: 'Internet service QoE',
      summary: 'Measures what customers actually experience on the internet, flags when it drifts, and explains why.',
      points: [
        'Latency, routes and page-load times to the services people use',
        'International submarine-cable capacity and utilisation',
        'Deviation detection with Slack alerts and a daily brief',
        'AI copilot that answers questions over the live data',
      ],
      stack: ['Python', 'Flask', 'Time series', 'LLM copilot', 'Slack'],
    },
    {
      id: 'stream', kind: 'production', featured: true, icon: 'tv', visual: 'streams',
      name: 'Stream Monitor', kicker: 'DStv · OTT · IPTV',
      summary: 'Watches live TV and streaming services around the clock and puts their health on the NOC wallboard.',
      points: [
        'Stream availability and start-up checks across platforms',
        'Browser automation for app-based services',
        'Feeds the shared wallboard next to internet QoE',
      ],
      stack: ['Python', 'ffmpeg', 'Puppeteer', 'Selenium', 'Flask'],
    },
    {
      id: 'minifactory', kind: 'personal', featured: true, icon: 'box',
      name: 'MiniFactory3D', kicker: 'E-commerce · 3D configurator',
      summary: 'Custom e-commerce platform with a 3D product configurator, designed, built and run end to end.',
      image: { src: 'minifactory', w: 1200, h: 686, alt: 'MiniFactory3D storefront with the 3D configurator' },
      link: 'https://www.minifactory3d.com', linkLabel: 'minifactory3d.com',
      stack: ['Custom codebase', '3D configurator', 'E-commerce'],
    },
    {
      id: 'speedlab', kind: 'production', icon: 'gauge',
      name: 'speedlab', kicker: 'Broadband package testing',
      summary: 'Moves a test line through each broadband profile, measures it, and records a verdict with evidence.',
      stack: ['Python', 'Flask', 'Automation'],
    },
    {
      id: 'alarms', kind: 'production', icon: 'layers',
      name: 'Alarm correlation & RCA', kicker: 'GPON access network',
      summary: 'Groups floods of access-network alarms into incidents and proposes the likely root cause.',
      stack: ['LLMs', 'Clustering', 'GPON'],
    },
    {
      id: 'qoe', kind: 'research', icon: 'sparkle', award: 'ICQCC 2024 Gold',
      name: 'AI-based QoE prediction', kicker: 'YouTube · TikTok · DStv',
      summary: 'Automated quality-of-experience measurement for video and social apps, with ML that predicts degradation.',
      stack: ['Machine learning', 'Automation', 'Video QoE'],
    },
    {
      id: 'video', kind: 'research', icon: 'server',
      name: 'Video delivery forensics', kicker: 'From the cache to the screen',
      summary: 'Followed video end to end: how much is served from local caches versus abroad, and where the seconds go when a set-top box boots and tunes, read straight from packet captures.',
      stack: ['Wireshark', 'IPTV', 'CDN caching', 'QoE'],
    },
    {
      id: 'failover', kind: 'research', icon: 'wifi',
      name: 'Broadband failover testing', kicker: 'Mobile backup',
      summary: 'Tested how fast and how well connections fall back to mobile when the fixed line drops.',
      stack: ['Test automation', 'Fixed + mobile'],
    },
    {
      id: 'aimaster', kind: 'teaching', icon: 'users', years: '2025 – now',
      name: 'AI Master', kicker: 'Educational platform',
      summary: 'Co-investigator on a platform that teaches AI and ML concepts through visual, interactive tools.',
      stack: ['AI education', 'Research'],
    },
    {
      id: 'videoqos', kind: 'research', icon: 'trend-up', years: '2023 – 2024',
      name: 'Real-time video QoS prediction', kicker: 'Live streaming',
      summary: 'Collaborative ML models that forecast network and video-quality metrics for live streaming.',
      stack: ['Machine learning', 'Deep learning'],
    },
    {
      id: 'cloudml', kind: 'research', icon: 'cloud', years: '2020', origin: 'BEng · University of Mauritius',
      name: 'Cloud-based ML website', kicker: 'ML in the browser',
      summary: 'Browser-based statistical data analysis and ML, built on JavaScript and Firebase.',
      stack: ['JavaScript', 'Firebase'],
    },
  ],

  /* ---------------------------------------------------------------------- */
  books: [
    {
      id: 'sdgs', type: 'Book', cover: 'cover-ai-sdgs',
      title: 'AI Solutions for the United Nations Sustainable Development Goals',
      short: 'AI Solutions for the UN SDGs',
      pub: 'Apress (Springer)', date: '2024-10',
      desc: 'Building ML applications in JavaScript that address several UN Sustainable Development Goals, from theory to working code.',
      link: 'https://link.springer.com/book/10.1007/979-8-8688-0536-3', host: 'Springer',
    },
    {
      id: 'mltraffic', type: 'Book', cover: 'cover-ml-traffic',
      title: 'Machine Learning for Network Traffic and Video Quality Analysis',
      short: 'ML for Network Traffic',
      pub: 'Apress (Springer)', date: '2024-06',
      desc: 'Network traffic monitoring, anomaly detection and video-quality analysis applications, built with ML in JavaScript.',
      link: 'https://link.springer.com/book/10.1007/979-8-8688-0354-3', host: 'Springer',
    },
    {
      id: 'cloudml', type: 'Book', cover: 'cover-cloud-ml',
      title: 'Real-Time Cloud Computing and Machine Learning Applications',
      short: 'Real-Time Cloud & ML',
      pub: 'Nova Science Publishers', date: '2021-07',
      desc: 'Android and Windows applications for real-time network monitoring and telemetry analytics, documented end to end.',
      link: 'https://novapublishers.com/shop/real-time-cloud-computing-and-machine-learning-applications/', host: 'Nova Science',
    },
    {
      id: 'ntn', type: 'Chapter', cover: 'cover-6g-ntn',
      title: 'Network QoS Monitoring in 6G Non-Terrestrial Networks',
      short: 'QoS in 6G NTN',
      pub: 'CRC Press (Taylor & Francis)', date: '2026-08',
      desc: 'Monitoring quality of service across satellite and other non-terrestrial links in 6G. A chapter in “Towards Integration 6G NTN Non-Terrestrial Networks with 5G NR-NTN Satellite Connectivity”.',
      link: 'https://www.taylorfrancis.com/chapters/edit/10.1201/9781003674801-3/network-qos-monitoring-6g-non-terrestrial-networks-lavesh-babooram-tulsi-pawan-fowdur', host: 'Taylor & Francis',
    },
    {
      id: 'blockchain', type: 'Chapter', cover: 'cover-emerald-blockchain',
      title: 'Leveraging the Power of Blockchain in Industry 4.0 and Intelligent Real-Time Systems for Achieving the SDGs',
      short: 'Blockchain in Industry 4.0',
      pub: 'Emerald Publishing', date: '2024-01',
      desc: 'How blockchain integrates with intelligent real-time systems and Industry 4.0 to serve the UN SDGs.',
      link: 'https://www.emerald.com/books/edited-volume/17362/chapter-abstract/94328159/Leveraging-the-Power-of-Blockchain-in-Industry-4-0?redirectedFrom=fulltext', host: 'Emerald',
    },
    {
      id: '5g6g', type: 'Chapter', cover: 'cover-5g-6g',
      title: 'Driving 5G Mobile Communications with Artificial Intelligence towards 6G',
      short: 'Driving 5G towards 6G',
      pub: 'CRC Press (Taylor & Francis)', date: '2023-04',
      desc: 'Enabling technologies, beamforming algorithms and applications of AI-driven 5G and 6G connectivity.',
      link: 'https://www.routledge.com/Driving-5G-Mobile-Communications-with-Artificial-Intelligence-towards-6G/Milovanovic-Bojkovic-Fowdur/p/book/9781032071244', host: 'CRC Press',
    },
  ],

  papers: [
    {
      kind: 'Journal', venue: 'Springer IJDSA', date: '2024-04',
      title: 'Performance analysis of collaborative real-time video QoS prediction',
      tags: ['Video QoS', 'Prediction', 'Collaborative ML'],
      link: 'https://link.springer.com/article/10.1007/s41060-024-00548-3',
    },
    {
      kind: 'Conference', venue: 'IEEE GCITC', date: '2023-12',
      title: 'Implementation and performance analysis of a SIP-enabled softphone system with machine-learning-based QoS assessment',
      tags: ['VoIP / SIP', 'QoS', 'Machine learning'],
      link: 'https://ieeexplore.ieee.org/document/9611100',
    },
    {
      kind: 'Conference', venue: 'IEEE', date: '2022-12',
      title: 'A web-based network traffic prediction and classification application using machine learning',
      tags: ['Traffic forecasting', 'Classification', 'Web app'],
      link: 'https://ieeexplore.ieee.org/document/9965243',
    },
    {
      kind: 'Journal', venue: 'Emerald IJPCC', date: '2022-09',
      title: 'Performance analysis of a cloud-based network analytics system with multiple-source data aggregation',
      tags: ['Cloud', 'Data aggregation', 'Network analytics'],
      link: 'https://www.emerald.com/ijpcc/article-abstract/19/5/698/163363/Performance-analysis-of-a-cloud-based-network?redirectedFrom=fulltext',
    },
  ],

  /* ---------------------------------------------------------------------- */
  pathFilters: [
    { id: 'all', label: 'All' },
    { id: 'work', label: 'Work' },
    { id: 'study', label: 'Study' },
    { id: 'milestone', label: 'Milestones' },
  ],

  pathGlance: [
    { icon: 'briefcase', k: 'Mauritius Telecom', v: 'Network engineer since 2022' },
    { icon: 'cap', k: 'MSc · BEng (Hons)', v: 'First Class, Faculty Gold Medal' },
    { icon: 'award', k: 'RPEM', v: 'Registered Professional Engineer, 2026' },
  ],

  path: [
    { kind: 'milestone', when: '2026', title: 'Registered Professional Engineer', org: 'CRPE council of Mauritius', text: 'Registered as a Professional Engineer of Mauritius (RPEM).' },
    { kind: 'work', when: 'Mar 2024 · Jul 2026 – now', title: 'Short-course trainer', org: 'University of Mauritius', points: ['Industry training in generative AI, LLMs and AI automation for enterprise workflows.', 'Hands-on modules in agentic systems, computer vision and applied ML.'] },
    { kind: 'milestone', when: '2024', title: 'ICQCC Gold award', org: 'Sri Lanka', text: 'Part of the team awarded Gold for “AI for Smart Service Monitoring in Telecommunications”, a system in production use.', image: { src: 'about-icqcc-award', w: 240, h: 207, alt: 'ICQCC 2024 Gold award' } },
    { kind: 'study', when: '2022 – 2024 · awarded 2025', title: 'MSc by Applied Research, Telecommunications Engineering', org: 'University of Mauritius', text: 'Thesis (2022–2024, degree awarded 2025): an AI-based ubiquitous network traffic and QoS analytics system for real-time multimedia communications.' },
    { kind: 'work', when: 'Oct 2022 – now', title: 'Network Engineer, Broadband Networks', org: 'Mauritius Telecom · Autonomous Networks', points: ['Builds the team’s in-house monitoring and automation platforms for internet, video and broadband services.', 'AI-assisted alarm correlation and root-cause analysis for the access network.', 'Service assurance and quality analytics, from GPON lines to international capacity.'] },
    { kind: 'work', when: 'Oct 2021 – Jul 2022', title: 'System Engineer', org: 'Infosys · Renault account', points: ['Java and SQL development across several concurrent projects for an automotive client.', 'Maintained, debugged and corrected application code to quality standards.'] },
    { kind: 'milestone', when: '2021', title: 'First book published', org: 'Nova Science Publishers', text: 'Real-Time Cloud Computing and Machine Learning Applications.' },
    { kind: 'study', when: 'Aug 2017 – Aug 2021', title: 'BEng (Hons) Telecommunications Engineering with Networking', org: 'University of Mauritius', text: 'First Class Honours. Faculty Gold Medal for the best final-year project.', image: { src: 'about-medal', w: 240, h: 232, alt: 'Faculty gold medal' } },
    { kind: 'work', when: 'Jul – Aug 2020', title: 'Trainee', org: 'Mauritius Telecom', points: ['Fault debugging and complaints handling, with first exposure to FTTH, GPON and optical distribution networks.'] },
    { kind: 'milestone', when: '2005', title: 'Where it started', org: 'Mauritius', text: 'Born in 1998. By seven, happily taking computers apart. The smile says it all.', image: { src: 'about-curiosity', w: 240, h: 232, alt: 'Lavesh as a child in front of a computer' } },
  ],

  /* ---------------------------------------------------------------------- */
  toolkit: [
    { group: 'Telecom', icon: 'signal', items: ['GPON / FTTH', 'IP networking & routing', 'QoS / QoE', 'IPTV & OTT delivery', 'Mobile connectivity', 'Service assurance', 'International capacity'] },
    { group: 'Monitoring', icon: 'activity', items: ['Grafana', 'PRTG', 'Wireshark', 'Packet analysis', 'Alarm correlation', 'Root-cause analysis'] },
    { group: 'Software', icon: 'code', items: ['Python', 'Flask', 'JavaScript', 'PowerShell', 'PHP', 'Java', 'REST APIs', 'Selenium', 'Puppeteer', 'ffmpeg', 'Docker'] },
    { group: 'AI', icon: 'sparkle', items: ['Agentic AI', 'LLMs & VLMs', 'RAG', 'Local models', 'n8n', 'ML forecasting', 'Deep learning'] },
  ],

  services: [
    { icon: 'sparkle', title: 'AI integration & automation', text: 'Chatbots, agents and workflows that take repetitive work off your team: enquiries, triage, reporting.' },
    { icon: 'globe', title: 'Custom web platforms', text: 'Fast, hand-built sites and internal tools with real data behind them, not templates.' },
    { icon: 'activity', title: 'Network QoS & video analytics', text: 'Measuring and predicting service quality for internet, OTT and IPTV, from probes to dashboards.' },
  ],

  quote: 'Your ideas shouldn’t die with you.',
};
