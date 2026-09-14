// State Management
const appState = {
  role: 'student', // 'student' | 'teacher'
  networkStatus: 'online', // 'online' | 'offline'
  currentTab: 'dashboard', // 'dashboard' | 'chat' | 'offline' | 'ipo' | 'whiteboard'
  pendingSyncCount: 0,
  activeChannel: 'cs101-general',
  channels: {
    'cs101-general': {
      name: '# cs101-general',
      desc: 'Class-wide open discussion for Software Engineering I',
      messages: [
        { author: 'Prof. Jacob', role: 'teacher', text: 'Welcome team! Remember that Sprint 1 submission is on Friday. Offline draft mode is enabled.', time: '09:15 AM' },
        { author: 'Rhea Solomon', role: 'student', text: 'Sir, can we submit the IPO diagram as an Excalidraw hand-drawn sketch?', time: '09:22 AM' },
        { author: 'Prof. Jacob', role: 'teacher', text: 'Yes! Excalidraw low-fi diagrams are totally acceptable for the sprint milestone.', time: '09:25 AM' },
        { author: 'Gigi Oderio', role: 'student', text: 'Awesome! Working with Jaynard on the offline sync queue module.', time: '09:30 AM' }
      ]
    },
    'project-alpha': {
      name: '# group-alpha-team',
      desc: 'Private team room for Project Alpha (4 members)',
      messages: [
        { author: 'Jaynard M.', role: 'student', text: 'Hey team, I cached the lectures for offline reading on my commute.', time: '10:04 AM' },
        { author: 'Rhea Solomon', role: 'student', text: 'I just finished the WebSocket and Firebase architecture diagram!', time: '10:12 AM' },
        { author: 'Jacob Desello', role: 'student', text: 'Drafting the offline sync queue. Will sync once I get on Wi-Fi.', time: '10:15 AM' }
      ]
    },
    'assignment-help': {
      name: '# assignment-qna',
      desc: 'Peer assistance & assignment clarifications',
      messages: [
        { author: 'Gigi Oderio', role: 'student', text: 'For Assignment 3, do we need to implement localStorage fallback?', time: 'Yesterday' },
        { author: 'Jaynard M.', role: 'student', text: 'Yes, localStorage API is used for offline data caching.', time: 'Yesterday' }
      ]
    }
  },
  offlineItems: [
    { id: 1, title: 'Lecture 4 - Agile IPO Architecture.pdf', size: '3.4 MB', status: 'Cached Offline', date: 'Downloaded 2h ago' },
    { id: 2, title: 'Assignment 3 Brief - Wireframing & LowFi.docx', size: '1.2 MB', status: 'Cached Offline', date: 'Downloaded yesterday' },
    { id: 3, title: 'Reading Material - WebSockets vs REST.pdf', size: '4.8 MB', status: 'Cached Offline', date: 'Downloaded 3d ago' }
  ],
  offlineDrafts: [
    { id: 'draft-1', title: 'Software Engineering IPO Draft Submission', content: 'Drafted offline: Included Input, Process, and Output diagrams for Google Classroom offline access.', status: 'synced', time: 'Yesterday' }
  ],
  atRiskStudents: [
    { id: 's1', name: 'Alex Rivera', riskLevel: 'High', issue: '3 missed submissions, 0 chat activity (7 days)', class: 'CS 101' },
    { id: 's2', name: 'Mia Chen', riskLevel: 'Medium', issue: 'No offline sync since Sept 10, Sprint 1 pending', class: 'CS 101' },
    { id: 's3', name: 'Carlos Santos', riskLevel: 'Medium', issue: 'Grade trend dropped -12% in Quiz 2', class: 'CS 102' }
  ]
};

// DOM Init
document.addEventListener('DOMContentLoaded', () => {
  initRoleToggle();
  initNetworkToggle();
  initNavigationTabs();
  initChatEngine();
  initOfflineEngine();
  renderCurrentView();
  renderStudentCalendar();
  renderCharts();
});

// Role Switcher
function initRoleToggle() {
  const studentBtn = document.getElementById('btnRoleStudent');
  const teacherBtn = document.getElementById('btnRoleTeacher');

  if (studentBtn && teacherBtn) {
    studentBtn.addEventListener('click', () => {
      appState.role = 'student';
      studentBtn.classList.add('active');
      teacherBtn.classList.remove('active');
      showToast('Switched to Student View', 'info');
      renderCurrentView();
    });

    teacherBtn.addEventListener('click', () => {
      appState.role = 'teacher';
      teacherBtn.classList.add('active');
      studentBtn.classList.remove('active');
      showToast('Switched to Teacher Analytics View', 'info');
      renderCurrentView();
    });
  }
}

// Network Online/Offline Toggle
function initNetworkToggle() {
  const onlineBtn = document.getElementById('btnModeOnline');
  const offlineBtn = document.getElementById('btnModeOffline');

  if (onlineBtn && offlineBtn) {
    onlineBtn.addEventListener('click', () => {
      if (appState.networkStatus === 'offline') {
        appState.networkStatus = 'online';
        onlineBtn.classList.add('active-online');
        offlineBtn.classList.remove('active-offline');
        triggerAutoSync();
      }
    });

    offlineBtn.addEventListener('click', () => {
      if (appState.networkStatus === 'online') {
        appState.networkStatus = 'offline';
        offlineBtn.classList.add('active-offline');
        onlineBtn.classList.remove('active-online');
        showToast('⚠️ Offline Mode Active: Submissions & notes will be cached locally in browser Storage.', 'warning');
        updateNetworkUI();
      }
    });
  }
}

function updateNetworkUI() {
  const banner = document.getElementById('networkBanner');
  const bannerText = document.getElementById('networkBannerText');
  const queueBadge = document.getElementById('syncQueueBadge');

  if (banner && bannerText) {
    if (appState.networkStatus === 'online') {
      banner.className = 'sync-banner online';
      bannerText.innerHTML = '🟢 <strong>Connected to Google Classroom Cloud.</strong> All changes live & synchronized.';
    } else {
      banner.className = 'sync-banner offline';
      bannerText.innerHTML = `🟠 <strong>Working Offline (Local Storage API).</strong> ${appState.pendingSyncCount} pending change(s) queued for sync.`;
    }
  }

  if (queueBadge) {
    queueBadge.textContent = `${appState.pendingSyncCount} Queued`;
    queueBadge.style.display = appState.pendingSyncCount > 0 ? 'inline-block' : 'none';
  }
}

function triggerAutoSync() {
  updateNetworkUI();
  if (appState.pendingSyncCount > 0) {
    showToast(`🔄 Connecting to Cloud... Syncing ${appState.pendingSyncCount} offline draft(s)...`, 'info');
    setTimeout(() => {
      appState.offlineDrafts.forEach(d => d.status = 'synced');
      const count = appState.pendingSyncCount;
      appState.pendingSyncCount = 0;
      updateNetworkUI();
      renderDraftsList();
      showToast(`✅ Successfully synced ${count} item(s) to Classroom Server!`, 'success');
    }, 1200);
  } else {
    showToast('🟢 Online: Everything is up-to-date.', 'success');
  }
}

// Tab Navigation
function initNavigationTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      appState.currentTab = tab.getAttribute('data-tab');
      renderCurrentView();
    });
  });
}

function renderCurrentView() {
  // Hide all view panels
  const panels = document.querySelectorAll('.view-panel');
  panels.forEach(p => p.style.display = 'none');

  // Show active tab
  const activePanel = document.getElementById(`panel-${appState.currentTab}`);
  if (activePanel) {
    activePanel.style.display = 'block';
  }

  // Handle role-specific visibility within panels
  const studentViews = document.querySelectorAll('.view-for-student');
  const teacherViews = document.querySelectorAll('.view-for-teacher');

  if (appState.role === 'student') {
    studentViews.forEach(el => el.style.display = 'block');
    teacherViews.forEach(el => el.style.display = 'none');
    document.getElementById('currentRoleLabel').textContent = 'Student Mode (Rhea Solomon)';
  } else {
    studentViews.forEach(el => el.style.display = 'none');
    teacherViews.forEach(el => el.style.display = 'block');
    document.getElementById('currentRoleLabel').textContent = 'Teacher Mode (Prof. Jacob Desello)';
  }

  updateNetworkUI();
}

// Group Chat Engine
function initChatEngine() {
  renderChannels();
  renderMessages();

  const sendBtn = document.getElementById('btnSendMessage');
  const chatInput = document.getElementById('chatInput');

  if (sendBtn && chatInput) {
    sendBtn.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSendMessage();
    });
  }

  // Add sample contextual action button
  const attachAssignBtn = document.getElementById('btnAttachAssignment');
  if (attachAssignBtn) {
    attachAssignBtn.addEventListener('click', () => {
      if (chatInput) {
        chatInput.value = '📎 [Linked: Assignment 3 - Sprint 1 Wireframe] Can anyone review my draft?';
        chatInput.focus();
      }
    });
  }
}

function renderChannels() {
  const channelList = document.getElementById('chatChannelList');
  if (!channelList) return;

  channelList.innerHTML = '';
  Object.keys(appState.channels).forEach(key => {
    const ch = appState.channels[key];
    const li = document.createElement('li');
    li.className = `channel-item ${key === appState.activeChannel ? 'active' : ''}`;
    li.innerHTML = `
      <span>${ch.name}</span>
      <span class="sketch-badge ${key === appState.activeChannel ? 'yellow' : 'gray'}">${ch.messages.length}</span>
    `;
    li.addEventListener('click', () => {
      appState.activeChannel = key;
      renderChannels();
      renderMessages();
    });
    channelList.appendChild(li);
  });
}

function renderMessages() {
  const container = document.getElementById('chatMessagesContainer');
  const chHeader = document.getElementById('activeChannelHeader');
  const chDesc = document.getElementById('activeChannelDesc');

  if (!container) return;

  const ch = appState.channels[appState.activeChannel];
  if (chHeader) chHeader.textContent = ch.name;
  if (chDesc) chDesc.textContent = ch.desc;

  container.innerHTML = '';
  ch.messages.forEach(msg => {
    const bubble = document.createElement('div');
    const isTeacher = msg.role === 'teacher';
    const isCurrentRoleAuthor = (appState.role === 'student' && msg.author.includes('Rhea')) || 
                                (appState.role === 'teacher' && isTeacher);

    let bubbleClass = 'message-bubble ';
    if (isTeacher) bubbleClass += 'teacher';
    else if (isCurrentRoleAuthor) bubbleClass += 'outgoing';
    else bubbleClass += 'incoming';

    bubble.className = bubbleClass;
    bubble.innerHTML = `
      <div class="message-author">
        <span>${msg.author}</span>
        <span class="sketch-badge ${isTeacher ? 'purple' : 'blue'}" style="font-size:11px; padding:1px 6px;">
          ${isTeacher ? 'Teacher' : 'Student'}
        </span>
      </div>
      <div class="message-text">${msg.text}</div>
      <div class="message-time">${msg.time}</div>
    `;
    container.appendChild(bubble);
  });

  container.scrollTop = container.scrollHeight;
}

function handleSendMessage() {
  const input = document.getElementById('chatInput');
  if (!input || !input.value.trim()) return;

  const text = input.value.trim();
  const author = appState.role === 'student' ? 'Rhea Solomon' : 'Prof. Jacob';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  appState.channels[appState.activeChannel].messages.push({
    author: author,
    role: appState.role,
    text: text,
    time: time
  });

  input.value = '';
  renderMessages();
  renderChannels();

  // If offline, notify message is queued
  if (appState.networkStatus === 'offline') {
    appState.pendingSyncCount++;
    updateNetworkUI();
    showToast('💬 Message sent locally! Queued to sync when back online.', 'warning');
  } else {
    // Simulate active peer reply
    if (appState.role === 'student') {
      setTimeout(() => {
        appState.channels[appState.activeChannel].messages.push({
          author: 'Gigi Oderio',
          role: 'student',
          text: `Got it @${author.split(' ')[0]}! Checking the dashboard update now. 👍`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        renderMessages();
        renderChannels();
      }, 1500);
    }
  }
}

// Offline Engine
function initOfflineEngine() {
  renderOfflineFiles();
  renderDraftsList();

  const saveDraftBtn = document.getElementById('btnSaveOfflineDraft');
  const draftTitle = document.getElementById('draftTitle');
  const draftBody = document.getElementById('draftBody');

  if (saveDraftBtn && draftTitle && draftBody) {
    saveDraftBtn.addEventListener('click', () => {
      if (!draftTitle.value.trim() || !draftBody.value.trim()) {
        showToast('Please enter both title and content for your assignment draft.', 'warning');
        return;
      }

      const isOffline = appState.networkStatus === 'offline';
      const newDraft = {
        id: 'draft-' + Date.now(),
        title: draftTitle.value.trim(),
        content: draftBody.value.trim(),
        status: isOffline ? 'pending' : 'synced',
        time: 'Just now'
      };

      appState.offlineDrafts.unshift(newDraft);
      if (isOffline) {
        appState.pendingSyncCount++;
        showToast('📦 Saved into Browser LocalStorage Cache! (Pending Sync)', 'warning');
      } else {
        showToast('✅ Saved & Submitted to Classroom Cloud!', 'success');
      }

      draftTitle.value = '';
      draftBody.value = '';
      updateNetworkUI();
      renderDraftsList();
    });
  }
}

function renderOfflineFiles() {
  const fileContainer = document.getElementById('offlineFilesList');
  if (!fileContainer) return;

  fileContainer.innerHTML = '';
  appState.offlineItems.forEach(f => {
    const card = document.createElement('div');
    card.className = 'sketch-card alt-border';
    card.style.padding = '14px';
    card.innerHTML = `
      <div class="flex-between">
        <div style="font-weight:bold; font-size:18px;">📄 ${f.title}</div>
        <span class="sketch-badge green">✓ ${f.status}</span>
      </div>
      <div class="flex-between mt-12 text-muted" style="font-size:14px;">
        <span>Size: ${f.size}</span>
        <span>${f.date}</span>
      </div>
      <div class="mt-12">
        <button class="sketch-btn blue" style="font-size:14px; padding:4px 12px;" onclick="showToast('Opening cached offline document...', 'info')">
          📖 Read Offline
        </button>
      </div>
    `;
    fileContainer.appendChild(card);
  });
}

function renderDraftsList() {
  const draftsContainer = document.getElementById('offlineDraftsList');
  if (!draftsContainer) return;

  draftsContainer.innerHTML = '';
  if (appState.offlineDrafts.length === 0) {
    draftsContainer.innerHTML = '<p class="text-muted">No assignment drafts yet.</p>';
    return;
  }

  appState.offlineDrafts.forEach(d => {
    const card = document.createElement('div');
    const isPending = d.status === 'pending';
    card.className = 'sketch-card';
    card.style.marginBottom = '12px';
    card.style.background = isPending ? 'var(--ex-orange)' : '#ffffff';
    card.innerHTML = `
      <div class="flex-between">
        <h4 style="font-size:19px;">📝 ${d.title}</h4>
        <span class="sketch-badge ${isPending ? 'orange' : 'green'}">
          ${isPending ? '⏳ Pending Sync (Offline)' : '✓ Synced to Cloud'}
        </span>
      </div>
      <p style="margin: 8px 0; font-size:16px;">${d.content}</p>
      <div class="flex-between text-muted" style="font-size:13px;">
        <span>${d.time}</span>
        <span>Storage: LocalStorage API Cache</span>
      </div>
    `;
    draftsContainer.appendChild(card);
  });
}

// Student Calendar View
function renderStudentCalendar() {
  const cal = document.getElementById('studentCalendarGrid');
  if (!cal) return;

  cal.innerHTML = `
    <div class="cal-header">S</div>
    <div class="cal-header">M</div>
    <div class="cal-header">T</div>
    <div class="cal-header">W</div>
    <div class="cal-header">T</div>
    <div class="cal-header">F</div>
    <div class="cal-header">S</div>
  `;

  // Sample month days
  const days = [
    { num: 1, event: null }, { num: 2, event: null }, { num: 3, event: null },
    { num: 4, event: null }, { num: 5, event: null }, { num: 6, event: null },
    { num: 7, event: null }, { num: 8, event: null }, { num: 9, event: null },
    { num: 10, event: null }, { num: 11, event: null }, { num: 12, event: 'Quiz 2' },
    { num: 13, event: null }, { num: 14, event: null }, { num: 15, event: 'Sprint 1 Draft (Today)', today: true },
    { num: 16, event: null }, { num: 17, event: null }, { num: 18, event: 'Assignment 3 Due', deadline: true },
    { num: 19, event: null }, { num: 20, event: null }, { num: 21, event: null },
    { num: 22, event: 'Final IPO Presentation', deadline: true }, { num: 23, event: null }, { num: 24, event: null }
  ];

  days.forEach(d => {
    const div = document.createElement('div');
    let classes = 'cal-day ';
    if (d.today) classes += 'today ';
    if (d.deadline) classes += 'has-deadline ';
    div.className = classes;

    div.innerHTML = `
      <div style="font-size:12px;">${d.num}</div>
      ${d.event ? `<div class="cal-dot" title="${d.event}"></div>` : ''}
    `;

    if (d.event) {
      div.style.cursor = 'pointer';
      div.addEventListener('click', () => {
        showToast(`📅 Day ${d.num}: ${d.event}`, 'info');
      });
    }

    cal.appendChild(div);
  });
}

// Hand-drawn Charts and Bars
function renderCharts() {
  // Teacher risk list
  const riskContainer = document.getElementById('teacherRiskList');
  if (riskContainer) {
    riskContainer.innerHTML = '';
    appState.atRiskStudents.forEach(st => {
      const row = document.createElement('div');
      row.className = 'sketch-card';
      row.style.padding = '12px 16px';
      row.style.marginBottom = '10px';
      row.style.background = '#fff8f6';
      row.style.borderColor = '#d9480f';
      row.innerHTML = `
        <div class="flex-between">
          <div>
            <strong>${st.name}</strong> <span class="sketch-badge orange">${st.class}</span>
            <div style="font-size:14px; color:#c92a2a; margin-top:4px;">⚠️ ${st.issue}</div>
          </div>
          <div>
            <button class="sketch-btn orange" style="font-size:14px; padding:4px 10px;" onclick="nudgeStudent('${st.name}')">
              📢 Send In-App Nudge
            </button>
          </div>
        </div>
      `;
      riskContainer.appendChild(row);
    });
  }
}

// Global actions
window.nudgeStudent = function(studentName) {
  showToast(`📢 Sent automated reminder notification & group chat nudge to ${studentName}!`, 'success');
};

window.quickSync = function() {
  if (appState.networkStatus === 'offline') {
    showToast('Cannot sync while Offline mode is toggled on. Switch to Online first!', 'warning');
  } else {
    triggerAutoSync();
  }
};

// Toast notification helper
function showToast(message, type = 'info') {
  let toast = document.getElementById('sketchToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'sketchToast';
    toast.className = 'sketch-toast';
    document.body.appendChild(toast);
  }

  toast.className = `sketch-toast show ${type}`;
  toast.innerHTML = `<span>${message}</span>`;

  if (window.toastTimeout) clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
