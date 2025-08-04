/*
 * Core functionality for Nood Drop.
 *
 * This file orchestrates routing between pages, manages the swipe deck
 * logic, persists state to localStorage and renders cards of various
 * types. All content lives client‑side – no servers and no signup.
 */

(() => {
  // Static content deck. In a real app this could be loaded from a JSON file
  // or remote API, but for the purposes of this prototype it's hardcoded.
  const cards = [
    {
      id: 1,
      type: 'image',
      image: 'main/image1.png',
      caption: 'Neon dreams swirling with digital lust and colourful chaos.',
    },
    {
      id: 2,
      type: 'article',
      image: 'main/image2.png',
      title: '5 Reasons Neon Is the New Black',
      teaser: 'Discover why this hot hue is taking over your midnight fantasies.',
      link: 'https://example.com/5-reasons-neon',
    },
    {
      id: 3,
      type: 'poll',
      question: 'Which vibe are you feeling right now?',
      options: ['Trashy & chic', 'Glitch goddess', 'Glow in the dark'],
      results: [25, 45, 30],
    },
    {
      id: 4,
      type: 'profile',
      image: 'main/profile.png',
      name: 'Nova',
      age: 23,
      bio: 'A neon muse with a penchant for late‑night coding and cosmic dancing.',
    },
    {
      id: 5,
      type: 'article',
      image: 'main/image3.png',
      title: 'Inside the AI Art Underground',
      teaser: 'Peek into the subversive world of AI‑generated visuals that will have you questioning reality.',
      link: 'https://example.com/ai-art-underground',
    },
    {
      id: 6,
      type: 'image',
      image: 'image2.png',
      caption: 'Just a glitch? Or the start of something wild and unexpected…',
    },
  ];

  // Get and set helpers for localStorage keys
  function getSavedCards() {
    try {
      return JSON.parse(localStorage.getItem('savedCards')) || [];
    } catch (e) {
      return [];
    }
  }

  function setSavedCards(arr) {
    localStorage.setItem('savedCards', JSON.stringify(arr));
  }

  function getCurrentIndex() {
    return parseInt(localStorage.getItem('currentIndex'), 10) || 0;
  }

  function setCurrentIndex(index) {
    localStorage.setItem('currentIndex', String(index));
  }

  function getPollVotes() {
    try {
      return JSON.parse(localStorage.getItem('pollVotes')) || {};
    } catch (e) {
      return {};
    }
  }

  function setPollVotes(obj) {
    localStorage.setItem('pollVotes', JSON.stringify(obj));
  }

  // DOM elements
  const deckPage = document.getElementById('deckPage');
  const savedPage = document.getElementById('savedPage');
  const settingsPage = document.getElementById('settingsPage');
  const cardContainer = document.getElementById('cardContainer');
  const savedList = document.getElementById('savedList');
  const skipBtn = document.getElementById('skipBtn');
  const saveBtn = document.getElementById('saveBtn');
  const clearSavedBtn = document.getElementById('clearSavedBtn');
  const navHome = document.getElementById('navHome');
  const navSaved = document.getElementById('navSaved');
  const navSettings = document.getElementById('navSettings');

  // Utility to build a card element for deck view
  function buildDeckCard(card) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card';

    if (card.type === 'image' || card.type === 'article' || card.type === 'profile') {
      // Add image if available
      if (card.image) {
        const img = document.createElement('img');
        img.src = card.image;
        img.alt = card.caption || card.title || card.name || '';
        wrapper.appendChild(img);
      }
    }

    const content = document.createElement('div');
    content.className = 'card-content';

    switch (card.type) {
      case 'image': {
        const caption = document.createElement('p');
        caption.className = 'card-caption';
        caption.textContent = card.caption || '';
        content.appendChild(caption);
        break;
      }
      case 'article': {
        const title = document.createElement('h2');
        title.className = 'card-title';
        title.textContent = card.title;
        const teaser = document.createElement('p');
        teaser.className = 'card-teaser';
        teaser.textContent = card.teaser;
        const link = document.createElement('a');
        link.href = card.link;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Read More →';
        link.style.color = 'var(--accent)';
        link.style.textDecoration = 'none';
        content.appendChild(title);
        content.appendChild(teaser);
        content.appendChild(link);
        break;
      }
      case 'profile': {
        const title = document.createElement('h2');
        title.className = 'card-title';
        title.textContent = `${card.name}, ${card.age}`;
        const bio = document.createElement('p');
        bio.className = 'card-bio';
        bio.textContent = card.bio;
        content.appendChild(title);
        content.appendChild(bio);
        break;
      }
      case 'poll': {
        const question = document.createElement('h2');
        question.className = 'card-title';
        question.textContent = card.question;
        content.appendChild(question);
        // Poll votes state
        const pollVotes = getPollVotes();
        const votedIndex = pollVotes[card.id];
        if (typeof votedIndex === 'number') {
          // Already voted – show results
          const results = renderPollResults(card, votedIndex);
          content.appendChild(results);
        } else {
          // Show options to vote
          const optionsContainer = document.createElement('div');
          optionsContainer.className = 'poll-options';
          card.options.forEach((option, index) => {
            const opt = document.createElement('div');
            opt.className = 'poll-option';
            opt.textContent = option;
            opt.addEventListener('click', () => {
              // Save vote
              const votes = getPollVotes();
              votes[card.id] = index;
              setPollVotes(votes);
              // Update view by replacing options with results
              content.innerHTML = '';
              const questionEl = document.createElement('h2');
              questionEl.className = 'card-title';
              questionEl.textContent = card.question;
              content.appendChild(questionEl);
              const resultsEl = renderPollResults(card, index);
              content.appendChild(resultsEl);
            });
            optionsContainer.appendChild(opt);
          });
          content.appendChild(optionsContainer);
        }
        break;
      }
      default:
        break;
    }

    wrapper.appendChild(content);
    return wrapper;
  }

  // Render poll results component
  function renderPollResults(card, userChoice) {
    const container = document.createElement('div');
    container.className = 'poll-results';
    // Compute totals: include user vote in the results
    const baseResults = card.results || new Array(card.options.length).fill(0);
    const total = baseResults.reduce((sum, val) => sum + val, 0) + 1;
    baseResults.forEach((val, index) => {
      const percentage = Math.round(((val + (userChoice === index ? 1 : 0)) / total) * 100);
      const bar = document.createElement('div');
      bar.className = 'poll-bar';
      const fill = document.createElement('div');
      fill.className = 'poll-bar-fill';
      fill.style.width = `${percentage}%`;
      if (index === userChoice) {
        // Make the user‑chosen bar brighter
        fill.style.backgroundColor = 'var(--accent)';
      } else {
        fill.style.backgroundColor = '#424254';
      }
      const label = document.createElement('div');
      label.className = 'poll-bar-label';
      label.textContent = `${card.options[index]} – ${percentage}%`;
      bar.appendChild(fill);
      bar.appendChild(label);
      container.appendChild(bar);
    });
    return container;
  }

  // Display current card on deck
  function showCard() {
    cardContainer.innerHTML = '';
    let index = getCurrentIndex();
    if (index >= cards.length) {
      // End of deck message
      const endMsg = document.createElement('div');
      endMsg.className = 'card';
      const msgContent = document.createElement('div');
      msgContent.className = 'card-content';
      const title = document.createElement('h2');
      title.className = 'card-title';
      title.textContent = 'You’ve reached the end!';
      const text = document.createElement('p');
      text.className = 'card-caption';
      text.textContent = 'Check back later for more drops.';
      msgContent.appendChild(title);
      msgContent.appendChild(text);
      endMsg.appendChild(msgContent);
      cardContainer.appendChild(endMsg);
      // Disable buttons when no more cards
      skipBtn.disabled = true;
      saveBtn.disabled = true;
      return;
    }
    const card = cards[index];
    const cardEl = buildDeckCard(card);
    cardContainer.appendChild(cardEl);
    // Ensure buttons are enabled
    skipBtn.disabled = false;
    saveBtn.disabled = false;
  }

  // Skip current card
  function skipCard() {
    let index = getCurrentIndex();
    index += 1;
    setCurrentIndex(index);
    showCard();
  }

  // Save current card and move to next
  function saveCard() {
    let index = getCurrentIndex();
    if (index >= cards.length) return;
    const card = cards[index];
    let saved = getSavedCards();
    if (!saved.some((c) => c.id === card.id)) {
      saved.push(card);
      setSavedCards(saved);
    }
    index += 1;
    setCurrentIndex(index);
    showCard();
  }

  // Build a saved card element for the saved view
  function buildSavedCard(card) {
    const wrapper = document.createElement('div');
    wrapper.className = 'saved-card';

    if (card.image) {
      const img = document.createElement('img');
      img.src = card.image;
      img.alt = card.caption || card.title || card.name || '';
      wrapper.appendChild(img);
    }

    const content = document.createElement('div');
    content.className = 'card-content';

    switch (card.type) {
      case 'image': {
        const caption = document.createElement('p');
        caption.className = 'card-caption';
        caption.textContent = card.caption || '';
        content.appendChild(caption);
        break;
      }
      case 'article': {
        const title = document.createElement('h2');
        title.className = 'card-title';
        title.textContent = card.title;
        const teaser = document.createElement('p');
        teaser.className = 'card-teaser';
        teaser.textContent = card.teaser;
        const link = document.createElement('a');
        link.href = card.link;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Read More →';
        link.style.color = 'var(--accent)';
        link.style.textDecoration = 'none';
        content.appendChild(title);
        content.appendChild(teaser);
        content.appendChild(link);
        break;
      }
      case 'profile': {
        const title = document.createElement('h2');
        title.className = 'card-title';
        title.textContent = `${card.name}, ${card.age}`;
        const bio = document.createElement('p');
        bio.className = 'card-bio';
        bio.textContent = card.bio;
        content.appendChild(title);
        content.appendChild(bio);
        break;
      }
      case 'poll': {
        const question = document.createElement('h2');
        question.className = 'card-title';
        question.textContent = card.question;
        content.appendChild(question);
        // Show results with user's vote if available
        const pollVotes = getPollVotes();
        const votedIndex = pollVotes[card.id];
        const resultsEl = renderPollResults(card, typeof votedIndex === 'number' ? votedIndex : -1);
        content.appendChild(resultsEl);
        break;
      }
    }

    wrapper.appendChild(content);
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      removeSavedCard(card.id);
    });
    wrapper.appendChild(removeBtn);

    return wrapper;
  }

  // Render saved list view
  function renderSavedList() {
    savedList.innerHTML = '';
    const saved = getSavedCards();
    if (!saved.length) {
      const msg = document.createElement('p');
      msg.style.textAlign = 'center';
      msg.style.color = 'var(--text-dim)';
      msg.textContent = 'You haven’t saved any drops yet. Swipe right on something you love!';
      savedList.appendChild(msg);
      return;
    }
    saved.forEach((card) => {
      const item = buildSavedCard(card);
      savedList.appendChild(item);
    });
  }

  // Remove card from saved list
  function removeSavedCard(cardId) {
    let saved = getSavedCards();
    saved = saved.filter((c) => c.id !== cardId);
    setSavedCards(saved);
    renderSavedList();
  }

  // Navigation handling
  function updatePage() {
    const hash = window.location.hash || '#';
    // Remove active state from all pages and nav items
    [deckPage, savedPage, settingsPage].forEach((page) => page.classList.remove('active'));
    [navHome, navSaved, navSettings].forEach((nav) => nav.classList.remove('active'));
    switch (hash) {
      case '#saved':
        savedPage.classList.add('active');
        navSaved.classList.add('active');
        renderSavedList();
        break;
      case '#settings':
        settingsPage.classList.add('active');
        navSettings.classList.add('active');
        break;
      default:
        deckPage.classList.add('active');
        navHome.classList.add('active');
        showCard();
        break;
    }
  }

  // Clear saved cards handler
  function clearSaved() {
    if (!confirm('Clear all saved drops?')) return;
    setSavedCards([]);
    // Also clear poll votes so that results refresh if user saves again
    setPollVotes({});
    renderSavedList();
  }

  // Event listeners
  skipBtn.addEventListener('click', skipCard);
  saveBtn.addEventListener('click', saveCard);
  clearSavedBtn.addEventListener('click', clearSaved);

  window.addEventListener('hashchange', updatePage);

  // Initial page load
  document.addEventListener('DOMContentLoaded', () => {
    updatePage();
  });
})();
