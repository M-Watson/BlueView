let userCredentials = { handle: '', password: '' };
let allPosts = [];
let selectedAuthor = 'all';
let appConfig = { collections: [], searches: [] };

// Make navTo globally available
window.navTo = function(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.style.display = 'none');
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
        targetPage.style.display = 'block';
    } else {
        console.error(`Page #page-${pageId} not found`);
    }
};

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const handle = document.getElementById('handle').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('login-message');
    messageDiv.textContent = 'Logging in...';
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ handle, password }),
        });
        const data = await response.json();
        if (response.ok) {
            userCredentials = { handle, password };
            messageDiv.textContent = data.message;
            messageDiv.className = 'success';
            document.getElementById('nav-app-btn').style.display = 'inline-block';
            navTo('app');
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            document.getElementById('since').value = yesterday.toISOString().slice(0, 10);
            loadConfig();
        } else {
            messageDiv.textContent = data.detail || 'Login failed';
            messageDiv.className = 'error';
        }
    } catch (error) {
        messageDiv.textContent = 'An error occurred. Please try again.';
        messageDiv.className = 'error';
    }
});

async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        appConfig = await response.json();
        renderQuickActions();
    } catch (error) { console.error('Failed to load config', error); }
}

function renderQuickActions() {
    const quickActionsEl = document.getElementById('quick-actions');
    quickActionsEl.innerHTML = '';
    appConfig.collections.forEach(col => {
        const btn = document.createElement('button');
        btn.className = 'quick-btn';
        btn.textContent = `Col: ${col.name}`;
        btn.onclick = () => runQuickCatchup({ collection_authors: col.authors });
        quickActionsEl.appendChild(btn);
    });
    appConfig.searches.forEach(srch => {
        const btn = document.createElement('button');
        btn.className = 'quick-btn';
        btn.textContent = `Tag: ${srch.name}`;
        btn.onclick = () => runQuickCatchup({ tag: srch.query });
        quickActionsEl.appendChild(btn);
    });
}

async function runQuickCatchup(params) {
    const since = document.getElementById('since').value;
    const until = document.getElementById('until').value;
    const payload = {
        ...userCredentials,
        ...params,
        since: new Date(since + 'T00:00:00Z').toISOString(),
        until: until ? new Date(until + 'T23:59:59Z').toISOString() : null
    };
    fetchAndRender(payload);
}

document.getElementById('catchup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const since = document.getElementById('since').value;
    const until = document.getElementById('until').value;
    const feedUri = document.getElementById('feed-uri').value;
    const tag = document.getElementById('tag').value;
    const payload = {
        ...userCredentials,
        since: new Date(since + 'T00:00:00Z').toISOString(),
        until: until ? new Date(until + 'T23:59:59Z').toISOString() : null,
        feed_uri: feedUri || null,
        tag: tag || null
    };
    fetchAndRender(payload);
});

async function fetchAndRender(payload) {
    const resultsContainer = document.getElementById('results-container');
    const feedResults = document.getElementById('feed-results');
    const statTotal = document.getElementById('stat-total');
    resultsContainer.style.display = 'block';
    statTotal.textContent = '...';
    feedResults.innerHTML = '<div class="card">Fetching your catch-up...</div>';
    try {
        const response = await fetch('/api/fetch-catchup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (response.ok) {
            allPosts = data.posts;
            processAndRender();
        } else {
            feedResults.innerHTML = `<div class="card error">Error: ${data.detail}</div>`;
        }
    } catch (error) {
        feedResults.innerHTML = '<div class="card error">An error occurred during fetch.</div>';
    }
}

// Config Management
const modal = document.getElementById('config-modal');
document.getElementById('manage-config-btn').onclick = () => { renderConfigModal(); modal.style.display = 'flex'; };
document.getElementById('close-config-btn').onclick = () => modal.style.display = 'none';

function renderConfigModal() {
    const colList = document.getElementById('config-collections-list');
    colList.innerHTML = '';
    appConfig.collections.forEach((col, idx) => {
        const div = document.createElement('div');
        div.className = 'config-item';
        div.innerHTML = `
            <input type="text" value="${col.name}" placeholder="Name" onchange="updateConfig('col', ${idx}, 'name', this.value)">
            <input type="text" value="${col.authors.join(', ')}" placeholder="Authors (comma separated)" onchange="updateConfig('col', ${idx}, 'authors', this.value)">
            <button onclick="removeConfig('col', ${idx})">❌</button>
        `;
        colList.appendChild(div);
    });
    const srchList = document.getElementById('config-searches-list');
    srchList.innerHTML = '';
    appConfig.searches.forEach((srch, idx) => {
        const div = document.createElement('div');
        div.className = 'config-item';
        div.innerHTML = `
            <input type="text" value="${srch.name}" placeholder="Name" onchange="updateConfig('srch', ${idx}, 'name', this.value)">
            <input type="text" value="${srch.query}" placeholder="Query/Tag" onchange="updateConfig('srch', ${idx}, 'query', this.value)">
            <button onclick="removeConfig('srch', ${idx})">❌</button>
        `;
        srchList.appendChild(div);
    });
}

window.updateConfig = (type, idx, key, val) => {
    if (type === 'col') {
        if (key === 'authors') val = val.split(',').map(s => s.trim());
        appConfig.collections[idx][key] = val;
    } else { appConfig.searches[idx][key] = val; }
};

window.removeConfig = (type, idx) => {
    if (type === 'col') appConfig.collections.splice(idx, 1);
    else appConfig.searches.splice(idx, 1);
    renderConfigModal();
};

document.getElementById('add-collection-btn').onclick = () => { appConfig.collections.push({ name: 'New Collection', authors: [] }); renderConfigModal(); };
document.getElementById('add-search-btn').onclick = () => { appConfig.searches.push({ name: 'New Search', query: '' }); renderConfigModal(); };
document.getElementById('save-config-btn').onclick = async () => {
    await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(appConfig) });
    renderQuickActions();
    modal.style.display = 'none';
};

function processAndRender() {
    calculateStats();
    renderAuthorList();
    renderFilteredPosts();
}

function calculateStats() {
    document.getElementById('stat-total').textContent = allPosts.length;
    const authorCounts = {};
    allPosts.forEach(p => { authorCounts[p.author.handle] = (authorCounts[p.author.handle] || 0) + 1; });
    const sortedAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    document.getElementById('stat-top-posters').innerHTML = sortedAuthors.map(([handle, count]) => `<div><strong>@${handle}</strong>: ${count}</div>`).join('');
    const sortedByEngagement = [...allPosts].sort((a, b) => (b.likeCount + b.repostCount) - (a.likeCount + a.repostCount)).slice(0, 3);
    document.getElementById('stat-highlights').innerHTML = sortedByEngagement.map(p => `<div title="${p.text}"><strong>@${p.author.handle}</strong>: ${p.likeCount} likes</div>`).join('');
}

function renderAuthorList() {
    const authorListEl = document.getElementById('author-list');
    const authorSearchEl = document.getElementById('author-search');
    const searchTerm = authorSearchEl ? authorSearchEl.value.toLowerCase() : '';
    const authors = {};
    allPosts.forEach(p => { authors[p.author.handle] = p.author.displayName || p.author.handle; });
    authorListEl.innerHTML = `<div class="author-item ${selectedAuthor === 'all' ? 'active' : ''}" onclick="setAuthor('all')">All Authors</div>`;
    Object.entries(authors).sort().filter(([handle, name]) => name.toLowerCase().includes(searchTerm) || handle.toLowerCase().includes(searchTerm)).forEach(([handle, name]) => {
        const item = document.createElement('div');
        item.className = `author-item ${selectedAuthor === handle ? 'active' : ''}`;
        item.textContent = name;
        item.title = `@${handle}`;
        item.onclick = () => setAuthor(handle);
        authorListEl.appendChild(item);
    });
}

document.getElementById('author-search').addEventListener('input', renderAuthorList);

window.setAuthor = function(handle) {
    selectedAuthor = handle;
    renderAuthorList();
    renderFilteredPosts();
}

function renderFilteredPosts() {
    const hideReplies = document.getElementById('hide-replies').checked;
    const showMedia = document.getElementById('show-media').checked;
    const groupBy = document.getElementById('group-by').value;
    const layoutView = document.getElementById('layout-view').value;
    const gridColumns = document.getElementById('grid-columns').value;
    const sortBy = document.getElementById('sort-by').value;

    document.getElementById('grid-columns-container').style.display = layoutView === 'grid' ? 'inline' : 'none';

    let filtered = allPosts;
    if (selectedAuthor !== 'all') filtered = filtered.filter(p => p.author.handle === selectedAuthor);
    if (hideReplies) filtered = filtered.filter(p => !p.isReply);

    // Sorting
    if (sortBy === 'newest') filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sortBy === 'oldest') filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sortBy === 'engagement') filtered.sort((a, b) => (b.likeCount + b.repostCount) - (a.likeCount + a.repostCount));

    const feedResults = document.getElementById('feed-results');
    feedResults.innerHTML = '';

    if (filtered.length === 0) {
        feedResults.innerHTML = '<div class="card">No posts found matching these filters.</div>';
        return;
    }

    // Grouping Logic
    const groups = {};
    if (groupBy === 'day') {
        filtered.forEach(p => {
            const day = new Date(p.createdAt).toLocaleDateString();
            if (!groups[day]) groups[day] = [];
            groups[day].push(p);
        });
    } else if (groupBy === 'author') {
        filtered.forEach(p => {
            const key = p.author.displayName || p.author.handle;
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });
    } else {
        groups['All Posts'] = filtered;
    }

    Object.entries(groups).forEach(([groupName, posts]) => {
        if (groupBy !== 'none') {
            const header = document.createElement('div');
            header.className = 'group-header';
            header.textContent = groupName;
            feedResults.appendChild(header);
        }

        const container = document.createElement('div');
        container.className = layoutView === 'grid' ? `post-grid cols-${gridColumns}` : 'post-list';
        
        posts.forEach(post => {
            const postEl = renderPostCard(post, showMedia);
            container.appendChild(postEl);
        });
        feedResults.appendChild(container);
    });
}

function renderPostCard(post, showMedia) {
    const postEl = document.createElement('div');
    postEl.className = 'card post-card';
    let mediaHtml = '';
    if (showMedia && post.embed) {
        if (post.embed.type === 'images') mediaHtml = `<div class="post-media">` + post.embed.images.map(img => `<img src="${img.thumb}" alt="${img.alt || ''}" loading="lazy">`).join('') + `</div>`;
        else if (post.embed.type === 'external') mediaHtml = `<div class="external-embed">${post.embed.external.thumb ? `<img src="${post.embed.external.thumb}" class="external-thumb">` : ''}<div class="external-content"><div class="external-title">${post.embed.external.title}</div><div class="external-desc">${post.embed.external.description}</div></div></div>`;
    }
    postEl.innerHTML = `<div class="post-header"><strong>${post.author.displayName || post.author.handle}</strong> <span class="handle">@${post.author.handle}</span></div><div class="post-text">${post.text}</div>${mediaHtml}<div class="post-footer"><small>${new Date(post.createdAt).toLocaleString()} | ❤️ ${post.likeCount} | 🔄 ${post.repostCount}</small></div>`;
    postEl.onclick = () => { const parts = post.uri.split('/'); const rkey = parts[parts.length - 1]; window.open(`https://bsky.app/profile/${post.author.handle}/post/${rkey}`, '_blank'); };
    return postEl;
}
// Documentation Logic
const docsBody = document.getElementById('docs-body');

window.openDocs = async (docType) => {
    navTo('docs');
    docsBody.innerHTML = 'Loading documentation...';
    try {
        const response = await fetch(`/api/docs/${docType}`);
        const data = await response.json();
        if (response.ok) {
            docsBody.innerHTML = data.html;
        } else {
            docsBody.innerHTML = `<div class="error">Failed to load docs: ${data.detail}</div>`;
        }
    } catch (e) {
        docsBody.innerHTML = `<div class="error">Error loading documentation.</div>`;
    }
};

